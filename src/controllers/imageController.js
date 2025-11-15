const PlantImage = require('../models/PlantImage');
const Alert = require('../models/Alert');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

//    POST /api/image/upload-manual
//     Upload image manuelle pour analyse immédiate
exports.uploadManualImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }
    const plantImage = await PlantImage.create({
      userId: req.user._id,
      capteurId: null,
      filename: req.file.filename,
      path: req.file.path,
      type: 'manual'
    });

    // Analyser l'image immédiatement
    analyzeImageWithAI(plantImage, req.app.io).catch(err => {
      console.error('Erreur analyse:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Image en cours d\'analyse',
      data: plantImage
    });
  } catch (error) {
    console.error('Erreur upload manuel:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    POST /api/image/upload-auto
//     Upload image automatique depuis ESP32-CAM
exports.uploadAutoImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const { capteurId } = req.body;
    
    let userId;
    if (capteurId) {
      const Capteur = require('../models/Capteur');
      const capteur = await Capteur.findById(capteurId);
      userId = capteur?.userId;
    } else {
      const User = require('../models/User');
      const user = await User.findOne({ role: 'agriculteur' });
      userId = user?._id;
    }

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const plantImage = await PlantImage.create({
      userId: userId,
      capteurId: capteurId || null,
      filename: req.file.filename,
      path: req.file.path,
      type: 'automatic'
    });

    // Analyser en arrière-plan
    analyzeImageWithAI(plantImage, req.app.io).catch(err => {
      console.error('Erreur analyse automatique:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Image reçue, analyse en cours',
      data: plantImage
    });
  } catch (error) {
    console.error('Erreur upload auto:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Fonction d'analyse avec le module IA
async function analyzeImageWithAI(plantImage, io) {
  try {
    console.log('🔍 Analyse de l\'image:', plantImage.filename);

    const formData = new FormData();
    const imageStream = fs.createReadStream(plantImage.path);
    formData.append('image', imageStream);

    const response = await axios.post(
      `${process.env.AI_MODULE_URL}/predict`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000
      }
    );

    const { maladie, confiance, recommandations } = response.data;

    plantImage.analysed = true;
    plantImage.resultatAnalyse = {
      maladie,
      confiance,
      recommandations,
      dateAnalyse: new Date()
    };
    await plantImage.save();

    console.log('✅ Analyse terminée:', maladie, `(${(confiance * 100).toFixed(1)}%)`);

    if (maladie !== 'Sain' && confiance > 0.7) {
      const alert = await Alert.create({
        userId: plantImage.userId,
        capteurId: plantImage.capteurId,
        type: 'maladie',
        severite: confiance > 0.9 ? 'critical' : 'warning',
        titre: `Maladie détectée : ${maladie}`,
        message: `Une maladie (${maladie}) a été détectée avec ${(confiance * 100).toFixed(1)}% de confiance.`,
        imageId: plantImage._id
      });

      if (io) {
        io.to(plantImage.userId.toString()).emit('newAlert', alert);
        io.to(plantImage.userId.toString()).emit('analysisComplete', {
          imageId: plantImage._id,
          result: plantImage.resultatAnalyse
        });
      }
    } else {
      if (io) {
        io.to(plantImage.userId.toString()).emit('analysisComplete', {
          imageId: plantImage._id,
          result: plantImage.resultatAnalyse
        });
      }
    }

    return plantImage;
  } catch (error) {
    console.error('❌ Erreur analyse IA:', error.message);
    
    plantImage.analysed = false;
    plantImage.analyseError = error.message;
    await plantImage.save();
    
    throw error;
  }
}

//    GET /api/image/list
//     Liste des images avec filtres
exports.getImages = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    let query = { userId: req.user._id };
    
    if (type && ['manual', 'automatic'].includes(type)) {
      query.type = type;
    }

    const images = await PlantImage.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('capteurId', 'nom localisation');

    const count = await PlantImage.countDocuments(query);

    res.json({
      success: true,
      data: images,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    GET /api/image/:id
//     Détails d'une image
exports.getImageById = async (req, res) => {
  try {
    const image = await PlantImage.findById(req.params.id)
      .populate('capteurId', 'nom localisation');

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    DELETE /api/image/:id
//     Supprimer une image
exports.deleteImage = async (req, res) => {
  try {
    const image = await PlantImage.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    if (image.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }

    await image.deleteOne();

    res.json({
      success: true,
      message: 'Image supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

