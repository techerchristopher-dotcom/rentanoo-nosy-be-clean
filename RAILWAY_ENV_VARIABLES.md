# 🔐 VARIABLES D'ENVIRONNEMENT - RAILWAY DEPLOYMENT

**Date** : 2025-01-27  
**Projet** : Rentanoo Nosy Be  
**Plateforme** : Railway

---

## 📋 RÉSUMÉ RAPIDE

**Total de variables** : 20 variables (15 requises + 5 optionnelles)

**Catégories** :
- **A) VITE_* (Build time)** : 7 variables (5 requises, 2 optionnelles)
- **B) Backend runtime (process.env)** : 12 variables (10 requises, 2 optionnelles)
- **C) Edge Functions Supabase** : Configurées séparément dans Supabase Dashboard (non incluses ici)

⚠️ **IMPORTANT** : Les variables `VITE_*` doivent être configurées **AVANT** le premier build sur Railway.

---

## 📊 A) VITE_* (BUILD TIME)

Ces variables sont injectées dans le code JavaScript au moment du build Vite. Elles doivent exister avant `npm run build`.

### A1. VITE_SUPABASE_URL

- **Nom** : `VITE_SUPABASE_URL`
- **Où** : `src/integrations/supabase/client.ts:6`, `src/lib/payerLocation.ts:4`
- **Required** : ✅ **OUI** (erreur si absente)
- **Exemple** : `https://zykwfjxurwmputxwlkxs.supabase.co`
- **Notes** :
  - URL du projet Supabase
  - Utilisée pour initialiser le client Supabase
  - Utilisée pour construire l'URL des Edge Functions

```typescript
// src/integrations/supabase/client.ts:6
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("❌ Variables Supabase manquantes !");
}
```

---

### A2. VITE_SUPABASE_ANON_KEY

- **Nom** : `VITE_SUPABASE_ANON_KEY`
- **Où** : `src/integrations/supabase/client.ts:7`
- **Required** : ✅ **OUI** (erreur si absente)
- **Exemple** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Notes** :
  - Clé publique (anon) Supabase
  - Récupérable depuis : https://supabase.com/dashboard/project/[PROJECT_ID]/settings/api
  - **Sécurité** : Cette clé est publique (OK à exposer dans le frontend)

```typescript
// src/integrations/supabase/client.ts:7
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

### A3. VITE_STRIPE_PUBLISHABLE_KEY

- **Nom** : `VITE_STRIPE_PUBLISHABLE_KEY`
- **Où** : `src/lib/stripePublicKey.ts:1`
- **Required** : ✅ **OUI** (utilisée pour Stripe Checkout)
- **Exemple** : `pk_test_51AbCdEf...` (test) ou `pk_live_51AbCdEf...` (production)
- **Notes** :
  - Clé publique Stripe (publishable key)
  - Récupérable depuis : https://dashboard.stripe.com/apikeys
  - **Sécurité** : Cette clé est publique (OK à exposer dans le frontend)

```typescript
// src/lib/stripePublicKey.ts:1
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
```

---

### A4. VITE_PUBLIC_SITE_URL

- **Nom** : `VITE_PUBLIC_SITE_URL`
- **Où** : `src/lib/config.ts:23`
- **Required** : ⚠️ **OPTIONNEL** (fallback disponible)
- **Exemple** : `https://rentanoo.com` ou `https://votre-app.railway.app`
- **Notes** :
  - URL publique du site (utilisée pour les redirections, liens, etc.)
  - **Fallback** : Si absente, utilise `window.location.origin` en runtime
  - **Recommandé** : La définir pour éviter les problèmes de redirection

```typescript
// src/lib/config.ts:23
if (import.meta.env.VITE_PUBLIC_SITE_URL) {
  return import.meta.env.VITE_PUBLIC_SITE_URL;
}
// Fallback pour build/SSR
return 'http://localhost:3002';
```

---

### A5. VITE_APP_CONTEXT

- **Nom** : `VITE_APP_CONTEXT`
- **Où** : `src/integrations/supabase/client.ts:15`
- **Required** : ⚠️ **OPTIONNEL** (défaut: `'tenant'`)
- **Exemple** : `tenant` ou `owner`
- **Notes** :
  - Contexte de l'application (pour isoler les sessions)
  - **En production** : Généralement `tenant` (une seule instance)
  - **En dev local** : Permet d'avoir deux instances (tenant sur 3012, owner sur 3013)

```typescript
// src/integrations/supabase/client.ts:15
const APP_CONTEXT = import.meta.env.VITE_APP_CONTEXT || 'tenant';
```

---

### A6. VITE_API_URL

- **Nom** : `VITE_API_URL`
- **Où** : `src/pages/Contact.tsx:80`
- **Required** : ⚠️ **OPTIONNEL** (fallback: `http://localhost:3000`)
- **Exemple** : `https://votre-app.railway.app` (sans `/api`)
- **Notes** :
  - URL de base de l'API backend
  - **En production** : Devrait pointer vers votre domaine Railway
  - **Fallback** : `http://localhost:3000` (pour dev local uniquement)
  - **Usage** : Utilisée uniquement pour le formulaire de contact

```typescript
// src/pages/Contact.tsx:80
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const response = await fetch(`${apiUrl}/api/contact`, {
```

---

### A7. VITE_DEV_PORT

- **Nom** : `VITE_DEV_PORT`
- **Où** : `vite.config.ts:11`
- **Required** : ⚠️ **OPTIONNEL** (uniquement pour dev local)
- **Exemple** : `3002`, `3012`, `3013`
- **Notes** :
  - **IGNORÉ EN PRODUCTION** : Utilisée uniquement par Vite dev server
  - **Pas nécessaire sur Railway** : Railway utilise le port défini par `PORT`
  - **Recommandation** : Ne pas la configurer sur Railway

```typescript
// vite.config.ts:11
const devPort = Number(process.env.VITE_DEV_PORT || process.env.PORT || 3002);
```

---

## 📊 B) BACKEND RUNTIME (process.env)

Ces variables sont utilisées par le serveur Express au runtime. Elles ne sont pas incluses dans le build frontend.

### B1. SUPABASE_URL

- **Nom** : `SUPABASE_URL`
- **Où** : `server/index.ts:22`
- **Required** : ✅ **OUI** (erreur si absente)
- **Exemple** : `https://zykwfjxurwmputxwlkxs.supabase.co`
- **Notes** :
  - **Duplication** : Même valeur que `VITE_SUPABASE_URL` mais sans préfixe `VITE_`
  - Utilisée par le serveur Express pour créer le client Supabase admin (service role)
  - **Stratégie** : Utiliser la même valeur que `VITE_SUPABASE_URL`

```typescript
// server/index.ts:22
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);
```

---

### B2. SUPABASE_SERVICE_ROLE_KEY

- **Nom** : `SUPABASE_SERVICE_ROLE_KEY`
- **Où** : `server/index.ts:23`
- **Required** : ✅ **OUI** (erreur si absente)
- **Exemple** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (très long)
- **Notes** :
  - **⚠️ SÉCURITÉ CRITIQUE** : Clé secrète avec permissions admin (bypass RLS)
  - **NE JAMAIS** exposer dans le frontend
  - Récupérable depuis : https://supabase.com/dashboard/project/[PROJECT_ID]/settings/api
  - Utilisée pour les opérations serveur (webhooks, checkin, etc.)

```typescript
// server/index.ts:23
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);
```

---

### B3. STRIPE_SECRET_KEY

- **Nom** : `STRIPE_SECRET_KEY`
- **Où** : `server/index.ts:12` (import dynamique depuis `src/lib/stripe.ts`)
- **Required** : ✅ **OUI** (erreur si absente)
- **Exemple** : `sk_test_51AbCdEf...` (test) ou `sk_live_51AbCdEf...` (production)
- **Notes** :
  - **⚠️ SÉCURITÉ CRITIQUE** : Clé secrète Stripe
  - **NE JAMAIS** exposer dans le frontend
  - Récupérable depuis : https://dashboard.stripe.com/apikeys
  - Utilisée pour créer les sessions Stripe Checkout et vérifier les webhooks

```typescript
// src/lib/stripe.ts:3-7
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY manquante dans .env.local");
}
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

---

### B4. STRIPE_WEBHOOK_SECRET

- **Nom** : `STRIPE_WEBHOOK_SECRET`
- **Où** : `server/index.ts:33`
- **Required** : ⚠️ **OPTIONNEL en dev, REQUIS en production**
- **Exemple** : `whsec_1234567890abcdef...`
- **Notes** :
  - Secret pour vérifier la signature des webhooks Stripe
  - **En dev** : Peut être omis (mode non sécurisé)
  - **En production** : **OBLIGATOIRE** pour sécuriser les webhooks
  - Récupérable depuis : https://dashboard.stripe.com/webhooks → Sélectionner le webhook → "Signing secret"
  - **URL webhook** : `https://votre-app.railway.app/api/stripe/webhook`

```typescript
// server/index.ts:33
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (webhookSecret) {
  // Vérifier la signature
} else {
  console.warn("⚠️ STRIPE_WEBHOOK_SECRET non configuré - mode dev non sécurisé");
}
```

---

### B5. EMAIL_TO

- **Nom** : `EMAIL_TO`
- **Où** : `server/index.ts:242`
- **Required** : ✅ **OUI** (si vous voulez recevoir les emails de contact)
- **Exemple** : `contact@rentanoo.com`
- **Notes** :
  - Adresse email de destination pour le formulaire de contact
  - Si absente, le formulaire de contact retournera une erreur 500

```typescript
// server/index.ts:242
const emailTo = process.env.EMAIL_TO;
if (!emailTo) {
  console.error("❌ EMAIL_TO non configuré dans les variables d'environnement");
  return res.status(500).json({
    error: "Configuration serveur manquante",
  });
}
```

---

### B6. EMAIL_FROM

- **Nom** : `EMAIL_FROM`
- **Où** : `server/index.ts:243`
- **Required** : ⚠️ **OPTIONNEL** (fallback sur l'email du formulaire)
- **Exemple** : `noreply@rentanoo.com`
- **Notes** :
  - Adresse email expéditrice
  - **Fallback** : Si absente, utilise l'email du formulaire de contact
  - **Recommandé** : La définir pour éviter les problèmes de spam

```typescript
// server/index.ts:243
const emailFrom = process.env.EMAIL_FROM || email;
```

---

### B7. SMTP_HOST

- **Nom** : `SMTP_HOST`
- **Où** : `server/index.ts:271`
- **Required** : ⚠️ **OPTIONNEL** (défaut: `smtp.gmail.com`)
- **Exemple** : `smtp.gmail.com`, `smtp.sendgrid.net`, `smtp.mailgun.org`
- **Notes** :
  - Serveur SMTP pour l'envoi d'emails
  - **Défaut** : `smtp.gmail.com` (Gmail)
  - **Autres options** : SendGrid, Mailgun, AWS SES, etc.

```typescript
// server/index.ts:271
host: process.env.SMTP_HOST || "smtp.gmail.com",
```

---

### B8. SMTP_PORT

- **Nom** : `SMTP_PORT`
- **Où** : `server/index.ts:272`
- **Required** : ⚠️ **OPTIONNEL** (défaut: `587`)
- **Exemple** : `587` (TLS), `465` (SSL), `25` (non sécurisé, déconseillé)
- **Notes** :
  - Port SMTP
  - **Défaut** : `587` (TLS)
  - **465** : SSL (nécessite `SMTP_SECURE=true`)

```typescript
// server/index.ts:272
port: Number(process.env.SMTP_PORT) || 587,
```

---

### B9. SMTP_SECURE

- **Nom** : `SMTP_SECURE`
- **Où** : `server/index.ts:273`
- **Required** : ⚠️ **OPTIONNEL** (défaut: `false`)
- **Exemple** : `true` (pour port 465) ou `false` (pour port 587)
- **Notes** :
  - Active SSL/TLS direct (pour port 465)
  - **Défaut** : `false` (TLS STARTTLS pour port 587)
  - **Port 465** : Nécessite `SMTP_SECURE=true`

```typescript
// server/index.ts:273
secure: process.env.SMTP_SECURE === "true", // true pour 465, false pour autres ports
```

---

### B10. SMTP_USER

- **Nom** : `SMTP_USER`
- **Où** : `server/index.ts:275`
- **Required** : ✅ **OUI** (si vous voulez envoyer des emails)
- **Exemple** : `votre-email@gmail.com` (Gmail) ou `apikey` (SendGrid)
- **Notes** :
  - Nom d'utilisateur SMTP
  - **Gmail** : Votre adresse email Gmail
  - **SendGrid** : `apikey` (littéralement)
  - **Mailgun** : Votre adresse email Mailgun

```typescript
// server/index.ts:275
auth: {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
},
```

---

### B11. SMTP_PASS

- **Nom** : `SMTP_PASS`
- **Où** : `server/index.ts:276`
- **Required** : ✅ **OUI** (si vous voulez envoyer des emails)
- **Exemple** : `votre-app-password` (Gmail App Password)
- **Notes** :
  - **⚠️ SÉCURITÉ** : Mot de passe SMTP (ne jamais exposer)
  - **Gmail** : Utiliser un "App Password" (pas votre mot de passe normal)
    - Créer un App Password : https://myaccount.google.com/apppasswords
  - **SendGrid** : Votre API Key
  - **Mailgun** : Votre API Key

```typescript
// server/index.ts:276
auth: {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
},
```

---

### B12. PORT

- **Nom** : `PORT`
- **Où** : `server/index.ts:682`
- **Required** : ⚠️ **OPTIONNEL** (défaut: `3000`)
- **Exemple** : `3000`
- **Notes** :
  - **Railway** : Définit automatiquement `PORT` (pas besoin de le configurer)
  - **Défaut** : `3000` si absente
  - **Recommandation** : Ne pas la configurer sur Railway (Railway la définit automatiquement)

```typescript
// server/index.ts:682
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
```

---

### B13. NODE_ENV

- **Nom** : `NODE_ENV`
- **Où** : `server/index.ts:663`, `nixpacks.toml:13`
- **Required** : ⚠️ **OPTIONNEL** (Railway peut le définir automatiquement)
- **Exemple** : `production`
- **Notes** :
  - **Railway** : Peut définir automatiquement `NODE_ENV=production`
  - **Script** : `npm run start:prod` définit déjà `NODE_ENV=production`
  - **Recommandation** : Ne pas la configurer (déjà géré par le script)

```typescript
// server/index.ts:663
if (process.env.NODE_ENV === "production") {
  // Servir le frontend buildé
}
```

---

## 📊 C) EDGE FUNCTIONS SUPABASE (Non incluses ici)

Les Edge Functions Supabase sont configurées **séparément** dans le Supabase Dashboard. Elles nécessitent :

- `STRIPE_SECRET_KEY`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_WEBHOOK_SECRET` (optionnel)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ALLOWED_ORIGINS` (optionnel)

**⚠️ Important** : Ces variables sont configurées dans Supabase Dashboard → Project Settings → Edge Functions → Secrets, **PAS** dans Railway.

---

## 🔄 DUPLICATIONS ET STRATÉGIE

### Variables Dupliquées

| Variable Frontend | Variable Backend | Stratégie |
|------------------|------------------|-----------|
| `VITE_SUPABASE_URL` | `SUPABASE_URL` | **Même valeur** : Utiliser la même URL pour les deux |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `STRIPE_SECRET_KEY` | **Différentes** : Publishable (frontend) vs Secret (backend) |

### Stratégie Recommandée

1. **Variables Supabase** :
   - `VITE_SUPABASE_URL` = `https://zykwfjxurwmputxwlkxs.supabase.co`
   - `SUPABASE_URL` = `https://zykwfjxurwmputxwlkxs.supabase.co` (même valeur)

2. **Variables Stripe** :
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...` (clé publique)
   - `STRIPE_SECRET_KEY` = `sk_test_...` (clé secrète, différente)

3. **Variables Email** :
   - Configurer uniquement si vous voulez activer le formulaire de contact
   - Sinon, laisser vides (le formulaire retournera une erreur)

---

## 📋 BLOC 1 : VARIABLES RAILWAY (Prêt à coller)

Copiez-collez ce bloc dans Railway → Variables → "Add Variable" (une par une) :

```
VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEf...
VITE_PUBLIC_SITE_URL=https://votre-app.railway.app
VITE_APP_CONTEXT=tenant
VITE_API_URL=https://votre-app.railway.app
SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_51AbCdEf...
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
EMAIL_TO=contact@rentanoo.com
EMAIL_FROM=noreply@rentanoo.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
NODE_ENV=production
```

**⚠️ Remplacez** :
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` → Votre vraie clé Supabase
- `pk_test_51AbCdEf...` → Votre vraie clé Stripe publique
- `sk_test_51AbCdEf...` → Votre vraie clé Stripe secrète
- `whsec_1234567890abcdef...` → Votre vrai secret webhook Stripe
- `https://votre-app.railway.app` → Votre domaine Railway (ou domaine personnalisé)
- `contact@rentanoo.com` → Votre adresse email
- `votre-email@gmail.com` → Votre email SMTP
- `votre-app-password` → Votre mot de passe SMTP

**⚠️ Variables optionnelles** (peuvent être omises) :
- `VITE_PUBLIC_SITE_URL` (fallback disponible)
- `VITE_APP_CONTEXT` (défaut: `tenant`)
- `VITE_API_URL` (fallback: `http://localhost:3000`)
- `EMAIL_FROM` (fallback sur email du formulaire)
- `SMTP_HOST` (défaut: `smtp.gmail.com`)
- `SMTP_PORT` (défaut: `587`)
- `SMTP_SECURE` (défaut: `false`)
- `NODE_ENV` (déjà défini par `npm run start:prod`)

---

## ✅ BLOC 2 : CHECKLIST RAILWAY (Ordre recommandé)

### Étape 1 : Variables Supabase (OBLIGATOIRES)

1. ✅ `VITE_SUPABASE_URL` = `https://zykwfjxurwmputxwlkxs.supabase.co`
2. ✅ `VITE_SUPABASE_ANON_KEY` = [Récupérer depuis Supabase Dashboard]
3. ✅ `SUPABASE_URL` = `https://zykwfjxurwmputxwlkxs.supabase.co` (même valeur que VITE_SUPABASE_URL)
4. ✅ `SUPABASE_SERVICE_ROLE_KEY` = [Récupérer depuis Supabase Dashboard]

**Où récupérer** : https://supabase.com/dashboard/project/zykwfjxurwmputxwlkxs/settings/api

---

### Étape 2 : Variables Stripe (OBLIGATOIRES)

5. ✅ `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...` ou `pk_live_...`
6. ✅ `STRIPE_SECRET_KEY` = `sk_test_...` ou `sk_live_...`
7. ✅ `STRIPE_WEBHOOK_SECRET` = `whsec_...` (après avoir créé le webhook dans Stripe)

**Où récupérer** : https://dashboard.stripe.com/apikeys

**⚠️ Webhook Stripe** :
- Créer le webhook dans Stripe Dashboard : https://dashboard.stripe.com/webhooks
- URL : `https://votre-app.railway.app/api/stripe/webhook`
- Événements : `checkout.session.completed`
- Récupérer le "Signing secret" après création

---

### Étape 3 : Variables Site (RECOMMANDÉES)

8. ✅ `VITE_PUBLIC_SITE_URL` = `https://votre-app.railway.app` (ou domaine personnalisé)
9. ✅ `VITE_API_URL` = `https://votre-app.railway.app` (même valeur que VITE_PUBLIC_SITE_URL)

**⚠️ Important** : Attendre que Railway génère le domaine avant de configurer ces variables.

---

### Étape 4 : Variables Email (OPTIONNELLES - Si formulaire de contact activé)

10. ✅ `EMAIL_TO` = `contact@rentanoo.com`
11. ✅ `EMAIL_FROM` = `noreply@rentanoo.com` (optionnel)
12. ✅ `SMTP_HOST` = `smtp.gmail.com` (optionnel, défaut)
13. ✅ `SMTP_PORT` = `587` (optionnel, défaut)
14. ✅ `SMTP_SECURE` = `false` (optionnel, défaut)
15. ✅ `SMTP_USER` = `votre-email@gmail.com`
16. ✅ `SMTP_PASS` = `votre-app-password` (Gmail App Password)

**⚠️ Gmail App Password** : https://myaccount.google.com/apppasswords

---

### Étape 5 : Variables Optionnelles

17. ✅ `VITE_APP_CONTEXT` = `tenant` (optionnel, défaut)
18. ✅ `NODE_ENV` = `production` (optionnel, déjà défini par script)

---

### Étape 6 : Déploiement

19. ✅ **Premier déploiement** : Railway va builder l'application avec les variables `VITE_*`
20. ✅ **Vérifier les logs** : Vérifier que le build réussit et que le serveur démarre
21. ✅ **Tester l'application** : Vérifier que l'app fonctionne en production
22. ✅ **Configurer Stripe Webhook** : Ajouter l'URL Railway dans Stripe Dashboard

---

## 🚨 VARIABLES MANQUANTES (Non trouvées dans le code)

Aucune variable manquante détectée. Toutes les variables nécessaires sont présentes dans le code.

---

## 📝 NOTES IMPORTANTES

### Ordre de Configuration

1. **AVANT le premier build** : Configurer toutes les variables `VITE_*` (sinon le build peut échouer)
2. **Après le premier déploiement** : Configurer les variables backend (runtime)
3. **Après avoir le domaine Railway** : Mettre à jour `VITE_PUBLIC_SITE_URL` et `VITE_API_URL`

### Variables Sensibles

**⚠️ Ne jamais exposer** :
- `SUPABASE_SERVICE_ROLE_KEY` (permissions admin)
- `STRIPE_SECRET_KEY` (clé secrète)
- `STRIPE_WEBHOOK_SECRET` (sécurité webhooks)
- `SMTP_PASS` (mot de passe email)

**✅ OK à exposer** (dans le frontend) :
- `VITE_SUPABASE_URL` (URL publique)
- `VITE_SUPABASE_ANON_KEY` (clé publique)
- `VITE_STRIPE_PUBLISHABLE_KEY` (clé publique)

### Redéploiement

Après avoir ajouté/modifié des variables :
1. Railway redéploie automatiquement si "Auto Deploy" est activé
2. Sinon, cliquer sur "Redeploy" manuellement

---

**Document généré le** : 2025-01-27  
**Version** : 1.0  
**Projet** : Rentanoo Nosy Be

