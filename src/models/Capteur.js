const mongoose = require('mongoose');

const capteurSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  macAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    default: 'ESP32-CAM',
    enum: ['ESP32-CAM', 'ESP32', 'Arduino', 'Raspberry Pi', 'Autre']
  },
  localisation: {
    type: String,
    trim: true
  },
  actif: {
    type: Boolean,
    default: true
  },

  // Statistiques d'analyse (pour le module IA)
  derniereAnalyse: {
    type: Date,
    default: null
  },
  nombreAnalyses: {
    type: Number,
    default: 0,
    min: 0
  },
  maladiesDetectees: {
    type: Number,
    default: 0,
    min: 0
  },

  // Données capteurs (existant)
  derniereDonnee: {
    type: Date
  },

  // Configuration technique
  config: {
    ipAddress: String,
    firmwareVersion: String,
    samplingInterval: {
      type: Number,
      default: 300 // 5 minutes
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100
    }
  },

  // Seuils d'alerte personnalisés
  seuils: {
    temperatureMin: Number,
    temperatureMax: Number,
    humiditeMin: Number,
    humiditeMax: Number,
    lumiereMini: Number,
    humiditeSolMin: Number
  },

  // Statut de connexion
  statut: {
    type: String,
    enum: ['online', 'offline', 'error', 'maintenance'],
    default: 'offline'
  },

  // Dernière communication
  derniereCommunication: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
// Taux de détection de maladies
capteurSchema.virtual('tauxMaladies').get(function () {
    if (this.nombreAnalyses === 0) return 0;
    return parseFloat(((this.maladiesDetectees / this.nombreAnalyses) * 100).toFixed(1));
  });

  // Vérifier si le capteur est hors ligne
  capteurSchema.virtual('isOffline').get(function () {
    if (!this.derniereCommunication) return true;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.derniereCommunication < fiveMinutesAgo;
  });

  // Durée depuis la dernière analyse
  capteurSchema.virtual('dernierAnalyseHumain').get(function () {
    if (!this.derniereAnalyse) return 'Jamais';

    const now = new Date();
    const diff = now - this.derniereAnalyse;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'À l\'instant';
  });

  // ═══════════════════════════════════════════════════════════
  // MÉTHODES D'INSTANCE
  // ═══════════════════════════════════════════════════════════

  /**
   * Mettre à jour le statut du capteur
   */
  capteurSchema.methods.updateStatut = function () {
    if (this.isOffline) {
      this.statut = 'offline';
    } else if (this.actif) {
      this.statut = 'online';
    }
    return this.save();
  };

  /**
   * Enregistrer une communication (heartbeat)
   */
  capteurSchema.methods.heartbeat = function () {
    this.derniereCommunication = new Date();
    this.derniereDonnee = new Date();
    if (this.actif) {
      this.statut = 'online';
    }
    return this.save();
  };

  /**
   * Incrémenter le compteur d'analyses
   */
  capteurSchema.methods.incrementAnalyses = async function (maladieDetectee = false) {
    this.nombreAnalyses = (this.nombreAnalyses || 0) + 1;
    this.derniereAnalyse = new Date();

    if (maladieDetectee) {
      this.maladiesDetectees = (this.maladiesDetectees || 0) + 1;
    }

    return this.save();
  };

  /**
   * Obtenir un résumé du capteur
   */
  capteurSchema.methods.getSummary = function () {
    return {
      id: this._id,
      nom: this.nom,
      type: this.type,
      macAddress: this.macAddress,
      localisation: this.localisation,
      actif: this.actif,
      statut: this.statut,
      stats: {
        nombreAnalyses: this.nombreAnalyses || 0,
        maladiesDetectees: this.maladiesDetectees || 0,
        tauxMaladies: this.tauxMaladies,
        derniereAnalyse: this.derniereAnalyse,
        dernierAnalyseHumain: this.dernierAnalyseHumain
      },
      connexion: {
        derniereCommunication: this.derniereCommunication,
        isOffline: this.isOffline
      }
    };
  };

  // ═══════════════════════════════════════════════════════════
  // MÉTHODES STATIQUES
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtenir les capteurs actifs d'un utilisateur
   */
  capteurSchema.statics.getActiveCapteurs = function (userId) {
    return this.find({
      userId,
      actif: true
    }).sort({ nom: 1 });
  };

  /**
   * Obtenir les capteurs hors ligne
   */
  capteurSchema.statics.getOfflineCapteurs = function (userId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.find({
      userId,
      actif: true,
      derniereCommunication: { $lt: fiveMinutesAgo }
    });
  };

  /**
   * Obtenir les statistiques globales d'un utilisateur
   */
  capteurSchema.statics.getGlobalStats = async function (userId) {
    const capteurs = await this.find({ userId });

    return {
      total: capteurs.length,
      actifs: capteurs.filter(c => c.actif).length,
      online: capteurs.filter(c => c.statut === 'online').length,
      offline: capteurs.filter(c => c.statut === 'offline').length,
      totalAnalyses: capteurs.reduce((sum, c) => sum + (c.nombreAnalyses || 0), 0),
      totalMaladies: capteurs.reduce((sum, c) => sum + (c.maladiesDetectees || 0), 0)
    };
  };

  /**
   * Trouver un capteur par MAC address
   */
  capteurSchema.statics.findByMacAddress = function (macAddress) {
    return this.findOne({
      macAddress: macAddress.toUpperCase()
    });
  };

  // ═══════════════════════════════════════════════════════════
  // HOOKS (Middleware)
  // ═══════════════════════════════════════════════════════════

  /**
   * Avant sauvegarde: normaliser la MAC address
   */
  capteurSchema.pre('save', function (next) {
    if (this.macAddress) {
      this.macAddress = this.macAddress.toUpperCase().trim();
    }
    next();
  });

  /**
   * Avant sauvegarde: valider les seuils
   */
  capteurSchema.pre('save', function (next) {
    if (this.seuils) {
      if (this.seuils.temperatureMin && this.seuils.temperatureMax) {
        if (this.seuils.temperatureMin >= this.seuils.temperatureMax) {
          return next(new Error('temperatureMin doit être < temperatureMax'));
        }
      }
      if (this.seuils.humiditeMin && this.seuils.humiditeMax) {
        if (this.seuils.humiditeMin >= this.seuils.humiditeMax) {
          return next(new Error('humiditeMin doit être < humiditeMax'));
        }
      }
    }
    next();
  });

  /**
   * Après recherche: mettre à jour automatiquement le statut
   */
  capteurSchema.post('find', function (docs) {
    docs.forEach(doc => {
      if (doc.isOffline && doc.statut === 'online') {
        doc.statut = 'offline';
        doc.save().catch(err => console.error('Erreur maj statut:', err));
      }
    });
  });

  module.exports = mongoose.model('Capteur', capteurSchema);