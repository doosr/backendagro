const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getAlertsSummary,
  markAsRead,
  markAllAsRead,
  deleteAlert,
  clearReadAlerts,
  getCriticalAlerts
} = require('../controllers/alertController');
const { protect } = require('../middleware/auth');
const { alertEmitter } = require('../services/alertService');
/**
 * @route   GET /api/alert/stream
 * @desc    Stream d'alertes en temps réel via Server-Sent Events
 * @access  Private
 */
router.get('/stream', protect, (req, res) => {
  const userId = req.user._id.toString();
  
  console.log(`📡 Client SSE connecté: User ${userId}`);

  // Configuration SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Pour nginx

  // Envoyer un message de connexion
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connecté aux alertes' })}\n\n`);

  // Fonction pour envoyer les alertes à ce client
  const sendAlert = (data) => {
    // Vérifier que l'alerte est pour cet utilisateur
    if (data.userId === userId) {
      res.write(`data: ${JSON.stringify(data.alert)}\n\n`);
      console.log(`📤 Alerte envoyée au client ${userId}`);
    }
  };

  // Écouter les nouvelles alertes
  alertEmitter.on('newAlert', sendAlert);

  // Heartbeat toutes les 30 secondes pour maintenir la connexion
  const heartbeatInterval = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  // Nettoyage lors de la déconnexion
  req.on('close', () => {
    console.log(`📡 Client SSE déconnecté: User ${userId}`);
    alertEmitter.removeListener('newAlert', sendAlert);
    clearInterval(heartbeatInterval);
  });
});
// Routes protégées - nécessitent authentification
router.use(protect);

// GET routes
router.get('/', getAlerts);
router.get('/summary', getAlertsSummary);
router.get('/critical', getCriticalAlerts);

// PUT routes
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

// DELETE routes
router.delete('/:id', deleteAlert);
router.delete('/clear', clearReadAlerts);

module.exports = router;