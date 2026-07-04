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
function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '—';
  const seconds = Math.round((new Date(endTime) - new Date(startTime)) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}

// ─── Gestion du bandeau d'état ────────────────────────────────────
function setStatus(kind, label, detail) {
  const hero = $('statusHero');
  hero.className = 'status-hero ' + kind;
  // Propage l'état au niveau de la page (liseré haut + accent barre de titre)
  document.body.setAttribute('data-state', kind);
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
      $('heroTemp').textContent = '--';
      $('humidity').textContent = '--';
      return;
    }

    const m = res.data;
    $('heroTemp').textContent = m.temperature;
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
      const peak = res.meta.activeAlert ? ` (pic ${res.meta.activeAlert.maxValue}°C)` : '';
      setStatus('alert', 'ALERTE — Surchauffe', `Température ${m.temperature}°C, seuil ${m.threshold}°C dépassé${peak}.`);
    } else {
      setStatus('normal', 'Normal', `Température ${m.temperature}°C, sous le seuil de ${m.threshold}°C.`);
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
    matin: { label: 'Matin', range: '06h00 – 12h00' },
    soir: { label: 'Soir', range: '12h00 – 20h00' },
    nuit: { label: 'Nuit', range: '20h00 – 06h00' },
  };

  const container = $('periods');
  container.innerHTML = '';
  for (const key of ['matin', 'soir', 'nuit']) {
    const p = res.periods[key];
    const info = meta[key];
    const avg = p.average != null ? `${p.average}°C` : '—';
    const alertClass = p.alertCount > 0 ? 'alert' : 'ok';
    container.innerHTML += `
      <div class="period-card">
        <div class="period-name">${info.label}</div>
        <div class="period-range">${info.range}</div>
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

// ─── Compteurs d'alertes (aujourd'hui / semaine / total) ──────────
function isSameDay(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}
function weekStartMonday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = dimanche
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}
function setCounter(id, value) {
  const el = $(id);
  el.textContent = value;
  el.classList.toggle('has-alerts', value > 0);
}

// ─── Tableau des alertes + compteurs ──────────────────────────────
async function refreshAlerts() {
  const res = await apiGet(`/api/alerts?deviceId=${DEVICE}&limit=1000`);
  const alerts = res.data || [];

  // Compteurs
  const monday = weekStartMonday();
  const total = alerts.length;
  const today = alerts.filter((a) => isSameDay(a.startTime)).length;
  const week = alerts.filter((a) => new Date(a.startTime) >= monday).length;
  setCounter('alertsToday', today);
  setCounter('alertsWeek', week);
  setCounter('alertsTotal', total);

  // Tableau : les 15 plus récentes
  const body = $('alertsBody');
  if (alerts.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty">Aucune alerte enregistrée.</td></tr>';
    return;
  }
  body.innerHTML = alerts
    .slice(0, 15)
    .map((a) => {
      const tag = a.status === 'ONGOING'
        ? '<span class="tag ongoing">En cours</span>'
        : '<span class="tag resolved">Résolue</span>';
      return `<tr>
        <td>${formatDateTime(a.startTime)}</td>
        <td>${a.endTime ? formatDateTime(a.endTime) : '—'}</td>
        <td>${a.maxValue}</td>
        <td>${a.thresholdAtEvent}</td>
        <td>${formatDuration(a.startTime, a.endTime)}</td>
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

// ─── Navigation : surbrillance de la section visible ──────────────
function setupNav() {
  const items = document.querySelectorAll('.bottom-nav .nav-item');
  const sections = ['statusHero', 'temps-reel', 'historiques', 'alertes']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          items.forEach((it) =>
            it.classList.toggle('active', it.dataset.target === entry.target.id)
          );
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  sections.forEach((s) => observer.observe(s));
}

function init() {
  $('deviceId').textContent = DEVICE;
  initLiveChart();
  setupNav();

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
