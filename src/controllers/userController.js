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
// @route   PUT /api/user/settings
// @desc    Mettre à jour les paramètres utilisateur
// userController.js

// ✅ Mise à jour du profil
exports.updateProfile = async (req, res) => {
  try {
    const { nom, telephone } = req.body;
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { nom, telephone },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Profil mis à jour',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ✅ Mise à jour des paramètres
exports.updateSettings = async (req, res) => {
  try {
    const { seuilHumiditeSol, arrosageAutomatique, notificationsEnabled } = req.body;
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        seuilHumiditeSol,
        arrosageAutomatique,
        notificationsEnabled
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // 🔥 Envoyer les paramètres à l'ESP32 via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('esp32').emit('settingsUpdate', {
        seuilHumiditeSol,
        arrosageAutomatique
      });
      console.log('⚙️ Paramètres envoyés à l\'ESP32');
    }

    res.json({
      message: 'Paramètres mis à jour',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};