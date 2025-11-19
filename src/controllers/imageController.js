/*const PlantImage = require('../models/PlantImage');
const Alert = require('../models/Alert');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION DU SERVICE IA
// ═══════════════════════════════════════════════════════════
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || process.env.AI_MODULE_URL || 'http://localhost:5001';
const AI_SERVICE_ENABLED = process.env.AI_SERVICE_ENABLED !== 'false';
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 30000;

console.log('🤖 Configuration IA:');
console.log(`   - Activé: ${AI_SERVICE_ENABLED}`);
console.log(`   - URL: ${AI_SERVICE_URL}`);
console.log(`   - Timeout: ${AI_TIMEOUT}ms\n`);

// ═══════════════════════════════════════════════════════════
// FONCTION D'ANALYSE IA (INTERNE)
// ═══════════════════════════════════════════════════════════
async function analyzeImageWithAI(plantImage, io) {
  if (!AI_SERVICE_ENABLED) {
    console.log('ℹ️ Service IA désactivé');
    return null;
  }

  try {
    if (!fs.existsSync(plantImage.path)) {
      throw new Error('Fichier image introuvable');
    }

    console.log(`🔍 Analyse: ${plantImage.filename}`);

    const formData = new FormData();
    formData.append('image', fs.createReadStream(plantImage.path));

    const response = await axios.post(
      `${AI_SERVICE_URL}/predict`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: AI_TIMEOUT,
        validateStatus: (status) => status < 500
      }
    );

    if (response.status !== 200) {
      throw new Error(`Service IA: code ${response.status}`);
    }

    const { maladie, confiance, recommandations, prediction, confidence, diseaseDetected } = response.data;

    const disease = maladie || prediction || 'unknown';
    const conf = confiance || confidence || 0;
    const recommendations = recommandations || response.data.recommendations || [];
    const isHealthy = disease === 'Sain' || disease === 'healthy' || !diseaseDetected;

    plantImage.analysed = true;
    plantImage.resultatAnalyse = {
      maladie: disease,
      confiance: conf,
      recommandations: recommendations,
      dateAnalyse: new Date(),
      healthy: isHealthy
    };
    await plantImage.save();

    console.log(`✅ Analyse terminée: ${disease} (${(conf * 100).toFixed(1)}%)`);

    if (!isHealthy && conf > 0.7) {
      const alert = await Alert.create({
        userId: plantImage.userId,
        capteurId: plantImage.capteurId,
        type: 'maladie',
        severite: conf > 0.9 ? 'critical' : 'warning',
        titre: `🦠 Maladie: ${disease}`,
        message: `Maladie "${disease}" détectée (${(conf * 100).toFixed(1)}%)${
          recommendations.length > 0 
            ? '. Recommandations: ' + recommendations.join(', ')
            : '. Consultez un expert.'
        }`,
        imageId: plantImage._id
      });

      console.log('🚨 Alerte créée:', alert.titre);

      if (io) {
        io.to(plantImage.userId.toString()).emit('newAlert', alert);
        io.to(plantImage.userId.toString()).emit('diseaseDetected', {
          imageId: plantImage._id,
          disease: disease,
          confidence: conf,
          alert: alert
        });
      }
    }

    if (io) {
      io.to(plantImage.userId.toString()).emit('analysisComplete', {
        imageId: plantImage._id,
        result: plantImage.resultatAnalyse,
        healthy: isHealthy
      });
    }

    return plantImage;

  } catch (error) {
    console.error('❌ Erreur analyse IA:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Service IA inaccessible: ${AI_SERVICE_URL}`);
      console.error('💡 Solutions:');
      console.error('   1. Démarrer: cd ai-service && python app.py');
      console.error('   2. Désactiver: AI_SERVICE_ENABLED=false');
    }

    plantImage.analysed = false;
    plantImage.analyseError = error.message;
    await plantImage.save();

    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// EXPORTS - ROUTES CONTROLLERS
// ═══════════════════════════════════════════════════════════

/**
 * @route   POST /api/image/upload-manual
 * @desc    Upload image manuelle avec analyse
 * @access  Private
 */
/*exports.uploadManualImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const { description, capteurId } = req.body;

    const plantImage = await PlantImage.create({
      userId: req.user._id,
      capteurId: capteurId || null,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      description: description || '',
      url: `/uploads/images/${req.file.filename}`,
      type: 'manual',
      analysed: false
    });

    console.log('✅ Image manuelle:', plantImage.filename);

    if (AI_SERVICE_ENABLED) {
      analyzeImageWithAI(plantImage, req.app.io || global.io).catch(err => {
        console.error('⚠️ Erreur analyse:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: AI_SERVICE_ENABLED ? 'Image en cours d\'analyse' : 'Image uploadée',
      data: plantImage,
      aiEnabled: AI_SERVICE_ENABLED
    });
  } catch (error) {
    console.error('❌ Upload manuel:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @route   POST /api/image/upload-auto
 * @desc    Upload automatique ESP32-CAM
 * @access  Public
 */
exports.uploadAutoImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    console.log('📸 ESP32-CAM:', req.file.filename);

    const { capteurId } = req.body;
    let userId;

    if (capteurId) {
      const Capteur = require('../models/Capteur');
      const capteur = await Capteur.findById(capteurId);
      userId = capteur?.userId;
    }

    if (!userId) {
      const user = await User.findOne({ role: 'agriculteur' });
      userId = user?._id;
    }

    if (!userId) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé'
      });
    }

    const plantImage = await PlantImage.create({
      userId: userId,
      capteurId: capteurId || null,
      filename: req.file.filename,
      originalName: req.file.originalname || 'plant.jpg',
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      description: 'Image automatique ESP32-CAM',
      url: `/uploads/images/${req.file.filename}`,
      type: 'automatic',
      analysed: false
    });

    console.log('✅ Image ESP32 sauvegardée');

    if (AI_SERVICE_ENABLED) {
      analyzeImageWithAI(plantImage, req.app.io || global.io).catch(err => {
        console.error('⚠️ Erreur analyse:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Image reçue avec succès',
      data: plantImage,
      aiStatus: AI_SERVICE_ENABLED ? 'analysis_pending' : 'disabled'
    });
  } catch (error) {
    console.error('❌ Upload auto:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @route   GET /api/image/list
 * @desc    Liste des images avec filtres
 * @access  Private
 */
exports.getImages = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      analysed,
      capteurId 
    } = req.query;

    let query = { userId: req.user._id };
    
    if (type && ['manual', 'automatic'].includes(type)) {
      query.type = type;
    }

    if (analysed !== undefined) {
      query.analysed = analysed === 'true';
    }

    if (capteurId) {
      query.capteurId = capteurId;
    }

    const images = await PlantImage.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('capteurId', 'nom localisation');

    const count = await PlantImage.countDocuments(query);

    res.json({
      success: true,
      data: images,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });
  } catch (error) {
    console.error('❌ Liste images:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @route   GET /api/image/:id
 * @desc    Détails d'une image
 * @access  Private
 */
exports.getImageById = async (req, res) => {
  try {
    const image = await PlantImage.findById(req.params.id)
      .populate('capteurId', 'nom localisation')
      .populate('userId', 'nom email');

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    if (req.user.role !== 'admin' && image.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
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

/**
 * @route   DELETE /api/image/:id
 * @desc    Supprimer une image
 * @access  Private
 */
exports.deleteImage = async (req, res) => {
  try {
    const image = await PlantImage.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    if (req.user.role !== 'admin' && image.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }

    await image.deleteOne();

    console.log('✅ Image supprimée:', image.filename);

    res.json({
      success: true,
      message: 'Image supprimée'
    });
  } catch (error) {
    console.error('❌ Suppression:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @route   POST /api/image/:id/reanalyze
 * @desc    Ré-analyser une image
 * @access  Private
 */
exports.reanalyzeImage = async (req, res) => {
  try {
    const image = await PlantImage.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image non trouvée'
      });
    }

    if (req.user.role !== 'admin' && image.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (!AI_SERVICE_ENABLED) {
      return res.status(400).json({
        success: false,
        message: 'Service IA désactivé'
      });
    }

    image.analysed = false;
    image.resultatAnalyse = null;
    image.analyseError = null;
    await image.save();

    analyzeImageWithAI(image, req.app.io || global.io).catch(err => {
      console.error('⚠️ Erreur ré-analyse:', err.message);
    });

    res.json({
      success: true,
      message: 'Ré-analyse lancée',
      data: image
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @route   GET /api/image/ai-status
 * @desc    Vérifier statut service IA
 * @access  Public
 */
exports.checkAIServiceStatus = async (req, res) => {
  try {
    if (!AI_SERVICE_ENABLED) {
      return res.json({
        success: true,
        aiService: {
          enabled: false,
          status: 'disabled',
          message: 'Service IA désactivé'
        }
      });
    }

    try {
      const health = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });

      res.json({
        success: true,
        aiService: {
          enabled: true,
          status: 'online',
          url: AI_SERVICE_URL,
          response: health.data,
          message: 'Service IA opérationnel'
        }
      });
    } catch (error) {
      res.json({
        success: true,
        aiService: {
          enabled: true,
          status: 'offline',
          url: AI_SERVICE_URL,
          error: error.message,
          message: 'Service IA configuré mais inaccessible',
          solutions: [
            'Démarrer: cd ai-service && python app.py',
            'Vérifier URL: ' + AI_SERVICE_URL,
            'Désactiver: AI_SERVICE_ENABLED=false'
          ]
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @route   GET /api/image/stats
 * @desc    Statistiques des images
 * @access  Private
 */
/*exports.getImageStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    }

    const stats = await PlantImage.aggregate([
      {
        $match: {
          userId: req.user._id,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          manual: { $sum: { $cond: [{ $eq: ['$type', 'manual'] }, 1, 0] } },
          automatic: { $sum: { $cond: [{ $eq: ['$type', 'automatic'] }, 1, 0] } },
          analysed: { $sum: { $cond: ['$analysed', 1, 0] } },
          withDisease: {
            $sum: { 
              $cond: [
                { 
                  $and: [
                    '$analysed',
                    { $ne: ['$resultatAnalyse.maladie', 'Sain'] },
                    { $ne: ['$resultatAnalyse.maladie', 'healthy'] }
                  ]
                }, 
                1, 
                0
              ] 
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      period,
      stats: stats[0] || {
        total: 0,
        manual: 0,
        automatic: 0,
        analysed: 0,
        withDisease: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════
// VÉRIFICATION DES EXPORTS
// ═══════════════════════════════════════════════════════════
console.log('✅ imageController chargé avec', Object.keys(exports).length, 'exports');*/