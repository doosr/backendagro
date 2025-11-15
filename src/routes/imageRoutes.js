const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  uploadManualImage,
  uploadAutoImage,
  getImages,
  getImageById,
  deleteImage
} = require('../controllers/imageController');
const { protect } = require('../middleware/auth');

// Configuration Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/plant-images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'plant-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Seules les images (JPEG, JPG, PNG) sont autorisées'));
  }
});

// Routes
router.post('/upload-manual', protect, upload.single('image'), uploadManualImage);
router.post('/upload-auto', upload.single('image'), uploadAutoImage);
router.get('/list', protect, getImages);
router.get('/:id', protect, getImageById);
router.delete('/:id', protect, deleteImage);

module.exports = router;