/**
 * Contrôleur des mesures (§6 du brief).
 * Reçoit/enregistre les mesures, les consulte, filtre par date et par période.
 */
const Measurement = require('../models/Measurement');
const AlertEvent = require('../models/AlertEvent');
const { processMeasurement } = require('../services/alertService');
const { config } = require('../config/env');
const {
  startOfDay,
  endOfDay,
  getPeriodRanges,
} = require('../utils/dateUtils');

/**
 * POST /api/measures — reçoit et enregistre une nouvelle mesure.
 * Corps attendu : { deviceId?, temperature, humidity?, threshold? }
 * L'API recalcule elle-même l'état (machine à états) et gère les évènements.
 */
async function createMeasurement(req, res) {
  const { deviceId, temperature, humidity, threshold } = req.body;

  // Validation des données (§6 : codes d'erreur adaptés)
  if (temperature === undefined || temperature === null || isNaN(Number(temperature))) {
    return res.status(400).json({
      success: false,
      error: 'Le champ « temperature » est requis et doit être un nombre.',
    });
  }

  const device = deviceId || config.deviceId;
  const usedThreshold =
    threshold !== undefined && !isNaN(Number(threshold))
      ? Number(threshold)
      : config.defaultThreshold;
  const timestamp = new Date();

  // Déterminer l'état et gérer les transitions d'alerte
  const { state, previousState, transition, alertEvent } = await processMeasurement({
    deviceId: device,
    temperature: Number(temperature),
    threshold: usedThreshold,
    timestamp,
  });

  // Enregistrer la mesure
  const measurement = await Measurement.create({
    deviceId: device,
    temperature: Number(temperature),
    humidity: humidity !== undefined && humidity !== null ? Number(humidity) : null,
    threshold: usedThreshold,
    state,
    timestamp,
  });

  res.status(201).json({
    success: true,
    data: measurement,
    meta: { previousState, transition, alertEvent },
  });
}

/**
 * GET /api/measures — consulte les mesures avec filtres optionnels.
 * Query : ?deviceId= &date=YYYY-MM-DD &from= &to= &period=matin|soir|nuit
 *         &state=NORMAL|ALERT &limit=N
 */
async function getMeasurements(req, res) {
  const { deviceId, date, from, to, period, state, limit } = req.query;
  const filter = {};

  if (deviceId) filter.deviceId = deviceId;
  if (state) filter.state = state;

  // Filtre par période de la journée (§6 : filtrer par période)
  if (period) {
    const day = date ? new Date(date) : new Date();
    const ranges = getPeriodRanges(day, period);
    filter.$or = ranges.map((r) => ({ timestamp: { $gte: r.start, $lt: r.end } }));
  } else if (date) {
    // Filtre sur une journée précise (§6 : filtrer par date)
    filter.timestamp = { $gte: startOfDay(date), $lte: endOfDay(date) };
  } else if (from || to) {
    // Filtre sur un intervalle libre
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const max = Math.min(parseInt(limit, 10) || 500, 5000);
  const measurements = await Measurement.find(filter)
    .sort({ timestamp: -1 })
    .limit(max)
    .lean();

  res.json({ success: true, count: measurements.length, data: measurements });
}

/**
 * GET /api/measures/latest — dernière mesure + état courant du système.
 * Sert de source pour le rafraîchissement temps réel du tableau de bord (§9).
 */
async function getLatestMeasurement(req, res) {
  const deviceId = req.query.deviceId || config.deviceId;

  const latest = await Measurement.findOne({ deviceId })
    .sort({ timestamp: -1 })
    .lean();

  if (!latest) {
    // Absence de données (§9 : distinguer l'absence de données)
    return res.status(404).json({
      success: false,
      error: 'Aucune mesure disponible pour cet équipement.',
      data: null,
    });
  }

  // Alerte en cours éventuelle
  const activeAlert = await AlertEvent.findOne({
    deviceId,
    status: 'ONGOING',
  })
    .sort({ startTime: -1 })
    .lean();

  res.json({
    success: true,
    data: latest,
    meta: {
      currentState: latest.state,
      activeAlert: activeAlert || null,
      serverTime: new Date(),
    },
  });
}

module.exports = {
  createMeasurement,
  getMeasurements,
  getLatestMeasurement,
};
