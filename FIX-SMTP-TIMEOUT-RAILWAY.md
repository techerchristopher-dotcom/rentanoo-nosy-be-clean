# Fix SMTP Timeout - Instructions Railway

## A) Modifications Backend (server/index.ts)

### 1. Timeout explicite Nodemailer ✅

Ajout de timeouts explicites dans la configuration SMTP :
- `connectionTimeout: 10000` (10s pour établir la connexion)
- `greetingTimeout: 5000` (5s pour le greeting SMTP)
- `socketTimeout: 10000` (10s pour les opérations socket)
- Timeout global avec `Promise.race` : 30s max

### 2. Logs détaillés SMTP ✅

Logs ajoutés à chaque étape :
- `[CONTACT] 📧 Creating transporter` : configuration SMTP
- `[CONTACT] ✅ Transporter créé avec succès`
- `[CONTACT] 📤 Sending mail` : début d'envoi
- `[CONTACT] ✅ SendMail OK` : envoi réussi
- `[CONTACT] ❌ SendMail ERROR` : erreur détaillée

### 3. Gestion d'erreur SMTP ✅

Détection spécifique des timeouts SMTP :
- Codes d'erreur : `ETIMEDOUT`, `ECONNRESET`, `ECONNREFUSED`
- Retourne `502` avec `{ ok: false, error: "SMTP_TIMEOUT" }` en cas de timeout

### 4. Route de test `/api/health/email` ✅

Route ajoutée pour tester la connexion SMTP sans envoyer d'email :
- Teste `transporter.verify()` avec timeout 15s
- Retourne l'état de la connexion SMTP
- Utile pour debug et vérification

## B) Vérification Frontend (Contact.tsx)

### 1. setIsSubmitting(false) dans finally ✅

Le frontend utilise déjà `setIsSubmitting(false)` directement dans le `finally` (pas `startTransition`).

### 2. Logs de traçage ✅

Logs ajoutés pour tracer chaque étape :
- `[Contact] 🚀 SUBMIT START`
- `[Contact] 📡 ABOUT TO FETCH`
- `[Contact] ✅ FETCH RESOLVED`
- `[Contact] ✅ FINALLY REACHED`

### 3. AbortController 15s ✅

Timeout frontend ajouté pour éviter fetch pending.

## C) Configuration Gmail SMTP

### Variables d'environnement requises sur Railway

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=chrisrentanoo@gmail.com
SMTP_PASS=<app-password-gmail>  # ⚠️ Pas le mot de passe Gmail, mais un "App Password"
EMAIL_TO=<email-destination>
EMAIL_FROM=chrisrentanoo@gmail.com  # Optionnel, par défaut utilise EMAIL_TO
```

### Créer un App Password Gmail

1. Aller sur https://myaccount.google.com/
2. Sécurité → Validation en 2 étapes (doit être activée)
3. Mots de passe des applications
4. Générer un nouveau mot de passe pour "Mail"
5. Copier le mot de passe généré (16 caractères)
6. Utiliser ce mot de passe dans `SMTP_PASS` sur Railway

## D) Instructions Railway

### 1. Vérifier les variables d'environnement

Dans Railway → Variables d'environnement, vérifier :

```bash
✅ SMTP_HOST=smtp.gmail.com
✅ SMTP_PORT=587
✅ SMTP_SECURE=false
✅ SMTP_USER=chrisrentanoo@gmail.com
✅ SMTP_PASS=<app-password-16-chars>
✅ EMAIL_TO=<destination@example.com>
```

### 2. Vérifier l'egress réseau Railway

Railway permet normalement les connexions sortantes vers `smtp.gmail.com:587`. 

**Si egress bloqué/instable** :
- Vérifier les logs Railway : `[CONTACT] ❌ SendMail ERROR` avec `ECONNREFUSED` ou `ETIMEDOUT`
- Alternatives si Gmail SMTP ne fonctionne pas :
  - **Postmark** (API REST, plus fiable) : `npm install postmark`
  - **Mailgun** (API REST) : `npm install mailgun-js`
  - **SendGrid** (API REST) : `npm install @sendgrid/mail`

### 3. Redéployer l'application

Après avoir mis à jour les variables d'environnement :

```bash
# Sur Railway, déclencher un nouveau déploiement
# Ou push vers la branche main si auto-deploy activé
git push origin main
```

### 4. Tester la connexion SMTP

**Test 1 : Route de santé**

```bash
curl https://rentanoo.com/api/health/email
```

Résultat attendu :
```json
{
  "ok": true,
  "message": "Connexion SMTP réussie",
  "config": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "chrisrentanoo@gmail.com"
  }
}
```

**Test 2 : Formulaire de contact**

1. Aller sur `https://rentanoo.com/contact`
2. Remplir le formulaire et soumettre
3. Ouvrir la console du navigateur (F12)
4. Vérifier les logs :
   - `[Contact] 🚀 SUBMIT START`
   - `[Contact] ✅ FETCH RESOLVED`
   - `[Contact] ✅ FINALLY REACHED`

**Test 3 : Logs Railway**

Dans Railway → Logs, vérifier :

```
[CONTACT] 📧 Creating transporter: { host: 'smtp.gmail.com', port: 587, ... }
[CONTACT] ✅ Transporter créé avec succès
[CONTACT] 📤 Sending mail - Tentative d'envoi vers: ...
[CONTACT] ✅ SendMail OK - Email de contact envoyé: ...
```

## E) Dépannage

### Problème : SMTP_TIMEOUT en production

**Causes possibles** :
1. App Password Gmail incorrect ou expiré
2. Egress Railway bloqué vers `smtp.gmail.com:587`
3. Connexion SMTP lente (plus de 10s)

**Solutions** :
1. Vérifier l'App Password Gmail dans Railway
2. Tester `/api/health/email` pour isoler le problème
3. Augmenter les timeouts si connexion lente (mais stable)
4. Migrer vers Postmark/Mailgun/SendGrid si SMTP Gmail instable

### Problème : Bouton reste en loading

**Vérifier** :
1. Console navigateur : `[Contact] ✅ FINALLY REACHED` doit apparaître
2. Si `FINALLY REACHED` n'apparaît pas : problème avec le `finally` (impossible normalement)
3. Si `FINALLY REACHED` apparaît mais bouton toujours loading : problème React (re-render)

### Problème : "Connection timeout" malgré fix

**Vérifier** :
1. Logs Railway : voir `[CONTACT] ❌ SendMail ERROR` avec détails
2. Test `/api/health/email` : voir si la connexion SMTP fonctionne
3. Vérifier que les variables d'environnement sont bien chargées sur Railway

## F) Résumé des changements

### Backend (server/index.ts)

✅ Timeouts explicites Nodemailer (connectionTimeout, greetingTimeout, socketTimeout)  
✅ Timeout global 30s avec Promise.race  
✅ Logs détaillés à chaque étape SMTP  
✅ Détection spécifique des erreurs timeout (ETIMEDOUT, ECONNRESET, etc.)  
✅ Retour 502 avec `{ ok: false, error: "SMTP_TIMEOUT" }` en cas de timeout  
✅ Route `/api/health/email` pour tester SMTP  

### Frontend (Contact.tsx)

✅ Logs de traçage détaillés  
✅ AbortController 15s pour éviter fetch pending  
✅ `setIsSubmitting(false)` directement dans finally  
✅ Message d'erreur inclut les détails (ex: "Connection timeout")  

## G) Prochaines étapes

1. ✅ Déployer les modifications backend sur Railway
2. ✅ Vérifier les variables d'environnement SMTP sur Railway
3. ✅ Tester `/api/health/email` pour valider la connexion SMTP
4. ✅ Tester le formulaire de contact en production
5. ✅ Vérifier les logs Railway pour confirmer l'envoi d'email

