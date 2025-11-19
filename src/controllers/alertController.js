const Alert = require('../models/Alert');
const { createDiseaseAlert } = require('../services/alertService');

//    GET /api/alert
//     Obtenir les alertes avec filtres avancés
exports.getAlerts = async (req, res) => {
  try {
    const { 
      lu, 
      limit = 50, 
      type, 
      severite, 
      capteurId,
      startDate,
      endDate 
    } = req.query;

    let query = { userId: req.user._id };
    
    // Filtrer par statut de lecture
    if (lu !== undefined) {
      query.lu = lu === 'true';
    }

    // Filtrer par type d'alerte
    if (type) {
      query.type = type;
    }

    // Filtrer par sévérité
    if (severite) {
      query.severite = severite;
    }

    // Filtrer par capteur
    if (capteurId) {
      query.capteurId = capteurId;
    }

    // Filtrer par date
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('capteurId', 'nom localisation type')
      .populate('imageId', 'filename url');

    // Compter les alertes non lues
    const unreadCount = await Alert.countDocuments({
      userId: req.user._id,
      lu: false
    });

    // Compter par sévérité
    const severityCounts = await Alert.aggregate([
      { $match: { userId: req.user._id, lu: false } },
      {
        $group: {
          _id: '$severite',
          count: { $sum: 1 }
        }
      }
    ]);

    const severityBreakdown = {
      info: 0,
      warning: 0,
      critical: 0
    };

    severityCounts.forEach(item => {
      severityBreakdown[item._id] = item.count;
    });

    res.json({
      success: true,
      count: alerts.length,
      unreadCount,
      severityBreakdown,
      data: alerts
    });
  } catch (error) {
    console.error('❌ Erreur récupération alertes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Dans la fonction receiveAnalysisResults, après la sauvegarde:
exports.receiveAnalysisResults = async (req, res) => {
  try {
    const { capteurId, analysisResult, timestamp } = req.body;


    const analysis = await AnalysisResult.create(analysisData);

    // NOUVEAU : Créer une alerte si maladie critique
    if (analysisResult.diseaseDetected && analysisResult.confidence > 0.8) {
      try {
        await createDiseaseAlert(analysis, capteur);
        console.log('🔔 Alerte de maladie créée');
      } catch (alertError) {
        console.error('⚠️ Erreur création alerte:', alertError.message);
        // Ne pas bloquer la sauvegarde si l'alerte échoue
      }
    }

    // Mettre à jour le capteur...
    if (capteur) {
      await capteur.incrementAnalyses(analysisResult.diseaseDetected);
      await capteur.heartbeat();
    }

    res.status(201).json({
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
      message: 'Erreur lors de l\'enregistrement de l\'analyse',
      error: error.message
    });
  }
};
//    GET /api/alert/summary
//     Obtenir un résumé des alertes
exports.getAlertsSummary = async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let startDate = new Date();
    if (period === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const summary = await Alert.aggregate([
      {
        $match: {
          userId: req.user._id,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            severite: '$severite'
          },
          count: { $sum: 1 },
          lastAlert: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Compter les alertes critiques actives
    const criticalCount = await Alert.countDocuments({
      userId: req.user._id,
      severite: 'critical',
      lu: false,
      timestamp: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // 2 dernières heures
    });

    res.json({
      success: true,
      period,
      criticalActive: criticalCount,
      summary
    });
  } catch (error) {
    console.error('❌ Erreur résumé alertes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @route   PUT /api/alert/:id/read
// @desc    Marquer une alerte comme lue
exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    alert.lu = true;
    await alert.save();

    res.json({
      success: true,
      message: 'Alerte marquée comme lue',
      data: alert
    });
  } catch (error) {
    console.error('❌ Erreur marquage alerte:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    PUT /api/alert/read-all
//     Marquer toutes les alertes comme lues
exports.markAllAsRead = async (req, res) => {
  try {
    const { type, severite } = req.body;

    let query = { 
      userId: req.user._id,
      lu: false
    };

    if (type) query.type = type;
    if (severite) query.severite = severite;

    const result = await Alert.updateMany(
      query,
      { lu: true }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} alerte(s) marquée(s) comme lue(s)`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Erreur marquage multiple alertes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    DELETE /api/alert/:id
//     Supprimer une alerte
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerte non trouvée'
      });
    }

    await alert.deleteOne();

    res.json({
      success: true,
      message: 'Alerte supprimée'
    });
  } catch (error) {
    console.error('❌ Erreur suppression alerte:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    DELETE /api/alert/clear
//     Supprimer toutes les alertes lues
exports.clearReadAlerts = async (req, res) => {
  try {
    const { olderThan } = req.body; // En jours

    let query = {
      userId: req.user._id,
      lu: true
    };

    if (olderThan) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(olderThan));
      query.timestamp = { $lte: date };
    }

    const result = await Alert.deleteMany(query);

    res.json({
      success: true,
      message: `${result.deletedCount} alerte(s) supprimée(s)`,
      count: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Erreur nettoyage alertes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    GET /api/alert/critical
//     Obtenir uniquement les alertes critiques actives
exports.getCriticalAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({
      userId: req.user._id,
      severite: 'critical',
      lu: false,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24h
    })
      .sort({ timestamp: -1 })
      .populate('capteurId', 'nom localisation type')
      .populate('imageId', 'filename url');

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('❌ Erreur alertes critiques:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};