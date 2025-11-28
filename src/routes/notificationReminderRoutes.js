const express = require('express');
const router = express.Router();
const {
    createReminder,
    getReminders,
    cancelReminder,
    snoozeAlert,
    getPendingReminders,
    markReminderSent
} = require('../controllers/notificationReminderController');
const { protect } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(protect);

// Routes CRUD
router.post('/', createReminder);
router.get('/', getReminders);
router.delete('/:id', cancelReminder);

// Routes spécifiques
router.post('/snooze/:alertId', snoozeAlert);
router.get('/pending', getPendingReminders);
router.put('/:id/sent', markReminderSent);

module.exports = router;
