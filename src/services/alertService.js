const Alert = require('../models/Alert');
const EventEmitter = require('events');

// Event Emitter global pour les alertes en temps réel
class AlertEmitter extends EventEmitter { }
const alertEmitter = new AlertEmitter();

/**
 * Créer une alerte et notifier en temps réel
 */
const createAlert = async (alertData) => {
  try {
    // Vérifier si les notifications sont activées pour l'utilisateur
    const User = require('../models/User');
    const user = await User.findById(alertData.userId);

    if (!user) {
      console.log(`❌ Utilisateur non trouvé: ${alertData.userId}`);
      return null;
    }

    if (!user.notificationsEnabled) {
      console.log(`🔕 Notifications désactivées pour l'utilisateur ${alertData.userId}`);
      return null; // Ne pas créer l'alerte si les notifications sont désactivées
    }

    const alert = await Alert.create(alertData);

    // Populate pour avoir les infos complètes
    await alert.populate('capteurId', 'nom localisation type');

    // Émettre l'événement pour les clients SSE connectés
    alertEmitter.emit('newAlert', {
      userId: alert.userId.toString(),
      alert: alert.toObject()
    });

    console.log(`🔔 Alerte créée: ${alert.titre} (User: ${alert.userId})`);

    return alert;
  } catch (error) {
    console.error('❌ Erreur création alerte:', error);
    throw error;
  }
};

/**
 * Créer une alerte depuis une analyse de maladie
 */
const createDiseaseAlert = async (analysis, capteur) => {
  const severity = analysis.severity === 'high' ? 'critical' :
    analysis.severity === 'medium' ? 'warning' : 'info';

  const titre = analysis.diseaseDetected
    ? `🦠 Maladie détectée: ${analysis.metadata?.predictionFr || analysis.maladie}`
    : '✅ Plante saine';

  const message = analysis.diseaseDetected
    ? `Une maladie a été détectée sur ${capteur.nom} avec ${(analysis.confiance * 100).toFixed(1)}% de confiance. ${analysis.recommandations?.[0] || 'Consultez les recommandations.'}`
    : `Aucune maladie détectée sur ${capteur.nom}. La plante est en bonne santé.`;

  return createAlert({
    userId: capteur.userId,
    capteurId: capteur._id,
    analysisId: analysis._id,
    type: 'maladie',
    severite: severity,
    titre,
    message,
    timestamp: new Date()
  });
};

/**
 * Créer une alerte capteur hors ligne
 */
const createSensorOfflineAlert = async (capteur) => {
  return createAlert({
    userId: capteur.userId,
    capteurId: capteur._id,
    type: 'systeme',
    severite: 'warning',
    titre: `📡 Capteur hors ligne: ${capteur.nom}`,
    message: `Le capteur ${capteur.nom} (${capteur.localisation}) n'a pas communiqué depuis plus de 5 minutes.`,
    timestamp: new Date()
  });
};

module.exports = {
  alertEmitter,
  createAlert,
  createDiseaseAlert,
  createSensorOfflineAlert
};