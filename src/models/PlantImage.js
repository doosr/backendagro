/*const mongoose = require('mongoose');

const plantImageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  capteurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capteur'
  },
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  analysed: {
    type: Boolean,
    default: false
  },
  resultatAnalyse: {
    maladie: String,
    confiance: Number,
    recommandations: [String],
    dateAnalyse: Date
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PlantImage', plantImageSchema);*/