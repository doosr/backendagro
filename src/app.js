const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware CORS - DOIT ÊTRE AVANT LES ROUTES
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware (pour debug)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sensor', require('./routes/sensorRoutes'));
app.use('/api/image', require('./routes/imageRoutes'));
app.use('/api/capteur', require('./routes/capteurRoutes'));
app.use('/api/alert', require('./routes/alertRoutes'));
app.use('/api/user', require('./routes/userRoutes'));

// Route de test
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

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    mongoUriExists: !!process.env.MONGO_URI,
    mongoUriPrefix: process.env.MONGO_URI?.substring(0, 20) + '...', // Show first 20 chars only
    nodeEnv: process.env.NODE_ENV,
    allEnvVars: Object.keys(process.env).filter(key => 
      key.includes('MONGO') || key.includes('JWT')
    )
  });
});

module.exports = app;
