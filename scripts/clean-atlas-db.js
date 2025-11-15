require('dotenv').config();
const mongoose = require('mongoose');

async function cleanAtlasDB() {
  try {
    console.log('🔄 Connexion à MongoDB Atlas...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connecté à MongoDB Atlas');

    // Supprimer la collection users
    try {
      await mongoose.connection.db.collection('users').drop();
      console.log('🗑️  Collection users supprimée');
    } catch (err) {
      console.log('ℹ️  Collection users n\'existe pas encore');
    }

    console.log('✨ Nettoyage terminé !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

cleanAtlasDB();