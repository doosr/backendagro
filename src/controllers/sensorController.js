const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const User = require('../models/User');

// @route   POST /api/sensor/data
// @desc    Recevoir données des capteurs ESP32
exports.receiveSensorData = async (req, res) => {
  try {
    const { humiditeSol, luminosite, temperatureAir, humiditeAir, etatPompe, capteurId } = req.body;

    // Pour l'instant, on utilise le premier utilisateur ou un utilisateur par défaut
    // En production, l'ESP32 devrait envoyer un token ou ID
    let user = await User.findOne({ role: 'agriculteur' });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun utilisateur trouvé'
      });
    }

    const sensorData = await SensorData.create({
      userId: user._id,
      capteurId: capteurId || null,
      humiditeSol,
      luminosite,
      temperatureAir,
      humiditeAir,
      etatPompe
    });

    // Vérifier les seuils et créer des alertes
    await checkThresholds(user, sensorData);

    // Émettre via Socket.IO
    if (req.app.io) {
      req.app.io.to(user._id.toString()).emit('newSensorData', sensorData);
    }

    res.status(201).json({
      success: true,
      data: sensorData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Fonction pour vérifier les seuils
async function checkThresholds(user, data) {
  const alerts = [];

  // Alerte humidité du sol
  if (data.humiditeSol < user.seuilHumiditeSol) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'humidite',
      severite: 'warning',
      titre: 'Humidité du sol faible',
      message: `L'humidité du sol est à ${data.humiditeSol}. Arrosage recommandé.`
    });
  }

  // Alerte température
  if (data.temperatureAir > 35) {
    alerts.push({
      userId: user._id,
      capteurId: data.capteurId,
      type: 'temperature',
      severite: 'warning',
      titre: 'Température élevée',
      message: `La température est à ${data.temperatureAir}°C. Surveillance recommandée.`
    });
  }

  if (alerts.length > 0) {
    await Alert.insertMany(alerts);
  }
}

// @route   GET /api/sensor/data
// @desc    Obtenir historique des données
exports.getSensorData = async (req, res) => {
  try {
    const { limit = 100, startDate, endDate } = req.query;

    let query = { userId: req.user._id };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('capteurId', 'nom localisation');

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

// @route   GET /api/sensor/latest
// @desc    Obtenir dernières données
exports.getLatestData = async (req, res) => {
  try {
    const data = await SensorData.findOne({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .populate('capteurId', 'nom localisation');

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

// @route   GET /api/sensor/stats
// @desc    Obtenir statistiques
exports.getStats = async (req, res) => {
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

    const stats = await SensorData.aggregate([
      {
        $match: {
          userId: req.user._id,
          timestamp: { $gte: startDate }
        }
      },
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
          maxTemperature: { $max: '$temperatureAir' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};