const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['alert', 'info', 'warning', 'success'],
        default: 'info'
    },
    read: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index pour recherche efficace
adminNotificationSchema.index({ read: 1, createdAt: -1 });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
