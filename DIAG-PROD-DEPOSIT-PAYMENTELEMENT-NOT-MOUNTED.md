# DIAG PROD — PaymentElement pas monté / confirmSetup error

**Mode** : DIAG ONLY — aucun patch, pas de modification de logique.  
**Objectif** : Pourquoi, en prod, le formulaire Stripe ne s'affiche pas et `confirmSetup` renvoie "elements should have a mounted Payment Element".

---

## 1️⃣ FLOW DÉPÔT CAUTION CÔTÉ FRONT

### Fichiers impliqués

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `src/components/DepositFlowModal.tsx` | 1-230 | Modale caution, appel API, rendu Elements + PaymentElement |
| `src/lib/depositCaution.ts` | 14-53 | `createSetupIntentClientSecret()` — POST `/api/deposit/create-setup-intent` |
| `src/lib/stripePublicKey.ts` | 1-5 | `STRIPE_PUBLISHABLE_KEY` depuis `VITE_STRIPE_PUBLISHABLE_KEY` |
| `src/pages/renter/RenterBookings.tsx` | 1010-1024 | Utilisation de `DepositFlowModal` |

### Fonctions clés

| Action | Fichier | Lignes |
|--------|---------|--------|
| Ouverture modale | `RenterBookings.tsx` | `setDepositModalBooking(b)` + `setIsDepositModalOpen(true)` |
| Appel API create-setup-intent | `DepositFlowModal.tsx` | L127-137 (`useEffect` → `createSetupIntentClientSecret`) |
| Stockage clientSecret | `DepositFlowModal.tsx` | L128 → `setClientSecret(secret)` |
| Rendu `<Elements>` + `<PaymentElement />` | `DepositFlowModal.tsx` | L206-225 (conditionnel) |
| Handler bouton "Enregistrer ma carte" | `DepositFlowModal.tsx` | L42-81 (`handleSubmit` → `stripe.confirmSetup`) |

---

## 2️⃣ VÉRIFICATION DU MONTAGE STRIPE ELEMENTS

### 2.1 `loadStripe()` et clé utilisée

**Fichier** : `src/lib/stripePublicKey.ts` L1-2

```typescript
export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
```

**Fichier** : `DepositFlowModal.tsx` L12

```typescript
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
```

| Élément | Comportement |
|---------|--------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Inliné au build. Absent → `""` → `stripePromise = null` |
| `stripePromise` | `loadStripe(pk)` ou `null` (pas un `Promise`, résultat synchrone de l'appel) |

**Note** : `loadStripe()` renvoie une `Promise<Stripe \| null>`. `stripePromise` est cette Promise.

### 2.2 Où sont rendus `<Elements>` et `<PaymentElement />`

**Fichier** : `DepositFlowModal.tsx` L206-225

```tsx
{clientSecret && stripePromise && (
  <Elements
    stripe={stripePromise}
    options={{
      clientSecret,
      appearance: { theme: "stripe" },
    }}
  >
    <DepositPaymentForm ... />
  </Elements>
)}
```

**Fichier** : `DepositFlowModal.tsx` L84-90 (`DepositPaymentForm`)

```tsx
return (
  <form onSubmit={handleSubmit} className="space-y-4">
    <PaymentElement
      options={{ layout: "tabs" }}
    />
    <div className="flex flex-col sm:flex-row gap-2 pt-2">
      ...
    </div>
  </form>
);
```

**Conditions de rendu** :
- `clientSecret` : rempli par l’API (L128).
- `stripePromise` : non null si `STRIPE_PUBLISHABLE_KEY` non vide.
- `<Elements>` : rendu uniquement si les deux sont vrais.
- `<PaymentElement />` : rendu à l’intérieur de `<Elements>` via `DepositPaymentForm`.

### 2.3 Vérification de la variable `clientSecret`

Même variable que la réponse API :
- L128 : `setClientSecret(secret)` avec `secret` de `createSetupIntentClientSecret()`.
- L212 : `clientSecret` passé à `Elements` dans `options`.

---

## 3️⃣ SCOPE — confirmSetup dans le bon provider ?

### Hiérarchie des composants

```
DepositFlowModal
└── Dialog
    └── DialogContent (portal #radix-portal-root)
        └── div (body)
            ├── DialogHeader, texte, montant, lien...
            ├── {loading && !clientSecret && <span>Chargement...</span>}
            └── {clientSecret && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <DepositPaymentForm>   ← useStripe(), useElements(), confirmSetup()
                      ├── <form onSubmit={handleSubmit}>
                      │     ├── <PaymentElement />
                      │     └── <Button type="submit">Enregistrer ma carte</Button>
                      └── ...
                  </Elements>
                )}
```

### Appels Stripe

| Hook / appel | Fichier | Lignes | Composant parent |
|--------------|---------|--------|------------------|
| `useStripe()` | `DepositFlowModal.tsx` | 39 | `DepositPaymentForm` |
| `useElements()` | `DepositFlowModal.tsx` | 40 | `DepositPaymentForm` |
| `stripe.confirmSetup({ elements })` | `DepositFlowModal.tsx` | 47-54 | `DepositPaymentForm` |

`DepositPaymentForm` est un enfant direct de `<Elements>` qui contient `<PaymentElement />`. Le scope est correct.

---

## 4️⃣ DIFFÉRENCES PROD vs DEV

### Conditions DEV / PROD dans le dépôt caution

| Recherche | Résultat |
|-----------|----------|
| `import.meta.env.DEV` dans `DepositFlowModal.tsx` | Aucune |
| `process.env.NODE_ENV` dans `DepositFlowModal.tsx` | Aucune |
| `VITE_*` conditionnel dans `DepositFlowModal.tsx` | Aucune |
| Lazy-load / dynamic import | Aucun dans le flux deposit |

Aucune branche DEV/PROD qui modifie le rendu du flux deposit.

### Variables VITE au build

| Variable | Moment | Impact |
|----------|--------|--------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Build | Inliné dans le bundle. Absent au build → `""` en prod. |

En prod, si la variable n’est pas fournie au build (CI, config, etc.), la clé sera vide.

---

## 5️⃣ API UTILISÉE : PaymentElement vs CardElement

### Occurrences

| Élément | Fichier | Ligne |
|---------|---------|-------|
| `PaymentElement` | `DepositFlowModal.tsx` | 3 (import), 86 (JSX) |
| `confirmSetup` | `DepositFlowModal.tsx` | 47 |
| `CardElement` | — | Aucune |
| `confirmCardSetup` | — | Aucune |

Le projet utilise uniquement `PaymentElement` et `confirmSetup`.

---

## 6️⃣ CAUSES PROBABLES IDENTIFIÉES

L’erreur Stripe "elements should have a mounted Payment Element" apparaît quand `confirmSetup` est appelé alors qu’aucun Payment Element n’est monté dans l’instance `elements`.

Causes documentées (StackOverflow, GitHub) :
1. Payment Element pas encore monté (chargement asynchrone de l’iframe).
2. Composant `Elements` démonté pendant l’appel (ex. loading qui remplace tout).
3. `loadStripe()` pas résolu au moment du rendu.
4. iframe Stripe bloquée (CSP, COEP/COOP).

---

## 7️⃣ CHECKLIST DE CONFIRMATION (SANS PATCH)

### Vérifier que `clientSecret` est non vide au rendu

- Dans la console prod : `console.log` déjà présent L13-14 dans `DepositFlowModal`.
- Ou ajouter temporairement avant le rendu de `Elements` :
  ```javascript
  console.log("[DepositFlowModal] clientSecret at render:", clientSecret ? "present" : "null");
  ```

### Vérifier si `<PaymentElement />` est monté (DOM)

1. Ouvrir la modale en prod.
2. DevTools → Elements, chercher un `iframe` avec `src` contenant `js.stripe.com` ou `stripe.com`.
3. Si aucun iframe Stripe dans le formulaire → Payment Element non monté.

### Vérifier si le submit est déclenché avant montage

Le bouton n’est désactivé que si `!stripe || isSubmitting`. Il n’y a pas d’attente de `onReady` du PaymentElement. L’utilisateur peut cliquer avant que l’iframe soit prête.

### Logs DIAG (DIAG ONLY)

| Emplacement | Log suggéré |
|-------------|-------------|
| `DepositFlowModal.tsx` avant L206 | `console.log("[DepositFlowModal] render Elements?", !!clientSecret, !!stripePromise);` |
| `DepositPaymentForm` L41 | `console.log("[DepositPaymentForm] handleSubmit", { hasStripe: !!stripe, hasElements: !!elements });` |
| `DepositPaymentForm` L86 (sur `PaymentElement`) | Ajouter `onReady={() => console.log("[PaymentElement] onReady")}` pour confirmer le montage |
| `DepositPaymentForm` L44 | Après `if (!stripe \|\| !elements) return;` : `console.log("[DepositPaymentForm] before confirmSetup", { elementsType: typeof elements });` |

---

## 8️⃣ RÉSUMÉ GO / NO GO

| Condition | GO | NO GO |
|-----------|-----|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` défini au build prod | Oui | Non → `stripePromise = null`, pas de `Elements` |
| Clé pk_ alignée avec sk_ (TEST/LIVE) | Oui | Non → Payment Element peut ne pas s’initialiser |
| `clientSecret` présent avant rendu de `Elements` | Oui | Non → `Elements` non rendu |
| Payment Element iframe montée avant submit | Oui | Non → erreur "elements should have a mounted Payment Element" |
| Pas de CSP / COEP / COOP bloquant les iframes Stripe | Oui | Non → iframe bloquée, Payment Element non monté |
| Submit désactivé tant que Payment Element pas prêt | — | Non → risque de clic avant montage |

---

## 9️⃣ TABLEAU CAUSES / PREUVES / CONFIRMATION / FIX

| Cause probable | Preuve (fichier + ligne) | Comment confirmer | Fix minimal (descriptif) |
|----------------|--------------------------|-------------------|---------------------------|
| **1. Payment Element pas prêt au clic** | Aucun `onReady` sur `PaymentElement` (L86). Bouton actif dès que `stripe` et `elements` sont non null. | En prod, noter l’ordre des logs et vérifier si `onReady` est logué avant le clic. | Désactiver le submit jusqu’à `onReady` du Payment Element. |
| **2. `VITE_STRIPE_PUBLISHABLE_KEY` absent au build prod** | `stripePublicKey.ts` L2 : `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY \|\| ""` | Vérifier les variables d’env au build (CI, Vercel, etc.). Tester `STRIPE_PUBLISHABLE_KEY` dans la console. | Définir la variable au moment du build prod. |
| **3. Incohérence pk_ / sk_ (TEST vs LIVE)** | Backend : `STRIPE_SECRET_KEY` (sk_test_ ou sk_live_). Frontend : `VITE_STRIPE_PUBLISHABLE_KEY` (pk_test_ ou pk_live_). | Comparer les préfixes des clés front et back. | Aligner les deux clés (test ou live). |
| **4. CSP bloquant l’iframe Stripe** | Pas de CSP dans le code du repo (headers serveur). | Vérifier les headers HTTP de la page prod. Chercher `Content-Security-Policy`, `frame-src`, `script-src`. | Autoriser `frame-src` / `script-src` pour `js.stripe.com`, `*.stripe.com`. |
| **5. COEP / COOP bloquant l’iframe** | Pas de COEP/COOP dans le code. | Vérifier les headers `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`. | Retirer ou assouplir ces en-têtes si nécessaire (cf. stripe/stripe-js#634). |
| **6. `Elements` démonté pendant la requête** | Réponse StackOverflow : démontage pendant `confirmSetup` peut provoquer l’erreur. | Vérifier si un changement d’état (loading, fermeture, etc.) démonte `Elements` pendant l’appel. | Ne pas démonter `Elements` avant la fin de `confirmSetup`. |
| **7. `loadStripe()` pas résolu** | L12 : `stripePromise = loadStripe(...)` passé à `Elements`. | Vérifier que Stripe.js charge correctement (requests `js.stripe.com`). | Charger Stripe plus tôt ou gérer le chargement avant de rendre `Elements`. |
| **8. Container avec hauteur 0** | `DialogContent` avec `overflow-y-auto`, `max-h-[90vh]`. | Inspecter le bloc contenant `PaymentElement` et vérifier sa hauteur calculée. | Ajuster le layout pour que le container ait une hauteur minimale. |

---

## 🔟 CONCLUSION

La cause la plus probable est l’absence de `onReady` sur `PaymentElement` et la possibilité de cliquer sur "Enregistrer ma carte" avant que l’iframe Stripe soit montée.

Les autres pistes à vérifier :
- Présence de `VITE_STRIPE_PUBLISHABLE_KEY` au build prod.
- Alignement des clés pk_ / sk_ (test ou live).
- Politiques de sécurité (CSP, COEP, COOP) susceptibles de bloquer l’iframe Stripe.
