/**
 * Point d'entrée de l'API de surveillance IoT.
 * Assemble Express, la connexion MongoDB, les routes et la gestion d'erreurs.
 */
const express = require('express');
const cors = require('cors');

const { config, validateConfig } = require('./config/env');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const measureRoutes = require('./routes/measureRoutes');
const alertRoutes = require('./routes/alertRoutes');
const historyRoutes = require('./routes/historyRoutes');

// Vérifier la configuration avant tout
validateConfig();

const app = express();

// ─── Middlewares globaux ────────────────────────────────────────────────
app.use(
  cors({
    origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(','),
  })
);
app.use(express.json());

// Journalisation simple des requêtes (utile pour la démo/débogage)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.originalUrl}`);
  next();
});

// ─── Route de santé / accueil ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'API IoT — Surveillance laboratoire informatique',
    status: 'ok',
    deviceId: config.deviceId,
    threshold: config.defaultThreshold,
    hysteresis: config.hysteresis,
    endpoints: {
      measures: '/api/measures',
      latest: '/api/measures/latest',
      alerts: '/api/alerts',
      resolvedAlerts: '/api/alerts/resolved',
      dailyHistory: '/api/history/daily',
      weeklyHistory: '/api/history/weekly',
      monthlyHistory: '/api/history/monthly',
    },
  });
});

// Route de « keep-alive » pour éviter la mise en veille de l'hébergement gratuit
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Routes de l'API ────────────────────────────────────────────────────
app.use('/api/measures', measureRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/history', historyRoutes);

// ─── Gestion des erreurs (toujours en dernier) ──────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Démarrage ──────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`   API démarrée sur le port ${config.port}`);
    console.log(`   Salle surveillée : ${config.deviceId}`);
    console.log(`   Seuil : ${config.defaultThreshold}°C (hystérésis ${config.hysteresis}°C)`);
  });
}

start();

module.exports = app;
