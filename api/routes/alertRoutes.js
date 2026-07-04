/**
 * Routes des alertes (lecture publique pour le tableau de bord).
 */
const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const {
  getAlerts,
  getActiveAlerts,
  getResolvedAlerts,
} = require('../controllers/alertController');

router.get('/', asyncHandler(getAlerts));
router.get('/active', asyncHandler(getActiveAlerts));
router.get('/resolved', asyncHandler(getResolvedAlerts));

module.exports = router;
