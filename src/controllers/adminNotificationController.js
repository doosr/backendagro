const AdminNotification = require('../models/AdminNotification');

// @route   GET /api/admin-notifications
// @desc    Récupérer toutes les notifications admin
// @access  Admin
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await AdminNotification.find()
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            count: notifications.length,
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

// @route   PATCH /api/admin-notifications/:id/read
// @desc    Marquer une notification comme lue
// @access  Admin
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

// @route   DELETE /api/admin-notifications/:id
// @desc    Supprimer une notification
// @access  Admin
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

// @route   POST /api/admin-notifications
// @desc    Créer une notification (utilisé par le système)
// @access  System
exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, userId, metadata } = req.body;

        const notification = await AdminNotification.create({
            title,
            message,
            type,
            userId,
            metadata
        });

        res.status(201).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Erreur create notification:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
