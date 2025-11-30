const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Token = require('../models/Token');

exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Accès non autorisé (token manquant)" });
    }

    const accessToken = auth.split(" ")[1];

    // 1. Vérifier si le token existe en base et n'est pas révoqué
    const tokenDoc = await Token.findOne({
      accessToken,
      revoked: false,
      accessTokenExpire: { $gt: Date.now() }
    });

    if (!tokenDoc) {
      return res.status(401).json({ message: "Session expirée ou invalide" });
    }

    // 2. Récupérer l'utilisateur
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    req.user = user;
    req.token = tokenDoc; // Attacher le doc token pour usage ultérieur (ex: logout)
    next();

  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: "Non autorisé" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé pour le rôle "${req.user.role}"`
      });
    }
    next();
  };
};
