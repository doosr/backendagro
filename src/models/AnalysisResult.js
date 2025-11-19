const mongoose = require('mongoose');
const Alert = require('./Alert'); // ---> Important : on importe Alert ici

const analysisResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  capteurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capteur',
    default: null
  },
  maladie: {
    type: String,
    required: true
  },
  confiance: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  diseaseDetected: {
    type: Boolean,
    required: true,
    default: false
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'none'],
    default: 'none'
  },
  recommandations: [{
    type: String
  }],
  analysedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    aiVersion: String,
    analysisTime: Date,
    capteurType: String
  }
}, {
  timestamps: true
});

// ─────────────────────────────────────────
// 🔥 MÉTHODE : déduire le niveau de risque
// ─────────────────────────────────────────
analysisResultSchema.methods.getRiskLevel = function () {
  if (!this.diseaseDetected) return 'none';

  if (this.confiance >= 0.9) return 'critical';
  if (this.confiance >= 0.7) return 'warning';
  return 'info';
};

// ─────────────────────────────────────────
// 📈 VIRTUEL : pourcentage de confiance
// ─────────────────────────────────────────
analysisResultSchema.virtual('confidencePercentage').get(function () {
  return (this.confiance * 100).toFixed(1) + '%';
});

// ─────────────────────────────────────────
// 📊 STATISTIQUES utilisateur
// ─────────────────────────────────────────
analysisResultSchema.statics.getUserStats = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        analysedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        diseases: { $sum: { $cond: ['$diseaseDetected', 1, 0] } },
        healthy: { $sum: { $cond: ['$diseaseDetected', 0, 1] } }
      }
    }
  ]);
};

// ─────────────────────────────────────────
// 🚨 POST-SAVE : créer automatiquement une Alerte
// ─────────────────────────────────────────
analysisResultSchema.post('save', async function (doc) {
  if (!doc.diseaseDetected) return;

  const risk = doc.getRiskLevel();

  const alert = new Alert({
    userId: doc.userId,
    capteurId: doc.capteurId,
    type: 'maladie',
    severite: risk === 'critical' ? 'critical'
             : risk === 'warning' ? 'warning'
             : 'info',
    titre: `Maladie détectée : ${doc.maladie}`,
    message: `Confiance : ${(doc.confiance * 100).toFixed(1)}%.\n` +
             `Gravité : ${doc.severity}.\n` +
             (doc.recommandations?.length ? `Recommandations : ${doc.recommandations.join(', ')}` : '')
  });

  await alert.save();
});

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
