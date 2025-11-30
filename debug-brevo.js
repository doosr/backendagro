require('dotenv').config();
const SibApiV3Sdk = require('@sendinblue/client');

console.log('--- Debug Brevo ---');
console.log('API Key present:', !!process.env.BREVO_API_KEY);
if (process.env.BREVO_API_KEY) {
    console.log('API Key length:', process.env.BREVO_API_KEY.length);
}

console.log('SibApiV3Sdk keys:', Object.keys(SibApiV3Sdk));
try {
    console.log('ApiClient exists:', !!SibApiV3Sdk.ApiClient);
    if (SibApiV3Sdk.ApiClient) {
        console.log('ApiClient instance exists:', !!SibApiV3Sdk.ApiClient.instance);
    }

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    console.log('Authentication object exists:', !!apiKey);

    apiKey.apiKey = process.env.BREVO_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    console.log('TransactionalEmailsApi instantiated successfully');
} catch (error) {
    console.error('Error during manual init:', error);
}
