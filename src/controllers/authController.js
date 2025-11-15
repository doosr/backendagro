const User = require('../models/User');
const jwt = require('jsonwebtoken');

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