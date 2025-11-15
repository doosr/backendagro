const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  capteurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capteur'
  },
  type: {
    type: String,
    enum: ['maladie', 'humidite', 'temperature', 'systeme'],
    required: true
  },
  severite: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  titre: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  lu: {
    type: Boolean,
    default: false
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlantImage'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

alertSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);