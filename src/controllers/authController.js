const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// Générer JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

//    POST /api/auth/register
//     Inscription utilisateur
exports.register = async (req, res) => {
  try {
    const { nom, email, password, role, telephone } = req.body;

    // Vérifier si l'utilisateur existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      email,
      password,
      role: role || 'agriculteur',
      telephone
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    POST /api/auth/login
//     Connexion utilisateur
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    GET /api/auth/me
//     Obtenir utilisateur actuel
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    POST /api/auth/forgot-password
//     Demander la réinitialisation du mot de passe
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email'
      });
    }

    const user = await User.findOne({ email });

    // Pour des raisons de sécurité, on renvoie toujours un message de succès
    // même si l'email n'existe pas (pour éviter l'énumération des utilisateurs)
    if (!user) {
      return res.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez les instructions de réinitialisation.'
      });
    }

    // Générer le token de réinitialisation
    const resetToken = user.getResetPasswordToken();

    // Sauvegarder l'utilisateur avec le token
    await user.save({ validateBeforeSave: false });

    try {
      // Envoyer l'email
      await sendPasswordResetEmail(user, resetToken);

      res.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez les instructions de réinitialisation.'
      });
    } catch (emailError) {
      // En cas d'erreur d'envoi d'email, réinitialiser les champs
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Erreur envoi email:', emailError);

      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer.'
      });
    }
  } catch (error) {
    console.error('Erreur forgot password:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

//    PUT /api/auth/reset-password/:resetToken
//     Réinitialiser le mot de passe avec le token
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un nouveau mot de passe'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Hasher le token reçu pour le comparer avec celui en base
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    // Trouver l'utilisateur avec le token et vérifier qu'il n'a pas expiré
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    // Définir le nouveau mot de passe
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Générer un nouveau token JWT pour connecter automatiquement l'utilisateur
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur reset password:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};