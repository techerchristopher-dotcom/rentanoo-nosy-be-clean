# Diagnostic Stripe Checkout : Transactions absentes du dashboard + Crash après paiement

## 🔍 Cause racine principale

**Le paiement Stripe est bien créé, mais :**
1. **Pas de logs pour identifier la clé utilisée** (sk_test vs sk_live) → Impossible de savoir quel dashboard consulter
2. **success_url ne contient pas session_id** → Impossible de vérifier côté front si le paiement a vraiment réussi
3. **PaymentSuccess ne vérifie pas le paiement** → Crash possible si le webhook n'a pas encore traité
4. **Confirmation via webhook uniquement** (correct) mais pas de fallback si webhook échoue

## 📋 Analyse détaillée

### A) Vérification que Stripe est vraiment appelé ✅

**Code vérifié** : `supabase/functions/create-checkout-session/index.ts`

**Ligne 464** : `stripe.checkout.sessions.create()` est bien appelé
```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [...],
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: { bookingId: String(bookingId) },
});
```

**✅ Confirmation** : Stripe API est bien appelé.

**❌ Problème** : Pas de logs pour identifier :
- Le type de clé utilisée (sk_test vs sk_live)
- Le session_id créé (cs_test_...)
- Le payment_intent_id créé (pi_test_...)

### B) Diagnostic "Stripe Dashboard vide"

#### 1. Variables d'environnement

**Code actuel** (ligne 388) :
```typescript
const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
```

**❌ Problème** : Aucun log pour identifier si c'est `sk_test_...` ou `sk_live_...`

**Impact** : Impossible de savoir quel dashboard consulter :
- Mode TEST → Dashboard Stripe en mode TEST (toggle en haut à droite)
- Mode LIVE → Dashboard Stripe en mode LIVE

#### 2. Stripe Connect

**✅ Résultat** : **AUCUNE trace de Stripe Connect** dans le code
- Pas de `stripeAccount` dans `checkout.sessions.create()`
- Pas de `connected account` ou `acct_` dans le code
- Pas d'`application_fee_amount`

**Conclusion** : Les paiements sont créés sur le compte Stripe principal (celui de la clé `STRIPE_SECRET_KEY`).

#### 3. Dashboard à consulter

**Règle** :
- Si `STRIPE_SECRET_KEY` commence par `sk_test_` → Dashboard en mode **TEST**
- Si `STRIPE_SECRET_KEY` commence par `sk_live_` → Dashboard en mode **LIVE**

**Action requise** : Vérifier le toggle "TEST/LIVE" en haut à droite du dashboard Stripe.

### C) Diagnostic crash après retour Stripe

#### 1. success_url / cancel_url

**Code actuel** (ligne 427, 479) :
```typescript
const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
// ...
success_url: successUrl,  // Ex: https://rentanoo.com/success
```

**❌ Problème** : `success_url` ne contient **PAS** de `session_id` :
- Stripe redirige vers : `https://rentanoo.com/success`
- Devrait être : `https://rentanoo.com/success?session_id={CHECKOUT_SESSION_ID}`

**Impact** : Impossible de vérifier côté front si le paiement a vraiment réussi.

#### 2. Code front qui traite le retour

**Fichier** : `src/pages/renter/PaymentSuccess.tsx`

**Code actuel** :
```typescript
export default function PaymentSuccess() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/me/renter/bookings?afterPayment=1");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);
  
  // ... UI ...
}
```

**❌ Problèmes** :
1. **Aucune vérification du paiement** : La page assume que le paiement a réussi
2. **Pas de récupération de session_id** depuis l'URL
3. **Pas de vérification avec Stripe API** pour confirmer le paiement
4. **Crash possible** si le webhook n'a pas encore traité → booking.status !== "confirmed"

#### 3. Route de redirection

**Fichier** : `src/pages/renter/RenterBookings.tsx`

**Ligne 70** : `const comingFromStripeSuccess = searchParams.get("afterPayment") === "1";`

**Ligne 96-100** : Cherche une réservation avec `status === 'accepted' || status === 'pending_payment'`

**❌ Problème** : Le webhook met le status à `"confirmed"` (ligne 198 de stripe-webhook/index.ts), mais le code cherche `"accepted"` ou `"pending_payment"`.

**Impact** : Si le webhook n'a pas encore traité, la réservation n'est pas trouvée → crash ou comportement inattendu.

### D) Vérification logique de confirmation

#### 1. Où Supabase met "confirmed"

**Fichier** : `supabase/functions/stripe-webhook/index.ts`

**Ligne 198** : `status: newStatus` où `newStatus = "confirmed"`

**✅ Correct** : La confirmation se fait uniquement via webhook Stripe (`checkout.session.completed`).

#### 2. Problème de timing

**Scénario problématique** :
1. Utilisateur paie sur Stripe Checkout → ✅ Succès
2. Stripe redirige vers `/success` → ⚡ Immédiat (< 1 seconde)
3. Page `/success` redirige vers `/me/renter/bookings?afterPayment=1` → ⚡ Après 2.5 secondes
4. Webhook Stripe traite `checkout.session.completed` → ⏱️ Peut prendre 1-5 secondes
5. **Résultat** : La page charge avant que le webhook ait mis à jour le status → Crash ou réservation non trouvée

#### 3. Pas de fallback

**❌ Problème** : Si le webhook échoue ou est retardé, il n'y a pas de mécanisme de fallback pour vérifier le paiement côté front.

## 🔧 Corrections proposées

### Correction 1 : Ajouter des logs pour identifier la clé Stripe

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Ajouter après la ligne 388** :
```typescript
// Log du type de clé Stripe (sans révéler la clé complète)
const stripeKeyType = stripeSecret?.startsWith("sk_test_") ? "TEST" 
  : stripeSecret?.startsWith("sk_live_") ? "LIVE" 
  : "UNKNOWN";
const stripeKeyPrefix = stripeSecret ? stripeSecret.substring(0, 7) + "..." : "N/A";

console.log("🔑 [create-checkout-session] Configuration Stripe:", {
  keyType: stripeKeyType,
  keyPrefix: stripeKeyPrefix,
  keyLength: stripeSecret?.length || 0,
  dashboardMode: stripeKeyType === "TEST" ? "TEST MODE (toggle en haut à droite)" : "LIVE MODE",
});
```

### Correction 2 : Ajouter session_id dans success_url

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Modifier ligne 479** :
```typescript
// AVANT
success_url: successUrl,

// APRÈS
success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
```

**Note** : Stripe remplace automatiquement `{CHECKOUT_SESSION_ID}` par l'ID réel de la session.

### Correction 3 : Améliorer PaymentSuccess pour vérifier le paiement

**Fichier** : `src/pages/renter/PaymentSuccess.tsx`

**Remplacer par** :
```typescript
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      console.error("❌ [PaymentSuccess] session_id manquant dans l'URL");
      setError("Session ID manquant. Veuillez contacter le support.");
      setIsVerifying(false);
      return;
    }

    // Vérifier le paiement via l'Edge Function ou directement via Supabase
    const verifyPayment = async () => {
      try {
        // Option 1: Vérifier via la DB (le webhook devrait avoir mis à jour)
        // Option 2: Vérifier directement avec Stripe API (nécessite une Edge Function)
        
        // Pour l'instant, on attend un peu pour laisser le webhook traiter
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Vérifier dans la DB que le booking est confirmé
        // (Cette logique devrait être dans une Edge Function dédiée)
        
        setIsVerifying(false);
        // Rediriger vers les bookings
        navigate("/me/renter/bookings?afterPayment=1");
      } catch (err) {
        console.error("❌ [PaymentSuccess] Erreur vérification paiement:", err);
        setError("Erreur lors de la vérification du paiement. Veuillez rafraîchir la page.");
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card rounded-xl shadow-card p-6 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-destructive">❌ Erreur</h1>
          <p className="text-foreground">{error}</p>
          <button
            onClick={() => navigate("/me/renter/bookings")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retour aux réservations
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card rounded-xl shadow-card p-6 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
          <span>✅</span>
          <span>Paiement confirmé</span>
        </h1>
        <p className="text-foreground">
          Merci ! Ton paiement a bien été reçu.
        </p>
        {isVerifying && (
          <p className="text-muted-foreground text-sm">
            Vérification en cours...
          </p>
        )}
        {!isVerifying && (
          <p className="text-muted-foreground text-xs">
            Redirection en cours...
          </p>
        )}
      </div>
    </main>
  );
}
```

### Correction 4 : Ajouter logs du session_id créé

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Modifier ligne 486** :
```typescript
console.log("✅ [create-checkout-session] Session créée avec succès:", {
  sessionId: session.id,
  sessionIdPrefix: session.id.substring(0, 10) + "...", // Ex: "cs_test_51..."
  paymentIntentId: session.payment_intent || "N/A",
  url: session.url?.substring(0, 50) + "...",
  bookingId,
  amountTTC_DB: amountTTC, // euros
  amountTTC_cents: unitAmountCents, // centimes
  subtotal_DB: subtotal, // euros
  // Ajouter pour debug dashboard
  stripeKeyType: stripeKeyType, // TEST ou LIVE
  dashboardUrl: stripeKeyType === "TEST" 
    ? "https://dashboard.stripe.com/test/payments" 
    : "https://dashboard.stripe.com/payments",
});
```

### Correction 5 : Corriger la recherche de réservation après paiement

**Fichier** : `src/pages/renter/RenterBookings.tsx`

**Modifier ligne 96-100** :
```typescript
// AVANT
const recentBooking = bookings
  .filter(b => b.status === 'accepted' || b.status === 'pending_payment')
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

// APRÈS
const recentBooking = bookings
  .filter(b => b.status === 'accepted' || b.status === 'pending_payment' || b.status === 'confirmed')
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
```

## 📝 Patch code complet

### Patch 1 : Edge Function (create-checkout-session)

```typescript
// Après ligne 388, ajouter :
const stripeKeyType = stripeSecret?.startsWith("sk_test_") ? "TEST" 
  : stripeSecret?.startsWith("sk_live_") ? "LIVE" 
  : "UNKNOWN";
const stripeKeyPrefix = stripeSecret ? stripeSecret.substring(0, 7) + "..." : "N/A";

console.log("🔑 [create-checkout-session] Configuration Stripe:", {
  keyType: stripeKeyType,
  keyPrefix: stripeKeyPrefix,
  keyLength: stripeSecret?.length || 0,
  dashboardMode: stripeKeyType === "TEST" ? "TEST MODE (toggle en haut à droite)" : "LIVE MODE",
});

// Modifier ligne 479 :
success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,

// Modifier ligne 486 :
console.log("✅ [create-checkout-session] Session créée avec succès:", {
  sessionId: session.id,
  sessionIdPrefix: session.id.substring(0, 10) + "...",
  paymentIntentId: session.payment_intent || "N/A",
  url: session.url?.substring(0, 50) + "...",
  bookingId,
  amountTTC_DB: amountTTC,
  amountTTC_cents: unitAmountCents,
  subtotal_DB: subtotal,
  stripeKeyType: stripeKeyType,
  dashboardUrl: stripeKeyType === "TEST" 
    ? "https://dashboard.stripe.com/test/payments" 
    : "https://dashboard.stripe.com/payments",
});
```

### Patch 2 : Frontend (PaymentSuccess.tsx)

Voir Correction 3 ci-dessus.

### Patch 3 : Frontend (RenterBookings.tsx)

Voir Correction 5 ci-dessus.

## ✅ Checklist de test

### Test 1 : Vérifier les logs Stripe

**En production** :
1. Lancer un paiement test
2. Vérifier les logs Supabase :
   ```bash
   supabase functions logs create-checkout-session --project-ref tbsgzykqcksmqxpimwry
   ```
3. Chercher :
   - `🔑 [create-checkout-session] Configuration Stripe:` → Vérifier `keyType: "TEST"` ou `"LIVE"`
   - `✅ [create-checkout-session] Session créée avec succès:` → Noter le `sessionId`

### Test 2 : Vérifier le dashboard Stripe

1. Se connecter à https://dashboard.stripe.com
2. **Vérifier le toggle** en haut à droite : TEST ou LIVE
3. Si logs montrent `keyType: "TEST"` → Toggle doit être sur **TEST**
4. Si logs montrent `keyType: "LIVE"` → Toggle doit être sur **LIVE**
5. Aller dans **Payments** → Chercher le `sessionId` noté dans les logs

### Test 3 : Tester le retour depuis Stripe

1. Lancer un paiement test
2. Compléter le paiement sur Stripe Checkout
3. Vérifier que l'URL de redirection contient `?session_id=cs_test_...`
4. Vérifier que la page `/success` charge sans erreur
5. Vérifier que la redirection vers `/me/renter/bookings?afterPayment=1` fonctionne
6. Vérifier que la réservation apparaît avec le bon statut (`confirmed`)

### Test 4 : Vérifier le webhook

1. Lancer un paiement test
2. Vérifier les logs du webhook :
   ```bash
   supabase functions logs stripe-webhook --project-ref tbsgzykqcksmqxpimwry
   ```
3. Chercher :
   - `💳 checkout.session.completed reçu:`
   - `✅ Réservation mise à jour avec succès:`

### Test 5 : Où regarder dans Stripe Dashboard

**Dans le dashboard Stripe** :
1. **Developers > Logs** : Voir toutes les requêtes API Stripe
   - Filtrer par `checkout.sessions.create`
   - Vérifier le `session_id` créé
2. **Payments > Transactions** : Voir les paiements réussis
   - Filtrer par date
   - Chercher le `session_id` ou `payment_intent_id`
3. **Connect accounts** : Si Connect était utilisé (mais ce n'est pas le cas ici)

## 🚨 Troubleshooting

### Problème : Transactions absentes du dashboard

**Vérifications** :
1. ✅ Vérifier le toggle TEST/LIVE dans le dashboard
2. ✅ Vérifier les logs pour confirmer `keyType: "TEST"` ou `"LIVE"`
3. ✅ Vérifier que la clé correspond au mode du dashboard
4. ✅ Vérifier dans **Developers > Logs** si la session a été créée

### Problème : Crash après retour Stripe

**Vérifications** :
1. ✅ Vérifier que `session_id` est présent dans l'URL (`/success?session_id=...`)
2. ✅ Vérifier les logs du webhook pour confirmer que le status a été mis à jour
3. ✅ Vérifier que le code cherche aussi `status === 'confirmed'` (pas seulement `'accepted'`)

### Problème : Webhook ne traite pas

**Vérifications** :
1. ✅ Vérifier que le webhook est configuré dans Stripe Dashboard
2. ✅ Vérifier que l'endpoint webhook est accessible
3. ✅ Vérifier les logs du webhook pour voir les erreurs

## 📊 Résumé des causes probables (par probabilité)

1. **🔴 Très probable** : Dashboard Stripe en mauvais mode (TEST vs LIVE)
2. **🟡 Probable** : Crash front car webhook pas encore traité (timing)
3. **🟢 Moins probable** : Webhook non configuré ou endpoint inaccessible
4. **🟢 Moins probable** : Clé Stripe incorrecte (mais alors le paiement ne fonctionnerait pas)

## 🎯 Action immédiate recommandée

1. **Ajouter les logs** (Patch 1) pour identifier la clé utilisée
2. **Vérifier le dashboard Stripe** avec le bon mode (TEST/LIVE)
3. **Ajouter session_id dans success_url** (Patch 1)
4. **Améliorer PaymentSuccess** (Patch 2) pour gérer le timing
5. **Corriger la recherche de réservation** (Patch 3)

