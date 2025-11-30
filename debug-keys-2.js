require('dotenv').config();
const SibApiV3Sdk = require('@sendinblue/client');

console.log('Has ApiClient:', 'ApiClient' in SibApiV3Sdk);
console.log('Has TransactionalEmailsApi:', 'TransactionalEmailsApi' in SibApiV3Sdk);
console.log('Has SendSmtpEmail:', 'SendSmtpEmail' in SibApiV3Sdk);
