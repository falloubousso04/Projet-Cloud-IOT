/**
 * Contrôleur des alertes (§6 : consulter les alertes, consulter les retours
 * à l'état normal).
 */
const AlertEvent = require('../models/AlertEvent');
const { config } = require('../config/env');
const { startOfDay, endOfDay } = require('../utils/dateUtils');

/** Construit un filtre de dates commun à partir des query params. */
function buildDateFilter(query, field) {
  const { date, from, to } = query;
  if (date) return { [field]: { $gte: startOfDay(date), $lte: endOfDay(date) } };
  if (from || to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    return { [field]: range };
  }
  return {};
}

/**
 * GET /api/alerts — liste des évènements d'alerte (en cours et résolus).
 * Query : ?deviceId= &status=ONGOING|RESOLVED &date= &from= &to= &limit=
 */
async function getAlerts(req, res) {
  const { deviceId, status, limit } = req.query;
  const filter = { ...buildDateFilter(req.query, 'startTime') };
  if (deviceId) filter.deviceId = deviceId;
  if (status) filter.status = status;

  const max = Math.min(parseInt(limit, 10) || 200, 2000);
  const alerts = await AlertEvent.find(filter)
    .sort({ startTime: -1 })
    .limit(max)
    .lean({ virtuals: true });

  res.json({ success: true, count: alerts.length, data: alerts });
}

/**
 * GET /api/alerts/active — alerte(s) actuellement en cours.
 */
async function getActiveAlerts(req, res) {
  const deviceId = req.query.deviceId || config.deviceId;
  const alerts = await AlertEvent.find({ deviceId, status: 'ONGOING' })
    .sort({ startTime: -1 })
    .lean({ virtuals: true });

  res.json({ success: true, count: alerts.length, data: alerts });
}

/**
 * GET /api/alerts/resolved — retours à l'état normal (alertes terminées).
 * Répond à l'exigence « consulter les retours à l'état normal » (§6).
 */
async function getResolvedAlerts(req, res) {
  const { deviceId, limit } = req.query;
  const filter = { status: 'RESOLVED', ...buildDateFilter(req.query, 'endTime') };
  if (deviceId) filter.deviceId = deviceId;

  const max = Math.min(parseInt(limit, 10) || 200, 2000);
  const alerts = await AlertEvent.find(filter)
    .sort({ endTime: -1 })
    .limit(max)
    .lean({ virtuals: true });

  res.json({ success: true, count: alerts.length, data: alerts });
}

module.exports = { getAlerts, getActiveAlerts, getResolvedAlerts };
