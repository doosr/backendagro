const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sensor', require('./routes/sensorRoutes'));
app.use('/api/capteur', require('./routes/capteurRoutes'));
app.use('/api/alert', require('./routes/alertRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/analysis', require('./routes/analysis'));

// Route test santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SmartPlant API is running',
    timestamp: new Date().toISOString()
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`
  });
});

// Gestionnaire global des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

<<<<<<< HEAD

=======
>>>>>>> 01c4131 (ddee)
module.exports = app;
