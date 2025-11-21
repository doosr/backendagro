/*const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Importer les contrôleurs
const imageController = require('../controllers/imageController');
const { protect } = require('../middleware/auth');

// Configuration du stockage Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/images');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(' Dossier uploads/images créé');
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'plant-' + uniqueSuffix + ext);
  }
});

// Filtrer uniquement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté. Utilisez JPG, PNG ou GIF.'), false);
  }
};

// Configuration Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// ═══════════════════════════════════════════════════════════
// ROUTES PUBLIQUES (ESP32-CAM sans authentification)
// ═══════════════════════════════════════════════════════════

// Upload automatique depuis ESP32-CAM
router.post('/upload-auto', upload.single('image'), imageController.uploadAutoImage);

// Vérifier le statut de l'IA (public pour permettre vérification)
router.get('/ai-status', imageController.checkAIServiceStatus);

// ═══════════════════════════════════════════════════════════
// ROUTES PROTÉGÉES (nécessitent authentification)
// ═══════════════════════════════════════════════════════════

// Appliquer le middleware d'authentification à toutes les routes suivantes
router.use(protect);

// GET routes
router.get('/list', imageController.getImages);
router.get('/stats', imageController.getImageStats);
router.get('/:id', imageController.getImageById);

// POST routes
router.post('/upload-manual', upload.single('image'), imageController.uploadManualImage);
router.post('/:id/reanalyze', imageController.reanalyzeImage);

// DELETE routes
router.delete('/:id', imageController.deleteImage);

module.exports = router;*/