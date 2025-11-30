require('dotenv').config();
const emailService = require('./src/services/emailService');

/**
 * Test de l'API Brevo
 */
async function testBrevoAPI() {
    console.log('🧪 Test de l\'API Brevo...\n');

    // Vérifier que la clé API est configurée
    if (!process.env.BREVO_API_KEY) {
        console.error('❌ BREVO_API_KEY non configurée dans .env');
        console.error('');
        console.error('📋 Instructions:');
        console.error('   1. Allez sur: https://app.brevo.com/settings/keys/api');
        console.error('   2. Créez ou copiez votre clé API');
        console.error('   3. Ajoutez dans .env: BREVO_API_KEY=votre-clé-ici');
        console.error('');
        process.exit(1);
    }

    console.log('✅ BREVO_API_KEY trouvée');
    console.log('   Clé:', process.env.BREVO_API_KEY.substring(0, 10) + '...');
    console.log('');

    try {
        // Test 1: Configuration
        console.log('📋 Test 1: Vérification de la configuration...');
        const configTest = await emailService.testEmailConfiguration();
        console.log('   Résultat:', configTest);
        console.log('');

        // Test 2: Email de réinitialisation de mot de passe
        console.log('📧 Test 2: Envoi d\'un email de réinitialisation...');
        const testUser = {
            email: 'dawserbelgacem122@gmail.com',
            nom: 'Test User'
        };
        const testToken = 'test-token-api-brevo-' + Date.now();

        const result = await emailService.sendPasswordResetEmail(testUser, testToken);
        console.log('   Résultat:', result);
        console.log('');

        console.log('✅ Tous les tests ont réussi!');
        console.log('');
        console.log('🎉 L\'API Brevo fonctionne correctement!');
        console.log('   Vérifiez votre boîte email:', testUser.email);

    } catch (error) {
        console.error('');
        console.error('❌ Erreur lors du test:');
        console.error('   Message:', error.message);

        if (error.message.includes('unauthorized') || error.message.includes('Invalid API key')) {
            console.error('');
            console.error('🔴 La clé API Brevo est invalide');
            console.error('   Vérifiez votre clé sur: https://app.brevo.com/settings/keys/api');
        }

        console.error('');
        console.error('   Stack:', error.stack);
        process.exit(1);
    }
}

// Exécuter le test
testBrevoAPI();
