const mongoose = require('mongoose');
const crypto = require('crypto');

const tokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accessToken: {
        type: String,
        required: true,
        unique: true
    },
    accessTokenExpire: {
        type: Date,
        required: true
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true
    },
    refreshTokenExpire: {
        type: Date,
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    deviceInfo: {
        userAgent: String,
        ip: String
    },
    revoked: {
        type: Boolean,
        default: false
    },
    revokedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index pour performances
tokenSchema.index({ accessToken: 1 });
tokenSchema.index({ refreshToken: 1 });
tokenSchema.index({ userId: 1, revoked: 1 });

// Méthode statique pour générer les tokens
tokenSchema.statics.generateTokens = async function (userId, deviceInfo) {
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const sessionId = crypto.randomUUID();

    const tokenDoc = await this.create({
        userId,
        accessToken,
        accessTokenExpire: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        refreshToken,
        refreshTokenExpire: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        sessionId,
        deviceInfo
    });

    return {
        accessToken,
        refreshToken,
        sessionId,
        accessTokenExpire: tokenDoc.accessTokenExpire,
        refreshTokenExpire: tokenDoc.refreshTokenExpire
    };
};

module.exports = mongoose.model('Token', tokenSchema);
