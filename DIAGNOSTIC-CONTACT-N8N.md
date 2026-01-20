# Diagnostic Complet - Formulaire de Contact → Migration n8n

## 1. Analyse du Flow Actuel

### 1.1 Frontend - Formulaire de Contact

**Fichier**: `src/pages/Contact.tsx`

**Fonction submit**: `onSubmit` (ligne 42-237)

**URL appelée**:
- En dev: `/api/contact` (proxy Vite vers `http://localhost:3001`)
- En prod: `${VITE_API_URL}/api/contact` ou `/api/contact` (selon config)

**Format envoyé**: `multipart/form-data` (FormData)

**Champs exacts**:
```typescript
{
  fullName: string,        // REQUIS (min 2 caractères)
  email: string,          // REQUIS (format email valide)
  phone?: string,         // OPTIONNEL
  subject: string,        // REQUIS (min 3 caractères)
  message: string,        // REQUIS (min 10 caractères)
  attachment?: File,      // OPTIONNEL (max 10MB, types: .pdf,.jpg,.jpeg,.png,.doc,.docx)
  website?: string        // HONEYPOT (champ caché anti-spam)
}
```

**Honeypot**:
- Champ: `website` (ligne 24, 264-270)
- Type: `text` caché (`hidden`, `tabIndex={-1}`)
- Gestion frontend: Si `data.website` est rempli → arrêt silencieux (ligne 46-50)
- Gestion backend: Si `website` présent → retourne succès factice (ligne 223-226)

**Pièce jointe**:
- Nom du champ: `attachment`
- Types acceptés: `.pdf,.jpg,.jpeg,.png,.doc,.docx`
- Taille max: 10MB (vérifié frontend ligne 97, backend ligne 201)
- Format: `File` (multipart/form-data)

**Validations frontend** (Zod schema ligne 17-25):
- `fullName`: min 2 caractères
- `email`: format email valide
- `subject`: min 3 caractères
- `message`: min 10 caractères
- `attachment`: optionnel, max 10MB (vérifié manuellement ligne 97)

**Réponses attendues côté frontend**:

**Succès** (200):
```json
{
  "ok": true,
  "success": true,
  "message": "Message envoyé avec succès"
}
```

**Erreurs** (400/500/502):
```json
{
  "ok": false,
  "error": "CODE_ERREUR",
  "message": "Message d'erreur lisible",
  "code": "CODE_OPTIONNEL",
  "details": "Détails optionnels"
}
```

Codes d'erreur possibles:
- `MISSING_FIELDS`: Champs requis manquants
- `INVALID_EMAIL`: Format email invalide
- `ATTACHMENT_TOO_LARGE`: Pièce jointe > 10MB
- `POSTMARK_NOT_CONFIGURED`: Postmark non configuré
- `EMAIL_TO_MISSING`: EMAIL_TO manquant
- `EMAIL_FROM_MISSING`: EMAIL_FROM manquant
- `POSTMARK_API_ERROR`: Erreur API Postmark
- `CONTACT_FAILED`: Erreur serveur générique

**Timeout**: 15 secondes (ligne 80)

### 1.2 Backend - Route API Contact

**Fichier**: `server/index.ts` (ligne 217-359)

**Route**: `POST /api/contact`

**Middleware**: `upload.single("attachment")` (multer, ligne 198-214)
- Storage: mémoire (`memoryStorage()`)
- Max size: 10MB
- Types autorisés: PDF, JPG, JPEG, PNG, DOC, DOCX

**Validations backend**:
1. Honeypot: Si `website` présent → succès factice (ligne 223-226)
2. Champs requis: `fullName`, `email`, `subject`, `message` (ligne 229-235)
3. Format email: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (ligne 238-245)

**Service email actuel**: Postmark (`server/email/postmark.ts`)
- Interface: `ContactEmailPayload` (ligne 4-15)
- Fonction: `sendContactEmail()` (ligne 26-148)
- Format email: HTML + texte
- Sujet: `[Rentanoo Contact] ${subject}`
- Reply-To: email du contact
- Pièce jointe: base64 dans attachments Postmark

### 1.3 Variables d'Environnement Actuelles

**Backend** (`server/index.ts`, `server/email/postmark.ts`):
- `POSTMARK_API_KEY`: Clé API Postmark (sera remplacée)
- `EMAIL_TO`: Destinataire des emails de contact (sera utilisé dans n8n)
- `EMAIL_FROM`: Expéditeur Postmark (sera utilisé dans n8n)

**Frontend** (`src/pages/Contact.tsx`):
- `VITE_API_URL`: URL du backend (optionnel, utilisé si défini)

**À ajouter pour n8n**:
- `N8N_WEBHOOK_URL`: URL du webhook n8n
- `N8N_WEBHOOK_SECRET`: Secret pour authentifier les requêtes (optionnel mais recommandé)

---

## 2. Architectures n8n Possibles

### Option A: Frontend → Webhook n8n Direct

**Flow**: `Contact.tsx` → `POST https://n8n.example.com/webhook/contact` → n8n → Email

**Pros**:
- ✅ Architecture simple, moins de composants
- ✅ Pas de backend intermédiaire à maintenir
- ✅ Latence réduite (une seule requête)
- ✅ Moins de points de défaillance

**Cons**:
- ❌ CORS à gérer côté n8n (si domaine différent)
- ❌ Secret webhook exposé côté frontend (risque sécurité)
- ❌ Pas de rate limiting centralisé
- ❌ Logs backend perdus (logs uniquement dans n8n)
- ❌ Validation backend perdue (seulement validation frontend)
- ❌ Honeypot vérifié côté frontend uniquement (peut être contourné)

**Recommandation**: ❌ **NON RECOMMANDÉ** pour ce projet (sécurité, logs, rate limit)

---

### Option B: Frontend → Backend → Webhook n8n

**Flow**: `Contact.tsx` → `POST /api/contact` → Backend → `POST https://n8n.example.com/webhook/contact` → n8n → Email

**Pros**:
- ✅ Sécurité: secret webhook côté backend uniquement
- ✅ Rate limiting possible côté backend (express-rate-limit)
- ✅ Validation backend + frontend (double sécurité)
- ✅ Honeypot vérifié côté backend (non contournable)
- ✅ Logs centralisés côté backend
- ✅ Gestion d'erreurs robuste (retry, fallback)
- ✅ CORS géré côté backend (déjà configuré)
- ✅ Pas de changement côté frontend (même contrat API)

**Cons**:
- ❌ Latence légèrement supérieure (deux requêtes)
- ❌ Backend à maintenir (mais déjà présent)

**Recommandation**: ✅ **RECOMMANDÉ** pour ce projet

**Pourquoi**:
1. **Sécurité**: Le secret n8n reste côté backend (jamais exposé au frontend)
2. **Anti-spam**: Honeypot vérifié côté backend (non contournable par bots)
3. **Rate limiting**: Peut être ajouté facilement côté backend
4. **Logs**: Tous les logs restent dans le backend (debugging facilité)
5. **Robustesse**: Gestion d'erreurs centralisée, retry possible
6. **CORS**: Déjà géré côté backend (pas de problème)

---

## 3. Spécifications n8n (Option B Recommandée)

### 3.1 Webhook n8n

**URL/Endpoint**: À créer dans n8n (ex: `https://n8n.example.com/webhook/contact`)

**Méthode**: `POST`

**Format payload recommandé**: `application/json` (plus simple que multipart/form-data)

**Exemple payload complet** (sans pièce jointe):
```json
{
  "fullName": "Jean Dupont",
  "email": "jean@example.com",
  "phone": "+33 6 12 34 56 78",
  "subject": "Demande d'information",
  "message": "Bonjour, j'aimerais en savoir plus sur vos services.",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Exemple payload avec pièce jointe** (base64):
```json
{
  "fullName": "Jean Dupont",
  "email": "jean@example.com",
  "phone": "+33 6 12 34 56 78",
  "subject": "Demande d'information",
  "message": "Bonjour, j'aimerais en savoir plus sur vos services.",
  "attachment": {
    "filename": "document.pdf",
    "content": "base64_encoded_content_here",
    "contentType": "application/pdf",
    "size": 123456
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Alternative pièce jointe** (URL temporaire):
Si n8n ne gère pas bien les gros payloads base64, le backend peut uploader la pièce jointe vers Supabase Storage et envoyer l'URL temporaire à n8n:
```json
{
  "fullName": "Jean Dupont",
  "email": "jean@example.com",
  "subject": "Demande d'information",
  "message": "Bonjour...",
  "attachmentUrl": "https://storage.supabase.co/.../document.pdf?token=...",
  "attachmentFilename": "document.pdf"
}
```

**Headers nécessaires**:
```
Content-Type: application/json
X-Webhook-Secret: <N8N_WEBHOOK_SECRET>
```

**Vérification secret**:
- n8n doit vérifier le header `X-Webhook-Secret` dans le workflow
- Comparer avec une variable d'environnement n8n `WEBHOOK_SECRET`
- Si différent → retourner 401 Unauthorized

**Stratégie anti-spam minimale**:
1. ✅ **Honeypot**: Vérifié côté backend (non contournable)
2. ✅ **Rate limiting**: À ajouter côté backend (express-rate-limit)
   - Exemple: 5 requêtes / 15 minutes par IP
3. ⚠️ **Validation email**: Format vérifié côté backend
4. ⚠️ **Validation taille**: Pièce jointe max 10MB côté backend

**Workflow n8n minimal**:
1. **Webhook** (trigger): Recevoir POST avec secret
2. **IF node**: Vérifier `X-Webhook-Secret` header
3. **Email node**: Envoyer email à `EMAIL_TO` avec contenu du message
4. **Response node**: Retourner `{ "ok": true, "success": true }`

**Template email n8n**:
```
Sujet: [Rentanoo Contact] {{ $json.subject }}

Corps (HTML):
<h2>Nouveau message de contact</h2>
<p><strong>Nom:</strong> {{ $json.fullName }}</p>
<p><strong>Email:</strong> {{ $json.email }}</p>
{{#if $json.phone}}<p><strong>Téléphone:</strong> {{ $json.phone }}</p>{{/if}}
<p><strong>Objet:</strong> {{ $json.subject }}</p>
<hr>
<p><strong>Message:</strong></p>
<p>{{ $json.message }}</p>
{{#if $json.attachment}}
<p><strong>Pièce jointe:</strong> {{ $json.attachment.filename }} ({{ $json.attachment.size }} bytes)</p>
{{/if}}
```

---

## 4. Éléments Extraits du Code

### 4.1 Champs Exacts

| Champ | Type | Obligatoire | Validation | Notes |
|-------|------|-------------|------------|-------|
| `fullName` | string | ✅ Oui | min 2 caractères | Nom complet |
| `email` | string | ✅ Oui | format email | Adresse email |
| `phone` | string | ❌ Non | - | Numéro de téléphone |
| `subject` | string | ✅ Oui | min 3 caractères | Objet du message |
| `message` | string | ✅ Oui | min 10 caractères | Contenu du message |
| `attachment` | File | ❌ Non | max 10MB, types: PDF/JPG/PNG/DOC/DOCX | Pièce jointe |
| `website` | string | ❌ Non | - | **Honeypot** (caché) |

### 4.2 Validations Existantes

**Frontend** (`src/pages/Contact.tsx`):
- Email: validation Zod (format email)
- Taille fichier: vérification manuelle 10MB (ligne 97)
- Honeypot: vérification si `website` rempli (ligne 46-50)

**Backend** (`server/index.ts`):
- Email: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (ligne 238)
- Taille fichier: multer limit 10MB (ligne 201)
- Types fichiers: multer filter PDF/JPG/PNG/DOC/DOCX (ligne 204-212)
- Honeypot: vérification si `website` présent (ligne 223-226)

### 4.3 Contrat JSON Réponses

**Succès** (200):
```json
{
  "ok": true,
  "success": true,
  "message": "Message envoyé avec succès"
}
```

**Erreurs** (400/500/502):
```json
{
  "ok": false,
  "error": "CODE_ERREUR",
  "message": "Message d'erreur lisible",
  "code": "CODE_OPTIONNEL",
  "details": "Détails optionnels"
}
```

### 4.4 Variables d'Environnement

**Actuelles** (à garder):
- `EMAIL_TO`: Destinataire des emails (utilisé dans n8n)
- `VITE_API_URL`: URL du backend (frontend, optionnel)

**À remplacer**:
- `POSTMARK_API_KEY`: ❌ Plus utilisé (remplacé par n8n)

**À ajouter**:
- `N8N_WEBHOOK_URL`: URL du webhook n8n (ex: `https://n8n.example.com/webhook/contact`)
- `N8N_WEBHOOK_SECRET`: Secret pour authentifier les requêtes (ex: `secret-random-123`)

---

## 5. Checklist "Éléments Nécessaires" pour n8n

### 5.1 Configuration n8n

- [ ] Créer un workflow n8n avec un **Webhook** comme trigger
- [ ] Configurer l'URL du webhook (ex: `/webhook/contact`)
- [ ] Activer le workflow pour générer l'URL publique
- [ ] Créer une variable d'environnement n8n `WEBHOOK_SECRET` (ex: `secret-random-123`)
- [ ] Créer une variable d'environnement n8n `EMAIL_TO` (ex: `contact@rentanoo.com`)
- [ ] Configurer le node **Email** (SMTP/Gmail/etc.) pour envoyer les emails
- [ ] Tester le workflow avec un payload de test

### 5.2 Modifications Code

- [ ] Modifier `server/index.ts` pour remplacer Postmark par appel n8n
- [ ] Ajouter `N8N_WEBHOOK_URL` et `N8N_WEBHOOK_SECRET` dans `.env.local`
- [ ] Ajouter rate limiting côté backend (optionnel mais recommandé)
- [ ] Tester le flow complet (frontend → backend → n8n → email)

### 5.3 Tests

- [ ] Test sans pièce jointe
- [ ] Test avec pièce jointe (petit fichier < 1MB)
- [ ] Test avec pièce jointe (gros fichier ~10MB)
- [ ] Test honeypot (remplir `website` → doit retourner succès factice)
- [ ] Test erreur n8n (désactiver workflow → doit retourner erreur backend)
- [ ] Test rate limit (si ajouté)

---

## 6. Modifications Code Minimales

### 6.1 Backend - Route `/api/contact` Modifiée

**Fichier**: `server/index.ts` (ligne 217-359)

**Changements**:
1. Supprimer l'import `sendContactEmail` de Postmark
2. Remplacer l'appel Postmark par un appel HTTP vers n8n
3. Convertir la pièce jointe en base64 si présente
4. Ajouter le header `X-Webhook-Secret`

**Code proposé** (à insérer après ligne 262):

```typescript
// Remplacer l'appel Postmark (ligne 265) par:

const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET;

if (!n8nWebhookUrl) {
  console.error("[CONTACT] N8N_WEBHOOK_URL not configured");
  return res.status(500).json({
    ok: false,
    error: "N8N_NOT_CONFIGURED",
    message: "Configuration n8n incomplète",
  });
}

// Préparer le payload pour n8n
const n8nPayload: any = {
  fullName,
  email,
  subject,
  message,
  timestamp: new Date().toISOString(),
};

if (phone) {
  n8nPayload.phone = phone;
}

// Convertir la pièce jointe en base64 si présente
if (attachment) {
  n8nPayload.attachment = {
    filename: attachment.originalname,
    content: attachment.buffer.toString("base64"),
    contentType: attachment.mimetype,
    size: attachment.size,
  };
}

// Appel n8n
try {
  const n8nResponse = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(n8nWebhookSecret && { "X-Webhook-Secret": n8nWebhookSecret }),
    },
    body: JSON.stringify(n8nPayload),
  });

  if (!n8nResponse.ok) {
    const errorText = await n8nResponse.text();
    console.error("[CONTACT] n8n webhook error", {
      status: n8nResponse.status,
      statusText: n8nResponse.statusText,
      body: errorText,
    });
    return res.status(502).json({
      ok: false,
      error: "N8N_WEBHOOK_ERROR",
      message: "Erreur lors de l'appel au webhook n8n",
    });
  }

  console.log("[CONTACT] Email sent via n8n");

  return res.status(200).json({
    ok: true,
    success: true,
    message: "Message envoyé avec succès",
  });
} catch (n8nError: any) {
  console.error("[CONTACT] n8n webhook failed", {
    message: n8nError?.message,
    code: n8nError?.code,
  });
  return res.status(502).json({
    ok: false,
    error: "N8N_WEBHOOK_ERROR",
    message: "Erreur lors de l'appel au webhook n8n",
  });
}
```

### 6.2 Variables d'Environnement

**Fichier**: `.env.local` (à créer ou modifier)

```bash
# n8n Webhook
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/contact
N8N_WEBHOOK_SECRET=secret-random-123

# Email destinataire (utilisé dans n8n)
EMAIL_TO=contact@rentanoo.com

# Backend URL (optionnel, pour frontend)
VITE_API_URL=http://localhost:3001
```

**À supprimer**:
- `POSTMARK_API_KEY` (plus utilisé)
- `EMAIL_FROM` (géré dans n8n)

### 6.3 Rate Limiting (Optionnel mais Recommandé)

**Installation**:
```bash
npm install express-rate-limit
```

**Code à ajouter dans `server/index.ts`** (après ligne 16):

```typescript
import rateLimit from "express-rate-limit";

// Rate limiting pour le formulaire de contact
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requêtes max par IP
  message: {
    ok: false,
    error: "RATE_LIMIT_EXCEEDED",
    message: "Trop de requêtes. Veuillez réessayer dans 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Appliquer le middleware** (avant la route `/api/contact`):

```typescript
app.post("/api/contact", contactRateLimit, upload.single("attachment"), async (req, res) => {
  // ... reste du code
});
```

---

## 7. Exemples Concrets

### 7.1 Frontend - Aucun Changement Nécessaire

Le frontend reste identique. Il continue d'envoyer `FormData` vers `/api/contact`.

**Snippet actuel** (déjà en place, ligne 111-115):

```typescript
const response = await fetch(apiUrl, {
  method: "POST",
  body: formData,
  signal: controller.signal,
});
```

### 7.2 Backend - Route `/api/contact` Modifiée

**Snippet complet** (remplace ligne 217-359 de `server/index.ts`):

```typescript
app.post("/api/contact", upload.single("attachment"), async (req, res) => {
  try {
    const { fullName, email, phone, subject, message, website } = req.body;
    const attachment = req.file;

    // Vérification honeypot
    if (website) {
      return res.status(200).json({ ok: true, success: true });
    }

    // Validation des champs requis
    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_FIELDS",
        message: "Les champs nom, email, objet et message sont obligatoires",
      });
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_EMAIL",
        message: "Format d'email invalide",
      });
    }

    console.log("[CONTACT] Using email provider: n8n");

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!n8nWebhookUrl) {
      console.error("[CONTACT] N8N_WEBHOOK_URL not configured");
      return res.status(500).json({
        ok: false,
        error: "N8N_NOT_CONFIGURED",
        message: "Configuration n8n incomplète",
      });
    }

    // Préparer le payload pour n8n
    const n8nPayload: any = {
      fullName,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    };

    if (phone) {
      n8nPayload.phone = phone;
    }

    // Convertir la pièce jointe en base64 si présente
    if (attachment) {
      n8nPayload.attachment = {
        filename: attachment.originalname,
        content: attachment.buffer.toString("base64"),
        contentType: attachment.mimetype,
        size: attachment.size,
      };
    }

    // Appel n8n
    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(n8nWebhookSecret && { "X-Webhook-Secret": n8nWebhookSecret }),
        },
        body: JSON.stringify(n8nPayload),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error("[CONTACT] n8n webhook error", {
          status: n8nResponse.status,
          statusText: n8nResponse.statusText,
          body: errorText,
        });
        return res.status(502).json({
          ok: false,
          error: "N8N_WEBHOOK_ERROR",
          message: "Erreur lors de l'appel au webhook n8n",
        });
      }

      console.log("[CONTACT] Email sent via n8n");

      return res.status(200).json({
        ok: true,
        success: true,
        message: "Message envoyé avec succès",
      });
    } catch (n8nError: any) {
      console.error("[CONTACT] n8n webhook failed", {
        message: n8nError?.message,
        code: n8nError?.code,
      });
      return res.status(502).json({
        ok: false,
        error: "N8N_WEBHOOK_ERROR",
        message: "Erreur lors de l'appel au webhook n8n",
      });
    }
  } catch (error: any) {
    console.error("[CONTACT] ❌ ERROR - Erreur route contact complète:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    });
    
    return res.status(500).json({
      ok: false,
      error: "CONTACT_FAILED",
      code: error.code || null,
      message: error.message || "Erreur serveur",
      ...(process.env.NODE_ENV !== "production" && {
        name: error.name,
        details: error.stack?.split("\n")[0] || null,
      }),
    });
  }
});
```

---

## 8. Plan de Test

### 8.1 Tests Locaux

**Prérequis**:
- Backend démarré (`npm run dev` dans `server/`)
- Frontend démarré (`npm run dev`)
- n8n workflow actif avec webhook configuré
- Variables d'environnement configurées (`.env.local`)

**Test 1: Formulaire sans pièce jointe**
1. Aller sur `http://localhost:3002/contact`
2. Remplir: nom, email, objet, message
3. Envoyer
4. ✅ Vérifier: Email reçu sur `EMAIL_TO`
5. ✅ Vérifier: Toast succès affiché

**Test 2: Formulaire avec pièce jointe**
1. Aller sur `http://localhost:3002/contact`
2. Remplir tous les champs + uploader un PDF (< 1MB)
3. Envoyer
4. ✅ Vérifier: Email reçu avec pièce jointe
5. ✅ Vérifier: Toast succès affiché

**Test 3: Pièce jointe trop grande**
1. Uploader un fichier > 10MB
2. ✅ Vérifier: Erreur affichée avant envoi (frontend)
3. ✅ Vérifier: Pas d'appel backend

**Test 4: Honeypot (anti-spam)**
1. Ouvrir DevTools → Console
2. Exécuter: `document.querySelector('input[name="website"]').value = "spam"`
3. Remplir et envoyer le formulaire
4. ✅ Vérifier: Succès factice retourné (pas d'email envoyé)
5. ✅ Vérifier: Logs backend montrent "Bot détecté"

**Test 5: Erreur n8n (webhook désactivé)**
1. Désactiver le workflow n8n
2. Envoyer un formulaire valide
3. ✅ Vérifier: Erreur 502 retournée
4. ✅ Vérifier: Toast erreur affiché côté frontend
5. ✅ Vérifier: Logs backend montrent l'erreur n8n

**Test 6: Rate limiting (si ajouté)**
1. Envoyer 6 formulaires rapidement depuis la même IP
2. ✅ Vérifier: 5 premiers réussissent
3. ✅ Vérifier: 6ème retourne erreur `RATE_LIMIT_EXCEEDED`

### 8.2 Tests Production

**Prérequis**:
- Déploiement backend et frontend en production
- Variables d'environnement configurées (Railway/Vercel/etc.)
- n8n workflow actif avec URL publique

**Test 1: Formulaire complet**
1. Aller sur `https://rentanoo.com/contact`
2. Remplir tous les champs + pièce jointe
3. Envoyer
4. ✅ Vérifier: Email reçu sur `EMAIL_TO`
5. ✅ Vérifier: Toast succès affiché

**Test 2: Validation email invalide**
1. Entrer un email invalide (ex: `test@`)
2. ✅ Vérifier: Erreur de validation affichée (frontend)
3. ✅ Vérifier: Pas d'appel backend

**Test 3: Champs manquants**
1. Ne pas remplir le champ "message"
2. ✅ Vérifier: Erreur de validation affichée (frontend)
3. ✅ Vérifier: Pas d'appel backend

**Test 4: Erreur réseau**
1. Désactiver temporairement le webhook n8n
2. Envoyer un formulaire valide
3. ✅ Vérifier: Erreur 502 retournée
4. ✅ Vérifier: Message d'erreur lisible affiché

---

## 9. Résumé des Modifications

### Fichiers à Modifier

1. **`server/index.ts`**:
   - Supprimer import `sendContactEmail` (ligne 8)
   - Remplacer route `/api/contact` (ligne 217-359) par version n8n
   - (Optionnel) Ajouter rate limiting

2. **`.env.local`**:
   - Ajouter `N8N_WEBHOOK_URL`
   - Ajouter `N8N_WEBHOOK_SECRET`
   - Supprimer `POSTMARK_API_KEY` (plus utilisé)
   - Supprimer `EMAIL_FROM` (géré dans n8n)
   - Garder `EMAIL_TO` (utilisé dans n8n)

3. **`package.json`** (si rate limiting):
   - Ajouter `express-rate-limit`

### Fichiers à NE PAS Modifier

- ✅ `src/pages/Contact.tsx` (aucun changement nécessaire)
- ✅ Frontend reste identique (même contrat API)

### Dépendances à Supprimer (Optionnel)

- `postmark` (package.json) - peut être supprimé si plus utilisé ailleurs

---

## 10. Checklist Finale

- [ ] Créer workflow n8n avec webhook
- [ ] Configurer variables d'environnement n8n (`WEBHOOK_SECRET`, `EMAIL_TO`)
- [ ] Modifier `server/index.ts` pour appeler n8n au lieu de Postmark
- [ ] Ajouter variables d'environnement backend (`N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`)
- [ ] (Optionnel) Ajouter rate limiting
- [ ] Tester localement (sans pièce jointe, avec pièce jointe, honeypot, erreur)
- [ ] Déployer en production
- [ ] Tester en production
- [ ] Supprimer `POSTMARK_API_KEY` des variables d'environnement
- [ ] (Optionnel) Supprimer package `postmark` si plus utilisé

---

**Document généré le**: 2025-01-15
**Version**: 1.0

