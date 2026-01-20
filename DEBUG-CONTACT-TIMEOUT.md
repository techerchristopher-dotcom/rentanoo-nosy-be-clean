# Debug Contact Timeout - Diagnostic Complet

## (A) EXTRACTION CODE ROUTE CONTACT

### Route POST `/api/contact` (lignes 216-346)

```typescript
// Route contact form (JSON only, no multer)
app.post("/api/contact", async (req, res) => {
  try {
    const { fullName, email, phone, subject, message, website, timestamp } = req.body;

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
      timestamp: timestamp || new Date().toISOString(),
    };

    if (phone) {
      n8nPayload.phone = phone;
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
    // Log détaillé de l'erreur complète
    console.error("[CONTACT] ❌ ERROR - Erreur route contact complète:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      // ... autres champs
    });
    
    // ⚠️ PROBLÈME ICI: Le catch externe transforme TOUTES les erreurs en 500
    // avec message générique "Erreur serveur" ou error.message
    return res.status(500).json({
      ok: false,
      error: "CONTACT_FAILED",
      code: error.code || null,
      message: error.message || "Erreur serveur",  // ⚠️ "Connection timeout" vient d'ici
      // En dev, inclure plus de détails (sans secrets)
      ...(process.env.NODE_ENV !== "production" && {
        name: error.name,
        details: error.stack?.split("\n")[0] || null,
      }),
    });
  }
});
```

### 🔍 PROBLÈME IDENTIFIÉ

**Provider utilisé**: n8n (via `fetch()`)

**Problème principal**: 
- Le `fetch()` vers n8n (ligne 275) **n'a pas de timeout configuré**
- Node.js `fetch()` par défaut peut attendre indéfiniment
- Si n8n ne répond pas ou est lent, le timeout vient du système (OS/network layer)
- L'erreur "Connection timeout" est capturée par le catch externe (ligne 316) qui retourne 500 avec `error.message`

**Bloc catch problématique** (ligne 305-315):
```typescript
catch (n8nError: any) {
  console.error("[CONTACT] n8n webhook failed", {
    message: n8nError?.message,
    code: n8nError?.code,
  });
  return res.status(502).json({
    ok: false,
    error: "N8N_WEBHOOK_ERROR",
    message: "Erreur lors de l'appel au webhook n8n",  // ⚠️ Message générique
  });
}
```

**Mais si l'erreur vient d'un timeout système**, elle peut être capturée par le catch externe (ligne 316) qui retourne:
```typescript
message: error.message || "Erreur serveur"  // ⚠️ "Connection timeout" vient d'ici
```

---

## (B) TABLEAU CONFIG ENV DÉTECTÉE

| Variable d'Environnement | Utilisée dans | Valeur par défaut | Conversion | Timeout configuré |
|-------------------------|---------------|-------------------|------------|-------------------|
| `N8N_WEBHOOK_URL` | `server/index.ts:248` | ❌ Aucune (obligatoire) | String direct | ❌ **AUCUN** (fetch sans timeout) |
| `N8N_WEBHOOK_SECRET` | `server/index.ts:249` | ❌ Aucune (optionnel) | String direct | N/A |
| `POSTMARK_API_KEY` | `server/email/postmark.ts:41` | ❌ Aucune | String direct | ❌ Aucun (mais Postmark SDK gère) |
| `EMAIL_TO` | `server/email/postmark.ts:42` | ❌ Aucune | String direct | N/A |
| `EMAIL_FROM` | `server/email/postmark.ts:43` | ❌ Aucune | String direct | N/A |

### ⚠️ PROBLÈME CRITIQUE: Pas de timeout sur fetch()

Le `fetch()` Node.js (ligne 275) n'a **aucun timeout configuré**. Par défaut:
- Node.js `fetch()` peut attendre indéfiniment
- Le timeout vient du système d'exploitation (généralement ~60-120s)
- L'erreur système (ETIMEDOUT, ECONNRESET) est capturée comme `error.message = "Connection timeout"`

---

## (C) PATCH DIFF MINIMAL À APPLIQUER

### Fix 1: Ajouter timeout explicite au fetch() n8n

**Fichier**: `server/index.ts`

**Lignes à modifier**: 273-315

```diff
    // Appel n8n
    try {
+     const startTime = Date.now();
+     console.log("[CONTACT] 📡 Calling n8n webhook", {
+       url: n8nWebhookUrl,
+       hasSecret: !!n8nWebhookSecret,
+       timestamp: new Date().toISOString(),
+     });
+
+     // Créer un AbortController pour timeout explicite
+     const controller = new AbortController();
+     const timeoutId = setTimeout(() => {
+       controller.abort();
+     }, 10000); // 10 secondes timeout

-     const n8nResponse = await fetch(n8nWebhookUrl, {
+     const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(n8nWebhookSecret && { "X-Webhook-Secret": n8nWebhookSecret }),
        },
        body: JSON.stringify(n8nPayload),
+       signal: controller.signal,
      });

+     clearTimeout(timeoutId);
+     const duration = Date.now() - startTime;
+     console.log("[CONTACT] ✅ n8n webhook response", {
+       status: n8nResponse.status,
+       duration: `${duration}ms`,
+     });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error("[CONTACT] n8n webhook error", {
          status: n8nResponse.status,
          statusText: n8nResponse.statusText,
          body: errorText,
+         duration: `${duration}ms`,
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
+     const duration = Date.now() - startTime;
+     const isTimeout = n8nError?.name === "AbortError" || 
+                       n8nError?.code === "ETIMEDOUT" ||
+                       n8nError?.message?.includes("timeout");
+
      console.error("[CONTACT] n8n webhook failed", {
        message: n8nError?.message,
        code: n8nError?.code,
+       name: n8nError?.name,
+         errno: n8nError?.errno,
+         syscall: n8nError?.syscall,
+         hostname: n8nError?.hostname,
+         port: n8nError?.port,
+         duration: `${duration}ms`,
+         isTimeout,
      });
+
+     // Retourner 502 avec message explicite pour timeout
+     if (isTimeout) {
+       return res.status(502).json({
+         ok: false,
+         error: "N8N_WEBHOOK_TIMEOUT",
+         message: "Le webhook n8n n'a pas répondu dans les délais (timeout 10s)",
+         details: `Durée: ${duration}ms`,
+       });
+     }
+
      return res.status(502).json({
        ok: false,
        error: "N8N_WEBHOOK_ERROR",
-       message: "Erreur lors de l'appel au webhook n8n",
+       message: n8nError?.message || "Erreur lors de l'appel au webhook n8n",
+       details: `Code: ${n8nError?.code || "unknown"}`,
      });
    }
```

### Fix 2: Améliorer le catch externe pour éviter de masquer les erreurs n8n

**Fichier**: `server/index.ts`

**Lignes à modifier**: 316-345

```diff
  } catch (error: any) {
+   // Si l'erreur vient déjà d'un catch interne (n8n), ne pas la re-capturer
+   // Les erreurs n8n sont déjà gérées dans le try/catch interne
+   if (error?.error === "N8N_WEBHOOK_ERROR" || error?.error === "N8N_WEBHOOK_TIMEOUT") {
+     throw error; // Re-throw pour que le catch interne le gère
+   }
+
    // Log détaillé de l'erreur complète
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
    
    // Retourner une réponse JSON informative avec le code d'erreur
    return res.status(500).json({
      ok: false,
      error: "CONTACT_FAILED",
      code: error.code || null,
-     message: error.message || "Erreur serveur",
+     message: error.message || "Erreur serveur",
+     // En prod, ne pas exposer les détails système
      // En dev, inclure plus de détails (sans secrets)
      ...(process.env.NODE_ENV !== "production" && {
        name: error.name,
        details: error.stack?.split("\n")[0] || null,
      }),
    });
  }
```

---

## (D) ÉTAPES DE TEST

### Test 1: Test Backend Local avec Timeout

```bash
# 1. Démarrer le backend
cd server && npm run dev

# 2. Dans un autre terminal, tester avec un webhook n8n invalide (pour simuler timeout)
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@test.com",
    "subject": "Test",
    "message": "Hello world"
  }'

# 3. Vérifier les logs backend:
# - Doit afficher "[CONTACT] 📡 Calling n8n webhook"
# - Après 10s, doit afficher "[CONTACT] n8n webhook failed" avec isTimeout: true
# - Réponse doit être 502 avec error: "N8N_WEBHOOK_TIMEOUT"
```

### Test 2: Test avec Webhook n8n Valide

```bash
# 1. Configurer N8N_WEBHOOK_URL dans .env.local
N8N_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/rentanoo-contact

# 2. Tester
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@test.com",
    "subject": "Test",
    "message": "Hello world"
  }'

# 3. Vérifier:
# - Logs doivent afficher duration < 10s
# - Réponse doit être 200 avec ok: true
# - Email doit être reçu via n8n
```

### Test 3: Test en Production

```bash
# 1. Déployer le fix
# 2. Tester le formulaire sur https://rentanoo.com/contact
# 3. Vérifier les logs Railway/Heroku:
#    - Chercher "[CONTACT] 📡 Calling n8n webhook"
#    - Chercher duration dans les logs
#    - Si timeout: chercher "N8N_WEBHOOK_TIMEOUT"
```

---

## 🔍 HYPOTHÈSES PROBABLES + PREUVE

### Hypothèse 1: Timeout fetch() non configuré (PROBABLE - 90%)

**Cause**: Le `fetch()` vers n8n n'a pas de timeout explicite, donc attend le timeout système (~60-120s)

**Preuve dans le code**:
- Ligne 275: `fetch(n8nWebhookUrl, {...})` sans `signal` ni timeout
- Pas d'`AbortController` configuré
- Node.js `fetch()` par défaut peut attendre indéfiniment

**Signal dans les logs**:
- `error.name === "AbortError"` (si timeout AbortController)
- `error.code === "ETIMEDOUT"` (si timeout système)
- `error.message.includes("timeout")`
- Durée > 10s dans les logs

**Fix**: Ajouter `AbortController` avec timeout 10s (voir Fix 1)

---

### Hypothèse 2: n8n webhook lent/inaccessible (PROBABLE - 70%)

**Cause**: Le webhook n8n est lent à répondre ou inaccessible depuis le serveur de production

**Preuve dans le code**:
- Pas de retry logic
- Pas de health check avant appel
- Pas de fallback

**Signal dans les logs**:
- `n8nResponse.status` = timeout ou erreur réseau
- `duration` > 10s mais < timeout système
- Erreur réseau (`ECONNREFUSED`, `ENOTFOUND`)

**Fix**: 
- Ajouter timeout explicite (Fix 1)
- Vérifier que `N8N_WEBHOOK_URL` est correct en prod
- Vérifier que le workflow n8n est actif

---

### Hypothèse 3: Egress réseau bloqué (PEU PROBABLE - 20%)

**Cause**: L'hébergeur (Railway/Heroku) bloque les connexions sortantes vers n8n

**Preuve dans le code**:
- Pas de vérification de connectivité
- Pas de message d'erreur spécifique pour egress bloqué

**Signal dans les logs**:
- `error.code === "ECONNREFUSED"` ou `"ENOTFOUND"`
- `error.syscall === "connect"`
- Timeout immédiat (< 1s) ou très long (> 60s)

**Fix**:
- Vérifier les règles firewall de l'hébergeur
- Tester la connectivité depuis le serveur: `curl https://n8n.srv1285649.hstgr.cloud/webhook/rentanoo-contact`
- Si bloqué: utiliser un proxy ou basculer vers une API email (Postmark/SendGrid)

---

## 📋 RÉSUMÉ

**Problème identifié**: 
- `fetch()` vers n8n sans timeout → timeout système (~60-120s)
- Erreur capturée par catch externe → message générique "Connection timeout"

**Fix minimal**:
1. Ajouter `AbortController` avec timeout 10s sur le `fetch()`
2. Ajouter logs d'instrumentation (duration, isTimeout)
3. Retourner erreur explicite `N8N_WEBHOOK_TIMEOUT` au lieu de message générique

**Priorité**: 🔴 CRITIQUE (bloque l'envoi d'emails en production)

