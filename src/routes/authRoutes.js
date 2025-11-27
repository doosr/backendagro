const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Routes d'authentification
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Routes de réinitialisation du mot de passe
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Route debug (correcte)
router.post('/debug', (req, res) => {
  res.json({
    mongoUriExists: !!process.env.MONGO_URI,
    mongoUriPrefix: process.env.MONGO_URI?.substring(0, 20) + '...',
    nodeEnv: process.env.NODE_ENV,
    allEnvVars: Object.keys(process.env).filter(key =>
      key.includes('MONGO') || key.includes('JWT')
    )
  });
});

module.exports = router;
