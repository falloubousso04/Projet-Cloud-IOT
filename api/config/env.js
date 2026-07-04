/**
 * Chargement et centralisation de la configuration.
 * Toutes les variables sensibles proviennent du fichier .env (§11 du brief).
 */
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI,
  apiKey: process.env.API_KEY,
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Paramètres métier (valeurs par défaut)
  deviceId: process.env.DEVICE_ID || 'LABO-INFO-01',
  defaultThreshold: parseFloat(process.env.DEFAULT_THRESHOLD) || 30,
  hysteresis: parseFloat(process.env.HYSTERESIS) || 2,

  // Plages horaires de la journée (heures locales, bornes en heures)
  periods: {
    matin: { start: 6, end: 12 },
    soir: { start: 12, end: 20 },
    nuit: { start: 20, end: 6 }, // à cheval sur minuit
  },
};

/**
 * Vérifie que les variables critiques sont présentes au démarrage.
 * Évite de découvrir une mauvaise configuration seulement à la première requête.
 */
function validateConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.apiKey) missing.push('API_KEY');

  if (missing.length > 0) {
    console.error(
      `❌ Configuration incomplète. Variables manquantes : ${missing.join(', ')}`
    );
    console.error('   Copiez api/.env.example en api/.env et renseignez-les.');
    process.exit(1);
  }
}

module.exports = { config, validateConfig };
