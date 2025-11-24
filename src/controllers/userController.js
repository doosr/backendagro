const User = require('../models/User');

// @route   GET /api/user
// @desc    Liste des utilisateurs (Admin uniquement)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @route   GET /api/user
// @desc    Liste des utilisateurs (Admin uniquement)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// @route   POST /api/user/irrigation
// @desc    Contrôler l'arrosage manuel
exports.controlIrrigation = async (req, res) => {
  try {
    const { action } = req.body; // 'ON' ou 'OFF'

    if (!["ON", "OFF"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action invalide"
      });
    }

    if (req.app.io) {
      req.app.io.to('esp32').emit('irrigationCommand', { action });
    }

    res.json({
      success: true,
      message: `Commande d'arrosage ${action} envoyée`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @route   POST /api/user/irrigation
// @desc    Contrôler l'arrosage manuel
exports.controlIrrigation = async (req, res) => {
  try {
    const { action } = req.body; // 'ON' ou 'OFF'

    if (!["ON", "OFF"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action invalide"
      });
    }

    if (req.app.io) {
      req.app.io.to('esp32').emit('irrigationCommand', { action });
    }

    res.json({
      success: true,
      message: `Commande d'arrosage ${action} envoyée`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
//    DELETE /api/user/:id
//     Supprimer un utilisateur (Admin uniquement)
exports.deleteUser = async (req, res) => {
try {
const user = await User.findByIdAndDelete(req.params.id);
if (!user) {
  return res.status(404).json({
    success: false,
    message: 'Utilisateur non trouvé'
  });
}

res.json({
  success: true,
  message: 'Utilisateur supprimé avec succès'
});
} catch (error) {
res.status(500).json({
success: false,
message: error.message
});
}
};
