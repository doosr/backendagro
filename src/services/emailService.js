console.log('   User:', process.env.EMAIL_USER);
console.log('   Pass:', process.env.EMAIL_PASS ? '****' + process.env.EMAIL_PASS.slice(-4) : 'NON DÉFINI');

// Configuration SMTP générique (supporte Gmail, Brevo, SendGrid, etc.)
return nodemailer.createTransporter({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // false pour 587, true pour 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Options pour éviter les timeouts
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});
};

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param {Object} user - L'utilisateur qui demande la réinitialisation
 * @param {String} resetToken - Le token de réinitialisation (non-hashé)
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    console.log('📧 Début sendPasswordResetEmail');
    console.log('   User:', user?.email);
    console.log('   Token:', resetToken ? 'Présent' : 'MANQUANT');

    const transporter = createTransporter();

    // Vérifier la connexion SMTP
    console.log('🔍 Vérification de la connexion SMTP...');
    await transporter.verify();
    console.log('✅ Connexion SMTP établie avec succès');

    // URL de réinitialisation (frontend)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log('🔗 URL de réinitialisation:', resetUrl);

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
              Bonjour ${user.nom},
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
        
        Bonjour ${user.nom},
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
        
        ${resetUrl}
        
        Ce lien expirera dans 10 minutes.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        © ${new Date().getFullYear()} SmartPlant IoT
      `
    };

    // Envoi de l'email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé avec succès');
    console.log('   Message ID:', info.messageId);
    console.log('   Destinataire:', user.email);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ ERREUR lors de l\'envoi de l\'email:');
    console.error('   Type:', error.name);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);

    if (error.code === 'EAUTH') {
      console.error('');
      console.error('🔴 ERREUR D\'AUTHENTIFICATION:');
      console.error('   Cause probable: Identifiants SMTP invalides');
      console.error('   Solution: Vérifiez EMAIL_USER et EMAIL_PASS dans .env');
      console.error('');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('');
      console.error('🔴 ERREUR DE CONNEXION:');
      console.error('   Le serveur SMTP n\'est pas accessible');
      console.error('   Vérifiez EMAIL_HOST et EMAIL_PORT dans .env');
      console.error('');
    }

    // Retourner une erreur détaillée pour le debugging
    throw new Error(`Impossible d'envoyer l'email: ${error.message} (${error.code || 'NO_CODE'})`);
  }
};

/**
 * Envoie un email de vérification d'email
 * @param {Object} user - L'utilisateur qui s'est inscrit
 * @param {String} verificationToken - Le token de vérification (non-hashé)
 */
const sendEmailVerification = async (user, verificationToken) => {
  try {
    console.log('Tentative d\'envoi d\'email de vérification à:', user.email);

    const transporter = createTransporter();

    // Vérifier la connexion SMTP
    await transporter.verify();
    console.log('✅ Connexion SMTP établie avec succès');

    // URL de vérification (frontend)
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    console.log('🔗 URL de vérification:', verificationUrl);

    // Options de l'email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: 'Vérifiez votre adresse email - SmartPlant IoT',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e;">🌱 SmartPlant IoT</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Bienvenue !</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Bonjour ${user.nom},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Merci de vous être inscrit à SmartPlant IoT. 
              Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #22c55e; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Vérifier mon email
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              <br>
              <a href="${verificationUrl}" style="color: #22c55e; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #ef4444; font-size: 14px; line-height: 1.6; margin: 0;">
                ⚠️ Ce lien expirera dans <strong>24 heures</strong>.
              </p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                Si vous n'avez pas créé de compte, ignorez cet email.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} SmartPlant IoT - Système de monitoring agricole intelligent</p>
          </div>
        </div>
      `,
      text: `
        Vérification d'email - SmartPlant IoT
        
        Bonjour ${user.nom},
        
        Merci de vous être inscrit à SmartPlant IoT.
        Pour activer votre compte, cliquez sur le lien ci-dessous :
        
        ${verificationUrl}
        
        Ce lien expirera dans 24 heures.
        
        Si vous n'avez pas créé de compte, ignorez cet email.
        
        © ${new Date().getFullYear()} SmartPlant IoT
      `
    };

    // Envoi de l'email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de vérification envoyé avec succès');
    console.log('   Message ID:', info.messageId);
    console.log('   Destinataire:', user.email);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ ERREUR lors de l\'envoi de l\'email:');
    console.error('   Type:', error.name);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);

    throw new Error('Impossible d\'envoyer l\'email: ' + error.message);
  }
};

/**
 * Fonction de test pour vérifier la configuration email
 */
const testEmailConfiguration = async () => {
  try {
    console.log('🧪 Test de la configuration email...');
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Configuration email valide !');
    return { success: true, message: 'Configuration valide' };
  } catch (error) {
    console.error('❌ Configuration email invalide:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendEmailVerification,
  testEmailConfiguration
};