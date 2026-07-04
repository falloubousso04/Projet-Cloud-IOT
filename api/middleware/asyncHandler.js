/**
 * Enveloppe une fonction de route asynchrone pour capturer automatiquement
 * les erreurs (rejets de promesse) et les transmettre à errorHandler,
 * évitant de répéter des try/catch dans chaque contrôleur.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
