const nodemailer = require('nodemailer');

// Configuration du transporteur email avec meilleure gestion d'erreurs
const createTransporter = () => {
  try {
    // Vérification des variables d'environnement requises
    const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_PORT'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    }

    // Configuration spécifique pour Gmail
    if (process.env.EMAIL_HOST.includes('gmail')) {
      console.log('📧 Utilisation de Gmail...');
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Doit être un "App Password", pas le mot de passe Gmail
        },
        debug: true, // Active les logs détaillés
        logger: true
      });
    }

    // Configuration pour Outlook/Hotmail
    if (process.env.EMAIL_HOST.includes('outlook') || process.env.EMAIL_HOST.includes('hotmail')) {
      console.log('📧 Utilisation d\'Outlook...');
      return nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          ciphers: 'SSLv3'
        },
        debug: true,
        logger: true
      });
    }

    // Configuration standard pour autres fournisseurs
    console.log(`📧 Configuration standard pour: ${process.env.EMAIL_HOST}`);
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true', // true pour port 465, false pour 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création du transporteur:', error.message);
    throw error;
  }
};

/**
 * Teste la connexion SMTP
 */
const testConnection = async () => {
  try {
    const transporter = createTransporter();
    console.log('🔍 Test de connexion SMTP...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');
    return true;
  } catch (error) {
    console.error('❌ Échec de la connexion SMTP:', error.message);
    return false;
  }
};

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param {Object} user - L'utilisateur qui demande la réinitialisation
 * @param {String} resetToken - Le token de réinitialisation (non-hashé)
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    // Validation des paramètres
    if (!user || !user.email) {
      throw new Error('Utilisateur ou email invalide');
    }
    if (!resetToken) {
      throw new Error('Token de réinitialisation manquant');
    }

    console.log(`📨 Envoi d'email à: ${user.email}`);

    const transporter = createTransporter();

    // Test de connexion avant l'envoi
    try {
      await transporter.verify();
      console.log('✅ Serveur SMTP prêt');
    } catch (verifyError) {
      console.error('⚠️ Avertissement: vérification SMTP échouée:', verifyError.message);
      // Continue quand même, parfois verify échoue mais sendMail fonctionne
    }

    // URL de réinitialisation (frontend)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password/${resetToken}`;

    // Options de l'email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe - SmartPlant IoT',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e;">🌱 SmartPlant IoT</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Réinitialisation de mot de passe</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Bonjour ${user.nom || 'Utilisateur'},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Vous avez demandé la réinitialisation de votre mot de passe. 
              Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #22c55e; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              <br>
              <a href="${resetUrl}" style="color: #22c55e; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 0;">
                ⚠️ Ce lien expirera dans <strong>10 minutes</strong>.
              </p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} SmartPlant IoT - Système de monitoring agricole intelligent</p>
          </div>
        </div>
      `,
      text: `
        Réinitialisation de mot de passe - SmartPlant IoT
        
        Bonjour ${user.nom || 'Utilisateur'},
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
        
        ${resetUrl}
        
        Ce lien expirera dans 10 minutes.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        © ${new Date().getFullYear()} SmartPlant IoT
      `
    };

    // Envoi de l'email
    console.log('📤 Envoi en cours...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé avec succès!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Erreur détaillée lors de l\'envoi de l\'email:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Command:', error.command);

    if (error.response) {
      console.error('   Response:', error.response);
    }

    if (error.responseCode) {
      console.error('   Response Code:', error.responseCode);
    }

    // Vérifier la config (sans afficher le mot de passe)
    console.error('🔍 Configuration utilisée:');
    console.error(`   Host: ${process.env.EMAIL_HOST}`);
    console.error(`   Port: ${process.env.EMAIL_PORT}`);
    console.error(`   Secure: ${process.env.EMAIL_SECURE}`);
    console.error(`   User: ${process.env.EMAIL_USER}`);
    console.error(`   From: ${process.env.EMAIL_FROM}`);

    // Messages d'erreur spécifiques
    if (error.code === 'EAUTH') {
      throw new Error('Authentification échouée. Vérifiez EMAIL_USER et EMAIL_PASS. Pour Gmail, utilisez un "App Password".');
    } else if (error.code === 'ESOCKET') {
      throw new Error('Impossible de se connecter au serveur SMTP. Vérifiez EMAIL_HOST et EMAIL_PORT.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Timeout de connexion. Vérifiez votre connexion internet et les paramètres du firewall.');
    } else {
      throw new Error('Impossible d\'envoyer l\'email: ' + error.message);
    }
  }
};

module.exports = {
  sendPasswordResetEmail,
  testConnection
};