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

// @route   DELETE /api/irrigation/history/:id
// @desc    Supprimer une entrée d'historique
exports.deleteHistoryItem = async (req, res) => {
    try {
        const historyItem = await IrrigationHistory.findById(req.params.id);

        if (!historyItem) {
            return res.status(404).json({
                success: false,
                message: 'Entrée non trouvée'
            });
        }

        // Vérifier que l'entrée appartient à l'utilisateur
        if (historyItem.userId.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Non autorisé'
            });
        }

        await historyItem.deleteOne();

        res.json({
            success: true,
            message: 'Entrée supprimée avec succès',
            id: req.params.id
        });
    } catch (error) {
        console.error('Erreur deleteHistoryItem:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression'
        });
    }
};
