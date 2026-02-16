# DIAGNOSTIC — Welcome email via n8n (sans trigger SQL)

**Date** : 2026-02-11  
**Statut** : 🔍 Diagnostic terminé  
**Objectif** : Identifier le point d'insertion optimal pour l'email de bienvenue

---

## 📋 RÉSUMÉ EXÉCUTIF

### ✅ Ce qui existe
- ✅ `profiles.kyc_status` passe à `"verified"` dans `Callback.tsx` (lignes 59-70 et 95-108)
- ✅ Webhook n8n `profiles-created` existe et fonctionne
- ✅ Pattern de payload compatible : `{ body: { record: {...} } }`

### ❌ Ce qui manque
- ❌ Colonne `welcome_email_sent_at` **n'existe PAS** dans `profiles` (absente des types TypeScript et migrations SQL)
- ❌ Aucune logique anti-doublon pour l'email de bienvenue
- ❌ Webhook n8n `welcome-client` **n'existe pas** (pas trouvé dans les docs)
- ❌ Variable env `VITE_N8N_WELCOME_WEBHOOK_URL` absente

---

## 1️⃣ LOCALISATION — Où `kyc_status` devient `"verified"`

### Fichier : `src/pages/auth/Callback.tsx`

**Point d'insertion #1** : Lignes 59-70 (dans `tryGetSession`)

```59:70:src/pages/auth/Callback.tsx
        if (session?.user) {
          // Update kyc_status = "verified" quand session disponible
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ kyc_status: "verified" })
            .eq("id", session.user.id);

          if (updateError) {
            console.error("[AuthCallback] UPDATE kyc_status FAILED:", updateError);
          } else {
            console.log("[AuthCallback] kyc_status updated to verified");
          }
```

**Point d'insertion #2** : Lignes 97-108 (dans `onAuthStateChange`)

```97:108:src/pages/auth/Callback.tsx
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        // Update kyc_status = "verified" quand session disponible
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ kyc_status: "verified" })
          .eq("id", session.user.id);

        if (updateError) {
          console.error("[AuthCallback] UPDATE kyc_status FAILED:", updateError);
        } else {
          console.log("[AuthCallback] kyc_status updated to verified");
        }
```

### ⚠️ Problème actuel : Pas d'anti-doublon

**Comportement actuel** :
- L'update `kyc_status = "verified"` est **inconditionnelle**
- Exécuté à **chaque** passage dans Callback (même si déjà `verified`)
- **Risque** : Si on ajoute l'envoi d'email ici sans vérification, l'email partira plusieurs fois

---

## 2️⃣ ANTI-DOUBLON ACTUEL

### Analyse du code existant

**Aucune logique anti-doublon** :
- ❌ Pas de `SELECT` avant l'`UPDATE` pour vérifier `kyc_status`
- ❌ Pas de lecture de `welcome_email_sent_at` (colonne inexistante)
- ❌ L'update est exécuté à chaque callback, même si déjà `verified`

**Conséquence** :
- Si on ajoute l'envoi d'email sans anti-doublon, l'utilisateur recevra plusieurs emails de bienvenue

---

## 3️⃣ COLONNE `welcome_email_sent_at`

### Recherche dans le code

```bash
# Recherche dans tout le repo
grep -r "welcome_email_sent_at" . --include="*.ts" --include="*.tsx" --include="*.sql"
# Résultat : Aucune occurrence
```

### Recherche dans les types TypeScript

**Fichier** : `src/integrations/supabase/types.ts`

```158:180:src/integrations/supabase/types.ts
      profiles: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          role: "renter" | "owner" | "admin" | null
          kyc_status: "pending" | "verified" | "rejected" | null
          avatar_url: string | null
          birthdate: string | null
          created_at: string
          updated_at: string | null
          place_of_birth: string | null
          address_line1: string | null
          postal_code: string | null
          city: string | null
          country: string | null
          driver_license_number: string | null
          driver_license_issue_date: string | null
          driver_license_country: string | null
          driver_license_file_path: string | null
          full_name: string | null
        }
```

**Conclusion** : ❌ `welcome_email_sent_at` **n'existe pas** dans la table `profiles`

---

## 4️⃣ STRATÉGIE ANTI-DOUBLON RECOMMANDÉE

### Option A (Recommandée) : Utiliser `kyc_status` comme flag

**Principe** :
- Ne PAS créer de colonne `welcome_email_sent_at`
- Utiliser la transition `kyc_status: "pending" → "verified"` comme déclencheur unique
- Logique : "Si on passe de `pending` à `verified`, envoyer le welcome email"

**Implémentation** :

```typescript
// Dans Callback.tsx, remplacer l'update aveugle par :

// 1. Lire le profil actuel
const { data: profile } = await supabase
  .from("profiles")
  .select("kyc_status, email, first_name, last_name")
  .eq("id", session.user.id)
  .single();

// 2. Si déjà verified, ne rien faire
if (profile?.kyc_status === "verified") {
  console.log("[AuthCallback] Already verified, skipping");
  completeSuccess();
  return;
}

// 3. Sinon, update + envoyer welcome email
const { error: updateError } = await supabase
  .from("profiles")
  .update({ kyc_status: "verified" })
  .eq("id", session.user.id);

if (!updateError) {
  // 4. Envoyer welcome email via n8n
  await sendWelcomeEmail(session.user.id, profile.email, profile.first_name);
}
```

**Avantages** :
- ✅ Pas de nouvelle colonne à créer
- ✅ Anti-doublon garanti (transition unique)
- ✅ Simple à implémenter

**Inconvénients** :
- ⚠️ Si `kyc_status` est déjà `verified` avant le callback (edge case), l'email ne partira pas
- ⚠️ Pas de traçabilité de l'envoi (pas de timestamp)

---

### Option B : Créer `welcome_email_sent_at`

**Principe** :
- Créer une colonne `welcome_email_sent_at TIMESTAMPTZ NULL` dans `profiles`
- Vérifier cette colonne avant d'envoyer l'email
- Marquer la colonne après envoi

**Implémentation** :

```sql
-- Migration SQL
ALTER TABLE public.profiles
ADD COLUMN welcome_email_sent_at TIMESTAMPTZ NULL;
```

```typescript
// Dans Callback.tsx
const { data: profile } = await supabase
  .from("profiles")
  .select("kyc_status, welcome_email_sent_at, email, first_name")
  .eq("id", session.user.id)
  .single();

// Si email déjà envoyé, skip
if (profile?.welcome_email_sent_at) {
  console.log("[AuthCallback] Welcome email already sent");
  // Continuer avec l'update kyc_status si nécessaire
}

// Si kyc_status passe à verified ET email pas encore envoyé
if (profile?.kyc_status !== "verified" && !profile?.welcome_email_sent_at) {
  // Update kyc_status
  await supabase
    .from("profiles")
    .update({ kyc_status: "verified" })
    .eq("id", session.user.id);
  
  // Envoyer welcome email
  const emailSent = await sendWelcomeEmail(...);
  
  // Marquer l'envoi
  if (emailSent) {
    await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", session.user.id);
  }
}
```

**Avantages** :
- ✅ Traçabilité complète (timestamp de l'envoi)
- ✅ Anti-doublon robuste
- ✅ Permet de renvoyer l'email manuellement si besoin

**Inconvénients** :
- ❌ Nécessite migration SQL
- ❌ Nécessite mise à jour des types TypeScript
- ❌ Plus complexe

---

## 5️⃣ VARIABLES D'ENVIRONNEMENT

### Existantes

```env
# .env.local
VITE_SUPABASE_URL=https://tbsgzykqcksmqxpimwry.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_N8N_PROFILES_CREATED_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/profiles-created
```

### À ajouter

**Option 1** : Créer un nouveau webhook `welcome-client`

```env
VITE_N8N_WELCOME_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client
```

**Option 2** : Réutiliser `profiles-created` (pas recommandé)

Le workflow `profiles-created` est déclenché à la création du profil, pas à la vérification. Réutiliser ce webhook pourrait créer de la confusion.

---

## 6️⃣ FORMAT PAYLOAD N8N

### Pattern existant (profiles-created)

```json
{
  "body": {
    "record": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "first_name": "Jean",
      "last_name": "Dupont",
      "phone": "+262..."
    }
  }
}
```

### Payload recommandé pour welcome email

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

**Note** : Format identique, compatible avec les workflows n8n existants.

---

## 7️⃣ MINI-RAPPORT

### 🔍 Ce que j'ai trouvé

1. **Point d'insertion** : `src/pages/auth/Callback.tsx` lignes 59-70 et 97-108
2. **Problème** : Pas d'anti-doublon, l'update `kyc_status` est inconditionnelle
3. **Colonne manquante** : `welcome_email_sent_at` n'existe pas dans `profiles`
4. **Webhook** : Aucun webhook `welcome-client` trouvé dans les docs
5. **Pattern payload** : Format `{ body: { record: {...} } }` compatible avec n8n

---

### 📍 Point d'insertion recommandé

**Fichier** : `src/pages/auth/Callback.tsx`

**Fonction** : `tryGetSession` (ligne 50)

**Logique recommandée** :

```typescript
// AVANT l'update kyc_status (ligne 59)
// 1. Lire le profil actuel
const { data: profile } = await supabase
  .from("profiles")
  .select("kyc_status, email, first_name, last_name")
  .eq("id", session.user.id)
  .single();

// 2. Si déjà verified, skip
if (profile?.kyc_status === "verified") {
  completeSuccess();
  return;
}

// 3. Update kyc_status
const { error: updateError } = await supabase
  .from("profiles")
  .update({ kyc_status: "verified" })
  .eq("id", session.user.id);

// 4. Si update OK, envoyer welcome email
if (!updateError) {
  await sendWelcomeEmail(session.user.id, profile);
}
```

**Même logique à dupliquer** dans `onAuthStateChange` (ligne 95)

---

### 📦 Données nécessaires

| Donnée | Source | Utilisation |
|--------|--------|-------------|
| `session.user.id` | Supabase Auth | ID du profil |
| `profile.email` | `profiles` table | Destinataire email |
| `profile.first_name` | `profiles` table | Personnalisation email |
| `profile.last_name` | `profiles` table | Personnalisation email (optionnel) |
| `profile.kyc_status` | `profiles` table | Anti-doublon (vérifier si déjà `verified`) |

---

### 🛠️ Plan minimal d'implémentation (3 modifications)

#### Modification 1 : Ajouter la variable env

**Fichier** : `.env.local`

```env
VITE_N8N_WELCOME_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client
```

**Fichier** : `.env.local.example`

```env
VITE_N8N_WELCOME_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/welcome-client
```

---

#### Modification 2 : Créer la fonction `sendWelcomeEmail`

**Fichier** : `src/pages/auth/Callback.tsx` (en haut du fichier, avant le composant)

```typescript
async function sendWelcomeEmail(
  userId: string,
  profile: { email: string | null; first_name: string | null; last_name: string | null }
): Promise<boolean> {
  const webhookUrl = import.meta.env.VITE_N8N_WELCOME_WEBHOOK_URL;
  if (!webhookUrl || !profile.email) {
    console.warn("[AuthCallback] Welcome email skipped (missing webhook or email)");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: {
          record: {
            id: userId,
            email: profile.email,
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("[AuthCallback] Welcome email failed", { status: response.status });
      return false;
    }

    console.log("[AuthCallback] Welcome email sent");
    return true;
  } catch (error) {
    console.error("[AuthCallback] Welcome email error", error);
    return false;
  }
}
```

---

#### Modification 3 : Modifier `tryGetSession` avec anti-doublon

**Fichier** : `src/pages/auth/Callback.tsx` lignes 59-70

**Remplacer** :

```typescript
if (session?.user) {
  // Update kyc_status = "verified" quand session disponible
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ kyc_status: "verified" })
    .eq("id", session.user.id);

  if (updateError) {
    console.error("[AuthCallback] UPDATE kyc_status FAILED:", updateError);
  } else {
    console.log("[AuthCallback] kyc_status updated to verified");
  }

  completeSuccess();
  return;
}
```

**Par** :

```typescript
if (session?.user) {
  // 1. Lire le profil actuel (anti-doublon)
  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status, email, first_name, last_name")
    .eq("id", session.user.id)
    .single();

  // 2. Si déjà verified, skip
  if (profile?.kyc_status === "verified") {
    console.log("[AuthCallback] Already verified, skipping");
    completeSuccess();
    return;
  }

  // 3. Update kyc_status = "verified"
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ kyc_status: "verified" })
    .eq("id", session.user.id);

  if (updateError) {
    console.error("[AuthCallback] UPDATE kyc_status FAILED:", updateError);
  } else {
    console.log("[AuthCallback] kyc_status updated to verified");
    
    // 4. Envoyer welcome email (non-bloquant)
    if (profile) {
      sendWelcomeEmail(session.user.id, profile).catch((err) =>
        console.error("[AuthCallback] Welcome email error", err)
      );
    }
  }

  completeSuccess();
  return;
}
```

**Même modification à faire** dans `onAuthStateChange` (lignes 97-108)

---

### ⚠️ Risques / Edge cases

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Profil absent** | `profile === null` → crash | Vérifier `if (profile)` avant `sendWelcomeEmail` |
| **Email null** | `profile.email === null` → email non envoyé | Vérifier dans `sendWelcomeEmail`, log warning |
| **Webhook down** | Email non envoyé, pas de retry | Catch error, log, continuer (non-bloquant) |
| **RLS** | SELECT/UPDATE bloqué | Vérifier RLS sur `profiles` (doit autoriser `auth.uid()`) |
| **Double callback** | `tryGetSession` + `onAuthStateChange` exécutés | Anti-doublon via `kyc_status` empêche double envoi |
| **OAuth Google** | `kyc_status` peut être déjà `verified` | Anti-doublon empêche envoi multiple |
| **Webhook URL manquante** | Email non envoyé | Log warning, continuer (non-bloquant) |

---

### ✅ Checklist test manuel

#### Préparation
- [ ] Créer le workflow n8n `welcome-client` (ou adapter `profiles-created`)
- [ ] Ajouter `VITE_N8N_WELCOME_WEBHOOK_URL` dans `.env.local`
- [ ] Redémarrer le serveur de dev

#### Test 1 : Nouveau signup email/password
- [ ] Créer un compte via `/auth/register`
- [ ] Cliquer sur le magic link dans l'email
- [ ] Vérifier console : `[AuthCallback] kyc_status updated to verified`
- [ ] Vérifier console : `[AuthCallback] Welcome email sent`
- [ ] Vérifier boîte mail : email de bienvenue reçu

#### Test 2 : Clic multiple sur le magic link
- [ ] Cliquer à nouveau sur le magic link
- [ ] Vérifier console : `[AuthCallback] Already verified, skipping`
- [ ] Vérifier boîte mail : **pas** de nouvel email de bienvenue

#### Test 3 : OAuth Google
- [ ] Se connecter via Google OAuth
- [ ] Si `kyc_status` déjà `verified` → pas d'email
- [ ] Si `kyc_status` `pending` → email envoyé

#### Test 4 : Webhook down
- [ ] Désactiver le webhook n8n (ou mettre une URL invalide)
- [ ] Créer un compte et confirmer
- [ ] Vérifier console : erreur loggée mais pas de crash
- [ ] Vérifier : `kyc_status` quand même mis à `verified`

#### Test 5 : Email null
- [ ] Créer un profil avec `email = null` (edge case)
- [ ] Vérifier console : `[AuthCallback] Welcome email skipped (missing email)`
- [ ] Vérifier : pas de crash

---

## 🎯 RECOMMANDATION FINALE

### Option recommandée : **Option A (utiliser `kyc_status` comme flag)**

**Pourquoi** :
- ✅ Pas de migration SQL nécessaire
- ✅ Implémentation simple (3 modifications)
- ✅ Anti-doublon garanti par la transition `pending → verified`
- ✅ Non-bloquant (email envoyé en async)
- ✅ Réutilise le pattern existant (payload compatible n8n)

**Inconvénient acceptable** :
- ⚠️ Pas de traçabilité de l'envoi (pas de timestamp)
- **Mitigation** : Ajouter des logs côté n8n pour tracer les envois

---

### Prochaines étapes

1. **Créer le workflow n8n `welcome-client`** (ou adapter `profiles-created`)
2. **Implémenter les 3 modifications** dans `Callback.tsx`
3. **Tester manuellement** (checklist ci-dessus)
4. **Commit + Push**

---

**Diagnostic terminé** ✅
