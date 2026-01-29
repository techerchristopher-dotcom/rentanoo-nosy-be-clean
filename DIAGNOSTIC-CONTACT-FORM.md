# 🔍 Diagnostic Formulaire Contact - Production

**Date**: 2026-01-15  
**URL**: https://rentanoo.com/contact  
**Objectif**: Envoi automatique d'email lors de la soumission du formulaire

---

## A) DIAGNOSTIC TECHNIQUE

### 1️⃣ Comment le formulaire envoie les données

**Fichier**: `src/pages/Contact.tsx` (lignes 43-108)

**Méthode d'envoi** :
```tsx
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const response = await fetch(`${apiUrl}/api/contact`, {
  method: "POST",
  body: formData, // FormData avec champs + pièce jointe optionnelle
});
```

**Route backend** : `POST /api/contact`  
**Type de données** : `FormData` (multipart/form-data)  
**Proxy Vite** : Configuré dans `vite.config.ts` (lignes 18-24) - `/api` → `http://localhost:3001`

---

### 2️⃣ Backend / Endpoint existant

**✅ BACKEND DÉJÀ EXISTANT** : Express.js dans `server/index.ts`

**Endpoint** : `POST /api/contact` (lignes 215-338 dans `server/index.ts`)

**Fonctionnalités déjà implémentées** :
- ✅ Validation des champs (nom, email, objet, message) - lignes 227-239
- ✅ Validation format email - lignes 233-239
- ✅ Honeypot anti-spam (`website`) - lignes 220-224
- ✅ Support pièces jointes (multer) - lignes 297-304
- ✅ Envoi email via Nodemailer (SMTP) - lignes 266-314
- ✅ Gestion d'erreurs - lignes 315-337

**Configuration requise** :
- Variables d'environnement SMTP dans `.env.local` ou Railway/Vercel
- Variables : `EMAIL_TO`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

---

### 3️⃣ Où le message est stocké / envoyé aujourd'hui

**Actuellement** :
- ❌ **PAS de stockage en base** : Le message n'est pas sauvegardé dans Supabase
- ✅ **Envoi email uniquement** : Via Nodemailer (SMTP)
- ⚠️ **Pas de logs persistants** : Seulement console.log côté serveur

**État actuel** :
- Le formulaire envoie vers `/api/contact`
- L'endpoint envoie un email via SMTP
- **Problème potentiel** : Si `EMAIL_TO` ou `SMTP_*` ne sont pas configurés, l'envoi échoue silencieusement ou retourne une erreur

---

## B) SOLUTION ACTUELLE (DÉJÀ IMPLÉMENTÉE)

### ✅ Architecture en place

```
Frontend (Contact.tsx)
  └─> POST /api/contact (FormData)
      └─> Backend Express (server/index.ts)
          └─> Validation (honeypot, champs, email)
          └─> Nodemailer (SMTP)
              └─> Email envoyé à EMAIL_TO
```

### Variables d'environnement requises

**Backend** (`server/index.ts`) :
```env
# Email destinataire (où recevoir les messages)
EMAIL_TO=contact@rentanoo.com

# Email expéditeur (optionnel, par défaut = email du client)
EMAIL_FROM=noreply@rentanoo.com

# Configuration SMTP
SMTP_HOST=smtp.gmail.com          # ou smtp.ovh.net, smtp.sendgrid.net, etc.
SMTP_PORT=587                     # ou 465 (avec secure=true)
SMTP_SECURE=false                 # true pour port 465, false pour 587
SMTP_USER=votre-email@example.com
SMTP_PASS=votre-mot-de-passe-app  # Mot de passe d'application (Gmail) ou API key
```

**Frontend** (optionnel) :
```env
VITE_API_URL=https://rentanoo.com  # Pour production, ou laisser vide pour proxy
```

---

## C) OPTIONS D'ENVOI EMAIL (RÉCOMMANDATION)

### Option 1 : SMTP (Déjà configuré - RECOMMANDÉ)

**Avantages** :
- ✅ Déjà implémenté dans le code
- ✅ Utilise Nodemailer (installé dans package.json)
- ✅ Compatible avec Gmail, OVH, Google Workspace, etc.
- ✅ Simple à configurer (juste les variables d'env)

**Configuration requise** :
- **Gmail** : Créer un "Mot de passe d'application" (pas le mot de passe normal)
- **OVH** : Utiliser les identifiants SMTP standard
- **Google Workspace** : Utiliser les identifiants du compte

**Recommandé pour** : Début rapide, coûts faibles

---

### Option 2 : API Email (SendGrid / Mailgun / Postmark)

**Avantages** :
- ✅ Plus fiable que SMTP (moins de problèmes de délivrabilité)
- ✅ Statistiques (taux de livraison, ouvertures)
- ✅ Meilleur pour le volume

**Inconvénients** :
- ❌ Nécessite une clé API (compte payant souvent)
- ❌ Modifications du code requises (remplacer Nodemailer par SDK)

**Recommandé pour** : Production à fort volume, besoin de statistiques

---

## D) ÉTAT ACTUEL DU CODE

### ✅ Ce qui fonctionne déjà

1. **Formulaire frontend** : `src/pages/Contact.tsx`
   - Validation Zod (lignes 17-25)
   - Honeypot (lignes 135-141, 44-48)
   - Envoi vers `/api/contact` (ligne 81)

2. **Backend Express** : `server/index.ts`
   - Endpoint `/api/contact` (ligne 215)
   - Validation (lignes 227-239)
   - Nodemailer configuré (lignes 266-314)
   - Support pièces jointes (lignes 297-304)

3. **Proxy Vite** : `vite.config.ts`
   - `/api` → `http://localhost:3001` (dev)
   - Configuré pour le développement local

---

### ⚠️ Ce qui manque (configuration)

1. **Variables d'environnement SMTP** :
   - `EMAIL_TO` : Adresse email destinataire
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

2. **Configuration production** :
   - `VITE_API_URL` pour pointer vers le backend en production
   - Backend doit être déployé (Railway, Vercel Serverless, etc.)

---

## E) RECOMMANDATIONS

### 1️⃣ Option recommandée : SMTP (déjà implémenté)

**Pourquoi** :
- ✅ Code déjà en place, pas de modification nécessaire
- ✅ Configuration simple (juste les variables d'env)
- ✅ Compatible avec la plupart des providers email

**Configuration requise** :
```env
EMAIL_TO=contact@rentanoo.com
SMTP_HOST=smtp.gmail.com  # ou votre provider
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@example.com
SMTP_PASS=votre-mot-de-passe-app
```

**Gmail** :
1. Activer l'authentification à 2 facteurs
2. Générer un "Mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe dans `SMTP_PASS`

---

### 2️⃣ Vérification de l'état actuel

**À vérifier** :
1. **Production** : Le backend Express est-il déployé ? (Railway, Vercel, etc.)
2. **Variables d'env** : `EMAIL_TO` et `SMTP_*` sont-elles configurées ?
3. **Test** : L'endpoint `/api/contact` répond-il en production ?

**Commandes de test** :
```bash
# Test local (si backend démarré)
curl -X POST http://localhost:3001/api/contact \
  -F "fullName=Test" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Message test"

# Test production (si backend déployé)
curl -X POST https://rentanoo.com/api/contact \
  -F "fullName=Test" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Message test"
```

---

## F) PLAN D'ACTION (si non configuré)

### Étape 1 : Configurer les variables d'environnement

**Local** (`.env.local`) :
```env
EMAIL_TO=contact@rentanoo.com
EMAIL_FROM=noreply@rentanoo.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
```

**Production** (Railway / Vercel) :
- Ajouter les mêmes variables dans le dashboard
- S'assurer que `EMAIL_TO` est configuré

---

### Étape 2 : Vérifier le déploiement du backend

**Railway** :
- Vérifier que `server/index.ts` est déployé
- Vérifier que le port est correct (3001 par défaut)

**Vercel** :
- Si site 100% statique, ajouter une fonction serverless pour `/api/contact`
- Ou déployer le backend Express séparément

---

### Étape 3 : Tester l'envoi

1. Soumettre le formulaire sur `/contact`
2. Vérifier les logs serveur (console.log dans `server/index.ts`)
3. Vérifier la réception de l'email dans `EMAIL_TO`

---

## G) RÉSUMÉ

### ✅ Statut actuel

- **Formulaire frontend** : ✅ Implémenté et fonctionnel
- **Backend endpoint** : ✅ Implémenté (`/api/contact`)
- **Envoi email** : ✅ Code prêt (Nodemailer)
- **Configuration SMTP** : ⚠️ **À configurer** (variables d'env)

### 📋 Ce dont tu as besoin

**Variables d'environnement** :
1. `EMAIL_TO` : Adresse email où recevoir les messages (ex: `contact@rentanoo.com`)
2. `SMTP_HOST` : Serveur SMTP (ex: `smtp.gmail.com`, `smtp.ovh.net`)
3. `SMTP_PORT` : Port SMTP (ex: `587` pour TLS, `465` pour SSL)
4. `SMTP_SECURE` : `false` pour 587, `true` pour 465
5. `SMTP_USER` : Email d'authentification SMTP
6. `SMTP_PASS` : Mot de passe SMTP (ou mot de passe d'application pour Gmail)

**Provider SMTP recommandé** :
- **Gmail** : Simple, gratuit, nécessite un "Mot de passe d'application"
- **OVH** : Si tu as déjà un domaine OVH
- **SendGrid** : Si tu veux une API (nécessite modifications du code)

---

## H) CONCLUSION

**Réponse** : ✅ **OUI, je peux l'implémenter proprement** - **C'EST DÉJÀ FAIT !**

**Le système est déjà en place** :
- Formulaire frontend ✅
- Backend endpoint ✅
- Envoi email (Nodemailer) ✅

**Il manque juste** :
- La configuration des variables d'environnement SMTP
- Vérifier que le backend est déployé en production

**Action requise** :
1. Me donner l'**adresse email destinataire** (`EMAIL_TO`)
2. Me donner les **identifiants SMTP** (ou je peux te guider pour Gmail)
3. Je peux t'aider à configurer les variables d'env et tester l'envoi

**Option alternative** :
Si tu préfères une API email (SendGrid, Mailgun), je peux modifier le code pour utiliser leur SDK au lieu de SMTP. Mais SMTP est plus simple et déjà implémenté.

---

**Fichiers concernés** :
- `src/pages/Contact.tsx` (lignes 43-108) - Formulaire frontend
- `server/index.ts` (lignes 215-338) - Endpoint backend `/api/contact`

