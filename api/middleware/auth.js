/**
 * Middleware d'authentification par clé API (§11 : protection minimale de l'API).
 *
 * L'ESP32 (et tout client autorisé à écrire) doit fournir la clé secrète
 * dans l'en-tête « x-api-key ». Sans clé valide → 401 Unauthorized.
 *
 * On protège uniquement les routes d'écriture (POST) ; les routes de lecture
 * restent publiques pour que le tableau de bord fonctionne sans secret exposé
 * dans le navigateur.
 */
const { config } = require('../config/env');

function requireApiKey(req, res, next) {
  const providedKey = req.header('x-api-key');

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      error: 'Clé API manquante. Fournissez l\'en-tête « x-api-key ».',
    });
  }

  if (providedKey !== config.apiKey) {
    return res.status(403).json({
      success: false,
      error: 'Clé API invalide.',
    });
  }

  next();
}

module.exports = requireApiKey;
