const Alert = require('../models/Alert');

//    GET /api/alert
//     Obtenir les alertes
exports.getAlerts = async (req, res) => {
  try {
    const { lu, limit = 50 } = req.query;

    let query = { userId: req.user._id };
    if (lu !== undefined) {
      query.lu = lu === 'true';
    }

    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('capteurId', 'nom localisation')
      .populate('imageId', 'filename');

    const unreadCount = await Alert.countDocuments({
      userId: req.user._id,
      lu: false
    });

    res.json({
      success: true,
      count: alerts.length,
      unreadCount,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    PUT /api/alert/:id/read
//     Marquer alerte comme lue
exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { lu: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @route   DELETE /api/alert/:id
// @desc    Supprimer une alerte
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Alerte supprimée'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};