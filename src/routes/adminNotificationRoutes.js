const express = require('express');
const router = express.Router();
const adminNotificationController = require('../controllers/adminNotificationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', adminNotificationController.getNotifications);
router.patch('/:id/read', adminNotificationController.markAsRead);
router.delete('/:id', adminNotificationController.deleteNotification);

module.exports = router;
