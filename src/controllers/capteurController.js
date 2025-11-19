const Capteur = require('../models/Capteur');
const User = require('../models/User');

//    POST /api/capteur
//     Ajouter un capteur (Admin uniquement)
exports.addCapteur = async (req, res) => {
  try {
    const { nom, macAddress, localisation, userId, type } = req.body;

    // Validation
    if (!nom || !macAddress || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Nom, adresse MAC et utilisateur sont requis'
      });
    }

    // Vérifier si le capteur existe déjà (même MAC)
    const capteurExists = await Capteur.findOne({ macAddress });
    if (capteurExists) {
      return res.status(400).json({
        success: false,
        message: 'Un capteur avec cette adresse MAC existe déjà'
      });
    }

    // Vérifier que l'utilisateur existe et est un agriculteur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role !== 'agriculteur') {
      return res.status(400).json({
        success: false,
        message: 'Seuls les agriculteurs peuvent avoir des capteurs'
      });
    }

    // Créer le capteur
    const capteur = await Capteur.create({
      nom,
      macAddress,
      localisation: localisation || '',
      userId,
      type: type || 'ESP32-CAM',
      actif: true
    });

    // Peupler les infos utilisateur
    await capteur.populate('userId', 'nom email');

    console.log('✅ Capteur créé:', capteur.nom, 'pour', user.nom);

    res.status(201).json({
      success: true,
      message: 'Capteur ajouté avec succès',
      data: capteur
    });
  } catch (error) {
    console.error('❌ Erreur ajout capteur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @route   GET /api/capteur
// @desc    Liste des capteurs
exports.getCapteurs = async (req, res) => {
  try {
    let query = {};
    
    // Admin voit tous les capteurs, agriculteur voit seulement les siens
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const capteurs = await Capteur.find(query)
      .populate('userId', 'nom email telephone role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: capteurs.length,
      data: capteurs
    });
  } catch (error) {
    console.error('❌ Erreur liste capteurs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    GET /api/capteur/:id
//     Détails d'un capteur
exports.getCapteurById = async (req, res) => {
  try {
    const capteur = await Capteur.findById(req.params.id)
      .populate('userId', 'nom email telephone');

    if (!capteur) {
      return res.status(404).json({
        success: false,
        message: 'Capteur non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && capteur.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      data: capteur
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    PUT /api/capteur/:id
//     Modifier un capteur
exports.updateCapteur = async (req, res) => {
  try {
    const { nom, localisation, userId, type, actif } = req.body;

    const capteur = await Capteur.findById(req.params.id);

    if (!capteur) {
      return res.status(404).json({
        success: false,
        message: 'Capteur non trouvé'
      });
    }

    // Si changement d'utilisateur, vérifier qu'il est agriculteur
    if (userId && userId !== capteur.userId.toString()) {
      const user = await User.findById(userId);
      if (!user || user.role !== 'agriculteur') {
        return res.status(400).json({
          success: false,
          message: 'Utilisateur invalide ou n\'est pas un agriculteur'
        });
      }
    }

    // Mettre à jour
    if (nom) capteur.nom = nom;
    if (localisation !== undefined) capteur.localisation = localisation;
    if (userId) capteur.userId = userId;
    if (type) capteur.type = type;
    if (actif !== undefined) capteur.actif = actif;

    await capteur.save();
    await capteur.populate('userId', 'nom email');

    console.log('✅ Capteur modifié:', capteur.nom);

    res.json({
      success: true,
      message: 'Capteur modifié avec succès',
      data: capteur
    });
  } catch (error) {
    console.error('❌ Erreur modification capteur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    DELETE /api/capteur/:id
//     Supprimer un capteur
exports.deleteCapteur = async (req, res) => {
  try {
    const capteur = await Capteur.findById(req.params.id);

    if (!capteur) {
      return res.status(404).json({
        success: false,
        message: 'Capteur non trouvé'
      });
    }

    await capteur.deleteOne();

    console.log('✅ Capteur supprimé:', capteur.nom);

    res.json({
      success: true,
      message: 'Capteur supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression capteur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    POST /api/capteur/auto-register
//     Auto-enregistrement d'un capteur ESP32
// ✅ CORRIGÉ: Retourne capteurId et userId en string
exports.autoRegisterCapteur = async (req, res) => {
  try {
    const { macAddress, type, nom, localisation } = req.body;

    if (!macAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse MAC requise'
      });
    }

    // Vérifier si le capteur existe déjà
    let capteur = await Capteur.findOne({ macAddress });
    
    if (capteur) {
      // ✅ CORRECTION: Capteur existe - retourner les IDs en string
      await capteur.populate('userId', 'nom email');
      
      console.log('✅ Capteur existant trouvé:', capteur.nom);
      
      return res.json({
        success: true,
        message: 'Capteur déjà enregistré',
        capteurId: capteur._id.toString(),  // ← Conversion en string
        userId: capteur.userId._id.toString(),  // ← Conversion en string
        data: capteur,
        registered: true
      });
    }

    // Trouver le premier agriculteur OU admin par défaut
    let defaultUser = await User.findOne({ role: 'agriculteur' });
    
    // Si aucun agriculteur, chercher un admin
    if (!defaultUser) {
      defaultUser = await User.findOne({ role: 'admin' });
    }
    
    if (!defaultUser) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé pour l\'enregistrement automatique'
      });
    }

    // Créer un nouveau capteur
    capteur = await Capteur.create({
      nom: nom || `Capteur-${macAddress.slice(-5).replace(/:/g, '')}`,
      macAddress,
      localisation: localisation || 'Non définie',
      userId: defaultUser._id,
      type: type || 'ESP32-CAM',
      actif: true
    });

    await capteur.populate('userId', 'nom email');

    console.log('✅ Auto-enregistrement capteur:', capteur.nom, 'pour', defaultUser.nom);

    // ✅ CORRECTION: Retourner capteurId et userId en string
    res.status(201).json({
      success: true,
      message: 'Capteur auto-enregistré avec succès',
      capteurId: capteur._id.toString(),  // ← Conversion en string
      userId: capteur.userId._id.toString(),  // ← Conversion en string
      data: capteur,
      registered: false
    });
  } catch (error) {
    console.error('❌ Erreur auto-enregistrement:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};