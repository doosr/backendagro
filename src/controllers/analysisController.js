const AnalysisResult = require('../models/AnalysisResult');
const Capteur = require('../models/Capteur');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * @desc    Recevoir les résultats d'analyse depuis le service IA
 * @route   POST /api/analysis/receive
 * @access  Private (API Key)
 */
exports.receiveAnalysisResults = async (req, res) => {
  try {
    const { capteurId, userId: userIdFromAI, analysisResult, timestamp } = req.body;

    console.log('📥 Réception résultats IA:', {
      capteurId,
      userIdFromAI,
      prediction: analysisResult?.prediction,
      confidence: analysisResult?.confidence
    });

    // Vérification résultat
    if (!analysisResult) {
      return res.status(400).json({
        success: false,
        message: "Résultat d'analyse manquant"
      });
    }

    let capteur = null;
    let userId = null;

    // Cas 1 : capteurId fourni →
    // on récupère userId depuis la base
    if (capteurId && capteurId !== 'unknown') {
      capteur = await Capteur.findById(capteurId).populate('userId');

      if (!capteur) {
        console.warn(`⚠️ Capteur introuvable: ${capteurId}`);
        return res.status(404).json({
          success: false,
          message: "Capteur introuvable"
        });
      }

      // **PRIORITÉ 1 : userId fourni par IA**
      if (userIdFromAI && userIdFromAI !== 'unknown') {
        userId = userIdFromAI;
        console.log(`🔄 userId forcé par IA : ${userId}`);
      }
      // **PRIORITÉ 2 : userId du capteur**
      else if (capteur.userId) {
        userId = capteur.userId._id;
        console.log(`🔗 userId depuis capteur : ${userId}`);
      }
      else {
        console.warn(`⚠️ Aucun userId disponible pour ce capteur !`);
        return res.status(400).json({
          success: false,
          message: "Aucun userId disponible. Fournissez userId ou associez un user au capteur."
        });
      }
    }

    // Cas 2 : aucun capteurId mais un userId explicite
    else if (userIdFromAI && userIdFromAI !== 'unknown') {
      userId = userIdFromAI;
      console.log(`⚠️ Aucun capteurId fourni, mais userId reçu: ${userId}`);
    }
    
    else {
      return res.status(400).json({
        success: false,
        message: "capteurId ou userId requis"
      });
    }

    // === Construction de l'analyse ===
    const analysisData = {
      userId: userId,
      capteurId: capteur ? capteur._id : null,
      maladie: analysisResult.prediction || analysisResult.maladie,
      confiance: analysisResult.confidence || analysisResult.confiance,
      diseaseDetected: analysisResult.diseaseDetected || false,
      severity: analysisResult.severity || 'none',
      recommandations: analysisResult.recommendations || analysisResult.recommandations || [],
      analysedAt: analysisResult.analysedAt || timestamp || new Date(),
      metadata: {
        aiVersion: analysisResult.modelUsed || 'unknown',
        analysisTime: new Date(),
        capteurType: capteur ? capteur.type : 'unknown'
      }
    };

    const analysis = await AnalysisResult.create(analysisData);

    console.log(`✅ Analyse sauvegardée: ${analysis._id}`);

    // Mise à jour stats capteur
    if (capteur) {
      await capteur.incrementAnalyses(analysisResult.diseaseDetected);
      await capteur.heartbeat();
    }

    return res.status(201).json({
      success: true,
      message: 'Analyse enregistrée avec succès',
      data: {
        analysisId: analysis._id,
        maladie: analysis.maladie,
        confiance: analysis.confiance,
        severity: analysis.severity,
        diseaseDetected: analysis.diseaseDetected
      }
    });

  } catch (error) {
    console.error('❌ Erreur receiveAnalysisResults:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'enregistrement de l'analyse",
      error: error.message
    });
  }
};

/**
 * @desc    Obtenir l'historique des analyses
 * @route   GET /api/analysis/history
 * @access  Private
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Paramètres de pagination et filtrage
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const capteurId = req.query.capteurId;
    const diseaseDetected = req.query.diseaseDetected;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Construction de la requête
    const query = { userId };

    if (capteurId) {
      query.capteurId = capteurId;
    }

    if (diseaseDetected !== undefined) {
      query.diseaseDetected = diseaseDetected === 'true';
    }

    if (startDate || endDate) {
      query.analysedAt = {};
      if (startDate) query.analysedAt.$gte = new Date(startDate);
      if (endDate) query.analysedAt.$lte = new Date(endDate);
    }

    // Exécuter la requête
    const analyses = await AnalysisResult.find(query)
      .populate('capteurId', 'nom type emplacement')
      .sort({ analysedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Compter le total
    const total = await AnalysisResult.countDocuments(query);

    res.status(200).json({
      success: true,
      count: analyses.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: analyses
    });

  } catch (error) {
    console.error('❌ Erreur getAnalysisHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message
    });
  }
};

/**
 * @desc    Obtenir les statistiques d'analyses
 * @route   GET /api/analysis/stats
 * @access  Private
 */
exports.getAnalysisStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const capteurId = req.query.capteurId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Construction de la requête
    const matchQuery = {
      userId: new mongoose.Types.ObjectId(userId),
      analysedAt: { $gte: startDate }
    };

    if (capteurId) {
      matchQuery.capteurId = new mongoose.Types.ObjectId(capteurId);
    }

    // Statistiques globales
    const globalStats = await AnalysisResult.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          diseases: { $sum: { $cond: ['$diseaseDetected', 1, 0] } },
          healthy: { $sum: { $cond: ['$diseaseDetected', 0, 1] } },
          avgConfidence: { $avg: '$confiance' },
          highSeverity: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          mediumSeverity: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          lowSeverity: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      }
    ]);

    // Maladies les plus fréquentes
    const topDiseases = await AnalysisResult.aggregate([
      { 
        $match: { 
          ...matchQuery,
          diseaseDetected: true 
        } 
      },
      {
        $group: {
          _id: '$maladie',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confiance' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Analyses par jour
    const dailyAnalyses = await AnalysisResult.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$analysedAt' } },
          total: { $sum: 1 },
          diseases: { $sum: { $cond: ['$diseaseDetected', 1, 0] } },
          healthy: { $sum: { $cond: ['$diseaseDetected', 0, 1] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Analyses par capteur
    const byCapteur = await AnalysisResult.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$capteurId',
          total: { $sum: 1 },
          diseases: { $sum: { $cond: ['$diseaseDetected', 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'capteurs',
          localField: '_id',
          foreignField: '_id',
          as: 'capteur'
        }
      },
      { $unwind: { path: '$capteur', preserveNullAndEmptyArrays: true } }
    ]);

    res.status(200).json({
      success: true,
      period: {
        days,
        startDate,
        endDate: new Date()
      },
      stats: {
        global: globalStats[0] || {
          total: 0,
          diseases: 0,
          healthy: 0,
          avgConfidence: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0
        },
        topDiseases,
        dailyAnalyses,
        byCapteur
      }
    });

  } catch (error) {
    console.error('❌ Erreur getAnalysisStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

/**
 * @desc    Obtenir une analyse par ID
 * @route   GET /api/analysis/:id
 * @access  Private
 */
exports.getAnalysisById = async (req, res) => {
  try {
    const analysis = await AnalysisResult.findById(req.params.id)
      .populate('capteurId', 'nom type emplacement')
      .populate('userId', 'nom email');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analyse introuvable'
      });
    }

    // Vérifier que l'analyse appartient à l'utilisateur
    if (analysis.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.status(200).json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ Erreur getAnalysisById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'analyse',
      error: error.message
    });
  }
};

/**
 * @desc    Supprimer une analyse
 * @route   DELETE /api/analysis/:id
 * @access  Private
 */
exports.deleteAnalysis = async (req, res) => {
  try {
    const analysis = await AnalysisResult.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analyse introuvable'
      });
    }

    // Vérifier que l'analyse appartient à l'utilisateur
    if (analysis.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await analysis.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Analyse supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur deleteAnalysis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'analyse',
      error: error.message
    });
  }
};