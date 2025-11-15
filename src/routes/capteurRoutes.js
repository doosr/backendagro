const express = require('express');
const router = express.Router();
const {
  addCapteur,
  getCapteurs,
  getCapteurById,
  updateCapteur,
  deleteCapteur,
  autoRegisterCapteur
} = require('../controllers/capteurController');
const { protect, authorize } = require('../middleware/auth');

// Route publique pour auto-enregistrement (doit être avant les routes avec params)
router.post('/auto-register', autoRegisterCapteur);

// Routes protégées
router.post('/', protect, authorize('admin'), addCapteur);
router.get('/', protect, getCapteurs);
router.get('/:id', protect, getCapteurById);
router.put('/:id', protect, authorize('admin'), updateCapteur);
router.delete('/:id', protect, authorize('admin'), deleteCapteur);

module.exports = router;