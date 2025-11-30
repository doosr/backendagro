const AdminNotification = require('../models/AdminNotification');

// GET /api/admin-notifications
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await AdminNotification.find()
            .populate('userId', 'nom email')
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await AdminNotification.countDocuments({ read: false });

        res.json({
            success: true,
            count: notifications.length,
            unreadCount,
            data: notifications
        });
    } catch (error) {
        console.error('Erreur get notifications:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// PATCH /api/admin-notifications/:id/read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await AdminNotification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée'
            });
        }

        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Erreur mark as read:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE /api/admin-notifications/:id
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await AdminNotification.findByIdAndDelete(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Notification supprimée'
        });
    } catch (error) {
        console.error('Erreur delete notification:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    deleteNotification
};
