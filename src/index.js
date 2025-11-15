require('dotenv').config();
const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

// Créer le dossier uploads si inexistant
const fs = require('fs');
const uploadDir = './uploads/plant-images';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Connexion à MongoDB
connectDB();

// Créer le serveur HTTP
const server = http.createServer(app);

// Configuration Socket.IO
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('📡 Nouveau client connecté:', socket.id);

  // Rejoindre une room basée sur userId
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} a rejoint sa room`);
  });

  // ESP32 rejoint une room spéciale
  socket.on('esp32-connect', () => {
    socket.join('esp32');
    console.log('🤖 ESP32 connecté');
  });

  socket.on('disconnect', () => {
    console.log('📴 Client déconnecté:', socket.id);
  });
});

// Partager io avec l'app
app.io = io;

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🌱 SmartPlant Backend Started 🌱    ║
  ║   Port: ${PORT}                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}           ║
  ╚═══════════════════════════════════════╝
  `);
});

// Gestion des erreurs non gérées
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});