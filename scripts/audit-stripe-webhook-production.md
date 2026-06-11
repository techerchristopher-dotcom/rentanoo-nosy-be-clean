# Audit Production — Webhooks Stripe Rentanoo

> **Phase** : P0 (préparation Fees Dynamic v1)
> **Statut** : Template à remplir manuellement avant le démarrage de P2.
> **Objectif** : déterminer quel webhook reçoit réellement les events Stripe en
> production afin de prendre une décision éclairée sur la suppression du doublon
> Express / Edge en P2. Aucun webhook n'est touché en P0 ni en P1.

---

## 1. Contexte technique constaté dans le code

Deux webhooks Stripe coexistent dans le repo, tous deux écoutent au moins
`checkout.session.completed`.

| # | Type | URL attendue | Fichier | Statut posé |
|---|---|---|---|---|
| W1 | Supabase Edge Function | `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook` | `supabase/functions/stripe-webhook/index.ts` | `confirmed` |
| W2 | Express (Railway) | `https://rentanoo.com/api/stripe/webhook` | `server/index.ts` (lignes 77-294) | `accepted` |

Events supplémentaires traités uniquement par W2 :

| Event | Code |
|---|---|
| `payment_intent.succeeded` | Réconciliation `booking_claim_charges` |
| `payment_intent.payment_failed` | Réconciliation `booking_claim_charges` |
| `checkout.session.completed` + `metadata.type === "extension"` | Crédit `amount_total_paid` cumulatif sur prolongations |

---

## 2. Procédure d'audit (à exécuter manuellement par un humain autorisé Stripe)

### 2.1 Stripe Dashboard — Mode LIVE

1. Ouvrir https://dashboard.stripe.com/webhooks (compte de production).
2. Pour chaque endpoint listé, capturer :
   - URL exacte
   - Statut (`Enabled` / `Disabled`)
   - Description
   - Events sélectionnés (liste complète)
   - Date de création
   - Date du dernier event reçu
   - Taux de succès des 7 derniers jours (% 2xx)
3. Pour chaque endpoint : cliquer « Recent events » et noter les 5 derniers
   events (type + status code retourné).
4. Cliquer sur « Signing secret » → confirmer la présence d'un secret actif
   (sans le révéler). Noter uniquement les 4 derniers caractères.

### 2.2 Stripe Dashboard — Mode TEST

Répéter la même procédure pour le mode TEST. Cela permet de comparer.

### 2.3 Vérification des secrets côté plateformes

| Plateforme | Variable | Méthode |
|---|---|---|
| Supabase Edge Functions | `STRIPE_WEBHOOK_SECRET` | Supabase Dashboard → Project Settings → Edge Functions → Secrets |
| Railway (Express) | `STRIPE_WEBHOOK_SECRET` | Railway Dashboard → service rentanoo → Variables |

Noter : présent / absent + 4 derniers caractères, pour vérifier que chaque
plateforme reçoit bien le secret du bon endpoint Stripe.

### 2.4 Logs applicatifs récents

| Source | Recherche |
|---|---|
| Supabase Logs — Edge Functions | `stripe-webhook` sur les 7 derniers jours. Compter les `checkout.session.completed reçu`. |
| Railway Logs | Filtrer `[webhook]` sur les 7 derniers jours. Compter les `[webhook] bookingId=`. |

---

## 3. Tableau de relevés (à compléter)

### 3.1 Endpoints Stripe LIVE

| # | URL | Status | Events | Dernier event reçu | 2xx 7j | Secret last 4 |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |

### 3.2 Endpoints Stripe TEST

| # | URL | Status | Events | Dernier event reçu | 2xx 7j | Secret last 4 |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |

### 3.3 Secrets côté plateformes

| Plateforme | Variable présente | Last 4 du secret | Correspond à quelle endpoint Stripe ? |
|---|---|---|---|
| Supabase Edge | ☐ | `____` | endpoint #__ |
| Railway Express | ☐ | `____` | endpoint #__ |

### 3.4 Volumétrie 7 jours

| Source | `checkout.session.completed` | `payment_intent.succeeded` | `payment_intent.payment_failed` | Autres |
|---|---|---|---|---|
| Supabase Edge logs |  |  |  |  |
| Railway logs |  |  |  |  |

---

## 4. Conclusions à produire après remplissage

### 4.1 Identifier le webhook actif pour `checkout.session.completed`

Cocher une option :

- [ ] **A.** Edge uniquement (URL Supabase enregistrée dans Stripe LIVE)
- [ ] **B.** Express uniquement (URL Railway enregistrée dans Stripe LIVE)
- [ ] **C.** Les deux endpoints reçoivent l'event en parallèle (double traitement)
- [ ] **D.** Aucun des deux (à investiguer immédiatement)

### 4.2 Identifier qui reçoit `payment_intent.*`

- [ ] Express uniquement (attendu)
- [ ] Edge également (à investiguer si oui)

### 4.3 Détection d'anomalies

- [ ] Deux endpoints LIVE avec la même URL → erreur de configuration
- [ ] Aucun secret côté plateforme alors qu'un secret existe côté Stripe
- [ ] Échecs > 1 % sur 7 jours
- [ ] Events dupliqués sur 2 endpoints en moins de 5 secondes

---

## 5. Décision P2 en fonction du résultat

| Scénario constaté | Décision recommandée pour P2 |
|---|---|
| **A. Edge actif uniquement pour `checkout.session.completed`** | Conserver l'Edge. Garder Express UNIQUEMENT pour `payment_intent.*` et la branche `extension`. Supprimer la portion `checkout.session.completed` côté Express. |
| **B. Express actif uniquement** | Inverser : transférer la logique `checkout.session.completed` côté Edge (refonte simple, le code Edge existe déjà). Désactiver l'endpoint Express dans Stripe Dashboard. Conserver Express pour `payment_intent.*`. |
| **C. Double traitement** | Désactiver IMMÉDIATEMENT l'un des deux endpoints dans Stripe Dashboard. Choix recommandé : garder Edge (statut `confirmed` cohérent). Vérifier qu'aucun booking n'est en double UPDATE. |
| **D. Aucun actif** | Bloquant : reconfigurer immédiatement, P2 ne peut pas démarrer. |

---

## 6. Validation requise

| Action | Personne | Date | Signature |
|---|---|---|---|
| Audit Stripe Dashboard LIVE rempli |  |  |  |
| Audit Stripe Dashboard TEST rempli |  |  |  |
| Vérification secrets plateformes |  |  |  |
| Conclusion section 4 cochée |  |  |  |
| Décision P2 (section 5) validée |  |  |  |

---

## 7. Notes libres

> Espace pour consigner les observations exceptionnelles : endpoints abandonnés,
> URL exotiques, events legacy, etc.

```
(à compléter manuellement)
```

---

_Document généré pendant la phase P0 du projet « Fees Dynamic v1 » (10 % CB / 15 % espèces)._
