const IrrigationHistory = require('../models/IrrigationHistory');

// @route   GET /api/irrigation/history
// @desc    Obtenir l'historique d'irrigation
exports.getHistory = async (req, res) => {
    try {
        const history = await IrrigationHistory.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(50); // Limiter aux 50 derniers événements

        res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        console.error('Erreur getHistory:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique'
        });
    }
};
