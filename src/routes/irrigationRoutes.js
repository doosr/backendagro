const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getHistory } = require('../controllers/irrigationController');

router.get('/history', protect, getHistory);

module.exports = router;
