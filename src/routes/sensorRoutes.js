const express = require('express');
const router = express.Router();
const {
  receiveSensorData,
  getSensorData,
  getLatestData,
  getStats
} = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');
// Route publique pour ESP32 (sans auth pour simplifier)
router.post('/data', receiveSensorData);
// Routes protégées
router.get('/data', protect, getSensorData);
router.get('/latest', protect, getLatestData);
router.get('/stats', protect, getStats);
module.exports = router;