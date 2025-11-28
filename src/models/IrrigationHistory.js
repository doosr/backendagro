const mongoose = require('mongoose');

const IrrigationHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['ON', 'OFF'],
        required: true
    },
    source: {
        type: String,
        enum: ['MANUAL', 'AUTO'],
        default: 'MANUAL'
    },
    duration: {
        type: Number, // En secondes, optionnel (calculé si OFF suit un ON)
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('IrrigationHistory', IrrigationHistorySchema);
