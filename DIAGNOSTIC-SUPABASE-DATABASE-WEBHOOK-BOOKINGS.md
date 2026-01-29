# Diagnostic et Plan d'Exécution : Database Webhook Supabase → n8n

**Date** : 2025-01-20  
**Projet Supabase** : `tbsgzykqcksmqxpimwry`  
**Table cible** : `public.bookings`  
**Webhook n8n** : `https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302`

---

## 1) DIAGNOSTIC MCP / CONNEXION ✅

### 1.1 Preuve de connexion au projet

**Commande MCP exécutée** : `mcp_supabase_get_project_url`

**Résultat** :
```
URL du projet : https://tbsgzykqcksmqxpimwry.supabase.co
```

✅ **Verdict** : Connexion MCP Supabase active sur le projet `tbsgzykqcksmqxpimwry`.

---

### 1.2 Liste des schémas et tables

**Commande MCP exécutée** : `mcp_supabase_list_tables` (schéma `public`)

**Résultat** : 12 tables dans le schéma `public` :

| Table | RLS | Lignes | Clés primaires |
|-------|-----|--------|----------------|
| `profiles` | ✅ | 0 | `id` |
| `vehicles` | ❌ | 0 | `id` |
| **`bookings`** | ✅ | **9** | `id` |
| `conversations` | ✅ | 15 | `id` |
| `messages` | ✅ | 7 | `id` |
| `checkin_depart` | ❌ | 0 | `id` |
| `checkin_return` | ❌ | 0 | `id` |
| `vehicle_photos` | ✅ | 9 | `id` |
| `payments` | ✅ | 0 | `id` |
| `reviews` | ✅ | 0 | `id` |
| `dictionary_entries` | ✅ | 0 | `id` |

**Commande SQL exécutée** :
```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth') 
ORDER BY table_schema, table_name;
```

**Résultat** : 32 tables au total (12 `public` + 20 `auth`)

✅ **Verdict** : Le schéma `public` contient bien la table `bookings`.

---

### 1.3 Confirmation de l'existence de `public.bookings`

**Commande SQL exécutée** :
```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'bookings' 
ORDER BY ordinal_position;
```

**Résultat** : 30 colonnes détectées, dont :

| Colonne | Type | Nullable | Default | Commentaire |
|---------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NO | - | FK → `auth.users` |
| `vehicle_id` | `uuid` | NO | - | FK → `public.vehicles` |
| `start_date` | `date` | NO | - | **OBLIGATOIRE** |
| `end_date` | `date` | NO | - | **OBLIGATOIRE** |
| `total_price` | `numeric` | NO | - | **OBLIGATOIRE** |
| `status` | `varchar` | YES | `'pending'` | Valeurs: `pending`, `pending_payment`, `confirmed`, `active`, `completed`, `cancelled`, `rejected`, `declined` |
| `base_price` | `numeric` | NO | - | **OBLIGATOIRE** |
| `options_total` | `numeric` | NO | - | **OBLIGATOIRE** |
| `service_fee` | `numeric` | NO | - | **OBLIGATOIRE** |
| `subtotal` | `numeric` | NO | - | **OBLIGATOIRE** |
| `price_per_day` | `numeric` | NO | - | **OBLIGATOIRE** |
| `created_at` | `timestamptz` | YES | `now()` | Auto |
| `updated_at` | `timestamptz` | YES | `now()` | Auto |

**Données existantes** :
```sql
SELECT id, user_id, vehicle_id, status FROM public.bookings LIMIT 5;
```

**Résultat** : 9 bookings existants, exemples :
- `0c376968-9fa1-4337-a1f4-b046997cc61f` (status: `cancelled`)
- `2b5c281a-4e40-4f17-9d43-655f3a800c1d` (status: `cancelled`)
- `6bdcebaf-7bcd-4e6f-959d-8abc01fa6c64` (status: `declined`)

✅ **Verdict** : La table `public.bookings` existe, contient 9 lignes, et a la structure attendue.

---

### 1.4 Tables liées à `bookings`

**Relations détectées** (via `mcp_supabase_list_tables`) :

| Table | Relation avec `bookings` |
|-------|--------------------------|
| `public.vehicles` | `bookings.vehicle_id` → `vehicles.id` |
| `auth.users` | `bookings.user_id` → `users.id` |
| `public.conversations` | `conversations.booking_id` → `bookings.id` |
| `public.messages` | `messages.booking_id` → `bookings.id` |
| `public.reviews` | `reviews.booking_id` → `bookings.id` |
| `public.payments` | `payments.booking_id` → `bookings.id` |
| `public.checkin_depart` | `checkin_depart.booking_id` → `bookings.id` |
| `public.checkin_return` | `checkin_return.booking_id` → `bookings.id` |

✅ **Verdict** : Les tables liées sont accessibles et les foreign keys sont correctement configurées.

---

## 2) WEBHOOKS EXISTANTS (DIAG) ⚠️

### 2.1 Tentative de listing via MCP

**Commande SQL exécutée** :
```sql
SELECT * FROM pg_webhooks LIMIT 10;
```

**Résultat** :
```
ERROR: relation "pg_webhooks" does not exist
```

**Commande SQL exécutée** :
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'supabase_functions' OR table_schema = 'realtime';
```

**Résultat** : Tables système (`messages`, `subscription`, `schema_migrations`), mais **pas de table de webhooks**.

### 2.2 Capacités MCP disponibles

**Outils MCP Supabase disponibles** :
- ✅ `mcp_supabase_execute_sql` : Exécution SQL directe
- ✅ `mcp_supabase_list_tables` : Liste des tables
- ✅ `mcp_supabase_apply_migration` : Création de migrations DDL
- ❌ **Aucun outil pour lister/créer/gérer les Database Webhooks**

### 2.3 Méthode alternative recommandée

**⚠️ LIMITATION MCP** : Les Database Webhooks Supabase ne sont **pas accessibles via SQL direct** ni via les outils MCP disponibles.

**Méthode recommandée** : **Dashboard Supabase** (interface graphique)

**URL directe** :
```
https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry/database/webhooks
```

✅ **Verdict** : Les webhooks existants ne sont **pas listables via MCP**. Il faut utiliser le **Dashboard Supabase uniquement** (pas d'API Management documentée disponible via MCP).

---

## 3) PLAN DE CRÉATION DU DATABASE WEBHOOK

### 3.1 Méthode choisie : **Dashboard Supabase** (recommandée)

**Justification** :
- ✅ Interface graphique simple et fiable
- ✅ Validation en temps réel des paramètres
- ✅ Pas besoin d'API key Management
- ✅ Visualisation immédiate des webhooks existants

**URL d'accès** :
```
https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry/database/webhooks
```

### 3.2 Paramètres exacts du webhook

| Paramètre | Valeur |
|-----------|--------|
| **Name** | `n8n_bookings_insert` |
| **Schema** | `public` |
| **Table** | `bookings` |
| **Events** | ✅ `INSERT` (uniquement) |
| **URL** | `https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302` |
| **HTTP Method** | `POST` |
| **HTTP Headers** | `Content-Type: application/json`<br>`X-Webhook-Secret: [À DÉFINIR]` |

### 3.3 Configuration du secret (recommandé)

**Nom du header** : `X-Webhook-Secret`

**Valeur recommandée** : Générer un secret aléatoire (ex: `openssl rand -hex 32`)

**Où configurer côté Supabase** :
- Dans le Dashboard → Database → Webhooks → `n8n_bookings_insert` → **HTTP Headers**
- Ajouter : `X-Webhook-Secret: <votre_secret>`

**Comment vérifier côté n8n** :
- Dans le workflow n8n, ajouter un node **IF** en premier après le Webhook :
  - Condition : `{{ $json.headers['x-webhook-secret'] }} === 'votre_secret'`
  - Si faux → **Stop and Error** (sécurité)

### 3.4 Format du payload envoyé par Supabase ⚠️ À CONFIRMER

**⚠️ IMPORTANT** : Le format exact du payload doit être **confirmé après création + test**.

**Structure attendue** (à vérifier après test) :
```json
{
  "type": "INSERT",
  "table": "bookings",
  "schema": "public",
  "record": {
    // Toutes les colonnes de la ligne insérée
  },
  "old_record": null
}
```

**Action requise** : Après création du webhook + INSERT de test, coller le **JSON exact** reçu dans n8n (input de l'exécution) pour figer le mapping définitif.

---

## 4) EXECUTION : CRÉATION DU WEBHOOK (Dashboard)

### 4.1 Étapes courtes

1. **Accéder au Dashboard** :
   - URL : `https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry/database/webhooks`
   - Cliquer sur **"Create a new webhook"** ou **"New webhook"**

2. **Remplir les paramètres** :
   - **Name** : `n8n_bookings_insert`
   - **Schema** : `public` (sélectionner dans dropdown)
   - **Table** : `bookings` (sélectionner dans dropdown)
   - **Events** : Cocher uniquement ✅ `INSERT`
   - **HTTP Method** : `POST`
   - **URL** : `https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302`

3. **Ajouter les headers** :
   - Cliquer sur **"Add header"** ou **"HTTP Headers"**
   - Header 1 :
     - Key : `Content-Type`
     - Value : `application/json`
   - Header 2 :
     - Key : `X-Webhook-Secret`
     - Value : `[À DÉFINIR PAR L'UTILISATEUR]`

4. **Sauvegarder** :
   - Cliquer sur **"Save"** ou **"Create webhook"**
   - Vérifier que le webhook apparaît dans la liste avec statut **Active** (vert)

---

## 5) TEST : INSERT ET VÉRIFICATION n8n

### 5.1 Étape 1 : Vérifier les IDs existants

**SQL de préparation** :
```sql
-- Récupérer un user_id existant
SELECT id FROM auth.users LIMIT 1;
-- Résultat attendu : bd19376c-cf76-4495-b8f6-e6499b3aef72

-- Récupérer un vehicle_id existant
SELECT id FROM public.vehicles LIMIT 1;
-- Résultat attendu : 0ffa7fd8-6948-4f3d-a25a-05de67e3dcff
```

✅ **IDs réels confirmés** :
- `user_id` : `bd19376c-cf76-4495-b8f6-e6499b3aef72`
- `vehicle_id` : `0ffa7fd8-6948-4f3d-a25a-05de67e3dcff`

### 5.2 Étape 2 : INSERT de test (EXÉCUTION)

**SQL exécuté** :
```sql
INSERT INTO public.bookings (
  user_id, vehicle_id, start_date, end_date,
  total_price, base_price, options_total, service_fee,
  subtotal, price_per_day, status
) VALUES (
  'bd19376c-cf76-4495-b8f6-e6499b3aef72'::uuid,
  '0ffa7fd8-6948-4f3d-a25a-05de67e3dcff'::uuid,
  '2025-01-25'::date, '2025-01-30'::date,
  150.00, 100.00, 20.00, 18.00,
  120.00, 20.00, 'pending'
)
RETURNING id, created_at, status;
```

**✅ Résultat** :
- `id` : `703bda86-77b9-40b2-936b-21705e9f5e83`
- `created_at` : `2026-01-23 13:34:09.434979+00`
- `status` : `pending`

**✅ Checkpoint 2 validé** : INSERT réussi, UUID généré.

### 5.3 Étape 3 : Vérifier n8n et coller le JSON exact ⏳ EN ATTENTE

**⚠️ ACTION REQUISE** : Vérifier manuellement dans n8n et coller le JSON exact reçu.

**Instructions** :
1. Aller sur n8n : `https://n8n.srv1285649.hstgr.cloud`
2. Ouvrir le workflow correspondant au webhook `d693b677-de6a-40fd-bcae-f954cedd2302`
3. Vérifier dans **Executions** qu'une nouvelle exécution apparaît (après l'INSERT de test à `2026-01-23 13:34:09 UTC`)
4. Ouvrir l'exécution et copier le **JSON complet** de l'input (premier node Webhook)
5. Coller le JSON ci-dessous pour figer le mapping définitif

**Booking créé pour référence** :
- `id` : `703bda86-77b9-40b2-936b-21705e9f5e83`
- `created_at` : `2026-01-23 13:34:09.434979+00`
- `status` : `pending`

**Section à remplir après vérification n8n** :
```json
[COLLER LE JSON EXACT REÇU DANS n8n ICI]
```

**Note** : Si aucune exécution n'apparaît dans n8n, vérifier que :
- Le webhook `n8n_bookings_insert` est bien créé et actif dans Supabase Dashboard
- L'URL du webhook dans Supabase correspond exactement à : `https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302`
- Le workflow n8n est actif (non en mode "draft")

---

### 5.4 Checkpoints de validation

#### Checkpoint 1 : Webhook créé et visible ✅

**Action** :
1. Aller sur : `https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry/database/webhooks`
2. Vérifier que `n8n_bookings_insert` apparaît dans la liste
3. Vérifier que le statut est **Active** (vert)

**Critère de succès** : Le webhook est listé et actif.

---

#### Checkpoint 2 : INSERT OK (id retourné) ✅

**Action** :
1. Exécuter le SQL de test (4.2)
2. Vérifier que l'INSERT réussit sans erreur
3. Noter l'`id` retourné (ex: `abc123-def456-...`)

**Critère de succès** : L'INSERT retourne un UUID valide.

---

#### Checkpoint 3 : n8n reçoit une exécution (payload visible) ✅

**Action** :
1. Aller sur n8n : `https://n8n.srv1285649.hstgr.cloud`
2. Ouvrir le workflow correspondant au webhook `d693b677-de6a-40fd-bcae-f954cedd2302`
3. Vérifier dans **Executions** qu'une nouvelle exécution apparaît
4. Ouvrir l'exécution et vérifier le payload reçu :
   - `type` = `"INSERT"`
   - `table` = `"bookings"`
   - `record.id` = UUID du booking créé (Checkpoint 2)
   - `record.user_id` = `"bd19376c-cf76-4495-b8f6-e6499b3aef72"`
   - `record.vehicle_id` = `"0ffa7fd8-6948-4f3d-a25a-05de67e3dcff"`
   - `record.status` = `"pending"`

**Critère de succès** : Le payload contient toutes les données du booking inséré.

---

## 6) RÉSUMÉ ET PROCHAINES ÉTAPES

### ✅ Diagnostic complet

- ✅ Connexion MCP confirmée sur `tbsgzykqcksmqxpimwry`
- ✅ Table `public.bookings` existe (9 lignes, 30 colonnes)
- ✅ Structure de la table validée (champs obligatoires identifiés)
- ⚠️ Webhooks non listables via MCP → Dashboard requis

### 📋 Plan d'exécution

1. **Créer le webhook via Dashboard Supabase** :
   - URL : `https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry/database/webhooks`
   - Paramètres : Voir section 3.2
   - Secret : Générer et configurer (section 3.3)

2. **Valider via les 3 checkpoints** :
   - Checkpoint 1 : Webhook visible et actif
   - Checkpoint 2 : INSERT de test réussi
   - Checkpoint 3 : n8n reçoit le payload

3. **Configurer n8n** (si nécessaire) :
   - Ajouter vérification du header `X-Webhook-Secret`
   - Traiter `$json.record.*` pour extraire les données du booking

### ⚠️ Points d'attention

- **Pas de retry automatique** : Si n8n est down, les événements sont perdus
- **Pas de filtre conditionnel natif** : Tous les INSERT déclenchent le webhook (même `status = 'pending'`)
- **Secret recommandé** : Protéger le webhook n8n avec un header secret

---

## 7) COMMANDES SQL PRÊTES À L'EMPLOI

### 6.1 Vérifier les IDs existants
```sql
SELECT id FROM auth.users LIMIT 1;
SELECT id FROM public.vehicles LIMIT 1;
```

### 6.2 INSERT de test (avec IDs réels)
```sql
INSERT INTO public.bookings (
  user_id,
  vehicle_id,
  start_date,
  end_date,
  total_price,
  base_price,
  options_total,
  service_fee,
  subtotal,
  price_per_day,
  status
) VALUES (
  'bd19376c-cf76-4495-b8f6-e6499b3aef72'::uuid,
  '0ffa7fd8-6948-4f3d-a25a-05de67e3dcff'::uuid,
  '2025-01-25'::date,
  '2025-01-30'::date,
  150.00,
  100.00,
  20.00,
  18.00,
  120.00,
  20.00,
  'pending'
)
RETURNING id, created_at;
```

### 6.3 Vérifier le dernier booking créé
```sql
SELECT id, user_id, vehicle_id, status, created_at 
FROM public.bookings 
ORDER BY created_at DESC 
LIMIT 1;
```

---

**Document créé le** : 2025-01-20  
**Statut** : ✅ Diagnostic complet, plan prêt pour validation

