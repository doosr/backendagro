const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
    getNotifications,
    markAsRead,
    deleteNotification,
    createNotification
} = require('../controllers/adminNotificationController');

// Toutes les routes nécessitent une authentification admin
router.use(protect);
router.use(authorize('admin'));

// Routes
router.get('/', getNotifications);
router.post('/', createNotification);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
