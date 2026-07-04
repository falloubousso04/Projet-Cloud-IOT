/*
 * Tableau de bord — logique temps réel et historiques.
 * Interroge l'API par « polling » (toutes les REFRESH_INTERVAL ms).
 */

const API = CONFIG.API_BASE;
const DEVICE = CONFIG.DEVICE_ID;

// ─── Helpers ──────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('fr-FR');
}
function formatDateTime(date) {
  return new Date(date).toLocaleString('fr-FR');
}
function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}

// ─── Gestion du bandeau d'état ────────────────────────────────────
function setStatus(kind, label, detail) {
  const banner = $('statusBanner');
  banner.className = 'status-banner ' + kind;
  const icons = { normal: '🟢', alert: '🔴', stale: '🟠', nodata: '⚪', offline: '🔌' };
  $('statusIcon').textContent = icons[kind] || '⏳';
  $('statusLabel').textContent = label;
  $('statusDetail').textContent = detail;
}

function setConnection(online) {
  const el = $('connection');
  el.className = 'connection ' + (online ? 'online' : 'offline');
  $('connText').textContent = online ? 'En ligne' : 'Hors ligne';
}

// ─── Graphique temps réel ─────────────────────────────────────────
let liveChart;
function initLiveChart() {
  const ctx = $('liveChart').getContext('2d');
  liveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Température (°C)',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: 'Seuil',
          data: [],
          borderColor: '#ef4444',
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      },
      plugins: { legend: { labels: { color: '#e2e8f0' } } },
    },
  });
}

async function refreshLiveChart() {
  const res = await apiGet(`/api/measures?deviceId=${DEVICE}&limit=30`);
  if (!res.data) return;
  const pts = res.data.slice().reverse(); // ordre chronologique
  liveChart.data.labels = pts.map((m) => formatTime(m.timestamp));
  liveChart.data.datasets[0].data = pts.map((m) => m.temperature);
  liveChart.data.datasets[1].data = pts.map((m) => m.threshold);
  liveChart.update('none');
}

// ─── Rafraîchissement temps réel (dernière mesure + état) ─────────
async function refreshLatest() {
  try {
    const res = await apiGet(`/api/measures/latest?deviceId=${DEVICE}`);
    setConnection(true);

    // Absence de données
    if (!res.success || !res.data) {
      setStatus('nodata', 'Aucune donnée', 'En attente de la première mesure du capteur.');
      $('temp').textContent = '--';
      $('humidity').textContent = '--';
      return;
    }

    const m = res.data;
    $('temp').textContent = m.temperature;
    $('humidity').textContent = m.humidity != null ? m.humidity : '--';
    $('threshold').textContent = m.threshold;
    $('lastUpdate').textContent = formatDateTime(m.timestamp);
    $('deviceId').textContent = m.deviceId;

    // Détection d'une mesure périmée (perte de connexion du capteur)
    const ageSec = (Date.now() - new Date(m.timestamp).getTime()) / 1000;
    if (ageSec > CONFIG.STALE_THRESHOLD_SEC) {
      setStatus(
        'stale',
        'Signal perdu',
        `Dernière mesure il y a ${Math.round(ageSec)} s — capteur peut-être hors ligne.`
      );
      return;
    }

    // État normal / alerte
    if (m.state === 'ALERT') {
      const peak = res.meta.activeAlert ? ` — pic ${res.meta.activeAlert.maxValue}°C` : '';
      setStatus('alert', '⚠️ ALERTE — Surchauffe', `Température ${m.temperature}°C ≥ seuil ${m.threshold}°C${peak}`);
    } else {
      setStatus('normal', 'État normal', `Température ${m.temperature}°C, sous le seuil de ${m.threshold}°C.`);
    }
  } catch (err) {
    // Perte de connexion à l'API
    setConnection(false);
    setStatus('offline', 'Connexion perdue', "Impossible de joindre l'API. Nouvelle tentative…");
  }
}

// ─── Historique journalier (matin / soir / nuit) ──────────────────
async function refreshDaily() {
  const date = $('dailyDate').value;
  const q = date ? `&date=${date}` : '';
  const res = await apiGet(`/api/history/daily?deviceId=${DEVICE}${q}`);
  if (!res.periods) return;

  const meta = {
    matin: { icon: '🌅', label: 'Matin', range: '06h–12h' },
    soir: { icon: '🌆', label: 'Soir', range: '12h–20h' },
    nuit: { icon: '🌙', label: 'Nuit', range: '20h–06h' },
  };

  const container = $('periods');
  container.innerHTML = '';
  for (const key of ['matin', 'soir', 'nuit']) {
    const p = res.periods[key];
    const info = meta[key];
    const avg = p.average != null ? `${p.average}°C` : '—';
    const alertClass = p.alertCount > 0 ? 'badge-alert' : 'badge-ok';
    container.innerHTML += `
      <div class="period-card">
        <h3>${info.icon} ${info.label} <span class="panel-hint">(${info.range})</span></h3>
        <div class="period-stats">
          <div class="period-stat"><span>Mesures</span><span class="val">${p.count}</span></div>
          <div class="period-stat"><span>Moyenne</span><span class="val">${avg}</span></div>
          <div class="period-stat"><span>Min / Max</span><span class="val">${p.min ?? '—'} / ${p.max ?? '—'}°C</span></div>
          <div class="period-stat"><span>Alertes</span><span class="val ${alertClass}">${p.alertCount}</span></div>
        </div>
      </div>`;
  }
}

// ─── Historique hebdomadaire (graphique) ──────────────────────────
let weeklyChart;
async function refreshWeekly() {
  const date = $('weekDate').value;
  const q = date ? `&week=${date}` : '';
  const res = await apiGet(`/api/history/weekly?deviceId=${DEVICE}${q}`);
  if (!res.days) return;

  const labels = res.days.map((d) => d.dayLabel);
  const averages = res.days.map((d) => d.average);
  const alerts = res.days.map((d) => d.alertCount);

  const cfg = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Moyenne (°C)',
          data: averages,
          backgroundColor: 'rgba(59,130,246,0.6)',
          yAxisID: 'y',
        },
        {
          label: "Nb d'alertes",
          data: alerts,
          backgroundColor: 'rgba(239,68,68,0.7)',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        y: {
          position: 'left',
          title: { display: true, text: '°C', color: '#94a3b8' },
          ticks: { color: '#94a3b8' }, grid: { color: '#334155' },
        },
        y1: {
          position: 'right',
          title: { display: true, text: 'Alertes', color: '#94a3b8' },
          ticks: { color: '#94a3b8', stepSize: 1 },
          grid: { drawOnChartArea: false },
          beginAtZero: true,
        },
      },
      plugins: { legend: { labels: { color: '#e2e8f0' } } },
    },
  };

  if (weeklyChart) {
    weeklyChart.data = cfg.data;
    weeklyChart.update();
  } else {
    weeklyChart = new Chart($('weeklyChart').getContext('2d'), cfg);
  }
}

// ─── Tableau des alertes ──────────────────────────────────────────
async function refreshAlerts() {
  const res = await apiGet(`/api/alerts?deviceId=${DEVICE}&limit=15`);
  const body = $('alertsBody');
  if (!res.data || res.data.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty">Aucune alerte enregistrée.</td></tr>';
    return;
  }
  body.innerHTML = res.data
    .map((a) => {
      const tag = a.status === 'ONGOING'
        ? '<span class="tag ongoing">En cours</span>'
        : '<span class="tag resolved">Résolue</span>';
      return `<tr>
        <td>${formatDateTime(a.startTime)}</td>
        <td>${a.endTime ? formatDateTime(a.endTime) : '—'}</td>
        <td>${a.maxValue}</td>
        <td>${a.thresholdAtEvent}</td>
        <td>${formatDuration(a.durationSeconds)}</td>
        <td>${tag}</td>
      </tr>`;
    })
    .join('');
}

// ─── Orchestration ────────────────────────────────────────────────
async function tickRealtime() {
  await refreshLatest();
  try {
    await refreshLiveChart();
    await refreshAlerts();
  } catch (e) { /* déjà géré par setConnection */ }
}

async function refreshHistories() {
  try {
    await refreshDaily();
    await refreshWeekly();
  } catch (e) {
    console.error('Erreur historiques :', e);
  }
}

function init() {
  $('deviceId').textContent = DEVICE;
  initLiveChart();

  // Historiques rafraîchis au changement de date
  $('dailyDate').addEventListener('change', refreshDaily);
  $('weekDate').addEventListener('change', refreshWeekly);

  // Premier chargement
  tickRealtime();
  refreshHistories();

  // Temps réel en boucle
  setInterval(tickRealtime, CONFIG.REFRESH_INTERVAL);
  // Historiques rafraîchis moins souvent
  setInterval(refreshHistories, 30000);
}

document.addEventListener('DOMContentLoaded', init);
