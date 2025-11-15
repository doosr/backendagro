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
    required: true
  },
  macAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    default: 'ESP32-CAM'
  },
  localisation: {
    type: String,
    trim: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  derniereDonnee: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Capteur', capteurSchema);