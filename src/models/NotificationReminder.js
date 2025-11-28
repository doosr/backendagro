const mongoose = require('mongoose');

const notificationReminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    alertId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alert',
        required: true
    },
    reminderTime: {
        type: Date,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'cancelled'],
        default: 'pending'
    },
    message: {
        type: String,
        required: true
    },
    snoozeDuration: {
        type: Number, // Durée en minutes
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index composé pour les requêtes fréquentes
notificationReminderSchema.index({ userId: 1, status: 1, reminderTime: 1 });

module.exports = mongoose.model('NotificationReminder', notificationReminderSchema);
