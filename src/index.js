require('dotenv').config();
const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const fs = require('fs');

const PORT = process.env.PORT || 5000;

// Create uploads folder if missing
const uploadDir = './uploads/plant-images';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Socket.IO configuration
const io = socketio(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('📡 Nouveau client connecté:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} a rejoint sa room`);
  });

  socket.on('esp32-connect', () => {
    socket.join('esp32');
    console.log('🤖 ESP32 connecté');
  });

  socket.on('disconnect', () => {
    console.log('📴 Client déconnecté:', socket.id);
  });
});

// Expose io to app routes
app.io = io;

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🌱 SmartPlant Backend Started 🌱    ║
  ║   Port: ${PORT}                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}           
  ╚═══════════════════════════════════════╝
  `);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
