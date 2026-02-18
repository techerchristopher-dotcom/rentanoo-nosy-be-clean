# DIAG ONLY — Étape 1 : create-checkout-session (Customer + setup_future_usage)

**Mode** : DIAG ONLY — aucune modification.  
**Fichier** : `supabase/functions/create-checkout-session/index.ts`

---

## 1. Où est construite `stripe.checkout.sessions.create(...)`

**Fichier** : `supabase/functions/create-checkout-session/index.ts`  
**Lignes** : 507-526

```507:526:supabase/functions/create-checkout-session/index.ts
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: description,
            },
            unit_amount: unitAmountCents, // Convertir euros → centimes
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: String(bookingId),
      },
    });
```

Appel direct à l’API Stripe, sans wrapper.

---

## 2. Garantir un Customer sur la Checkout Session

### Cas A : `customer: <stripe_customer_id>` si présent

Si le profile du locataire a déjà `profiles.stripe_customer_id` :

```ts
customer: profile.stripe_customer_id  // ex: "cus_xxx"
```

### Cas B : sinon `customer_email` + `customer_creation: "always"`

Si aucun `stripe_customer_id` :

```ts
customer_email: profile.email,
customer_creation: "always"
```

Stripe créera un nouveau Customer et liera la carte à ce customer.

### État actuel

- `customer` : non utilisé
- `customer_email` : non utilisé  
- `customer_creation` : non utilisé

`grep` dans `supabase/functions` : aucun usage de ces champs.

---

## 3. Injection de `payment_intent_data`

**Emplacement** : au même niveau que `mode`, `line_items`, `success_url`, etc. — à l’intérieur de l’objet passé à `stripe.checkout.sessions.create()`.

**Position exacte** : entre L522 (`cancel_url`) et L524 (`metadata`), ou juste après `metadata` avant la fermeture `});` (L526).

**Exemple de structure cible** :

```ts
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [...],
  success_url: ...,
  cancel_url: cancelUrl,
  metadata: { bookingId: String(bookingId) },
  payment_intent_data: { setup_future_usage: "off_session" },  // ← À AJOUTER
  // + customer OU (customer_email + customer_creation) selon cas
});
```

---

## 4. Récupération du booking — query actuelle

**Lignes** : 306-310

```306:310:supabase/functions/create-checkout-session/index.ts
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("subtotal, base_price, options_total, vehicle_id, start_date, end_date")
      .eq("id", bookingId)
      .single();
```

`user_id` n’est pas sélectionné.

### Extension du select

Remplacer la chaîne L308 par :

```ts
.select("subtotal, base_price, options_total, vehicle_id, start_date, end_date, user_id")
```

Ou plus explicitement :

```ts
.select("user_id, subtotal, base_price, options_total, vehicle_id, start_date, end_date")
```

`user_id` = `bookings.user_id` (renter / locataire).

---

## 5. Lire profiles à partir de `user_id`

### Table / colonnes

| Table   | Colonnes utilisées                    |
|---------|--------------------------------------|
| `profiles` | `id`, `stripe_customer_id`, `email` |

`profiles.id` = `auth.users.id` = `bookings.user_id`.

### Requête Supabase (pseudo-code)

À exécuter après la validation du booking (après L327), une fois `user_id` disponible :

```ts
// Après L327 (booking validé), si booking.user_id existe
const userId = booking.user_id;
if (!userId) {
  // Fallback : ne pas passer customer → setup_future_usage ne sauvegardera pas la carte
  // OU retourner erreur selon stratégie
}

const { data: profile, error: profileErr } = await supabaseAdmin
  .from("profiles")
  .select("stripe_customer_id, email")
  .eq("id", userId)
  .single();

if (profileErr || !profile) {
  // Gérer : profile non trouvé
}
```

### Logique customer pour Checkout

```ts
// Construire l'objet sessionOptions
const sessionOptions: any = {
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [...],
  success_url: ...,
  cancel_url: cancelUrl,
  metadata: { bookingId: String(bookingId) },
  payment_intent_data: { setup_future_usage: "off_session" },
};

if (profile?.stripe_customer_id) {
  sessionOptions.customer = profile.stripe_customer_id;
} else if (profile?.email) {
  sessionOptions.customer_email = profile.email;
  sessionOptions.customer_creation = "always";
}

const session = await stripe.checkout.sessions.create(sessionOptions);
```

---

## 6. Risques / contraintes

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Email absent** | Pas de `customer_email` → pas de customer créé → `setup_future_usage` ne sauvegarde pas la carte | Vérifier `profile?.email` ; si vide, fallback vers flow SetupIntent caution (comportement actuel) ou erreur explicite |
| **`stripe_customer_id` invalide** | Stripe peut rejeter un `cus_xxx` supprimé ou d’un autre compte | Gérer l’erreur Stripe ; en cas d’échec, retry avec `customer_email` + `customer_creation: "always"` si email dispo |
| **Checkout mode guest** | Sans `customer` ni `customer_email`, Checkout crée une session anonyme → pas de carte sauvegardée | Toujours passer `customer` ou `customer_email` + `customer_creation` pour forcer un customer |
| **`user_id` null** | `bookings.user_id` peut être null (contrainte DB à vérifier) | Si null, impossible de joindre profiles ; ne pas passer customer ; log + comportement dégradé (caution via SetupIntent) |
| **Profile non trouvé** | L’utilisateur peut ne pas avoir de ligne dans `profiles` | Vérifier existence du profile avant session ; sinon erreur ou fallback sans customer |
| **`customer` et `customer_email` ensemble** | Incompatibles : Stripe rejette si les deux sont fournis | Utiliser soit `customer`, soit `customer_email` + `customer_creation`, jamais les deux |

---

## 7. Mini-plan des modifs minimales

| # | Zone | Fichier | Lignes | Action |
|---|------|---------|--------|--------|
| 1 | Select booking | `create-checkout-session/index.ts` | 308 | Ajouter `user_id` au `.select()` |
| 2 | Lecture profile | idem | Après 327 | Nouvelle requête `from("profiles").select("stripe_customer_id, email").eq("id", booking.user_id).single()` |
| 3 | Options Checkout | idem | 507-526 | Construire objet session avec `customer` ou `customer_email` + `customer_creation` selon profile |
| 4 | Options Checkout | idem | 507-526 | Ajouter `payment_intent_data: { setup_future_usage: "off_session" }` |
| 5 | Gestion erreurs | idem | Après requête profile | Traiter profile null, email absent, stripe_customer_id invalide |

### Sections de code concernées

| Section | Lignes | Rôle |
|---------|--------|------|
| Requête booking | 306-310 | Ajouter `user_id` au select |
| Bloc après validation subtotal | 328-351 | Insérer lecture profile + logique customer |
| Appel `stripe.checkout.sessions.create` | 507-526 | Ajouter `payment_intent_data` + `customer` / `customer_email` / `customer_creation` |

---

**Rappel** : DIAG ONLY — aucune modification appliquée.
