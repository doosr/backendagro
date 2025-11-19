const express = require('express');
const router = express.Router();
const {
  receiveAnalysisResults,
  getAnalysisHistory,
  getAnalysisStats,
  getAnalysisById,
  deleteAnalysis
} = require('../controllers/analysisController');

const { protect } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE - Vérification API Key
// ═══════════════════════════════════════════════════════════

/**
 * Middleware pour vérifier l'API Key du service IA
 * Protège la route /receive qui reçoit les résultats d'analyse
 */
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.AI_API_KEY || 'your-secret-key-changez-moi';
  
  console.log('🔑 Vérification API Key...');
  console.log('  API Key reçue:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Aucune');
  
  if (!apiKey) {
    console.warn('⚠️ API Key manquante');
    return res.status(401).json({
      success: false,
      message: 'API Key manquante'
    });
  }
  
  if (apiKey !== validApiKey) {
    console.warn('⚠️ API Key invalide');
    return res.status(401).json({
      success: false,
      message: 'API Key invalide'
    });
  }
  
  console.log('✅ API Key valide');
  next();
};

// ═══════════════════════════════════════════════════════════
// ROUTES PUBLIQUES (avec API Key)
// ═══════════════════════════════════════════════════════════

/**
 * @route   POST /api/analysis/receive
 * @desc    Recevoir les résultats d'analyse depuis le service IA
 * @access  Private (API Key)
 * 
 * Cette route est appelée par le service IA Python après l'analyse
 * d'une image. Elle enregistre les résultats dans MongoDB.
 */
router.post('/receive', verifyApiKey, receiveAnalysisResults);

// ═══════════════════════════════════════════════════════════
// ROUTES PROTÉGÉES (authentification utilisateur JWT)
// ═══════════════════════════════════════════════════════════

// Appliquer le middleware d'authentification à toutes les routes suivantes
router.use(protect);

/**
 * @route   GET /api/analysis/history
 * @desc    Obtenir l'historique des analyses de l'utilisateur
 * @access  Private (JWT)
 * @params  Query: page, limit, capteurId, diseaseDetected, startDate, endDate
 */
router.get('/history', getAnalysisHistory);

/**
 * @route   GET /api/analysis/stats
 * @desc    Obtenir les statistiques d'analyse
 * @access  Private (JWT)
 * @params  Query: days, capteurId
 */
router.get('/stats', getAnalysisStats);

/**
 * @route   GET /api/analysis/:id
 * @desc    Obtenir une analyse spécifique par ID
 * @access  Private (JWT)
 */
router.get('/:id', getAnalysisById);

/**
 * @route   DELETE /api/analysis/:id
 * @desc    Supprimer une analyse
 * @access  Private (JWT)
 */
router.delete('/:id', deleteAnalysis);

module.exports = router;