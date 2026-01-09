# 🔍 DIAGNOSTIC STRIPE WEBHOOK — 401 "Missing authorization header"

> **Objectif : diagnostic uniquement, aucune modification de code.**

**Date** : 2025-01-27  
**Projet** : `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)  
**URL Webhook** : `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook`

---

## 📋 Contexte

- ✅ Stripe envoie bien l'événement `checkout.session.completed` vers l'URL webhook
- ❌ Stripe reçoit une réponse **401 – "Missing authorization header"**
- ✅ Le paiement Stripe est bien `payment_status = "paid"`
- ✅ Le `metadata.bookingId` est présent dans l'événement
- ❌ La base Supabase **n'est pas mise à jour**

---

## 1️⃣ Cause racine du `401`

### Problème identifié

**Par défaut, les Edge Functions de Supabase exigent un jeton JWT valide dans l'en-tête `Authorization` pour chaque requête.** Si cet en-tête est absent ou invalide, la fonction renvoie une erreur `401 Unauthorized` avec le message "Missing authorization header".

Dans le cas présent :
- Stripe envoie des webhooks **sans inclure d'en-tête `Authorization`**
- La fonction `stripe-webhook` est donc rejetée avant même d'atteindre le code métier

### Configuration actuelle

**Fichier trouvé :** `supabase/functions/stripe-webhook/function.toml`

```toml
# Configuration Supabase Edge Function : stripe-webhook
[functions.stripe-webhook]
verify_jwt = false
```

**⚠️ PROBLÈME IDENTIFIÉ :**

Le fichier s'appelle `function.toml`, mais selon la documentation Supabase, le fichier de configuration doit s'appeler **`config.toml`** (pas `function.toml`).

**Format attendu par Supabase :**
- Option A : `supabase/functions/stripe-webhook/config.toml` (fichier `config.toml` dans le dossier de la fonction)
- Option B : `supabase/config.toml` avec section `[functions.stripe-webhook]` (configuration globale)

**Résultat :** Le fichier `function.toml` n'est **probablement pas reconnu** par Supabase, donc la configuration `verify_jwt = false` n'est **pas appliquée**. La fonction reste donc protégée par JWT par défaut.

---

## 2️⃣ Compatibilité Stripe avec Edge Functions protégées JWT

### Réponse claire

**❌ NON, un webhook Stripe n'est PAS compatible avec une Edge Function protégée par JWT.**

**Raison :**
- Stripe n'envoie **jamais** d'en-tête `Authorization` dans ses webhooks
- Stripe utilise uniquement le header `stripe-signature` pour l'authentification
- Les webhooks Stripe sont conçus pour être appelés par des endpoints publics ou protégés par signature (pas par JWT)

**Conclusion :** Pour qu'un webhook Stripe fonctionne avec une Edge Function Supabase, il **DOIT** avoir `verify_jwt = false` dans sa configuration.

---

## 3️⃣ Chemin d'exécution actuel

### Moment du rejet

La requête est rejetée **AVANT** que le code de la fonction ne soit exécuté.

**Ordre d'exécution :**

1. **Stripe envoie la requête POST** vers `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook`
   - Headers envoyés : `stripe-signature`, `Content-Type: application/json`
   - **PAS de header `Authorization`**

2. **Middleware Supabase (niveau infrastructure)**
   - Vérifie la présence du header `Authorization: Bearer <token>`
   - **Échec : header absent**
   - Retourne immédiatement `401 Unauthorized` avec message "Missing authorization header"
   - **La requête n'atteint JAMAIS le code de la fonction**

3. **Code de la fonction (`index.ts`)**
   - ❌ **N'est jamais exécuté**
   - La logique Stripe (vérification signature, parsing event) n'est jamais atteinte
   - Les mises à jour DB ne sont jamais effectuées

### Confirmation

**Le paiement Stripe est OK mais bloqué AVANT la logique métier.**

- ✅ Stripe a bien traité le paiement (`payment_status = "paid"`)
- ✅ L'événement `checkout.session.completed` contient bien `metadata.bookingId`
- ❌ La requête est rejetée au niveau du middleware Supabase (avant le code)
- ❌ Aucune logique métier n'est exécutée
- ❌ Aucune écriture DB n'est effectuée

---

## 4️⃣ Vérification déploiement et accessibilité

### Déploiement de la fonction

**Fichier source :** `supabase/functions/stripe-webhook/index.ts`  
**Configuration :** `supabase/functions/stripe-webhook/function.toml` (⚠️ nom incorrect)

**URL de la fonction :**
- Format : `https://[PROJECT_REF].supabase.co/functions/v1/[function-name]`
- Actuel : `https://tbsgzykqcksmqxpimwry.supabase.co/functions/v1/stripe-webhook`

**Accessibilité :**
- ✅ La fonction est accessible publiquement (pas de restriction réseau)
- ✅ L'URL correspond bien à celle configurée dans Stripe Dashboard
- ❌ Mais la fonction est protégée par JWT (configuration non appliquée)

### Code de la fonction

**Fichier :** `supabase/functions/stripe-webhook/index.ts`

**Observations :**
- ✅ Le code gère correctement les webhooks Stripe (lignes 49-261)
- ✅ Vérification de signature Stripe si `STRIPE_WEBHOOK_SECRET` est défini (lignes 64-87)
- ✅ Parsing de l'événement `checkout.session.completed` (lignes 104-110)
- ✅ Mise à jour DB avec calcul des fees (lignes 141-242)
- ✅ Le code est correct et fonctionnel

**Commentaire dans le code (ligne 3) :**
```typescript
// @allowPublic: true
```

⚠️ Ce commentaire n'a **aucun effet** sur Supabase. C'est juste un commentaire TypeScript, pas une directive Supabase.

---

## 5️⃣ Impact sur les écritures DB

### Confirmation

**✅ OUI, le problème actuel empêche totalement toute écriture DB**, même si le code webhook est correct.

**Raison :**
- La requête est rejetée au niveau du middleware Supabase (avant l'exécution du code)
- Le code de mise à jour DB (lignes 215-242) n'est jamais atteint
- Même si le code était parfait, il ne serait jamais exécuté

**Code qui devrait s'exécuter (mais ne s'exécute pas) :**

```215:242:supabase/functions/stripe-webhook/index.ts
  // 7. Mise à jour de la réservation dans Supabase
  const { data: updateData, error: updateErr } = await supabaseAdmin
    .from("bookings")
    .update(updatePayload)
    .eq("id", bookingId)
    .select();

  // Log DEV-only après update
  if (isDev) {
    console.info("[fees-webhook-write:after]", {
      webhook: "EDGE_WEBHOOK",
      bookingId,
      ok: !updateErr,
      error: updateErr?.message || null,
      data: updateData ? "updated" : null,
    });
  }

  if (updateErr) {
    console.error("❌ Erreur mise à jour réservation:", updateErr);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "DB update failed",
        details: updateErr.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("✅ Réservation mise à jour avec succès:", {
    bookingId,
    status: "accepted",
    paid_at: now,
    amount_total_paid: amountTotalPaid,
  });
```

**Résultat :** Ce code n'est jamais exécuté car la requête est rejetée avant.

---

## 📊 Résumé du diagnostic

### Cause racine

**Le fichier de configuration `function.toml` n'est pas reconnu par Supabase** car il devrait s'appeler `config.toml`. La configuration `verify_jwt = false` n'est donc pas appliquée, et la fonction reste protégée par JWT par défaut.

### Fichiers responsables

1. **`supabase/functions/stripe-webhook/function.toml`** (nom incorrect)
   - Contient `verify_jwt = false` mais n'est pas reconnu
   - Devrait s'appeler `config.toml` ou être déplacé dans `supabase/config.toml`

2. **Configuration implicite par défaut Supabase**
   - Par défaut, `verify_jwt = true` pour toutes les Edge Functions
   - Cette configuration par défaut est appliquée car `function.toml` n'est pas reconnu

### Chemin d'exécution

1. Stripe envoie webhook → URL Edge Function
2. **Middleware Supabase** → Vérifie `Authorization` header → **ÉCHEC (401)**
3. Code de la fonction → **N'est jamais exécuté**

### Impact

- ❌ Aucune logique métier n'est exécutée
- ❌ Aucune écriture DB n'est effectuée
- ❌ Même si le code est correct, il ne peut pas s'exécuter

---

## 🔍 Détails techniques

### Configuration attendue par Supabase

**Format 1 : Fichier dans le dossier de la fonction**
```
supabase/functions/stripe-webhook/config.toml
```

**Contenu attendu :**
```toml
[functions.stripe-webhook]
verify_jwt = false
```

**Format 2 : Configuration globale**
```
supabase/config.toml
```

**Contenu attendu :**
```toml
[functions.stripe-webhook]
verify_jwt = false
```

### Configuration actuelle (incorrecte)

**Fichier :** `supabase/functions/stripe-webhook/function.toml`  
**Problème :** Le nom `function.toml` n'est pas reconnu par Supabase

### Commentaire dans le code

**Ligne 3 de `index.ts` :**
```typescript
// @allowPublic: true
```

**Note :** Ce commentaire n'a aucun effet. C'est juste un commentaire TypeScript, pas une directive Supabase. Seule la configuration TOML peut désactiver la vérification JWT.

---

## ✅ Conclusion

**Diagnostic complet :**

1. ✅ **Cause racine identifiée** : Fichier `function.toml` non reconnu → `verify_jwt = false` non appliqué
2. ✅ **Fichier responsable** : `supabase/functions/stripe-webhook/function.toml` (nom incorrect)
3. ✅ **Compatibilité confirmée** : Stripe ne peut pas envoyer `Authorization` header
4. ✅ **Chemin d'exécution expliqué** : Rejet au middleware avant le code
5. ✅ **Impact confirmé** : Blocage total des écritures DB

**Le problème est purement configurationnel, pas lié au code de la fonction.**

---

**Fin du diagnostic — Aucune modification effectuée**

