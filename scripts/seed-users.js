require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: String,
  telephone: String,
  seuilHumiditeSol: Number,
  arrosageAutomatique: Boolean,
  notificationsEnabled: Boolean,
  isEmailVerified: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const users = [
  {
    nom: 'Agriculteur Demo',
    email: 'agriculteur@test.com',
    password: 'password123',
    role: 'agriculteur',
    telephone: '+216 20 123 456',
    seuilHumiditeSol: 500,
    arrosageAutomatique: true,
    notificationsEnabled: true,
    isEmailVerified: true  // ✅ Email vérifié pour les comptes de démo
  },
  {
    nom: 'Admin Demo',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    telephone: '+216 20 789 456',
    seuilHumiditeSol: 500,
    arrosageAutomatique: true,
    notificationsEnabled: true,
    isEmailVerified: true  // ✅ Email vérifié pour les comptes de démo
  }
];

async function seedUsers() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB Atlas\n');

    // Supprimer les anciens comptes de démo
    const deleteResult = await User.deleteMany({ 
      email: { $in: ['agriculteur@test.com', 'admin@test.com'] } 
    });
    console.log(`🗑️  ${deleteResult.deletedCount} anciens comptes supprimés\n`);

    // Créer les nouveaux comptes
    console.log('📝 Création des comptes de démonstration...\n');
    
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });
      
      console.log(`✅ ${user.role === 'admin' ? '👨‍💼' : '👨‍🌾'} ${user.nom}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mot de passe: password123`);
      console.log(`   Rôle: ${user.role}`);
      console.log(`   Email vérifié: ${user.isEmailVerified ? '✅' : '❌'}\n`);
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║          ✨ Comptes créés avec succès ! ✨           ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    console.log('📝 IDENTIFIANTS DE CONNEXION:\n');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ 👨‍🌾 AGRICULTEUR                                      │');
    console.log('│   Email    : agriculteur@test.com                   │');
    console.log('│   Password : password123                            │');
    console.log('│   Accès    : Dashboard, Capteurs, Irrigation, IA   │');
    console.log('└─────────────────────────────────────────────────────┘\n');
    
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│ 👨‍💼 ADMINISTRATEUR                                   │');
    console.log('│   Email    : admin@test.com                         │');
    console.log('│   Password : password123                            │');
    console.log('│   Accès    : Toutes les fonctionnalités + Gestion  │');
    console.log('└─────────────────────────────────────────────────────┘\n');
    
    console.log('🌐 URL de connexion: http://localhost:3000/login\n');
    
    await mongoose.disconnect();
    console.log('✅ Déconnexion de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

seedUsers();