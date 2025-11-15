const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  capteurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capteur'
  },
  humiditeSol: {
    type: Number,
    required: true
  },
  luminosite: {
    type: Number,
    required: true
  },
  temperatureAir: {
    type: Number,
    required: true
  },
  humiditeAir: {
    type: Number,
    required: true
  },
  etatPompe: {
    type: Number,
    required: true,
    enum: [0, 1]
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index pour améliorer les performances des requêtes
sensorDataSchema.index({ userId: 1, timestamp: -1 });
sensorDataSchema.index({ capteurId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);