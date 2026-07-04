/**
 * Service de gestion des alertes — machine à états avec hystérésis.
 *
 * C'est le cœur logique du système (§5.2). L'API est la source de vérité :
 * elle recalcule elle-même l'état à partir de l'état précédent, ce qui garantit
 * qu'on n'enregistre qu'UN SEUL évènement d'alerte par épisode
 * (« éviter plusieurs alertes identiques tant que l'état ne change pas »).
 *
 * Règles d'hystérésis :
 *   - état NORMAL → ALERT  si  temperature >= threshold
 *   - état ALERT  → NORMAL si  temperature <  (threshold - hysteresis)
 * La zone morte [threshold - hysteresis ; threshold[ évite le clignotement.
 */
const Measurement = require('../models/Measurement');
const AlertEvent = require('../models/AlertEvent');
const { config } = require('../config/env');

/**
 * Calcule le nouvel état à partir de l'état précédent et de la température.
 * @param {string} previousState  'NORMAL' | 'ALERT'
 * @param {number} temperature    température mesurée
 * @param {number} threshold      seuil de déclenchement
 * @param {number} hysteresis     largeur de la zone morte
 * @returns {'NORMAL'|'ALERT'}
 */
function computeState(previousState, temperature, threshold, hysteresis) {
  if (previousState === 'ALERT') {
    // On reste en alerte tant qu'on n'est pas franchement redescendu
    return temperature < threshold - hysteresis ? 'NORMAL' : 'ALERT';
  }
  // Depuis l'état normal, on déclenche dès que le seuil est atteint/dépassé
  return temperature >= threshold ? 'ALERT' : 'NORMAL';
}

/**
 * Traite une nouvelle mesure : détermine l'état, gère les transitions
 * (création / clôture d'évènements d'alerte) et renvoie l'état retenu.
 *
 * @param {object} params
 * @param {string} params.deviceId
 * @param {number} params.temperature
 * @param {number} params.threshold
 * @param {Date}   params.timestamp
 * @returns {Promise<{state: string, transition: string|null, alertEvent: object|null}>}
 */
async function processMeasurement({ deviceId, temperature, threshold, timestamp }) {
  const hysteresis = config.hysteresis;

  // 1. Récupérer l'état précédent (dernière mesure de cette salle)
  const lastMeasurement = await Measurement.findOne({ deviceId })
    .sort({ timestamp: -1 })
    .lean();
  const previousState = lastMeasurement ? lastMeasurement.state : 'NORMAL';

  // 2. Calculer le nouvel état avec hystérésis
  const state = computeState(previousState, temperature, threshold, hysteresis);

  // 3. Gérer les transitions d'état
  let transition = null;
  let alertEvent = null;

  if (previousState === 'NORMAL' && state === 'ALERT') {
    // Début d'un nouvel épisode d'alerte → on crée UN évènement
    transition = 'TO_ALERT';
    alertEvent = await AlertEvent.create({
      deviceId,
      startTime: timestamp,
      thresholdAtEvent: threshold,
      triggerValue: temperature,
      maxValue: temperature,
      status: 'ONGOING',
    });
  } else if (previousState === 'ALERT' && state === 'NORMAL') {
    // Retour à la normale → on clôture l'évènement en cours
    transition = 'TO_NORMAL';
    alertEvent = await AlertEvent.findOneAndUpdate(
      { deviceId, status: 'ONGOING' },
      { $set: { endTime: timestamp, status: 'RESOLVED' } },
      { new: true, sort: { startTime: -1 } }
    );
  } else if (state === 'ALERT') {
    // Toujours en alerte : on met simplement à jour le pic de température,
    // SANS créer de nouvel évènement (anti-répétition §5.2).
    alertEvent = await AlertEvent.findOneAndUpdate(
      { deviceId, status: 'ONGOING', maxValue: { $lt: temperature } },
      { $set: { maxValue: temperature } },
      { new: true, sort: { startTime: -1 } }
    );
  }

  return { state, previousState, transition, alertEvent };
}

module.exports = { computeState, processMeasurement };
