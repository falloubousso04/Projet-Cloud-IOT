/**
 * Routes des historiques (lecture publique pour le tableau de bord).
 */
const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const {
  getDailyHistory,
  getWeeklyHistory,
  getMonthlyHistory,
} = require('../controllers/historyController');

router.get('/daily', asyncHandler(getDailyHistory));
router.get('/weekly', asyncHandler(getWeeklyHistory));
router.get('/monthly', asyncHandler(getMonthlyHistory));

module.exports = router;
