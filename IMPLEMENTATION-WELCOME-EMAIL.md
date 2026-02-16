# IMPLEMENTATION — Welcome email via n8n après vérification

**Date** : 2026-02-11  
**Statut** : ✅ Implémenté  
**Fichiers modifiés** : 5 fichiers

---

## 🎯 OBJECTIF

Envoyer un email de bienvenue via n8n webhook **une seule fois** après vérification du compte, avec anti-doublon robuste via `profiles.welcome_email_sent_at`.

---

## 📝 MODIFICATIONS EFFECTUÉES

### 1️⃣ Migration SQL : Ajout colonne `welcome_email_sent_at`

**Fichier** : `supabase/migrations/20260211000000_add_welcome_email_sent_at.sql`

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.profiles.welcome_email_sent_at IS 'Timestamp when the welcome email was sent (anti-doublon)';
```

---

### 2️⃣ Types TypeScript : Ajout `welcome_email_sent_at`

**Fichier** : `src/integrations/supabase/types.ts`

Ajout de `welcome_email_sent_at: string | null` dans :
- `profiles.Row`
- `profiles.Insert`
- `profiles.Update`

---

### 3️⃣ Variables d'environnement

**Fichier** : `.env.local`

```env
VITE_N8N_WELCOME_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client
```

**Fichier** : `.env.local.example`

```env
# Webhook welcome-client (email de bienvenue après vérification)
VITE_N8N_WELCOME_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client
```

---

### 4️⃣ Callback.tsx : Refactorisation complète

**Fichier** : `src/pages/auth/Callback.tsx`

#### Ajout fonction `sendWelcomeEmail`

```typescript
async function sendWelcomeEmail(
  userId: string,
  profile: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    welcome_email_sent_at: string | null;
  }
): Promise<boolean>
```

**Logique** :
1. Vérifier `VITE_N8N_WELCOME_WEBHOOK_URL` (skip si absent)
2. Vérifier `welcome_email_sent_at` (skip si déjà envoyé)
3. Vérifier `email` (skip si null)
4. POST vers n8n avec payload `{ body: { record: {...} } }`
5. Si succès → update `welcome_email_sent_at = now()`

**Logs** :
- `[Welcome] skipped (reason=missing_webhook|already_sent|missing_email)`
- `[Welcome] sent`
- `[Welcome] failed` + status

---

#### Ajout fonction `handleVerifiedUser`

```typescript
const handleVerifiedUser = async (userId: string) => {
  // Anti-doublon via useRef
  if (hasRunRef.current) return;
  hasRunRef.current = true;

  // 1. Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status, welcome_email_sent_at, email, first_name, last_name")
    .eq("id", userId)
    .single();

  // 2. Si déjà verified → skip update, check welcome email
  if (profile.kyc_status === "verified") {
    sendWelcomeEmail(userId, profile);
    return;
  }

  // 3. Update kyc_status
  await supabase
    .from("profiles")
    .update({ kyc_status: "verified" })
    .eq("id", userId);

  // 4. Send welcome email
  sendWelcomeEmail(userId, profile);
}
```

**Anti-doublon** :
- `useRef(false)` empêche double exécution dans le même chargement de page
- `welcome_email_sent_at` empêche double envoi entre plusieurs visites

---

#### Modification `tryGetSession` et `onAuthStateChange`

**Avant** :
```typescript
if (session?.user) {
  await supabase.from("profiles").update({ kyc_status: "verified" });
  completeSuccess();
}
```

**Après** :
```typescript
if (session?.user) {
  await handleVerifiedUser(session.user.id);
  completeSuccess();
}
```

**Même modification** dans les 2 endroits (tryGetSession + onAuthStateChange)

---

## 🔒 ANTI-DOUBLON

### Niveau 1 : `hasRunRef` (useRef)

Empêche double exécution dans le même chargement de page :
- `tryGetSession` ET `onAuthStateChange` peuvent se déclencher simultanément
- `hasRunRef.current = true` après la première exécution
- Les appels suivants sont skippés

### Niveau 2 : `kyc_status`

Empêche update inutile si déjà `verified` :
- Si `kyc_status === "verified"` → skip l'update
- Mais vérifie quand même si welcome email doit être envoyé

### Niveau 3 : `welcome_email_sent_at`

Empêche envoi multiple de l'email :
- Si `welcome_email_sent_at !== null` → skip l'envoi
- Timestamp persisté en DB, valable entre plusieurs visites

---

## 📡 PAYLOAD N8N

**Format** : Compatible avec les workflows existants

```json
{
  "body": {
    "record": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "first_name": "Jean",
      "last_name": "Dupont"
    }
  }
}
```

---

## 🧪 TESTS MANUELS

### Test 1 : Premier signup + confirmation

1. Créer un compte via `/auth/register`
2. Cliquer sur le magic link dans l'email
3. **Vérifier console** :
   - `[AuthCallback] kyc_status updated to verified`
   - `[Welcome] sent`
4. **Vérifier DB** :
   - `profiles.kyc_status = "verified"`
   - `profiles.welcome_email_sent_at` rempli
5. **Vérifier boîte mail** : Email de bienvenue reçu

---

### Test 2 : Re-clic sur magic link (anti-doublon)

1. Cliquer à nouveau sur le magic link
2. **Vérifier console** :
   - `[AuthCallback] Already verified, checking welcome email`
   - `[Welcome] skipped (reason=already_sent)`
3. **Vérifier boîte mail** : **Pas** de nouvel email

---

### Test 3 : Webhook down (non-bloquant)

1. Désactiver le webhook n8n (ou mettre URL invalide)
2. Créer un compte et confirmer
3. **Vérifier console** :
   - `[Welcome] failed` + status
   - Pas de crash
4. **Vérifier DB** :
   - `kyc_status = "verified"` (quand même mis à jour)
   - `welcome_email_sent_at = null` (pas marqué car échec)

---

### Test 4 : Webhook manquant (skip propre)

1. Supprimer `VITE_N8N_WELCOME_WEBHOOK_URL` de `.env.local`
2. Redémarrer le serveur
3. Créer un compte et confirmer
4. **Vérifier console** :
   - `[Welcome] skipped (reason=missing_webhook)`
   - Pas de crash
5. **Vérifier DB** :
   - `kyc_status = "verified"`
   - `welcome_email_sent_at = null`

---

### Test 5 : Email null (edge case)

1. Créer un profil avec `email = null` (via SQL direct)
2. Confirmer le compte
3. **Vérifier console** :
   - `[Welcome] skipped (reason=missing_email)`
   - Pas de crash

---

## ⚠️ EDGE CASES GÉRÉS

| Cas | Comportement | Log |
|-----|--------------|-----|
| Webhook URL manquante | Skip proprement | `[Welcome] skipped (reason=missing_webhook)` |
| Email déjà envoyé | Skip (anti-doublon) | `[Welcome] skipped (reason=already_sent)` |
| Email null | Skip proprement | `[Welcome] skipped (reason=missing_email)` |
| Webhook down | Catch error, continue | `[Welcome] failed` + status |
| Profil absent | Log error, continue | `[AuthCallback] Failed to fetch profile` |
| Double callback | useRef empêche | `[AuthCallback] Already processed, skipping` |
| kyc_status déjà verified | Skip update, check email | `[AuthCallback] Already verified` |

---

## 📊 DIFF RÉSUMÉ

### Callback.tsx

**Ajouts** :
- `useRef` pour anti-doublon
- Fonction `sendWelcomeEmail` (73 lignes)
- Fonction `handleVerifiedUser` (59 lignes)
- Appels à `handleVerifiedUser` dans 2 endroits

**Suppressions** :
- Update `kyc_status` direct (remplacé par `handleVerifiedUser`)

**Total** : +132 lignes, -10 lignes

---

### types.ts

**Ajouts** :
- `welcome_email_sent_at: string | null` dans 3 interfaces

**Total** : +3 lignes

---

### Migrations SQL

**Nouveau fichier** : `20260211000000_add_welcome_email_sent_at.sql`

---

### Variables env

**Ajouts** :
- `.env.local` : `VITE_N8N_WELCOME_WEBHOOK_URL`
- `.env.local.example` : Documentation

---

## ✅ CHECKLIST DE LIVRAISON

- [x] Migration SQL créée
- [x] Types TypeScript mis à jour
- [x] Variable env ajoutée et documentée
- [x] Fonction `sendWelcomeEmail` implémentée
- [x] Fonction `handleVerifiedUser` implémentée
- [x] Anti-doublon `useRef` implémenté
- [x] Anti-doublon `welcome_email_sent_at` implémenté
- [x] Logs clairs et explicites
- [x] Gestion d'erreur non-bloquante
- [x] Skip propre si webhook manquant
- [x] Pas d'erreur de linting
- [ ] Migration SQL appliquée en prod
- [ ] Workflow n8n `welcome-client` créé
- [ ] Tests manuels effectués
- [ ] Email de bienvenue reçu

---

## 🚀 PROCHAINES ÉTAPES

### 1. Appliquer la migration SQL

**Local** :
```bash
supabase db push
```

**Prod** :
```bash
# Via Supabase Dashboard → SQL Editor
# Ou via CLI si configuré
```

---

### 2. Créer le workflow n8n `welcome-client`

**URL** : `https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client`

**Payload attendu** :
```json
{
  "body": {
    "record": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "Jean",
      "last_name": "Dupont"
    }
  }
}
```

**Actions** :
1. Extraire `body.record` du payload
2. Composer email de bienvenue avec template
3. Envoyer via Gmail/SendGrid
4. Répondre HTTP 200

---

### 3. Tester en local

Suivre la checklist de tests ci-dessus.

---

### 4. Déployer en prod

1. Commit + push
2. Vérifier que `VITE_N8N_WELCOME_WEBHOOK_URL` est configurée en prod
3. Appliquer la migration SQL
4. Tester avec un nouveau compte

---

**Implémentation terminée** ✅
