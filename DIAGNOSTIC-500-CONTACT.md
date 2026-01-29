# Diagnostic POST /api/contact 500

## Problème

POST `/api/contact` retourne 500. Côté frontend :
- status: 500
- message utilisateur: "Erreur, réessayez."
- finally OK (isSubmitting repasse false)

## A) Modifications Backend (server/index.ts) ✅

### 1. Logs d'erreur détaillés ✅

Le catch externe de `/api/contact` logue maintenant toutes les informations :

```typescript
console.error("[CONTACT] ❌ ERROR - Erreur route contact complète:", {
  message: error.message,
  code: error.code,
  name: error.name,
  stack: error.stack,
  command: error.command,
  response: error.response,
  responseCode: error.responseCode,
  errno: error.errno,
  syscall: error.syscall,
  hostname: error.hostname,
  port: error.port,
  address: error.address,
});
```

### 2. Réponse JSON informative ✅

Le catch retourne maintenant un JSON avec code d'erreur :

```typescript
return res.status(500).json({
  ok: false,
  error: "CONTACT_FAILED",
  code: error.code || null,
  message: error.message || "Erreur serveur",
  // En dev, inclure plus de détails
  ...(process.env.NODE_ENV !== "production" && {
    name: error.name,
    details: error.stack?.split("\n")[0] || null,
  }),
});
```

### 3. Codes d'erreur possibles

Selon la cause, le code d'erreur sera :

- `ETIMEDOUT` : Timeout connexion SMTP
- `ECONNRESET` : Connexion SMTP reset
- `ECONNREFUSED` : Connexion SMTP refusée
- `EAUTH` : Authentification SMTP invalide
- `LIMIT_FILE_SIZE` : Fichier trop gros (multer)
- `MISSING_EMAIL_TO` : EMAIL_TO non configuré
- Autres : Erreur multer, validation, etc.

## B) Modifications Frontend (Contact.tsx) ✅

### 1. Affichage message backend ✅

Le frontend extrait maintenant `code`, `message` et `details` du backend :

```typescript
const errorCode = result.code || null;
const errorMessage = result.message || result.error || result.details || "...";
const errorDetails = result.details || "";

// Format: [CODE] message: details
let fullErrorMessage = errorMessage;
if (errorCode) {
  fullErrorMessage = `[${errorCode}] ${errorMessage}`;
}
if (errorDetails && errorDetails !== errorMessage) {
  fullErrorMessage = `${fullErrorMessage}: ${errorDetails}`;
}
```

### 2. Logs détaillés ✅

Le frontend logue maintenant `fullResult` avec tous les détails :

```typescript
console.error("[Contact] ❌ Erreur HTTP:", {
  status: response.status,
  error: result.error || "Erreur inconnue",
  code: errorCode,
  message: errorMessage,
  details: errorDetails,
  fullResult: result,  // ⭐ Tous les détails du backend
});
```

### 3. Conservation du message backend ✅

Le catch conserve le message formaté du backend :

```typescript
if (error.message?.startsWith("[")) {
  // Message contient déjà [CODE] message: details
  errorMessage = error.message;
}
```

## C) Étapes de Diagnostic

### 1. Vérifier les logs Railway

Dans Railway → Logs, chercher :

```
[CONTACT] ❌ ERROR - Erreur route contact complète: { ... }
```

**Codes d'erreur à vérifier** :

- **`ETIMEDOUT` / `ECONNRESET` / `ECONNREFUSED`** → Problème SMTP (egress Railway ou config Gmail)
- **`EAUTH`** → Authentification SMTP invalide (mauvais App Password Gmail)
- **`LIMIT_FILE_SIZE`** → Fichier trop gros (max 10MB)
- **`MISSING_EMAIL_TO`** → EMAIL_TO non configuré
- Autres → Voir `error.message` et `error.stack`

### 2. Tester `/api/health/email`

Avant de tester le formulaire, tester la connexion SMTP :

```bash
curl https://rentanoo.com/api/health/email
```

**Résultat attendu** :
```json
{
  "ok": true,
  "message": "Connexion SMTP réussie",
  "config": { ... }
}
```

**Si erreur** :
```json
{
  "ok": false,
  "error": "SMTP_TIMEOUT" | "SMTP_CONNECTION_FAILED",
  "message": "...",
  "details": "..."
}
```

**Action** : Si `/api/health/email` échoue, résoudre SMTP avant tout.

### 3. Tester `/api/contact` en production

1. Aller sur `https://rentanoo.com/contact`
2. Remplir le formulaire (sans pièce jointe d'abord)
3. Soumettre
4. Ouvrir la console navigateur (F12)
5. Vérifier les logs :
   ```
   [Contact] ❌ Erreur HTTP: { code: "ETIMEDOUT", ... }
   ```

**Message toast attendu** :
- Format : `[CODE] message: details`
- Exemple : `[ETIMEDOUT] Connection timeout: La connexion au serveur SMTP a expiré`

### 4. Vérifier les variables d'environnement Railway

Dans Railway → Variables d'environnement :

```bash
✅ SMTP_HOST=smtp.gmail.com
✅ SMTP_PORT=587
✅ SMTP_SECURE=false
✅ SMTP_USER=chrisrentanoo@gmail.com
✅ SMTP_PASS=<app-password-16-chars>  # ⚠️ App Password, pas mot de passe Gmail
✅ EMAIL_TO=<destination@example.com>
✅ EMAIL_FROM=chrisrentanoo@gmail.com  # Optionnel
```

## D) Causes Fréquentes et Solutions

### 1. SMTP Timeout (ETIMEDOUT)

**Symptôme** : `code: "ETIMEDOUT"` dans les logs

**Causes possibles** :
- Egress Railway bloqué vers `smtp.gmail.com:587`
- App Password Gmail incorrect ou expiré
- Connexion SMTP lente (>10s)

**Solutions** :
1. Vérifier App Password Gmail dans Railway
2. Tester `/api/health/email` pour isoler le problème
3. Augmenter `connectionTimeout` si connexion lente mais stable
4. Migrer vers Postmark/Mailgun/SendGrid si SMTP Gmail instable

### 2. Authentification SMTP invalide (EAUTH)

**Symptôme** : `code: "EAUTH"` dans les logs

**Cause** : App Password Gmail incorrect ou expiré

**Solution** : Regénérer App Password Gmail et mettre à jour `SMTP_PASS` sur Railway

### 3. Fichier trop gros (LIMIT_FILE_SIZE)

**Symptôme** : `code: "LIMIT_FILE_SIZE"` dans les logs

**Cause** : Pièce jointe > 10MB

**Solution** : Vérifier taille fichier côté frontend avant envoi

### 4. EMAIL_TO manquant

**Symptôme** : `message: "Configuration serveur manquante"`

**Cause** : Variable `EMAIL_TO` non configurée sur Railway

**Solution** : Ajouter `EMAIL_TO` dans Railway → Variables d'environnement

## E) Livrables

### Backend (server/index.ts)

✅ Logs détaillés dans catch externe (`[CONTACT] ❌ ERROR`)  
✅ Réponse JSON avec `ok: false`, `error: "CONTACT_FAILED"`, `code`, `message`  
✅ Détails additionnels en dev (`name`, `details`)  

### Frontend (Contact.tsx)

✅ Extraction `code`, `message`, `details` du backend  
✅ Format message : `[CODE] message: details`  
✅ Logs détaillés avec `fullResult`  
✅ Conservation du message backend formaté  

## F) Prochaines Étapes

1. ✅ Déployer les modifications sur Railway
2. ⏳ Tester `/api/health/email` pour valider SMTP
3. ⏳ Soumettre le formulaire de contact
4. ⏳ Vérifier les logs Railway pour identifier le code d'erreur exact
5. ⏳ Corriger la cause selon le code d'erreur identifié

## G) Exemple de Logs Attendu

### Logs Railway (Backend)

```
[CONTACT] ❌ ERROR - Erreur route contact complète: {
  message: "Connection timeout",
  code: "ETIMEDOUT",
  name: "Error",
  ...
}
```

### Logs Navigateur (Frontend)

```
[Contact] ❌ Erreur HTTP: {
  status: 500,
  code: "ETIMEDOUT",
  message: "Connection timeout",
  fullResult: { ok: false, error: "CONTACT_FAILED", code: "ETIMEDOUT", message: "Connection timeout" }
}
```

### Message Toast Utilisateur

```
[ETIMEDOUT] Connection timeout: La connexion au serveur SMTP a expiré
```

