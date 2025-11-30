const User = require('../models/User');
const Token = require('../models/Token');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendEmailVerification } = require('../services/emailService');
const AdminNotification = require('../models/AdminNotification');

// POST /api/auth/register - Inscription utilisateur
exports.register = async (req, res) => {
  try {
    const { nom, email, password, role, telephone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    const user = await User.create({
      nom,
      email,
      password,
      role: role || 'agriculteur',
      telephone
    });

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendEmailVerification(user, verificationToken);

      if (user.role === 'agriculteur') {
        await AdminNotification.create({
          type: 'info',
          title: 'Nouvel agriculteur inscrit',
          message: `${user.nom} (${user.email}) vient de s'inscrire`,
          userId: user._id
        });
      }

      // Générer les tokens pour connexion immédiate (optionnel, ici on demande vérification)
      // Pour l'instant on ne connecte pas automatiquement sans vérification

      res.status(201).json({
        success: true,
        message: 'Un email de vérification a été envoyé à votre adresse email',
        user: {
          id: user._id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);
      console.error('Erreur envoi email:', emailError);

      return res.status(500).json({
        success: false,
        message: 'Une erreur est survenue lors de l\'envoi de l\'email de vérification'
      });
    }
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        res.json({
          success: true,
          ...tokens, // accessToken, refreshToken, sessionId...
          user: {
            id: user._id,
            nom: user.nom,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    };

    // POST /api/auth/refresh-token
    exports.refreshToken = async (req, res) => {
      try {
        const { refreshToken } = req.body;
        const userAgent = req.headers['user-agent'];
        const ip = req.ip;

        if (!refreshToken) {
          return res.status(400).json({ message: "Refresh token requis" });
        }

        // Trouver le token refresh valide
        const tokenDoc = await Token.findOne({
          refreshToken,
          revoked: false,
          refreshTokenExpire: { $gt: Date.now() }
        });

        if (!tokenDoc) {
          return res.status(401).json({ message: "Refresh token invalide ou expiré" });
        }

        // Révoquer l'ancien token (rotation de refresh token pour sécurité)
        tokenDoc.revoked = true;
        tokenDoc.revokedAt = Date.now();
        await tokenDoc.save();

        // Générer une nouvelle paire de tokens
        const newTokens = await Token.generateTokens(tokenDoc.userId, { userAgent, ip });

        res.json({
          success: true,
          ...newTokens
        });

      } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    };

    // POST /api/auth/logout
    exports.logout = async (req, res) => {
      try {
        // req.token est attaché par le middleware protect
        if (req.token) {
          req.token.revoked = true;
          req.token.revokedAt = Date.now();
          await req.token.save();
        }

        res.json({ success: true, message: "Déconnecté avec succès" });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    };

    // POST /api/auth/logout-all
    exports.logoutAll = async (req, res) => {
      try {
        await Token.updateMany(
          { userId: req.user._id, revoked: false },
          { revoked: true, revokedAt: Date.now() }
        );

        res.json({ success: true, message: "Déconnecté de tous les appareils" });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    };

    // GET /api/auth/verify-email/:token
    exports.verifyEmail = async (req, res) => {
      try {
        const verificationToken = crypto
          .createHash('sha256')
          .update(req.params.token)
          .digest('hex');

        const user = await User.findOne({
          verificationToken,
          verificationExpire: { $gt: Date.now() }
        }).select('+verificationToken +verificationExpire');

        if (!user) {
          return res.status(400).json({
            success: false,
            message: 'Token invalide ou expiré'
          });
        }

        user.emailVerified = true;
        user.verificationToken = undefined;
        user.verificationExpire = undefined;
        await user.save();

        // Générer tokens pour connexion auto après vérification
        const tokens = await Token.generateTokens(user._id, {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });

        res.json({
          success: true,
          message: 'Email vérifié avec succès',
          ...tokens,
          user: {
            id: user._id,
            nom: user.nom,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified
          }
        });
      } catch (error) {
        console.error('Erreur verify email:', error);
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    };

    // POST /api/auth/resend-verification
    exports.resendVerification = async (req, res) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Veuillez fournir un email'
          });
        }

        const user = await User.findOne({ email });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'Utilisateur non trouvé'
          });
        }

        if (user.emailVerified) {
          return res.status(400).json({
            success: false,
            message: 'Cet email est déjà vérifié'
          });
        }

        const verificationToken = user.getEmailVerificationToken();
        await user.save({ validateBeforeSave: false });

        try {
          await sendEmailVerification(user, verificationToken);

          res.json({
            success: true,
            message: 'Email de vérification renvoyé avec succès'
          });
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);

          return res.status(500).json({
            success: false,
            message: 'Une erreur est survenue lors de l\'envoi de l\'email'
          });
        }
      } catch (error) {
        console.error('Erreur resend verification:', error);
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    };

    // GET /api/auth/me
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

    // POST /api/auth/forgot-password
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

        if (!user) {
          return res.json({
            success: true,
            message: 'Si un compte existe avec cet email, vous recevrez les instructions'
          });
        }

        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        try {
          await sendPasswordResetEmail(user, resetToken);

          res.json({
            success: true,
            message: 'Si un compte existe avec cet email, vous recevrez les instructions'
          });
        } catch (emailError) {
          user.resetPasswordToken = undefined;
          user.resetPasswordExpire = undefined;
          await user.save({ validateBeforeSave: false });

          console.error('Erreur envoi email:', emailError);

          return res.status(500).json({
            success: false,
            message: 'Une erreur est survenue lors de l\'envoi de l\'email'
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

    // PUT /api/auth/reset-password/:resetToken
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

        const resetPasswordToken = crypto
          .createHash('sha256')
          .update(req.params.resetToken)
          .digest('hex');

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

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Générer tokens pour connexion auto
        const tokens = await Token.generateTokens(user._id, {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });

        res.json({
          success: true,
          message: 'Mot de passe réinitialisé avec succès',
          ...tokens,
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