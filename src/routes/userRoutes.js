const express = require('express');
const router = express.Router();
const {
  getUsers,
  updateSettings,
  getSettings,
  controlIrrigation,
  deleteUser,
  updateProfile,
  createUser,
  toggleEmailVerification
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

//  Routes utilisateur
router.get('/', protect, authorize('admin'), getUsers);
router.post('/create', protect, authorize('admin'), createUser);
router.patch('/:id/verify-email', protect, authorize('admin'), toggleEmailVerification);

//  Mise à jour du profil (nom, téléphone, etc.)
router.put('/profile', protect, updateProfile);

//  Récupération des paramètres (pour ESP32)
router.get('/settings', protect, getSettings);

//  Mise à jour des paramètres (irrigation, notifications)
router.put('/settings', protect, updateSettings);

//  Contrôle manuel de l'irrigation
router.post('/irrigation', protect, controlIrrigation);

//  Suppression utilisateur (admin uniquement)
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;