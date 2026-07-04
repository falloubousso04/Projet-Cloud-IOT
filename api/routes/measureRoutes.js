/**
 * Routes des mesures.
 * POST protégé par clé API (écriture) ; GET publics (lecture pour le dashboard).
 */
const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const requireApiKey = require('../middleware/auth');
const {
  createMeasurement,
  getMeasurements,
  getLatestMeasurement,
} = require('../controllers/measureController');

// Écriture : réservée aux clients disposant de la clé API (ESP32)
router.post('/', requireApiKey, asyncHandler(createMeasurement));

// Lecture : publique
router.get('/', asyncHandler(getMeasurements));
router.get('/latest', asyncHandler(getLatestMeasurement));

module.exports = router;
