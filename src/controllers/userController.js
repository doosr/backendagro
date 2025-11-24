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
/*
// @route   PUT /api/user/settings
// @desc    Mettre à jour les paramètres utilisateur
exports.updateSettings = async (req, res) => {
  try {
    const { seuilHumiditeSol, arrosageAutomatique, notificationsEnabled } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        seuilHumiditeSol,
        arrosageAutomatique,
        notificationsEnabled
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: user
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

    // Émettre commande via Socket.IO vers ESP32
    if (req.app.io) {
      req.app.io.to('esp32').emit('irrigationCommand', { action });
}
res.json({
  success: true,
  message: `Commande d'arrosage ${action} envoyée`
});
} catch (error) {
res.status(500).json({
success: false,
message: error.message
});
}
};*/
// @route POST /api/user/irrigation
// @desc Contrôler l'arrosage manuel
exports.controlIrrigation = async (req, res) => {
  try {
    const { action, capteurId } = req.body; // 'ON' ou 'OFF'
    
    if (!action || !['ON', 'OFF'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action invalide. Utilisez ON ou OFF' 
      });
    }

    if (!capteurId) {
      return res.status(400).json({ 
        success: false, 
        message: 'capteurId requis' 
      });
    }

    // Émettre commande via Socket.IO vers ESP32
    if (req.app.io) {
      req.app.io.emit('irrigationCommand', { 
        capteurId,
        action,
        userId: req.user._id,
        timestamp: new Date()
      });
      
      console.log(`📤 Commande irrigation ${action} envoyée au capteur ${capteurId}`);
    }

    res.json({ 
      success: true, 
      message: `Commande d'arrosage ${action} envoyée au capteur ${capteurId}` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route PUT /api/user/settings
// @desc Mettre à jour les paramètres utilisateur et envoyer au capteur
exports.updateSettings = async (req, res) => {
  try {
    const { seuilHumiditeSol, arrosageAutomatique, notificationsEnabled, capteurId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { seuilHumiditeSol, arrosageAutomatique, notificationsEnabled },
      { new: true, runValidators: true }
    ).select('-password');

    // Envoyer les nouveaux paramètres au capteur via Socket.IO
    if (req.app.io && capteurId) {
      req.app.io.emit('settingsUpdate', {
        capteurId,
        seuilHumiditeSol,
        arrosageAutomatique,
        userId: req.user._id,
        timestamp: new Date()
      });
      
      console.log(` Paramètres mis à jour envoyés au capteur ${capteurId}`);
    }

    res.json({ 
      success: true, 
      data: user,
      message: 'Paramètres mis à jour et envoyés au capteur'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
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
