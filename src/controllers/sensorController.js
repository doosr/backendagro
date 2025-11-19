const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const User = require('../models/User');

//    POST /api/sensor/data
//     Recevoir données des capteurs ESP32
exports.receiveSensorData = async (req, res) => {
  try {
    const { humiditeSol, luminosite, temperatureAir, humiditeAir, etatPompe, capteurId } = req.body;

    // Validation des données
    if (humiditeSol === undefined || luminosite === undefined || 
        temperatureAir === undefined || humiditeAir === undefined || 
        etatPompe === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Données de capteurs incomplètes'
      });
    }

    // Trouver l'utilisateur approprié
    let user;
    
    if (capteurId) {
      // Si capteurId fourni, trouver l'utilisateur via le capteur
      const Capteur = require('../models/Capteur');
      const capteur = await Capteur.findById(capteurId).populate('userId');
      
      if (capteur) {
        user = capteur.userId;
      }
    }
    
    // Sinon, utiliser le premier agriculteur
    if (!user) {
      user = await User.findOne({ role: 'agriculteur' });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé'
      });
    }

    // Créer l'enregistrement de données
    const sensorData = await SensorData.create({
      userId: user._id,
      capteurId: capteurId || null,
      humiditeSol,
      luminosite,
      temperatureAir,
      humiditeAir,
      etatPompe
    });

    // Vérifier les seuils et créer des alertes si nécessaire
    await checkThresholds(user, sensorData);

    // Émettre via Socket.IO pour mise à jour en temps réel
    if (req.app.io) {
      req.app.io.to(user._id.toString()).emit('newSensorData', sensorData);
    }

    res.status(201).json({
      success: true,
      data: sensorData
    });
  } catch (error) {
    console.error('❌ Erreur réception données capteur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Fonction améliorée pour vérifier les seuils et créer des alertes
async function checkThresholds(user, data) {
  const alerts = [];

  // 🌱 ALERTE HUMIDITÉ DU SOL
  if (data.humiditeSol < user.seuilHumiditeSol) {
    const severity = data.humiditeSol < user.seuilHumiditeSol * 0.7 ? 'critical' : 'warning';
    
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'humidite',
      severite: severity,
      titre: severity === 'critical' ? '🚨 Humidité du sol critique' : '⚠️ Humidité du sol faible',
      message: `L'humidité du sol est à ${data.humiditeSol}. Seuil configuré: ${user.seuilHumiditeSol}. ${
        severity === 'critical' ? 'ARROSAGE URGENT REQUIS!' : 'Arrosage recommandé.'
      }`
    });
  }

  // ☀️ ALERTE LUMINOSITÉ
  if (data.luminosite < 200) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'systeme',
      severite: 'info',
      titre: '🌙 Luminosité faible',
      message: `Luminosité détectée: ${data.luminosite}. Conditions de faible luminosité.`
    });
  } else if (data.luminosite > 3500) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'systeme',
      severite: 'warning',
      titre: '☀️ Luminosité excessive',
      message: `Luminosité très élevée: ${data.luminosite}. Risque de stress des plantes.`
    });
  }

  // 🌡️ ALERTE TEMPÉRATURE AIR
  if (data.temperatureAir > 35) {
    const severity = data.temperatureAir > 40 ? 'critical' : 'warning';
    
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'temperature',
      severite: severity,
      titre: severity === 'critical' ? '🚨 Température critique' : '🌡️ Température élevée',
      message: `La température est à ${data.temperatureAir}°C. ${
        severity === 'critical' 
          ? 'DANGER! Risque sévère pour les plantes!' 
          : 'Surveillance et ventilation recommandées.'
      }`
    });
  } else if (data.temperatureAir < 10) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'temperature',
      severite: 'warning',
      titre: '❄️ Température basse',
      message: `La température est à ${data.temperatureAir}°C. Risque de gel, protection recommandée.`
    });
  }

  // 💧 ALERTE HUMIDITÉ AIR
  if (data.humiditeAir > 85) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'humidite',
      severite: 'warning',
      titre: '💧 Humidité de l\'air élevée',
      message: `L'humidité de l'air est à ${data.humiditeAir}%. Risque de moisissures et maladies fongiques.`
    });
  } else if (data.humiditeAir < 30) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'humidite',
      severite: 'info',
      titre: '🏜️ Humidité de l\'air faible',
      message: `L'humidité de l'air est à ${data.humiditeAir}%. Air très sec, augmentation d'humidité conseillée.`
    });
  }

  // 💦 ALERTE POMPE
  if (data.etatPompe === 1) {
    // Vérifier si la pompe était déjà active récemment
    const recentPumpAlert = await Alert.findOne({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'systeme',
      titre: { $regex: /Pompe activée/ },
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
    });

    if (!recentPumpAlert) {
      alerts.push({
        userId: user._id,
        capteurId: data.capteurId,
        type: 'systeme',
        severite: 'info',
        titre: '💦 Pompe activée',
        message: `Système d'arrosage activé. Humidité sol: ${data.humiditeSol}`
      });
    }
  }

  // 🔴 ALERTE COMBINÉE - Conditions extrêmes
  if (data.temperatureAir > 35 && data.humiditeSol < user.seuilHumiditeSol && data.humiditeAir < 40) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'systeme',
      severite: 'critical',
      titre: '🔴 CONDITIONS CRITIQUES MULTIPLES',
      message: `ALERTE COMBINÉE! Température: ${data.temperatureAir}°C, Humidité sol: ${data.humiditeSol}, Humidité air: ${data.humiditeAir}%. ACTION IMMÉDIATE REQUISE!`
    });
  }

  // Éviter les alertes en double (même type dans les 30 dernières minutes)
  if (alerts.length > 0) {
    const filteredAlerts = [];
    
    for (const alert of alerts) {
      const recentSimilarAlert = await Alert.findOne({
        userId: alert.userId,
        capteurId: alert.capteurId,
        type: alert.type,
        severite: alert.severite,
        timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes
      });

      // N'ajouter que si pas d'alerte similaire récente ou si c'est critique
      if (!recentSimilarAlert || alert.severite === 'critical') {
        filteredAlerts.push(alert);
      }
    }

    if (filteredAlerts.length > 0) {
      const createdAlerts = await Alert.insertMany(filteredAlerts);
      
      // Émettre les nouvelles alertes via Socket.IO
      if (global.io) {
        createdAlerts.forEach(alert => {
          global.io.to(user._id.toString()).emit('newAlert', alert);
        });
      }
      
      console.log(`✅ ${filteredAlerts.length} alerte(s) créée(s) pour ${user.nom}`);
    }
  }
}

//    GET /api/sensor/data
//     Obtenir historique des données
exports.getSensorData = async (req, res) => {
  try {
    const { limit = 100, startDate, endDate, capteurId } = req.query;

    let query = { userId: req.user._id };

    if (capteurId) {
      query.capteurId = capteurId;
    }

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('capteurId', 'nom localisation type');

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    GET /api/sensor/latest
//     Obtenir dernières données
exports.getLatestData = async (req, res) => {
  try {
    const { capteurId } = req.query;
    
    let query = { userId: req.user._id };
    if (capteurId) {
      query.capteurId = capteurId;
    }

    const data = await SensorData.findOne(query)
      .sort({ timestamp: -1 })
      .populate('capteurId', 'nom localisation type');

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    GET /api/sensor/stats
//     Obtenir statistiques
exports.getStats = async (req, res) => {
  try {
    const { period = '24h', capteurId } = req.query;
    
    let startDate = new Date();
    if (period === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    let matchQuery = {
      userId: req.user._id,
      timestamp: { $gte: startDate }
    };

    if (capteurId) {
      matchQuery.capteurId = require('mongoose').Types.ObjectId(capteurId);
    }

    const stats = await SensorData.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          avgHumiditeSol: { $avg: '$humiditeSol' },
          avgLuminosite: { $avg: '$luminosite' },
          avgTemperature: { $avg: '$temperatureAir' },
          avgHumiditeAir: { $avg: '$humiditeAir' },
          minHumiditeSol: { $min: '$humiditeSol' },
          maxHumiditeSol: { $max: '$humiditeSol' },
          minTemperature: { $min: '$temperatureAir' },
          maxTemperature: { $max: '$temperatureAir' },
          minLuminosite: { $min: '$luminosite' },
          maxLuminosite: { $max: '$luminosite' },
          totalReadings: { $sum: 1 },
          pumpActivations: { 
            $sum: { $cond: [{ $eq: ['$etatPompe', 1] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      period,
      stats: stats[0] || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    GET /api/sensor/chart-data
//     Obtenir données pour graphiques
exports.getChartData = async (req, res) => {
  try {
    const { period = '24h', capteurId, interval = '1h' } = req.query;
    
    let startDate = new Date();
    if (period === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    let matchQuery = {
      userId: req.user._id,
      timestamp: { $gte: startDate }
    };

    if (capteurId) {
      matchQuery.capteurId = require('mongoose').Types.ObjectId(capteurId);
    }

    // Déterminer le format de groupage selon l'intervalle
    let dateFormat;
    if (interval === '1h') {
      dateFormat = { 
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
    } else {
      dateFormat = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
    }

    const chartData = await SensorData.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: dateFormat,
          avgHumiditeSol: { $avg: '$humiditeSol' },
          avgLuminosite: { $avg: '$luminosite' },
          avgTemperature: { $avg: '$temperatureAir' },
          avgHumiditeAir: { $avg: '$humiditeAir' },
          timestamp: { $first: '$timestamp' }
        }
      },
      { $sort: { timestamp: 1 } }
    ]);

    res.json({
      success: true,
      count: chartData.length,
      data: chartData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};