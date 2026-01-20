# Implémentation Contact → n8n - Guide Rapide

## 🎯 Architecture Recommandée

```
Frontend (Contact.tsx) 
  → POST /api/contact (FormData)
    → Backend (server/index.ts)
      → POST n8n webhook (JSON + base64 attachment)
        → n8n workflow
          → Email à EMAIL_TO
```

## 📋 Checklist Rapide

### 1. Configuration n8n
- [ ] Créer workflow avec **Webhook** trigger
- [ ] Activer le workflow → copier l'URL publique
- [ ] Créer variable n8n `WEBHOOK_SECRET` (ex: `secret-123`)
- [ ] Créer variable n8n `EMAIL_TO` (ex: `contact@rentanoo.com`)
- [ ] Configurer node **Email** (SMTP/Gmail/etc.)

### 2. Modifications Backend
- [ ] Modifier `server/index.ts` (voir code ci-dessous)
- [ ] Ajouter `.env.local` variables (voir ci-dessous)
- [ ] (Optionnel) Ajouter rate limiting

### 3. Tests
- [ ] Test sans pièce jointe
- [ ] Test avec pièce jointe
- [ ] Test honeypot
- [ ] Test erreur n8n

---

## 🔧 Code Backend Modifié

### Fichier: `server/index.ts`

**1. Supprimer l'import Postmark** (ligne 8):
```typescript
// ❌ SUPPRIMER cette ligne:
import { sendContactEmail } from "./email/postmark";
```

**2. Remplacer la route `/api/contact`** (ligne 217-359):

```typescript
// Route contact form
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

## 🔐 Variables d'Environnement

### Fichier: `.env.local`

```bash
# n8n Webhook
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/contact
N8N_WEBHOOK_SECRET=secret-random-123

# Email destinataire (utilisé dans n8n)
EMAIL_TO=contact@rentanoo.com

# Backend URL (optionnel, pour frontend)
VITE_API_URL=http://localhost:3001
```

**À supprimer** (plus utilisés):
- ❌ `POSTMARK_API_KEY`
- ❌ `EMAIL_FROM`

---

## 🚦 Rate Limiting (Optionnel)

### Installation
```bash
npm install express-rate-limit
```

### Code à ajouter dans `server/index.ts`

**1. Import** (après ligne 5):
```typescript
import rateLimit from "express-rate-limit";
```

**2. Configuration** (après ligne 16):
```typescript
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

**3. Appliquer** (modifier la route):
```typescript
app.post("/api/contact", contactRateLimit, upload.single("attachment"), async (req, res) => {
  // ... reste du code
});
```

---

## 📧 Configuration n8n Workflow

### Structure Workflow Minimal

1. **Webhook** (trigger)
   - Method: `POST`
   - Path: `/webhook/contact`
   - Response Mode: `Response Node`

2. **IF Node** (vérification secret)
   - Condition: `{{ $json.headers['x-webhook-secret'] }} === '{{ $env.WEBHOOK_SECRET }}'`
   - Si faux → retourner 401

3. **Email Node** (envoi email)
   - To: `{{ $env.EMAIL_TO }}`
   - Subject: `[Rentanoo Contact] {{ $json.body.subject }}`
   - HTML Body: (voir template ci-dessous)

4. **Respond to Webhook** (response)
   - Response Code: `200`
   - Response Body: `{ "ok": true, "success": true }`

### Template Email HTML

```html
<h2>Nouveau message de contact</h2>
<p><strong>Nom:</strong> {{ $json.body.fullName }}</p>
<p><strong>Email:</strong> {{ $json.body.email }}</p>
{{#if $json.body.phone}}
<p><strong>Téléphone:</strong> {{ $json.body.phone }}</p>
{{/if}}
<p><strong>Objet:</strong> {{ $json.body.subject }}</p>
<hr>
<p><strong>Message:</strong></p>
<p>{{ $json.body.message }}</p>
{{#if $json.body.attachment}}
<p><strong>Pièce jointe:</strong> {{ $json.body.attachment.filename }} ({{ $json.body.attachment.size }} bytes)</p>
{{/if}}
```

**Note**: Si n8n reçoit le body directement (pas dans `$json.body`), ajuster les références:
- `{{ $json.body.fullName }}` → `{{ $json.fullName }}`
- etc.

---

## 🧪 Tests Rapides

### Test 1: Sans pièce jointe
```bash
curl -X POST http://localhost:3001/api/contact \
  -F "fullName=Test User" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Test message"
```

### Test 2: Avec pièce jointe
```bash
curl -X POST http://localhost:3001/api/contact \
  -F "fullName=Test User" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Test message" \
  -F "attachment=@/path/to/file.pdf"
```

### Test 3: Honeypot (doit retourner succès factice)
```bash
curl -X POST http://localhost:3001/api/contact \
  -F "fullName=Test User" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Test message" \
  -F "website=spam"
```

### Test 4: Erreur n8n (désactiver workflow n8n)
```bash
# Même commande que Test 1
# Doit retourner 502 avec erreur N8N_WEBHOOK_ERROR
```

---

## 📊 Payload n8n Reçu

### Sans pièce jointe
```json
{
  "fullName": "Jean Dupont",
  "email": "jean@example.com",
  "phone": "+33 6 12 34 56 78",
  "subject": "Demande d'information",
  "message": "Bonjour, j'aimerais en savoir plus.",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Avec pièce jointe
```json
{
  "fullName": "Jean Dupont",
  "email": "jean@example.com",
  "subject": "Demande d'information",
  "message": "Bonjour, j'aimerais en savoir plus.",
  "attachment": {
    "filename": "document.pdf",
    "content": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDEyMyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE4NwolJUVPRgo=",
    "contentType": "application/pdf",
    "size": 123456
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## ✅ Checklist Finale

- [ ] Workflow n8n créé et activé
- [ ] Variables n8n configurées (`WEBHOOK_SECRET`, `EMAIL_TO`)
- [ ] `server/index.ts` modifié (code ci-dessus)
- [ ] `.env.local` mis à jour (`N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`)
- [ ] (Optionnel) Rate limiting ajouté
- [ ] Tests locaux réussis
- [ ] Déploiement production
- [ ] Tests production réussis
- [ ] `POSTMARK_API_KEY` supprimé des variables d'environnement

---

**Document généré le**: 2025-01-15
**Version**: 1.0

