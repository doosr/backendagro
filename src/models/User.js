const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, "L'email est requis"],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'agriculteur'],
    default: 'agriculteur'
  },
  telephone: {
    type: String,
    trim: true
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  seuilHumiditeSol: {
    type: Number,
    default: 500
  },
  arrosageAutomatique: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);