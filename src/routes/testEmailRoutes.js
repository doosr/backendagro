// routes/testEmailRoutes.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

/**
 * Test 1: Vérifier les variables d'environnement
 */
router.get('/test-env', (req, res) => {
    const config = {
        EMAIL_USER: process.env.EMAIL_USER ? '✅ Défini' : '❌ Manquant',
        EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Défini (longueur: ' + process.env.EMAIL_PASS.length + ')' : '❌ Manquant',
        EMAIL_FROM: process.env.EMAIL_FROM ? '✅ Défini' : '❌ Manquant',
        FRONTEND_URL: process.env.FRONTEND_URL ? '✅ Défini' : '❌ Manquant',
        values: {
            EMAIL_USER: process.env.EMAIL_USER,
            EMAIL_PASS: process.env.EMAIL_PASS ? '****' + process.env.EMAIL_PASS.slice(-4) : null,
            EMAIL_FROM: process.env.EMAIL_FROM,
            FRONTEND_URL: process.env.FRONTEND_URL
        }
    };

    res.json(config);
});

/**
 * Test 2: Vérifier la connexion SMTP Gmail
 */
router.get('/test-connection', async (req, res) => {
    try {
        console.log('🔍 Test de connexion SMTP Gmail...');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.verify();

        console.log('✅ Connexion SMTP réussie !');
        res.json({
            success: true,
            message: 'Connexion SMTP Gmail établie avec succès',
            user: process.env.EMAIL_USER
        });
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.response
        });
    }
});

/**
 * Test 3: Envoyer un email de test simple
 */
router.post('/test-send-simple', async (req, res) => {
    try {
        const { toEmail } = req.body;

        if (!toEmail) {
            return res.status(400).json({
                success: false,
                error: 'Veuillez fournir un email destinataire (toEmail)'
            });
        }

        console.log('📤 Envoi d\'email de test à:', toEmail);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: toEmail,
            subject: 'Test Email - SmartPlant IoT',
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #22c55e;">✅ Test Email Réussi !</h1>
          <p>Cet email confirme que votre configuration Gmail fonctionne correctement.</p>
          <p><strong>Envoyé le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <p><strong>Depuis:</strong> ${process.env.EMAIL_USER}</p>
        </div>
      `,
            text: 'Test email - Configuration Gmail OK'
        });

        console.log('✅ Email envoyé:', info.messageId);

        res.json({
            success: true,
            message: 'Email envoyé avec succès',
            messageId: info.messageId,
            to: toEmail
        });
    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.response
        });
    }
});

/**
 * Test 4: Test complet de réinitialisation de mot de passe
 */
router.post('/test-reset-password', async (req, res) => {
    try {
        const { email, nom } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email requis'
            });
        }

        console.log('📤 Test email de réinitialisation pour:', email);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetToken = 'test-token-' + Date.now();
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'TEST - Réinitialisation de mot de passe - SmartPlant IoT',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e;">🌱 SmartPlant IoT</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">TEST - Réinitialisation de mot de passe</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Bonjour ${nom || 'Utilisateur'},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Ceci est un <strong>EMAIL DE TEST</strong> pour vérifier la fonctionnalité de réinitialisation.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #22c55e; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Réinitialiser mon mot de passe (TEST)
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Lien de test:
              <br>
              <a href="${resetUrl}" style="color: #22c55e; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #ef4444; font-size: 14px; line-height: 1.6;">
                ⚠️ Ceci est un email de TEST - Ne pas utiliser en production
              </p>
            </div>
          </div>
        </div>
      `
        });

        console.log('✅ Email de test envoyé:', info.messageId);

        res.json({
            success: true,
            message: 'Email de réinitialisation de test envoyé',
            messageId: info.messageId,
            resetUrl: resetUrl
        });
    } catch (error) {
        console.error('❌ Erreur:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

module.exports = router;