require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function testEmail() {
  try {
    console.log('🔄 Test de configuration email...\n');
    console.log('Configuration:');
    console.log(`  Host: ${process.env.EMAIL_HOST}`);
    console.log(`  Port: ${process.env.EMAIL_PORT}`);
    console.log(`  User: ${process.env.EMAIL_USER}`);
    console.log(`  Pass: ${process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'NON DÉFINI'}\n`);

    // Vérifier la connexion
    await transporter.verify();
    console.log('✅ Connexion au serveur SMTP réussie\n');

    // Envoyer un email de test
    const info = await transporter.sendMail({
      from: `"SmartPlant IA Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Envoi à soi-même
      subject: '✅ Test Email SmartPlant IA',
      html: `
        <h2>Email de test réussi !</h2>
        <p>Si vous recevez cet email, votre configuration est correcte.</p>
        <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
      `
    });

    console.log('✅ Email de test envoyé avec succès!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`\n✉️  Vérifiez votre boîte email: ${process.env.EMAIL_USER}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n⚠️  ERREUR D\'AUTHENTIFICATION');
      console.log('Solutions:');
      console.log('1. Activez la validation en 2 étapes sur Google');
      console.log('2. Générez un mot de passe d\'application: https://myaccount.google.com/apppasswords');
      console.log('3. Utilisez ce mot de passe dans EMAIL_PASS');
    }
  }
}

testEmail();