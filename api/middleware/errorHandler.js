/**
 * Gestion centralisée des erreurs (§6 : retourner des réponses et codes d'erreur
 * adaptés ; §11 : gestion des erreurs).
 */

// Route inconnue → 404
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
}

// Gestionnaire d'erreurs global (dernier middleware de la chaîne Express)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('❌ Erreur non gérée :', err.message);

  // Erreur de validation Mongoose → 400 Bad Request
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Identifiant Mongo mal formé → 400
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Paramètre invalide : ${err.path}`,
    });
  }

  // Erreur générique → 500 Internal Server Error
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Erreur interne du serveur',
  });
}

module.exports = { notFound, errorHandler };
