# DIAG ONLY — PHASE 3.2.1 (profiles.stripe_customer_id) — AUCUNE IMPLEMENTATION

**Date** : 2026-02-14  
**Contexte** : Phase 3.2 "Option A strict" (SetupIntent + attach PaymentMethod + update booking → card_registered, sans hold).  
**Objectif** : Valider à 100% ce qu'il faut pour ajouter `profiles.stripe_customer_id` en DB + impacts repo, sans toucher aux fichiers.  
**Mode** : Diagnostic uniquement — aucun patch, aucun diff, aucun code.

---

## 0) Règles

- **DIAG ONLY** : aucune modification de fichiers, aucun patch, aucun diff, aucun code ajouté.
- Livrable : chemins de fichiers, extraits, preuves, risques, checklist, décisions.

---

## 1) Preuve DB actuelle (repo)

### 1.1 Recherche `stripe_customer_id`

| Source | Résultat | Preuve |
|--------|----------|--------|
| **supabase/migrations/** | ❌ **N'existe pas** | `grep -r "stripe_customer_id" supabase/migrations/` → 0 résultat dans les fichiers de migration |

### 1.2 Recherche `profiles`

| Fichier | Lignes | Contenu |
|---------|--------|---------|
| `supabase/migrations/20260211000000_add_welcome_email_sent_at.sql` | 1-7 | Migration qui **modifie** la table profiles : ajout de `welcome_email_sent_at` |
| `supabase/migrations/001_dictionary_entries.sql` | 71-72 | Référence FK : `created_by UUID REFERENCES public.profiles(id)`, `updated_by UUID REFERENCES public.profiles(id)` |
| `supabase/migrations/README-DICTIONNAIRE.md` | 140, 249, 251 | Documentation mentionnant la table profiles |

**Aucune** migration existante ne crée la table `profiles` dans le dossier migrations — la structure provient du script de recréation global.

### 1.3 Recherche `customers`

| Source | Résultat | Preuve |
|--------|----------|--------|
| **supabase/migrations/** | ❌ **N'existe pas** | Aucune table `customers` (Stripe Customer est externe à la DB) |
| **SQL** | — | Aucune colonne nommée "customer" dans les migrations |

### 1.4 SCRIPT-RECREATE-SCHEMA-RENTANOO.sql — table `profiles`

**Fichier** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql`  
**Lignes** : 147-164

```sql
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    email text NOT NULL,
    first_name text,
    last_name text,
    phone text,
    avatar_url text,
    bio text,
    role text DEFAULT 'renter'::text,
    kyc_status text DEFAULT 'pending'::text,
    is_admin boolean DEFAULT false,
    admin_role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_bio_length CHECK ((bio IS NULL) OR (length(bio) <= 500)),
    CONSTRAINT profiles_admin_role_check CHECK ((admin_role = ANY (ARRAY['user'::text, 'admin'::text]))),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

**Conclusion** : Aucune colonne Stripe (stripe_customer_id ou autre) dans la définition actuelle de `profiles`.

### 1.5 Tableau récapitulatif

| Élément | Existe | Référence exacte |
|---------|--------|------------------|
| `stripe_customer_id` dans migrations | ❌ Non | — |
| Table `profiles` | ✅ Oui | SCRIPT-RECREATE L.147-164 ; migrations 001, 20260211000000 |
| Colonne Stripe dans profiles | ❌ Non | Aucune |
| Référence "customers" (Stripe) | ❌ Non | Aucune table/colonne customers en DB |

---

## 2) Preuve côté frontend/backend (repo)

### 2.1 Scan `stripe_customer_id`

| Emplacement | Résultat | Détail |
|-------------|----------|--------|
| **Code source (src/, server/, supabase/functions/)** | ❌ **Aucun** | Seulement dans les docs (DIAG-*, PLAN-*, AUDIT-*, BLUEPRINT) |
| **Migrations** | ❌ Aucun | — |

### 2.2 Scan `cus_`

| Emplacement | Résultat | Détail |
|-------------|----------|--------|
| **Code source** | ❌ **Aucun** | Aucune référence au préfixe Stripe Customer |
| **Docs** | ✅ Mention | DIAG-BLUEPRINT, etc. (documentation uniquement) |

### 2.3 Scan `customers.create`

| Emplacement | Résultat | Détail |
|-------------|----------|--------|
| **supabase/functions/** | ❌ **Aucun** | `grep "customers.create"` → 0 résultat |
| **server/** | ❌ **Aucun** | Idem |
| **src/** | ❌ **Aucun** | Idem |
| **Docs** | ✅ Mention | DIAG-BLUEPRINT L.227 : `stripe.customers.create` (spec, non implémenté) |

### 2.4 Scan `paymentMethods.attach`

| Emplacement | Résultat | Détail |
|-------------|----------|--------|
| **Code source** | ❌ **Aucun** | Aucune implémentation |
| **Docs** | ✅ Mention | DIAG-BLUEPRINT L.257-258 (spec) |

### 2.5 Vérification : Customer Stripe créé quelque part ?

| Composant | Crée un Stripe Customer ? | Preuve |
|-----------|---------------------------|--------|
| **Edge Function create-checkout-session** | ❌ **Non** | `stripe.checkout.sessions.create({ mode: "payment", line_items, metadata })` — pas de `customer` ni `customer_email`. Stripe Checkout crée un Customer éphémère côté Stripe, non persisté en DB. |
| **Express server** | ❌ **Non** | Webhook `checkout.session.completed` → update bookings uniquement. Aucun `stripe.customers.create`. |
| **Frontend** | ❌ **Non** | Pas d'appel Stripe côté client (sauf redirection Checkout). |

**Conclusion** : **Aucun** Stripe Customer n'est créé ni persisté dans le repo actuellement. La Phase 3.2 (SetupIntent) sera la **première** utilisation de Stripe Customer dans ce projet.

---

## 3) Table profiles : utilisation actuelle

### 3.1 Fichiers qui SELECT/UPDATE profiles

| Fichier | Opération | Champs utilisés (extraits) |
|---------|-----------|----------------------------|
| `src/services/supabase/profile.ts` | SELECT, UPDATE | `id`, `email`, `first_name`, `last_name`, `phone`, `avatar_url`, `bio`, `role`, `kyc_status`, `birthdate`, `place_of_birth`, `address_line1`, `postal_code`, `city`, `country`, `driver_license_*`, `full_name`, `created_at`, `updated_at` |
| `src/pages/auth/Callback.tsx` | SELECT, UPDATE | `kyc_status` (L.67, 133, 184) |
| `src/services/checkinReturnSnapshotService.ts` | SELECT | Profils owner/renter (L.259, 282) |
| `src/services/supabaseCheckinService.ts` | SELECT | Profils owner/renter (L.582, 605) |
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | SELECT | Profiles (L.669, 736) |
| `src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx` | SELECT | Profiles (L.490) |
| `src/components/RenterBookingCard.tsx` | SELECT | Via jointure ou service (L.571) |
| `src/pages/booking/BookingDiscussion.tsx` | SELECT | Profiles (L.490) |
| `src/services/supabase/vehicleOwner.ts` | SELECT | Profiles (L.55) |

**Aucun** de ces fichiers n’utilise `stripe_customer_id` aujourd’hui.

### 3.2 profiles.email — fiabilité

| Source | Détail |
|--------|--------|
| **Trigger handle_new_user** | SCRIPT-RECREATE L.82-103 : `INSERT INTO profiles (..., email, ...) VALUES (..., NEW.email, ...)` — `email` vient de `auth.users` à l'inscription. |
| **Table profiles** | `email text NOT NULL` (L.150) |
| **ProfileService** | Utilise `profile.email \|\| ''` et `authUser.email` comme fallback (L.49, 72) |
| **Recommandation** | `profiles.email` est renseigné à la création. En cas de changement d’email dans `auth.users`, il peut diverger. Pour Phase 3.2 : utiliser `profile.email ?? user.email` (auth.getUser) comme fallback pour `stripe.customers.create`. |

**Conclusion** : `profiles.email` existe et est utilisable. Utiliser `profile.email || user.email` pour garantir un email non vide lors de la création du Stripe Customer.

---

## 4) Migration minimale (DIAG ONLY)

### 4.1 Colonne à ajouter

- **Table** : `public.profiles`
- **Colonne** : `stripe_customer_id`

### 4.2 Type SQL recommandé

| Aspect | Valeur | Justification |
|--------|--------|---------------|
| **Type** | `TEXT` | Format Stripe Customer ID : `cus_xxxxxxxxxxxxx` (≈24 caractères). TEXT suffisant, pas de VARCHAR limité. |
| **Nullabilité** | **NULL autorisé** | Les profils existants n’ont pas de Stripe Customer. Création à la première utilisation (SetupIntent). Pas de valeur par défaut. |
| **Default** | Aucun | NULL par défaut implicite. |

### 4.3 Index

| Index | Recommandation | Justification |
|-------|----------------|---------------|
| **Sur stripe_customer_id** | ❌ **Non** | Lookup principal : `user_id` (profiles.id = auth.uid). Pas de requête par `stripe_customer_id` côté app. Stripe fournit `cus_xxx` ; on écrit en base après création. |
| **Sur profiles.id** | ✅ Déjà existant | PK, index automatique. |

### 4.4 Commentaire SQL recommandé

```
ID Stripe Customer (cus_xxx) pour paiements off_session et SetupIntent caution.
```

### 4.5 Périmètre Phase 3.2

- **Un seul** champ ajouté : `stripe_customer_id`.
- Pas d’autres colonnes Stripe sur `profiles` pour cette phase.

---

## 5) Impacts types / TypeScript

### 5.1 types.ts — déclaration profiles

**Fichier** : `src/integrations/supabase/types.ts`  
**Lignes** : 157-229 (extrait)

La table `profiles` est déclarée avec des colonnes explicites. `stripe_customer_id` **n’est pas** présent dans `Row`, `Insert`, `Update`.

### 5.2 Blocage compilation si non mis à jour ?

| Cas | Bloquant ? | Explication |
|-----|------------|-------------|
| **ProfileService** | ❌ Non | Utilise `.select('*')` et mappe manuellement vers `User`. Les champs inconnus sont ignorés. `User` n’a pas `stripeCustomerId`. Aucune lecture/écriture de `stripe_customer_id` côté frontend. |
| **ProfileUpdateData / updateProfile** | ❌ Non | `ProfileUpdateData` ne contient pas `stripeCustomerId`. Les endpoints deposit mettront à jour `stripe_customer_id` via `supabaseAdmin` côté serveur, sans utiliser `ProfileService`. |
| **Server (Express)** | ❌ Non | Utilise `createClient` de `@supabase/supabase-js` sans typage générique. Pas d’import de `src/integrations/supabase/types`. Les requêtes `.select('id, email, stripe_customer_id')` et `.update({ stripe_customer_id })` fonctionneront à l’exécution même sans mise à jour des types. |
| **Select explicite** | ⚠️ Oui (à terme) | Si du code frontend fait `.select('id, email, stripe_customer_id')` avec typage strict, TypeScript exigera que `stripe_customer_id` soit dans `Row`. |

### 5.3 Fichiers potentiellement impactés plus tard

| Fichier | Quand | Risque |
|---------|-------|--------|
| `src/integrations/supabase/types.ts` | Si on veut typage strict pour les requêtes deposit côté client | Ajouter `stripe_customer_id: string \| null` dans `profiles.Row` (et Insert/Update si besoin). |
| `src/types/index.ts` (User) | Si on expose stripe_customer_id dans l’UI | Optionnel pour Phase 3.2. |
| **Aucun** | Pour la migration + endpoints serveur | La migration et les endpoints Express sont indépendants des types TS. |

**Conclusion** : Pas de blocage compile-time pour la migration ni pour les endpoints deposit. Mise à jour des types recommandée lors de l’ajout d’une utilisation explicite de `stripe_customer_id` côté frontend.

---

## 6) Validation checklist (exécutable)

### 6.1 Vérifier la colonne dans information_schema

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'stripe_customer_id';
```

**Résultat attendu** (après migration) :
```
 column_name       | data_type | is_nullable | column_default
-------------------+-----------+-------------+---------------
 stripe_customer_id| text      | YES         | NULL
```

### 6.2 Vérifier que les lignes existantes ont NULL

```sql
SELECT COUNT(*) AS total,
       COUNT(stripe_customer_id) AS with_stripe_id
FROM public.profiles;
```

**Résultat attendu** (juste après migration) : `with_stripe_id = 0`, `total` = nombre de profils.

### 6.3 Vérifier contraintes / triggers

```sql
-- Contraintes sur profiles
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- Triggers sur profiles
SELECT tgname, tgtype 
FROM pg_trigger 
WHERE tgrelid = 'public.profiles'::regclass;
```

**Résultat attendu** : Aucune contrainte CHECK/UNIQUE sur `stripe_customer_id`. Triggers existants (`update_profiles_updated_at`, `trigger_sync_profile_is_admin`) inchangés — ils ne touchent pas à `stripe_customer_id`.

### 6.4 Test d’écriture (optionnel, après migration)

```sql
-- Simuler une mise à jour (remplacer par des valeurs réelles si test manuel)
UPDATE public.profiles
SET stripe_customer_id = 'cus_test123'
WHERE id = '00000000-0000-0000-0000-000000000000'
  AND stripe_customer_id IS NULL;

-- Vérifier
SELECT id, stripe_customer_id FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000000';

-- Rollback si test
UPDATE public.profiles SET stripe_customer_id = NULL WHERE id = '00000000-0000-0000-0000-000000000000';
```

---

## 7) Conclusion GO / NO-GO

### Décision : **GO**

Aucun point bloquant identifié. La migration `profiles.stripe_customer_id` est faisable et sans impact sur le code existant.

### Prérequis AVANT micro-implémentation

1. **Migration SQL** : Créer et exécuter la migration ajoutant `stripe_customer_id` sur `profiles` (type TEXT, nullable, sans index, avec commentaire).
2. **Vérification post-migration** : Exécuter les requêtes de validation (section 6).
3. **Types TS** (optionnel pour Phase 3.2) : Mettre à jour `types.ts` uniquement si une requête frontend utilise explicitement `stripe_customer_id`.
4. **Backend** : Les endpoints `create-setup-intent` et `attach-payment-method` utiliseront `supabaseAdmin` ; pas de dépendance aux types frontend.

---

**DIAG Phase 3.2.1 terminé — prêt pour migration minimale puis implémentation des endpoints deposit.**
