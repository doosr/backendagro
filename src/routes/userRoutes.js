const express = require('express');
const router = express.Router();
const {
  getUsers,
  updateSettings,
  controlIrrigation,
  deleteUser,
  updateProfile  // <-- ajouter ici
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getUsers);
router.put('/settings', protect, updateSettings);
router.post('/irrigation', protect, controlIrrigation);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.put('/profile', protect, updateProfile); // <-- corrige ici

module.exports = router;
