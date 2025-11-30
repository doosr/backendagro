require('dotenv').config();
const SibApiV3Sdk = require('@sendinblue/client');

try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    console.log('Instance created');

    // Check authentications property
    if (apiInstance.authentications) {
        console.log('Authentications found:', Object.keys(apiInstance.authentications));
        if (apiInstance.authentications['apiKey']) {
            console.log('Setting API key on instance.authentications.apiKey');
            apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;
        }
    } else {
        console.log('No authentications property on instance');
        // Try setApiKey method if it exists
        if (apiInstance.setApiKey) {
            console.log('Using setApiKey method');
            apiInstance.setApiKey(0, process.env.BREVO_API_KEY); // 0 is usually for api-key
        }
    }

    console.log('Configuration attempt finished');

    // Try to send a test email (dry run or just check if it throws auth error immediately)
    // We won't actually send to avoid spamming, just checking config structure.

} catch (error) {
    console.log('Error:', error.message);
}
