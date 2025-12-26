# DIAGNOSTIC STRICT — create-checkout-session / Stripe redirect URLs

## 📋 Résumé du problème

**Symptôme :** L'Edge Function `create-checkout-session` retourne une erreur :
```
❌ [create-checkout-session] URLs de redirection manquantes: { hasSuccessUrl: false, hasCancelUrl: false }
```

**Erreur HTTP :** `500` avec message `"Configuration serveur manquante: STRIPE_SUCCESS_URL et/ou STRIPE_CANCEL_URL"`

---

## 1️⃣ Localisation de la source des URLs

### Fichier analysé
**`supabase/functions/create-checkout-session/index.ts`**

### Comment les URLs sont récupérées

**Lignes 221-222 :**
```typescript
const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");
```

**Lignes 224-242 :** Vérification et erreur si absentes
```typescript
if (!successUrl || !cancelUrl) {
  console.error("❌ [create-checkout-session] URLs de redirection manquantes:", {
    hasSuccessUrl: !!successUrl,
    hasCancelUrl: !!cancelUrl
  });
  return new Response(
    JSON.stringify({ 
      ok: false, 
      error: "Configuration serveur manquante: STRIPE_SUCCESS_URL et/ou STRIPE_CANCEL_URL" 
    }),
    { status: 500, ... }
  );
}
```

**Lignes 267-268 :** Utilisation dans la session Stripe
```typescript
success_url: successUrl,
cancel_url: cancelUrl,
```

### Conclusion : Source des URLs

**✅ Source :** `Deno.env.get(...)` — **ENV-ONLY**

**❌ PAS du body :** Le code ne lit jamais `body.successUrl` ou `body.cancelUrl`

**❌ PAS d'helper/import :** Aucun import ou fonction helper pour construire les URLs

**❌ PAS de fallback Origin/Referer :** Aucune logique de fallback basée sur les headers HTTP

---

## 2️⃣ Noms attendus

### Variables d'environnement attendues

| Variable | Nom exact | Format attendu |
|----------|-----------|----------------|
| Success URL | `STRIPE_SUCCESS_URL` | URL complète (ex: `http://localhost:3012/success`) |
| Cancel URL | `STRIPE_CANCEL_URL` | URL complète (ex: `http://localhost:3012/cancel`) |

### Documentation dans le code

**Lignes 6-10 du fichier Edge Function :**
```typescript
 * - STRIPE_SUCCESS_URL : URL de redirection après paiement réussi
 *   ⚠️ EN DEV LOCAL : Utiliser http://localhost:3012/success (tenant) ou http://localhost:3013/success (owner)
 *   ⚠️ Configurer selon l'instance utilisée (tenant sur 3012, owner sur 3013)
 * - STRIPE_CANCEL_URL : URL de redirection après annulation
 *   ⚠️ EN DEV LOCAL : Utiliser http://localhost:3012/cancel (tenant) ou http://localhost:3013/cancel (owner)
```

### Variables d'environnement du body

**❌ Aucune variable du body n'est attendue pour les URLs**

Le payload attendu (lignes 12-17) ne mentionne que :
- `amount` (number)
- `description` (string)
- `bookingId` (string, optionnel)

**Aucune mention de `successUrl` ou `cancelUrl` dans le body.**

---

## 3️⃣ Vérification du call front → edge function

### Fichier frontend analysé
**`src/lib/payerLocation.ts`**

### Appel à l'Edge Function

**Lignes 43-49 :**
```typescript
const { data, error } = await supabase.functions.invoke("create-checkout-session", {
  body: {
    amount: reservation.totalTTC,
    description: `Location de ${reservation.voiture}`,
    bookingId: reservation.id,
  },
});
```

### Ce qui est envoyé

**Body JSON :**
```json
{
  "amount": 150.50,
  "description": "Location de véhicule",
  "bookingId": "booking-uuid"
}
```

**Headers (gérés automatiquement par `supabase.functions.invoke`) :**
- `Authorization: Bearer <session.access_token>`
- `apikey: <VITE_SUPABASE_ANON_KEY>`
- `Content-Type: application/json`

### Confirmation : URLs non envoyées

**✅ Confirmation :** `successUrl` et `cancelUrl` **NE SONT PAS** envoyés dans le body.

**✅ Confirmation :** Aucun header custom n'est ajouté pour les URLs.

### Résultat : **ENV-ONLY**

L'Edge Function attend les URLs **uniquement depuis les variables d'environnement**, et le frontend ne les envoie pas.

---

## 4️⃣ Comparaison avec le comportement "avant ça marchait"

### Recherche d'un ancien système

**Fichier analysé :** `server/index.ts`

**Résultat :** Le serveur Express gère uniquement le **webhook Stripe** (`/api/stripe/webhook`), pas la création de session checkout.

**Lignes 27-188 :** Route webhook qui traite `checkout.session.completed`, mais ne crée pas de session.

### Conclusion : Pas d'ancien système backend

**✅ Pas de remplacement :** Il n'y a pas d'ancien endpoint Express qui créait la session Stripe.

**✅ Architecture actuelle :** L'Edge Function `create-checkout-session` est la seule source de création de session.

### Hypothèse : Changement de projet Supabase

**Projet actuel :** `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)

**Hypothèse :** Si le code a été migré d'un projet Supabase à un autre, les secrets d'environnement (incluant `STRIPE_SUCCESS_URL` et `STRIPE_CANCEL_URL`) n'ont peut-être pas été copiés.

### Routes frontend existantes

**Fichier :** `src/App.tsx` (lignes 79-80)

```typescript
<Route path="/success" element={<PaymentSuccess />} />
<Route path="/cancel" element={<PaymentCancel />} />
```

**✅ Les routes existent :** `/success` et `/cancel` sont bien définies dans le router React.

**Fichier :** `src/pages/renter/PaymentSuccess.tsx`
- Route `/success` redirige vers `/me/renter/bookings?afterPayment=1` après 2.5s

**Fichier :** `src/pages/renter/PaymentCancel.tsx`
- Route `/cancel` existe (fichier présent)

### Pourquoi ça casse maintenant

**Cause probable :** Les variables d'environnement `STRIPE_SUCCESS_URL` et `STRIPE_CANCEL_URL` ne sont pas définies dans le projet Supabase `tbsgzykqcksmqxpimwry`.

**Avant :** Si ça marchait, c'est que ces variables étaient définies dans l'ancien projet (ou en local).

**Maintenant :** Migration vers un nouveau projet Supabase sans copier ces secrets.

---

## 5️⃣ Prouver le manque runtime

### Vérification Supabase secrets

**Commande CLI :**
```bash
supabase secrets list --project-ref tbsgzykqcksmqxpimwry
```

**Résultat attendu :** La liste doit contenir `STRIPE_SUCCESS_URL` et `STRIPE_CANCEL_URL`.

**Si absentes :** C'est la cause racine.

### Vérification via logs Edge Function

**Les logs DEV-only ajoutés précédemment (lignes 34-68) affichent :**
```json
{
  "stripeEnvVars": {
    "STRIPE_SUCCESS_URL": { "exists": false },
    "STRIPE_CANCEL_URL": { "exists": false }
  }
}
```

**Où voir les logs :**
- Dashboard Supabase → `Edge Functions` → `Logs` → `create-checkout-session`
- Ou CLI : `supabase functions logs create-checkout-session --project-ref tbsgzykqcksmqxpimwry`

### Vérification Network tab (Request Payload)

**Où regarder :**
1. Ouvrir DevTools → Network
2. Filtrer sur `create-checkout-session`
3. Cliquer sur la requête POST
4. Onglet "Payload" ou "Request"

**Résultat attendu :**
```json
{
  "amount": 150.50,
  "description": "Location de véhicule",
  "bookingId": "uuid"
}
```

**✅ Confirmation :** Aucun champ `successUrl` ou `cancelUrl` dans le payload (comportement normal, car l'Edge Function ne les lit pas depuis le body).

---

## 6️⃣ Tableau récapitulatif

| Source | Nom attendu | Présent actuellement ? | Pourquoi c'est vide | Action minimale à faire ensuite |
|--------|------------|------------------------|---------------------|----------------------------------|
| **ENV** | `STRIPE_SUCCESS_URL` | ❌ **NON** | Secret non défini dans le projet Supabase `tbsgzykqcksmqxpimwry` | Définir via `supabase secrets set STRIPE_SUCCESS_URL=<url> --project-ref tbsgzykqcksmqxpimwry` |
| **ENV** | `STRIPE_CANCEL_URL` | ❌ **NON** | Secret non défini dans le projet Supabase `tbsgzykqcksmqxpimwry` | Définir via `supabase secrets set STRIPE_CANCEL_URL=<url> --project-ref tbsgzykqcksmqxpimwry` |
| **Body** | `successUrl` | ❌ **N/A** | Le code ne lit pas cette variable du body | N/A (pas nécessaire) |
| **Body** | `cancelUrl` | ❌ **N/A** | Le code ne lit pas cette variable du body | N/A (pas nécessaire) |

---

## 📝 Conclusion

### Cause racine identifiée

**✅ Source de vérité :** Les URLs viennent **uniquement des variables d'environnement Supabase** (`STRIPE_SUCCESS_URL` et `STRIPE_CANCEL_URL`).

**✅ Pourquoi c'est vide :** Ces secrets ne sont pas définis dans le projet Supabase `tbsgzykqcksmqxpimwry`.

**✅ Pourquoi "ça marchait avant" :** Probablement que :
- Les secrets étaient définis dans un autre projet Supabase
- Ou les secrets étaient définis en local mais pas synchronisés avec Supabase Cloud
- Ou migration vers un nouveau projet sans copier les secrets

### Action minimale requise

**1. Définir les secrets dans Supabase :**

```bash
# Pour DEV (tenant sur port 3012)
supabase secrets set STRIPE_SUCCESS_URL=http://localhost:3012/success --project-ref tbsgzykqcksmqxpimwry
supabase secrets set STRIPE_CANCEL_URL=http://localhost:3012/cancel --project-ref tbsgzykqcksmqxpimwry

# Pour PROD (remplacer par les URLs de production)
supabase secrets set STRIPE_SUCCESS_URL=https://rentanoo.com/success --project-ref tbsgzykqcksmqxpimwry
supabase secrets set STRIPE_CANCEL_URL=https://rentanoo.com/cancel --project-ref tbsgzykqcksmqxpimwry
```

**2. Vérifier que les secrets sont bien définis :**

```bash
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE
```

**3. Redéployer l'Edge Function (si nécessaire) :**

```bash
supabase functions deploy create-checkout-session --project-ref tbsgzykqcksmqxpimwry
```

### Notes importantes

- **Les routes `/success` et `/cancel` existent déjà** dans le frontend (`src/App.tsx`)
- **Le frontend n'a pas besoin de modification** — il n'envoie pas les URLs (et c'est normal)
- **L'Edge Function doit être la source de vérité** pour les URLs (sécurité + centralisation)

---

**Date de diagnostic :** 2025-01-XX  
**Fichiers analysés :**
- `supabase/functions/create-checkout-session/index.ts` (lignes 221-242)
- `src/lib/payerLocation.ts` (lignes 43-49)
- `src/App.tsx` (lignes 79-80)
- `server/index.ts` (vérification webhook uniquement)

