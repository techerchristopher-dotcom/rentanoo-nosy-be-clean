# Migration Contact → n8n (Frontend → Backend → n8n)

## ✅ Modifications Appliquées

### 1. Frontend (`src/pages/Contact.tsx`)

**Changements**:
- ✅ Appel vers `/api/contact` au lieu du webhook n8n direct
- ✅ Envoi en JSON (`application/json`) au lieu de `FormData`
- ✅ Payload: `fullName`, `email`, `phone?`, `subject`, `message`, `timestamp`
- ✅ Honeypot, timeout 15s, UI success/error conservés
- ✅ Pièce jointe ignorée (pas envoyée)

**Code modifié** (lignes 67-104):
```typescript
// URL du backend
const apiBase = import.meta.env.VITE_API_URL?.trim();
const apiUrl = apiBase ? `${apiBase}/api/contact` : "/api/contact";

// Payload JSON
const payload: any = {
  fullName: data.fullName,
  email: data.email,
  subject: data.subject,
  message: data.message,
  timestamp: new Date().toISOString(),
};

if (data.phone) {
  payload.phone = data.phone;
}

// Envoi JSON
const response = await fetch(apiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
  signal: controller.signal,
});
```

### 2. Backend (`server/index.ts`)

**Changements**:
- ✅ Route `/api/contact` accepte JSON uniquement (pas de multer)
- ✅ Validation honeypot (`website`)
- ✅ Validations: champs requis + regex email
- ✅ Appel n8n server-side via `fetch()`
- ✅ Gestion d'erreurs n8n (502 si webhook échoue)
- ✅ Réponse identique: `{ ok: true, success: true, message }`

**Code modifié** (ligne 216-359):
```typescript
// Route contact form (JSON only, no multer)
app.post("/api/contact", async (req, res) => {
  const { fullName, email, phone, subject, message, website, timestamp } = req.body;

  // Honeypot
  if (website) {
    return res.status(200).json({ ok: true, success: true });
  }

  // Validations...

  // Appel n8n
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET;

  const n8nPayload = {
    fullName,
    email,
    subject,
    message,
    timestamp: timestamp || new Date().toISOString(),
    ...(phone && { phone }),
  };

  const n8nResponse = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(n8nWebhookSecret && { "X-Webhook-Secret": n8nWebhookSecret }),
    },
    body: JSON.stringify(n8nPayload),
  });

  // Retourner réponse identique au frontend
  return res.status(200).json({
    ok: true,
    success: true,
    message: "Message envoyé avec succès",
  });
});
```

---

## 🔐 Variables d'Environnement

### Backend (`.env.local` ou Railway)

**À ajouter**:
```bash
# n8n Webhook
N8N_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/rentanoo-contact

# (Optionnel) Secret pour authentifier les requêtes
N8N_WEBHOOK_SECRET=secret-random-123
```

**À garder** (si utilisé ailleurs):
```bash
# Backend URL (optionnel, pour frontend)
VITE_API_URL=http://localhost:3001
```

**À supprimer** (plus utilisés pour le contact):
- ❌ `POSTMARK_API_KEY` (si plus utilisé ailleurs)
- ❌ `EMAIL_FROM` (si plus utilisé ailleurs)
- ❌ `EMAIL_TO` (géré dans n8n maintenant)

---

## 🧪 Tests

### Test 1: Backend Local (curl)

```bash
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@test.com",
    "subject": "Test Subject",
    "message": "Hello world",
    "timestamp": "2025-01-20T00:00:00.000Z"
  }'
```

**Réponse attendue** (200):
```json
{
  "ok": true,
  "success": true,
  "message": "Message envoyé avec succès"
}
```

### Test 2: Formulaire Frontend

1. Démarrer le backend: `npm run dev` (dans `server/`)
2. Démarrer le frontend: `npm run dev` (dans la racine)
3. Aller sur `http://localhost:3012/contact`
4. Remplir le formulaire (sans pièce jointe)
5. Cliquer sur "Envoyer"
6. ✅ Vérifier: Toast de succès affiché
7. ✅ Vérifier: Email reçu via n8n

### Test 3: Honeypot (Anti-spam)

```bash
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test",
    "email": "test@test.com",
    "subject": "Test",
    "message": "Test",
    "website": "spam"
  }'
```

**Réponse attendue** (200 avec succès factice):
```json
{
  "ok": true,
  "success": true
}
```

### Test 4: Erreur n8n (webhook désactivé)

1. Désactiver temporairement le workflow n8n
2. Envoyer un formulaire valide
3. ✅ Vérifier: Erreur 502 retournée
4. ✅ Vérifier: Toast erreur affiché côté frontend

### Test 5: Validation Email Invalide

```bash
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test",
    "email": "invalid-email",
    "subject": "Test",
    "message": "Test"
  }'
```

**Réponse attendue** (400):
```json
{
  "ok": false,
  "error": "INVALID_EMAIL",
  "message": "Format d'email invalide"
}
```

---

## 📊 Flow Complet

```
1. Utilisateur remplit le formulaire (Contact.tsx)
   ↓
2. Frontend envoie POST /api/contact (JSON)
   {
     fullName, email, phone?, subject, message, timestamp
   }
   ↓
3. Backend valide (honeypot, champs, email)
   ↓
4. Backend appelle n8n webhook (server-side)
   POST https://n8n.srv1285649.hstgr.cloud/webhook/rentanoo-contact
   Headers: X-Webhook-Secret (si défini)
   ↓
5. n8n reçoit les données et envoie l'email via Gmail
   ↓
6. Backend retourne { ok: true, success: true, message }
   ↓
7. Frontend affiche toast de succès
```

---

## ✅ Checklist Finale

- [x] Frontend modifié (appel `/api/contact` en JSON)
- [x] Backend modifié (accepte JSON, appelle n8n)
- [ ] Variables d'environnement ajoutées (`N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`)
- [ ] Tests backend locaux réussis
- [ ] Tests frontend locaux réussis
- [ ] Déploiement production
- [ ] Tests production réussis

---

## 🔍 Dépannage

### Erreur: "N8N_NOT_CONFIGURED"
- Vérifier que `N8N_WEBHOOK_URL` est défini dans les variables d'environnement backend

### Erreur: "N8N_WEBHOOK_ERROR" (502)
- Vérifier que le workflow n8n est actif
- Vérifier l'URL du webhook dans n8n
- Vérifier les logs backend pour plus de détails

### CORS Error
- Normalement résolu car le frontend appelle le backend (même domaine ou proxy Vite)
- Si problème, vérifier la configuration CORS dans `server/index.ts`

---

**Document généré le**: 2025-01-20
**Version**: 1.0

