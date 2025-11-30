const User = require('../models/User');
const SensorData = require('../models/SensorData');
const IrrigationHistory = require('../models/IrrigationHistory');

// @route   GET /api/user
// @desc    Liste des utilisateurs (Admin uniquement)
exports.getUsers = async (req, res) => {
  try {
    // Filtrer les administrateurs de la liste
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');

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

// @route   POST /api/user/create
// @desc    Créer un utilisateur (Admin uniquement)
exports.createUser = async (req, res) => {
  try {
    const { nom, email, password, role, telephone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    const user = await User.create({
      nom,
      email,
      password,
      role: role || 'agriculteur',
      telephone,
      emailVerified: true // Admin crée des utilisateurs déjà vérifiés
    });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur create user:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @route   PATCH /api/user/:id/verify-email
// @desc    Toggle email verification (Admin uniquement)
exports.toggleEmailVerification = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    user.emailVerified = !user.emailVerified;
    await user.save();

    res.json({
      success: true,
      message: `Email ${user.emailVerified ? 'vérifié' : 'non vérifié'}`,
      data: {
        id: user._id,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Erreur toggle verification:', error);
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
        message: "Action invalide. Utilisez 'ON' ou 'OFF'"
      });
    }

    console.log(`💧 Commande d'irrigation: ${action} pour utilisateur ${req.user._id}`);

    // Enregistrer l'historique
    await IrrigationHistory.create({
      userId: req.user._id,
      action,
      source: 'MANUAL',
      timestamp: new Date()
    });

    // Envoyer la commande à l'ESP32
    const io = req.app.get('io');
    if (io) {
      const commandData = {
        action,
        userId: req.user._id.toString(),
        timestamp: new Date()
      };

      // Émettre la commande à la room ESP32 (format Socket.IO standard)
      io.to('esp32').emit('irrigationCommand', commandData);

      // Pour ESP32 avec client WebSocket brut, envoyer aussi en format texte JSON simple
      const esp32Sockets = await io.in('esp32').fetchSockets();
      esp32Sockets.forEach(socket => {
        // Envoyer un message texte simple que l'ESP32 peut parser
        socket.send(JSON.stringify(commandData));
      });

      console.log(`📤 Commande envoyée à l'ESP32: ${action}`);

      // 🔄 Mise à jour optimiste de l'interface utilisateur
      const latestData = await SensorData.findOne({ userId: req.user._id })
        .sort({ timestamp: -1 });

      if (latestData) {
        // Créer un objet simulé avec le nouvel état de la pompe
        const updatedData = latestData.toObject();
        updatedData.etatPompe = action === 'ON' ? 1 : 0;
        updatedData.timestamp = new Date();
        updatedData.manualMode = true; // Indiquer que c'est un mode manuel

        // Émettre vers le frontend pour mise à jour immédiate
        io.to(req.user._id.toString()).emit('newSensorData', updatedData);
        console.log(`📡 Mise à jour optimiste envoyée au frontend`);
      }
    } else {
      console.warn('⚠️ Socket.IO non disponible');
      return res.status(503).json({
        success: false,
        message: 'Service de communication temps réel non disponible'
      });
    }

    res.json({
      success: true,
      message: `Commande d'arrosage ${action} envoyée avec succès`,
      action,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Erreur controlIrrigation:', error);
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

// @route   PUT /api/user/settings
// @desc    Mettre à jour les paramètres utilisateur

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
      console.log("⚙️ Paramètres envoyés à l'ESP32");
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

// ✅ Récupérer les paramètres utilisateur (pour ESP32)
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('seuilHumiditeSol arrosageAutomatique notificationsEnabled');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        seuilHumiditeSol: user.seuilHumiditeSol || 500,
        arrosageAutomatique: user.arrosageAutomatique !== undefined ? user.arrosageAutomatique : true,
        notificationsEnabled: user.notificationsEnabled !== undefined ? user.notificationsEnabled : true
      }
    });
  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};