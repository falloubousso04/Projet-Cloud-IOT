/**
 * Utilitaires de dates et de plages horaires.
 * Centralise la logique des périodes matin/soir/nuit (§8) pour éviter
 * de la dupliquer dans les contrôleurs.
 */
const { config } = require('../config/env');

/** Début du jour (00:00:00.000) pour une date donnée. */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Fin du jour (23:59:59.999) pour une date donnée. */
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Retourne le nom de la période (matin/soir/nuit) pour une date donnée,
 * en fonction des plages définies dans la configuration.
 */
function getPeriodName(date) {
  const h = new Date(date).getHours();
  const { matin, soir, nuit } = config.periods;
  if (h >= matin.start && h < matin.end) return 'matin';
  if (h >= soir.start && h < soir.end) return 'soir';
  return 'nuit'; // 20h → 6h (à cheval sur minuit)
}

/**
 * Construit un filtre Mongo { $gte, $lt } sur les heures de la journée
 * pour une période donnée et un jour donné.
 * La période « nuit » est à cheval sur minuit → on renvoie deux intervalles.
 *
 * @returns {Array<{start: Date, end: Date}>}
 */
function getPeriodRanges(day, periodName) {
  const base = startOfDay(day);
  const { matin, soir, nuit } = config.periods;

  const make = (startH, endH) => {
    const start = new Date(base);
    start.setHours(startH, 0, 0, 0);
    const end = new Date(base);
    end.setHours(endH, 0, 0, 0);
    return { start, end };
  };

  if (periodName === 'matin') return [make(matin.start, matin.end)];
  if (periodName === 'soir') return [make(soir.start, soir.end)];

  // Nuit : de 20h à minuit + de minuit à 6h
  const eveningPart = make(nuit.start, 24);
  const morningPart = {
    start: base,
    end: new Date(base.getTime() + nuit.end * 3600 * 1000),
  };
  return [eveningPart, morningPart];
}

/** Lundi 00:00 de la semaine contenant `date` (semaine ISO, débute le lundi). */
function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = dimanche, 1 = lundi ...
  const diff = day === 0 ? 6 : day - 1; // ramener au lundi
  d.setDate(d.getDate() - diff);
  return d;
}

/** Premier jour du mois à 00:00. */
function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/** Premier jour du mois suivant à 00:00. */
function startOfNextMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

module.exports = {
  startOfDay,
  endOfDay,
  getPeriodName,
  getPeriodRanges,
  startOfWeek,
  startOfMonth,
  startOfNextMonth,
};
