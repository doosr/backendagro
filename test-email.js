require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Script de test pour vérifier la configuration email
 */

async function testEmailConfig() {
    console.log('🔧 Test de configuration email...\n');

    // Afficher les variables d'environnement (sans le mot de passe)
    console.log('📋 Configuration actuelle:');
    console.log(`  EMAIL_HOST: ${process.env.EMAIL_HOST}`);
    console.log(`  EMAIL_PORT: ${process.env.EMAIL_PORT}`);
    console.log(`  EMAIL_SECURE: ${process.env.EMAIL_SECURE}`);
    console.log(`  EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`  EMAIL_PASS: ${process.env.EMAIL_PASS ? '***configuré***' : 'NON CONFIGURÉ'}`);
    console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM}`);
    console.log(`  FRONTEND_URL: ${process.env.FRONTEND_URL}\n`);

    // Créer le transporteur
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Vérifier la connexion
        console.log('🔍 Vérification de la connexion au serveur SMTP...');
        await transporter.verify();
        console.log('✅ Connexion au serveur SMTP réussie!\n');

        // Envoyer un email de test
        console.log('📧 Envoi d\'un email de test...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: 'dawserbelgacem122@gmail.com', // Email fourni par l'utilisateur
            subject: 'Test Email - SmartPlant IoT',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">🌱 SmartPlant IoT</h1>
          <h2>Email de Test</h2>
          <p>Cet email confirme que la configuration SMTP fonctionne correctement.</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">
            Si vous recevez cet email, la configuration est opérationnelle.
          </p>
        </div>
      `,
            text: 'Email de test - La configuration SMTP fonctionne correctement.'
        });

        console.log('✅ Email de test envoyé avec succès!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Destinataire: ${process.env.EMAIL_USER}\n`);

        console.log('✨ Test terminé avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors du test email:');
        console.error(`   Type: ${error.name}`);
        console.error(`   Message: ${error.message}`);

        if (error.code) {
            console.error(`   Code: ${error.code}`);
        }

        if (error.responseCode) {
            console.error(`   Response Code: ${error.responseCode}`);
        }

        if (error.response) {
            console.error(`   Réponse du serveur: ${error.response}`);
        }

        console.log('\n💡 Solutions possibles:');
        console.log('  1. Vérifiez que le mot de passe d\'application Gmail est correct');
        console.log('  2. Assurez-vous que la validation en 2 étapes est activée dans Gmail');
        console.log('  3. Vérifiez que vous utilisez un "App Password" et non votre mot de passe Gmail');
        console.log('  4. Visitez: https://myaccount.google.com/apppasswords');

        process.exit(1);
    }
}

// Exécuter le test
testEmailConfig();
