# Configuration de l'API Brevo (Sendinblue)

## ⚠️ Important
Le backend utilise maintenant l'API Brevo au lieu de SMTP pour l'envoi d'emails. Cela évite les problèmes de ports bloqués sur les plateformes cloud comme Render.

## 📋 Étapes de configuration

### 1. Obtenir une clé API Brevo

1. Connectez-vous à votre compte Brevo: https://app.brevo.com
2. Allez dans **Settings** → **SMTP & API** → **API Keys**
   - Ou directement: https://app.brevo.com/settings/keys/api
3. Créez une nouvelle clé API:
   - Cliquez sur "Create a new API key"
   - Donnez-lui un nom (ex: "SmartPlant Production")
   - Copiez la clé générée

### 2. Configuration locale (.env)

Ajoutez cette variable dans votre fichier `.env`:

```env
BREVO_API_KEY=votre-clé-api-brevo-ici
```

Exemple de fichier `.env` complet:
```env
# Email Configuration (Brevo API)
BREVO_API_KEY=xkeysib-1234567890abcdef...
EMAIL_FROM=noreply@votredomaine.com
EMAIL_USER=9cf13d001@smtp-brevo.com
FRONTEND_URL=http://localhost:3000

# Autres variables...
```

### 3. Configuration sur Render

1. Allez sur votre dashboard Render: https://dashboard.render.com
2. Sélectionnez votre service backend
3. Allez dans **Environment** → **Environment Variables**
4. Ajoutez la variable:
   - **Key**: `BREVO_API_KEY`
   - **Value**: votre clé API Brevo
5. Cliquez sur **Save Changes**
6. Le service redémarrera automatiquement

### 4. Tester localement

Exécutez le script de test:

```bash
node test-brevo-api.js
```

Si tout est bien configuré, vous devriez voir:
```
✅ BREVO_API_KEY trouvée
📋 Test 1: Vérification de la configuration...
✅ Configuration API Brevo valide !
📧 Test 2: Envoi d'un email de réinitialisation...
✅ Email envoyé avec succès via API Brevo
```

## 🔧 Dépannage

### Erreur: "BREVO_API_KEY non configurée"
- Vérifiez que la variable est bien ajoutée dans `.env`
- Relancez le serveur après avoir modifié `.env`

### Erreur: "unauthorized" ou "Invalid API key"
- Votre clé API est invalide ou expirée
- Créez une nouvelle clé sur: https://app.brevo.com/settings/keys/api
- Vérifiez qu'il n'y a pas d'espaces avant/après la clé

### Erreur: "Daily limit exceeded"
- Vous avez atteint la limite d'envoi du plan gratuit de Brevo
- Vérifiez votre quota sur le dashboard Brevo
- Attendez 24h ou passez à un plan payant

## 📊 Limites du plan gratuit Brevo

- **300 emails/jour**
- Idéal pour le développement et les petits projets

Si vous avez besoin de plus, considérez:
- Plan Lite: 10,000 emails/mois
- Plan Premium: 20,000+ emails/mois

## 🔗 Liens utiles

- Dashboard Brevo: https://app.brevo.com
- Clés API: https://app.brevo.com/settings/keys/api
- Documentation API: https://developers.brevo.com
- Support: https://help.brevo.com
