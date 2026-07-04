/**
 * Contrôleur des historiques (§8 du brief).
 *  - journalier par période : matin / soir / nuit ;
 *  - hebdomadaire : par jour ;
 *  - mensuel : par jour du mois.
 *
 * Chaque historique renvoie, pour chaque tranche : les mesures, la moyenne
 * et le nombre d'alertes.
 */
const Measurement = require('../models/Measurement');
const AlertEvent = require('../models/AlertEvent');
const { config } = require('../config/env');
const {
  startOfDay,
  endOfDay,
  getPeriodRanges,
  startOfWeek,
  startOfMonth,
  startOfNextMonth,
} = require('../utils/dateUtils');

/** Calcule moyenne, min, max et compte à partir d'un tableau de mesures. */
function summarize(measurements) {
  if (measurements.length === 0) {
    return { count: 0, average: null, min: null, max: null };
  }
  const temps = measurements.map((m) => m.temperature);
  const sum = temps.reduce((a, b) => a + b, 0);
  return {
    count: measurements.length,
    average: Math.round((sum / temps.length) * 10) / 10,
    min: Math.min(...temps),
    max: Math.max(...temps),
  };
}

/** Compte les alertes (évènements) démarrées dans un intervalle. */
async function countAlerts(deviceId, start, end) {
  return AlertEvent.countDocuments({
    deviceId,
    startTime: { $gte: start, $lt: end },
  });
}

/**
 * GET /api/history/daily — historique journalier par période (matin/soir/nuit).
 * Query : ?deviceId= &date=YYYY-MM-DD (défaut : aujourd'hui)
 */
async function getDailyHistory(req, res) {
  const deviceId = req.query.deviceId || config.deviceId;
  const day = req.query.date ? new Date(req.query.date) : new Date();

  const periodNames = ['matin', 'soir', 'nuit'];
  const result = {};

  for (const name of periodNames) {
    const ranges = getPeriodRanges(day, name);

    // Récupérer les mesures de la période (une ou deux tranches pour la nuit)
    const orConditions = ranges.map((r) => ({
      timestamp: { $gte: r.start, $lt: r.end },
    }));
    const measurements = await Measurement.find({
      deviceId,
      $or: orConditions,
    })
      .sort({ timestamp: 1 })
      .lean();

    // Compter les alertes de la période
    let alertCount = 0;
    for (const r of ranges) {
      alertCount += await countAlerts(deviceId, r.start, r.end);
    }

    result[name] = {
      range: config.periods[name],
      ...summarize(measurements),
      alertCount,
      measurements,
    };
  }

  res.json({
    success: true,
    deviceId,
    date: startOfDay(day),
    periods: result,
  });
}

/**
 * GET /api/history/weekly — historique hebdomadaire (par jour).
 * Query : ?deviceId= &week=YYYY-MM-DD (n'importe quel jour de la semaine voulue)
 */
async function getWeeklyHistory(req, res) {
  const deviceId = req.query.deviceId || config.deviceId;
  const ref = req.query.week ? new Date(req.query.week) : new Date();
  const monday = startOfWeek(ref);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + i);
    const dayEnd = endOfDay(dayStart);

    const measurements = await Measurement.find({
      deviceId,
      timestamp: { $gte: dayStart, $lte: dayEnd },
    })
      .sort({ timestamp: 1 })
      .lean();

    const alertCount = await countAlerts(deviceId, dayStart, new Date(dayEnd.getTime() + 1));

    days.push({
      date: dayStart,
      dayLabel: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
      ...summarize(measurements),
      alertCount,
    });
  }

  res.json({
    success: true,
    deviceId,
    weekStart: monday,
    days,
  });
}

/**
 * GET /api/history/monthly — historique mensuel (moyenne + alertes par jour).
 * Query : ?deviceId= &month=YYYY-MM-DD (n'importe quel jour du mois voulu)
 */
async function getMonthlyHistory(req, res) {
  const deviceId = req.query.deviceId || config.deviceId;
  const ref = req.query.month ? new Date(req.query.month) : new Date();
  const monthStart = startOfMonth(ref);
  const monthEnd = startOfNextMonth(ref);
  const nbDays = Math.round((monthEnd - monthStart) / (24 * 3600 * 1000));

  const days = [];
  for (let i = 0; i < nbDays; i++) {
    const dayStart = new Date(monthStart);
    dayStart.setDate(monthStart.getDate() + i);
    const dayEnd = endOfDay(dayStart);

    const measurements = await Measurement.find({
      deviceId,
      timestamp: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    const alertCount = await countAlerts(deviceId, dayStart, new Date(dayEnd.getTime() + 1));

    days.push({
      date: dayStart,
      day: i + 1,
      ...summarize(measurements),
      alertCount,
    });
  }

  res.json({
    success: true,
    deviceId,
    monthStart,
    days,
  });
}

module.exports = { getDailyHistory, getWeeklyHistory, getMonthlyHistory };
