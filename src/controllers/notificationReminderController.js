const NotificationReminder = require('../models/NotificationReminder');
const Alert = require('../models/Alert');

// @route   POST /api/reminders
// @desc    Créer un nouveau rappel
exports.createReminder = async (req, res) => {
    try {
        const { alertId, snoozeDuration } = req.body; // snoozeDuration en minutes
        const userId = req.user._id;

        // Vérifier que l'alerte existe et appartient à l'utilisateur
        const alert = await Alert.findOne({ _id: alertId, userId });
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alerte non trouvée'
            });
        }

        // Calculer l'heure du rappel
        const reminderTime = new Date(Date.now() + snoozeDuration * 60 * 1000);

        const reminder = await NotificationReminder.create({
            userId,
            alertId,
            reminderTime,
            snoozeDuration,
            message: alert.message,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: `Rappel créé pour ${snoozeDuration} minutes`,
            data: reminder
        });
    } catch (error) {
        console.error('Erreur createReminder:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @route   GET /api/reminders
// @desc    Récupérer les rappels de l'utilisateur
exports.getReminders = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status = 'pending' } = req.query;

        const reminders = await NotificationReminder.find({
            userId,
            status
        })
            .populate('alertId')
            .sort({ reminderTime: 1 });

        res.json({
            success: true,
            count: reminders.length,
            data: reminders
        });
    } catch (error) {
        console.error('Erreur getReminders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @route   DELETE /api/reminders/:id
// @desc    Annuler un rappel
exports.cancelReminder = async (req, res) => {
    try {
        const userId = req.user._id;
        const reminderId = req.params.id;

        const reminder = await NotificationReminder.findOneAndUpdate(
            { _id: reminderId, userId },
            { status: 'cancelled' },
            { new: true }
        );

        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'Rappel non trouvé'
            });
        }

        res.json({
            success: true,
            message: 'Rappel annulé',
            data: reminder
        });
    } catch (error) {
        console.error('Erreur cancelReminder:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @route   POST /api/reminders/snooze/:alertId
// @desc    Reporter une alerte (snooze)
exports.snoozeAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        const { duration } = req.body; // Durée en minutes (5, 15, 60, 1440)
        const userId = req.user._id;

        // Vérifier que l'alerte existe
        const alert = await Alert.findOne({ _id: alertId, userId });
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alerte non trouvée'
            });
        }

        // Créer le rappel
        const reminderTime = new Date(Date.now() + duration * 60 * 1000);

        const reminder = await NotificationReminder.create({
            userId,
            alertId,
            reminderTime,
            snoozeDuration: duration,
            message: alert.message,
            status: 'pending'
        });

        // Marquer l'alerte comme lue
        alert.lu = true;
        await alert.save();

        res.status(201).json({
            success: true,
            message: `Alerte reportée de ${duration} minutes`,
            data: reminder
        });
    } catch (error) {
        console.error('Erreur snoozeAlert:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @route   GET /api/reminders/pending
// @desc    Récupérer les rappels en attente à envoyer (pour le service)
exports.getPendingReminders = async (req, res) => {
    try {
        const now = new Date();

        const reminders = await NotificationReminder.find({
            status: 'pending',
            reminderTime: { $lte: now }
        })
            .populate('userId')
            .populate('alertId');

        res.json({
            success: true,
            count: reminders.length,
            data: reminders
        });
    } catch (error) {
        console.error('Erreur getPendingReminders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @route   PUT /api/reminders/:id/sent
// @desc    Marquer un rappel comme envoyé
exports.markReminderSent = async (req, res) => {
    try {
        const reminderId = req.params.id;

        const reminder = await NotificationReminder.findByIdAndUpdate(
            reminderId,
            { status: 'sent' },
            { new: true }
        );

        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'Rappel non trouvé'
            });
        }

        res.json({
            success: true,
            data: reminder
        });
    } catch (error) {
        console.error('Erreur markReminderSent:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
