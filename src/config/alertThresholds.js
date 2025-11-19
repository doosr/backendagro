/**
 * Configuration des seuils d'alertes pour le système SmartPlant
 * Ces valeurs peuvent être personnalisées par utilisateur dans le modèle User
 */

module.exports = {
  // 🌱 HUMIDITÉ DU SOL
  humiditeSol: {
    // Seuils par défaut (peuvent être personnalisés par utilisateur)
    optimal: { min: 400, max: 800 },
    warning: 350,  // En dessous = warning
    critical: 250, // En dessous = critical
    unit: 'valeur analogique'
  },

  // ☀️ LUMINOSITÉ
  luminosite: {
    veryLow: 200,      // En dessous = nuit/très sombre
    low: 500,          // Faible luminosité
    optimal: { min: 800, max: 3000 },
    high: 3500,        // Très lumineux
    excessive: 4000,   // Risque de stress
    unit: 'lux'
  },

  // 🌡️ TEMPÉRATURE AIR
  temperatureAir: {
    freezing: 0,       // Point de congélation
    cold: 10,          // Froid
    optimal: { min: 18, max: 28 },
    warm: 30,          // Chaud
    hot: 35,           // Très chaud - warning
    critical: 40,      // Critique - danger
    unit: '°C'
  },

  // 💧 HUMIDITÉ AIR
  humiditeAir: {
    veryLow: 30,       // Très sec
    low: 40,           // Sec
    optimal: { min: 50, max: 70 },
    high: 80,          // Humide
    veryHigh: 85,      // Risque de moisissures - warning
    unit: '%'
  },

  // ⏱️ DÉLAIS ENTRE ALERTES (en minutes)
  alertCooldown: {
    info: 60,          // 1 heure entre alertes info similaires
    warning: 30,       // 30 minutes entre alertes warning similaires
    critical: 5        // 5 minutes entre alertes critical (pas de cooldown si vraiment critique)
  },

  // 🔔 PRIORITÉS D'ALERTES
  priority: {
    critical: 1,
    warning: 2,
    info: 3
  },

  // 🌾 PROFILS DE CULTURES (exemples)
  cropProfiles: {
    tomates: {
      humiditeSol: { min: 500, max: 700 },
      temperatureAir: { min: 18, max: 28 },
      humiditeAir: { min: 50, max: 70 }
    },
    laitue: {
      humiditeSol: { min: 600, max: 800 },
      temperatureAir: { min: 15, max: 24 },
      humiditeAir: { min: 60, max: 80 }
    },
    fraises: {
      humiditeSol: { min: 450, max: 650 },
      temperatureAir: { min: 15, max: 25 },
      humiditeAir: { min: 50, max: 75 }
    },
    concombres: {
      humiditeSol: { min: 550, max: 750 },
      temperatureAir: { min: 20, max: 30 },
      humiditeAir: { min: 60, max: 80 }
    }
  },

  // 📊 SEUILS POUR STATISTIQUES
  statistics: {
    idealDayLength: 14,        // heures de lumière idéales
    minWaterCycleTime: 30,     // minutes minimum entre arrosages
    maxConsecutivePumpRuns: 5  // nombre max d'arrosages consécutifs avant alerte
  }
};