const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ----------------------
// MIDDLEWARES
// ----------------------

// CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ----------------------
// ROUTE RACINE
// ----------------------
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur SmartPlant Backend 🌱',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// ----------------------
// ROUTES API
// ----------------------
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sensor', require('./routes/sensorRoutes'));
app.use('/api/capteur', require('./routes/capteurRoutes'));
app.use('/api/alert', require('./routes/alertRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/analysis', require('./routes/analysis'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'SmartPlant API is running',
    timestamp: new Date().toISOString()
  });
});

// ----------------------
// 404 - Catch All
// ----------------------
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`
  });
});

// ----------------------
// ERROR HANDLER GLOBAL
// ----------------------
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
