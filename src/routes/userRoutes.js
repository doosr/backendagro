const express = require('express');
const router = express.Router();
const {
  getUsers,
  updateSettings,
  controlIrrigation,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getUsers);
router.put('/settings', protect, updateSettings);
router.post('/irrigation', protect, controlIrrigation);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;