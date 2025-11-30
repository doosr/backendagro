const SibApiV3Sdk = require('@sendinblue/client');

// Configuration de l'API Brevo (Sendinblue)
let apiInstance;

try {
  // Initialiser l'instance de l'API
  apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  // Vérifier que la clé API est configurée
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️  BREVO_API_KEY non configurée dans .env');
    console.warn('   L\'envoi d\'emails ne fonctionnera pas');
    console.warn('   Obtenez une clé API sur: https://app.brevo.com/settings/keys/api');
  } else {
    // Configurer la clé API
    if (apiInstance.authentications && apiInstance.authentications['apiKey']) {
      apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;
      console.log('✅ API Brevo configurée avec succès');
    } else {
      console.warn('⚠️ Impossible de configurer l\'authentification Brevo: structure inattendue');
    }
  }
} catch (error) {
  console.error('❌ ERREUR lors de la configuration de l\'API Brevo:', error.message);
  console.error('   Stack:', error.stack);
}

/**
 * Envoie un email via l'API Brevo
 * @param {Object} emailData - Données de l'email
 */
const sendEmail = async (emailData) => {
  if (!apiInstance || !process.env.BREVO_API_KEY) {
    throw new Error('API Brevo non configurée. Vérifiez BREVO_API_KEY dans .env');
  }

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // Nettoyer l'adresse email (enlever le nom si présent: "Nom <email>")
    let senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (senderEmail && senderEmail.includes('<')) {
      const match = senderEmail.match(/<([^>]+)>/);
      if (match) {
        senderEmail = match[1];
      }
    }

    sendSmtpEmail.sender = {
      email: senderEmail,
      name: 'SmartPlant IoT'
    };
    sendSmtpEmail.to = [{ email: emailData.to }];
    sendSmtpEmail.subject = emailData.subject;
    sendSmtpEmail.htmlContent = emailData.html;
    sendSmtpEmail.textContent = emailData.text;

    console.log('📧 Envoi email via API Brevo...');
    console.log('   De:', sendSmtpEmail.sender.email);
    console.log('   À:', emailData.to);
    console.log('   Sujet:', emailData.subject);

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('✅ Email envoyé avec succès via API Brevo');
    console.log('   Message ID:', result.messageId);

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('❌ ERREUR lors de l\'envoi via API Brevo:');
    console.error('   Error Object:', JSON.stringify(error, null, 2));

    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Body:', JSON.stringify(error.response.body, null, 2));
    }

    const errorMessage = error.message || (error.response && error.response.body && error.response.body.message) || 'Erreur inconnue';
    throw new Error(`Impossible d'envoyer l'email: ${errorMessage}`);
  }
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

    // URL de réinitialisation (frontend)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log('🔗 URL de réinitialisation:', resetUrl);

    const emailData = {
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

    const result = await sendEmail(emailData);
    console.log('   Destinataire:', user.email);

    return result;
  } catch (error) {
    console.error('❌ ERREUR lors de l\'envoi de l\'email de réinitialisation:');
    console.error('   Type:', error.name);
    console.error('   Message:', error.message);

    throw new Error(`Impossible d'envoyer l'email: ${error.message}`);
  }
};

/**
 * Envoie un email de vérification d'email
 * @param {Object} user - L'utilisateur qui s'est inscrit
 * @param {String} verificationToken - Le token de vérification (non-hashé)
 */
const sendEmailVerification = async (user, verificationToken) => {
  try {
    console.log('📧 Tentative d\'envoi d\'email de vérification à:', user.email);

    // URL de vérification (frontend)
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    console.log('🔗 URL de vérification:', verificationUrl);

    const emailData = {
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

    const result = await sendEmail(emailData);
    console.log('   Destinataire:', user.email);

    return result;
  } catch (error) {
    console.error('❌ ERREUR lors de l\'envoi de l\'email de vérification:');
    console.error('   Type:', error.name);
    console.error('   Message:', error.message);

    throw new Error('Impossible d\'envoyer l\'email: ' + error.message);
  }
};

/**
 * Fonction de test pour vérifier la configuration de l'API Brevo
 */
const testEmailConfiguration = async () => {
  try {
    console.log('🧪 Test de la configuration de l\'API Brevo...');

    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY non configurée');
    }

    if (!apiInstance) {
      throw new Error('API Brevo non initialisée');
    }

    console.log('✅ Configuration API Brevo valide !');
    return { success: true, message: 'Configuration valide' };
  } catch (error) {
    console.error('❌ Configuration API Brevo invalide:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendEmailVerification,
  testEmailConfiguration
}; 