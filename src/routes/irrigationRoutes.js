const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getHistory, deleteHistoryItem } = require('../controllers/irrigationController');

router.get('/history', protect, getHistory);
router.delete('/history/:id', protect, deleteHistoryItem);

module.exports = router;
