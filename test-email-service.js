require('dotenv').config();
const emailService = require('./src/services/emailService');

/**
 * Test du service emailService avec les nouvelles modifications
 */
async function testEmailService() {
    console.log('🧪 Test du service emailService...\n');

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
        const testToken = 'test-token-123456';

        const result = await emailService.sendPasswordResetEmail(testUser, testToken);
        console.log('   Résultat:', result);
        console.log('');

        console.log('✅ Tous les tests ont réussi!');
        console.log('   Vérifiez votre boîte email:', testUser.email);

    } catch (error) {
        console.error('❌ Erreur lors du test:');
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        process.exit(1);
    }
}

// Exécuter les tests
testEmailService();
