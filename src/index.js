require('dotenv').config();
const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const fs = require('fs');

const PORT = process.env.PORT || 5000;

// ----------------------
// CRÉER LE DOSSIER UPLOADS
// ----------------------
const uploadDir = './uploads/plant-images';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ----------------------
// CONNEXION MONGODB
// ----------------------
connectDB();

// ----------------------
// CRÉER LE SERVEUR HTTP
// ----------------------
const server = http.createServer(app);

// ----------------------
// CONFIGURATION SOCKET.IO
// ----------------------
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ----------------------
// SOCKET.IO EVENTS
// ----------------------
io.on('connection', (socket) => {
  console.log('📡 Nouveau client connecté:', socket.id);

  // Rejoindre une room par userId
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} a rejoint sa room`);
  });

  // ESP32 rejoint la room spéciale
  socket.on('esp32-connect', () => {
    socket.join('esp32');
    console.log('🤖 ESP32 connecté via esp32-connect');
  });

  // Écouteur alternatif pour ESP32 (au cas où)
  socket.on('message', (data) => {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;

      if (message.type === 'esp32Connect') {
        socket.join('esp32');
        console.log('🤖 ESP32 connecté via message type');
        socket.emit('connected', { status: 'ok', message: 'ESP32 connected successfully' });
      }
    } catch (error) {
      console.error('❌ Erreur parsing message:', error);
    }
  });

  // Gérer les messages texte bruts (pour Socket.IO v4 avec transport websocket)
  socket.on('text', (text) => {
    try {
      const message = JSON.parse(text);
      if (message.type === 'esp32Connect') {
        socket.join('esp32');
        console.log('🤖 ESP32 connecté via text');
      }
    } catch (error) {
      console.error('❌ Erreur parsing text:', error);
    }
  });

  // Écouter les commandes d'irrigation depuis le contrôleur
  socket.on('irrigationCommand', (data) => {
    console.log('💧 Commande irrigation reçue du serveur:', data);
    // Relayer la commande aux ESP32 connectés
    io.to('esp32').emit('irrigationCommand', data);
  });

  socket.on('disconnect', () => {
    console.log('📴 Client déconnecté:', socket.id);
  });
});

// ----------------------
// PARTAGER IO DANS L’APP
// ----------------------
app.set('io', io);

// ----------------------
// LANCER LE SERVEUR
// ----------------------
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🌱 SmartPlant Backend Started 🌱    ║
  ║   Port: ${PORT}                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'} ║
  ╚═══════════════════════════════════════╝
  `);
});

// ----------------------
// GESTION DES ERREURS NON GÉRÉES
// ----------------------
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
