# Google Ads (gtag.js) — Installation et suivi des conversions

## A) Stack du site

| Élément | Valeur |
|---------|--------|
| **Framework** | React 18 + TypeScript |
| **Bundler** | Vite 5 |
| **Routing** | React Router v6 (SPA) |
| **Backend** | Express (server/index.ts) — Railway / rentanoo.com |
| **Paiement** | Stripe Checkout + Webhook `checkout.session.completed` |
| **SSR/SPA** | SPA (pas de SSR) |

### Emplacements clés

| Rôle | Fichier |
|------|---------|
| **HTML global / head** | `index.html` |
| **Point d'entrée React** | `src/main.tsx` → `src/App.tsx` |
| **Layout principal** | Pas de layout.tsx — `App.tsx` wrappe toutes les routes |
| **Checkout / paiement** | Edge Function Supabase `create-checkout-session` → Stripe Checkout redirect |
| **Page success** | `src/pages/renter/PaymentSuccess.tsx` (`/success?session_id=...`) |
| **Redirection après paiement** | `/success` → 2s → `/me/renter/bookings?afterPayment=1` |
| **Caution (deposit)** | `src/components/DepositFlowModal.tsx` — SetupIntent + attach PM |
| **Webhook Stripe** | Express `server/index.ts` L72-234 (`/api/stripe/webhook`) |

---

## B) Tag global Google Ads — Où et comment

**Fichier** : `index.html`  
**Emplacement** : Dans le `<head>`, juste avant `</head>`.

```html
<!-- Google Ads (gtag.js) - Tag global sur toutes les pages -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17959842873"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-17959842873');
</script>
```

✅ **Patch appliqué** — Le tag est déjà injecté dans `index.html`.

---

## C) Déclencher la conversion "purchase" au bon moment

### Signal fiable : backend-confirmed

| Méthode | Fiabilité | Implémentation |
|---------|-----------|----------------|
| **URL `?afterPayment=1`** | ❌ Faible — manipulable, pas de confirmation serveur | Non utilisé |
| **Page `/success?session_id=cs_xxx`** | ✅ Bon — Stripe redirige uniquement après paiement réussi | Utilisé |
| **API backend + Stripe** | ✅ Meilleur — vérifie `payment_status === 'paid'` côté Stripe | Implémenté |

### Choix retenu : API `/api/stripe/session-details`

1. L’utilisateur est redirigé par Stripe vers `/success?session_id=cs_xxx`.
2. Le front appelle `GET /api/stripe/session-details?session_id=xxx`.
3. Le backend utilise `stripe.checkout.sessions.retrieve()` et vérifie `payment_status === 'paid'`.
4. Si oui → renvoie `amount`, `currency`, `booking_id`.
5. Le front envoie la conversion gtag avec ces données + `transaction_id` (session_id) pour la déduplication.

**Intérêt** : Conversion déclenchée uniquement si Stripe confirme le paiement.  
**Protection anti-doublon** : `transaction_id` côté Google Ads + `sessionStorage` côté client.

---

## D) Code de la conversion "purchase"

### Variables d’environnement

Ajouter dans `.env.local` (et sur Railway) :

```env
# Labels récupérés dans Google Ads > Mesures > Conversions > [Action] > Tag
VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE=AbC1dEf2GhI3   # Exemple — remplacer par le vôtre
VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT=              # Optionnel, pour la caution
```

### Récupération du label

1. Google Ads → **Mesures** → **Conversions** → **Nouvelle action de conversion**  
2. **Type** : Site web → Achat  
3. **Catégorie** : Purchase  
4. Copier le **label** (ex : `AbC1dEf2GhI3`) dans `VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE`

### Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/lib/gtag.ts` | Helpers `sendPurchaseConversion`, `sendDepositConversion`, anti-doublon |
| `src/pages/renter/PaymentSuccess.tsx` | Appel API + envoi conversion purchase |
| `server/index.ts` | Endpoint `GET /api/stripe/session-details` |

### Anti-double

- **sessionStorage** : Liste des `transaction_id` déjà envoyés.
- **transaction_id** : Identifiant unique par paiement (`session_id` ou `deposit_bookingId`).
- Google Ads ignore les conversions avec un `transaction_id` déjà vu.

---

## E) Variables nécessaires

| Variable | Source | Usage |
|---------|--------|-------|
| **amount** (location) | `session.amount_total / 100` (Stripe) | `value` |
| **currency** | `session.currency` (ex : `EUR`) | `currency` |
| **transaction_id** | `session.id` (cs_xxx) | Déduplication |
| **booking_id** | `session.metadata.bookingId` | Optionnel (logs) |
| **statut paiement** | `session.payment_status === 'paid'` | Vérification API |
| **Montant caution** | `depositAmount` (prop) | Conversion deposit |
| **statut caution** | `deposit_status` en DB | Non utilisé pour gtag (event après succès) |

---

## F) Plan de vérification

### 1. Tag global

- [ ] Ouvrir https://rentanoo.com → F12 → **Network**  
- [ ] Filtrer par `googletagmanager` → le script `gtag/js?id=AW-17959842873` doit être chargé.
- [ ] **Console** : `typeof window.gtag` → `"function"`.

### 2. Chrome Tag Assistant (extension)

- [ ] Installer [Tag Assistant Legacy](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk).
- [ ] Ouvrir rentanoo.com → icône Tag Assistant → **Enable** → rafraîchir la page.
- [ ] Vérifier que le tag `AW-17959842873` est détecté.

### 3. Conversion "purchase"

- [ ] Effectuer un paiement de test (mode Stripe Test).
- [ ] Arrivée sur `/success?session_id=cs_test_...` → vérifier dans Network :  
  - `GET /api/stripe/session-details?session_id=...` → 200 OK.
- [ ] **Console** : `[gtag] purchase conversion sent: {...}` (en mode dev).
- [ ] **Tag Assistant** : event `conversion` avec `send_to`, `value`, `currency`, `transaction_id`.
- [ ] Google Ads → **Mesures** → **Conversions** → vérifier une nouvelle conversion après 24–48 h.

### 4. Cas à tester

| Cas | Attendu |
|-----|---------|
| Paiement OK | 1 conversion envoyée, `transaction_id` unique |
| Refresh sur `/success` | Pas de 2e conversion (sessionStorage + transaction_id) |
| Retour arrière | Pas de 2e conversion |
| Paiement échoué | Pas de conversion (pas de redirection vers /success) |
| Accès direct `/success` sans `session_id` | Pas de conversion |
| Mobile | Même comportement (tester sur device réel ou responsive) |

### 5. Logs utiles

- **Dev** : `src/lib/gtag.ts` log en console les envois.
- **Google Ads** : Outil de diagnostic des conversions (après 24–48 h).

---

## Récapitulatif des fichiers modifiés

```
index.html                              # + Tag Google Ads global
server/index.ts                         # + GET /api/stripe/session-details
src/lib/gtag.ts                         # Nouveau
src/pages/renter/PaymentSuccess.tsx     # + Appel API + conversion
src/components/DepositFlowModal.tsx     # + Conversion deposit (si label configuré)
.env.local.example                      # + VITE_GOOGLE_ADS_CONVERSION_LABEL_*
```

---

## Action requise

1. Créer l’action de conversion "Purchase" dans Google Ads et récupérer le label.  
2. Ajouter `VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE=<label>` dans `.env.local` et sur Railway.  
3. Rebuild et redéployer.  
4. Tester avec un paiement Stripe Test et vérifier les conversions dans Google Ads.
