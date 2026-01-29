# Plan d'Exécution - Database Webhook Supabase → n8n pour `public.bookings`

**Date**: 2026-01-21  
**Projet Supabase**: `tbsgzykqcksmqxpimwry`  
**Table cible**: `public.bookings`  
**Webhook n8n**: `https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302`

---

## 1) VÉRIFICATION D'ACCÈS ET CONTEXTE

### 1.1 Accès au projet Supabase

**⚠️ LIMITATION MCP**: Les outils MCP Supabase disponibles ne permettent pas directement de:
- Lister les Database Webhooks existants
- Créer un Database Webhook via commande MCP

**✅ ALTERNATIVES DISPONIBLES**:
1. **Dashboard Supabase** (recommandé): Interface graphique pour créer/gérer les webhooks
2. **API Supabase Management**: Via `POST /v1/projects/{project_ref}/database/webhooks`
3. **SQL direct**: Si l'extension `pg_net` est activée (peut nécessiter activation)

**Vérification à faire manuellement**:
- Se connecter au Dashboard Supabase: `https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry`
- Aller dans **Database** → **Webhooks**
- Lister les webhooks existants et vérifier s'il y en a déjà sur `public.bookings`

### 1.2 Schéma de la table `public.bookings`

**Source**: `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 199-227)

**Colonnes principales** (pour INSERT minimal):
- `id` (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())
- `user_id` (uuid, NOT NULL, FK → auth.users)
- `vehicle_id` (uuid, NOT NULL, FK → vehicles)
- `start_date` (date, NOT NULL)
- `end_date` (date, NOT NULL)
- `total_price` (numeric, NOT NULL, CHECK >= 0)
- `status` (varchar, DEFAULT 'pending', CHECK IN ('pending', 'pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'rejected', 'declined'))
- `base_price` (numeric, NOT NULL)
- `options_total` (numeric, NOT NULL)
- `service_fee` (numeric, NOT NULL)
- `subtotal` (numeric, NOT NULL)
- `price_per_day` (numeric, NOT NULL)
- `created_at` (timestamptz, DEFAULT now())
- `updated_at` (timestamptz, DEFAULT now())

**Contraintes importantes**:
- `end_date > start_date` (CHECK)
- `status` doit être dans la liste autorisée
- `total_price >= 0`

---

## 2) STRATÉGIE DE DÉCLENCHEMENT

### Options disponibles

**A) Déclencher sur INSERT (quoi qu'il arrive)**
- ✅ Simple: un seul webhook, déclenchement immédiat
- ⚠️ Risque: notifications pour bookings `pending` (non payés, brouillons)
- ⚠️ Doublons possibles: si un booking passe de `pending` → `confirmed` via UPDATE, pas de nouvelle notification

**B) Déclencher sur UPDATE quand `status` devient `confirmed`**
- ✅ Cible uniquement les réservations confirmées/payées
- ⚠️ Complexité: nécessite un filtre conditionnel dans le webhook (si Supabase le supporte)
- ⚠️ Manque les INSERT directs avec `status='confirmed'` (rares mais possibles)

**C) Déclencher sur INSERT + filtrer côté n8n**
- ✅ Simple côté Supabase (un seul webhook INSERT)
- ✅ Flexibilité côté n8n (peut filtrer par `status` dans le workflow)
- ✅ Couvre tous les cas (INSERT direct `confirmed` + UPDATE `pending`→`confirmed` si on ajoute aussi UPDATE)

### ✅ RECOMMANDATION: Option C (INSERT + filtre n8n)

**Justification (3 lignes)**:
- **Simplicité**: Un seul webhook INSERT à créer, pas de logique conditionnelle complexe côté Supabase.
- **Flexibilité**: n8n peut filtrer par `status` et ne traiter que les `confirmed`/`accepted`, tout en gardant une trace de tous les INSERTs.
- **Couverture**: Capture tous les cas (INSERT direct `confirmed` ET INSERT `pending` qui sera confirmé plus tard via Stripe).

**Alternative si besoin de UPDATE aussi**:
- Créer un **second webhook sur UPDATE** avec filtre `status = 'confirmed'` (si Supabase supporte les filtres conditionnels)
- OU: laisser n8n gérer la logique (recevoir tous les INSERTs, filtrer par `status`)

---

## 3) CRÉATION DU DATABASE WEBHOOK

### 3.1 Méthode recommandée: Dashboard Supabase

**Chemin exact dans Supabase Dashboard**:
1. Se connecter: `https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry`
2. Menu gauche: **Database** → **Webhooks**
3. Cliquer sur **"New Webhook"** ou **"Create Webhook"**
4. Remplir le formulaire (voir paramètres ci-dessous)

### 3.2 Paramètres du webhook

**Nom du webhook**:
```
n8n_bookings_insert
```

**Table**:
```
public.bookings
```

**Events**:
- ✅ **INSERT** (cocher)
- ❌ UPDATE (décocher, sauf si tu veux aussi capturer les changements de statut)
- ❌ DELETE (décocher)

**HTTP Request**:
- **Method**: `POST`
- **URL**: `https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302`
- **Headers** (optionnel, si secret nécessaire):
  ```
  Content-Type: application/json
  X-Webhook-Secret: YOUR_SECRET_HERE
  ```

**Payload** (format Supabase Database Webhook):
Supabase envoie automatiquement un payload JSON avec:
- `type`: `"INSERT"` (ou `"UPDATE"`, `"DELETE"`)
- `table`: `"bookings"`
- `schema`: `"public"`
- `record`: objet complet de la ligne insérée (toutes les colonnes)
- `old_record`: `null` pour INSERT

**Exemple de payload envoyé par Supabase**:
```json
{
  "type": "INSERT",
  "table": "bookings",
  "schema": "public",
  "record": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "user_id": "u1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "vehicle_id": "v1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "start_date": "2026-01-15",
    "end_date": "2026-01-20",
    "total_price": 350.00,
    "status": "pending",
    "base_price": 300.00,
    "options_total": 20.00,
    "service_fee": 30.00,
    "subtotal": 320.00,
    "price_per_day": 64.00,
    "rental_days": 5,
    "created_at": "2026-01-10T10:00:00.000Z",
    "updated_at": "2026-01-10T10:00:00.000Z",
    "start_time": null,
    "end_time": null,
    "pickup_location": null,
    "selected_options": null,
    "reference_number": null
  },
  "old_record": null
}
```

### 3.3 Méthode alternative: API Supabase Management

**Si le Dashboard n'est pas disponible**, utiliser l'API Management:

**Endpoint**:
```
POST https://api.supabase.com/v1/projects/{project_ref}/database/webhooks
```

**Headers**:
```
Authorization: Bearer {SUPABASE_ACCESS_TOKEN}
Content-Type: application/json
```

**Body**:
```json
{
  "name": "n8n_bookings_insert",
  "table": "bookings",
  "schema": "public",
  "events": ["INSERT"],
  "url": "https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302",
  "http_method": "POST",
  "http_headers": {
    "Content-Type": "application/json"
  }
}
```

**⚠️ NOTE**: Cette méthode nécessite un **Supabase Access Token** (généré dans Dashboard → Settings → API → Access Tokens).

### 3.4 Méthode alternative: SQL (si `pg_net` activé)

**Si l'extension `pg_net` est activée** dans le projet:

```sql
-- Vérifier si pg_net est disponible
SELECT * FROM pg_available_extensions WHERE name = 'pg_net';

-- Activer pg_net si nécessaire (nécessite droits admin)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer le webhook (exemple, syntaxe à vérifier selon version pg_net)
SELECT net.http_post(
  url := 'https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{"test": "webhook"}'::jsonb
);
```

**⚠️ LIMITATION**: `pg_net` nécessite généralement un trigger PostgreSQL personnalisé pour être déclenché sur INSERT. Ce n'est **pas un Database Webhook natif Supabase**.

**Recommandation**: Utiliser le **Dashboard Supabase** (méthode 3.1) qui est la plus simple et native.

### 3.5 Gestion de la signature/secret

**Supabase Database Webhooks**:
- **Pas de signature automatique** par défaut (contrairement aux Edge Functions)
- **Option**: Ajouter un header personnalisé `X-Webhook-Secret` dans la configuration du webhook
- **Côté n8n**: Vérifier ce header dans le workflow pour authentifier la requête

**Recommandation**:
1. Créer un secret (ex: `rentanoo-booking-webhook-secret-2026`)
2. L'ajouter dans les **Headers** du webhook Supabase: `X-Webhook-Secret: rentanoo-booking-webhook-secret-2026`
3. Dans n8n, ajouter un node **IF** qui vérifie `{{$json.headers['x-webhook-secret']}} === 'rentanoo-booking-webhook-secret-2026'` avant de traiter

---

## 4) PLAN DE VALIDATION

### 4.1 Checkpoint 1: Création du webhook OK

**Action**:
1. Créer le webhook via Dashboard Supabase (méthode 3.1)
2. Vérifier qu'il apparaît dans la liste des webhooks

**Sortie attendue**:
- ✅ Webhook `n8n_bookings_insert` listé dans **Database** → **Webhooks**
- ✅ Statut: **Active** / **Enabled**
- ✅ Table: `public.bookings`
- ✅ Events: `INSERT`

### 4.2 Checkpoint 2: INSERT de test OK

**SQL de test minimal** (compatible avec le schéma):

```sql
-- Récupérer un user_id et vehicle_id existants d'abord
-- (remplacer par des UUIDs réels de votre DB)

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
  status,
  rental_days
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,  -- Remplacer par un user_id réel
  '00000000-0000-0000-0000-000000000002'::uuid,  -- Remplacer par un vehicle_id réel
  '2026-02-01'::date,
  '2026-02-05'::date,
  350.00,
  300.00,
  20.00,
  30.00,
  320.00,
  64.00,
  'pending',
  5
)
RETURNING id, status, created_at;
```

**Vérifications côté Supabase**:
- ✅ L'INSERT réussit (pas d'erreur de contrainte)
- ✅ Le booking est créé avec `status = 'pending'`
- ✅ Dans **Database** → **Webhooks** → **Logs** (si disponible), voir une entrée pour cet INSERT

**Sortie attendue**:
- ✅ INSERT réussi, `id` retourné
- ✅ Log webhook visible (si monitoring disponible)

### 4.3 Checkpoint 3: n8n reçoit le webhook OK

**Vérifications côté n8n**:
1. Aller dans n8n: `https://n8n.srv1285649.hstgr.cloud`
2. Ouvrir le workflow qui contient le webhook `d693b677-de6a-40fd-bcae-f954cedd2302`
3. Vérifier **Executions** / **Last Executions**:
   - ✅ Une nouvelle exécution apparaît après l'INSERT SQL
   - ✅ Statut: **Success** (200 OK)
   - ✅ Input du webhook contient:
     - `type: "INSERT"`
     - `table: "bookings"`
     - `record.id` = l'UUID du booking créé
     - `record.status` = `"pending"` (ou autre selon l'INSERT)

**Sortie attendue**:
- ✅ n8n reçoit le payload avec `record.id` correspondant au booking créé
- ✅ Response HTTP 200 OK retourné à Supabase

### 4.4 Test avec statut `confirmed` (optionnel)

**Pour tester le filtre côté n8n**:

```sql
-- Créer un booking directement avec status='confirmed'
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
  status,
  rental_days
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '2026-02-10'::date,
  '2026-02-15'::date,
  400.00,
  350.00,
  25.00,
  25.00,
  375.00,
  75.00,
  'confirmed',  -- ⭐ Status confirmed directement
  5
)
RETURNING id, status;
```

**Vérification**:
- ✅ n8n reçoit aussi cet INSERT
- ✅ Le workflow n8n peut filtrer: `{{$json.record.status}} === 'confirmed'` pour ne traiter que ceux-là

---

## 5) RÉSUMÉ DES ÉTAPES D'EXÉCUTION

### Étape 1: Vérification préalable
- [ ] Se connecter au Dashboard Supabase: `https://supabase.com/dashboard/project/tbsgzykqcksmqxpimwry`
- [ ] Aller dans **Database** → **Webhooks**
- [ ] Lister les webhooks existants et vérifier qu'il n'y en a pas déjà sur `public.bookings`

### Étape 2: Création du webhook
- [ ] Cliquer sur **"New Webhook"** ou **"Create Webhook"**
- [ ] Remplir:
  - **Name**: `n8n_bookings_insert`
  - **Table**: `public.bookings`
  - **Events**: ✅ INSERT
  - **URL**: `https://n8n.srv1285649.hstgr.cloud/webhook/d693b677-de6a-40fd-bcae-f954cedd2302`
  - **Method**: `POST`
  - **Headers** (optionnel): `Content-Type: application/json` + `X-Webhook-Secret: YOUR_SECRET`
- [ ] Sauvegarder

### Étape 3: Test INSERT
- [ ] Exécuter le SQL de test (Checkpoint 2)
- [ ] Vérifier que l'INSERT réussit
- [ ] Vérifier les logs webhook (si disponibles)

### Étape 4: Vérification n8n
- [ ] Ouvrir le workflow n8n correspondant
- [ ] Vérifier **Executions** → nouvelle exécution avec le payload
- [ ] Confirmer que `record.id` correspond au booking créé

### Étape 5: Nettoyage (optionnel)
- [ ] Supprimer le booking de test si nécessaire:
  ```sql
  DELETE FROM public.bookings WHERE id = 'UUID_DU_BOOKING_TEST';
  ```

---

## 6) WORKFLOW N8N RECOMMANDÉ

**Structure suggérée**:
1. **Webhook** (reçoit le payload Supabase)
2. **IF** (optionnel): Vérifier `X-Webhook-Secret` header
3. **IF**: Filtrer par `{{$json.record.status}} === 'confirmed'` (ou `'accepted'`)
4. **Function/Code**: Transformer le payload Supabase en format souhaité (ex: extraire `record.*` et le renommer)
5. **Gmail** / **Email**: Envoyer l'email de confirmation
6. **Respond to Webhook**: Retourner 200 OK

**Exemple de transformation (node Function)**:
```javascript
// Input: $json = { type: "INSERT", table: "bookings", record: {...} }
// Output: format simplifié pour l'email

const booking = $json.record;

return {
  json: {
    bookingId: booking.id,
    status: booking.status,
    startDate: booking.start_date,
    endDate: booking.end_date,
    vehicleId: booking.vehicle_id,
    customerId: booking.user_id,
    totalAmount: booking.total_price,
    currency: booking.currency || "EUR",
    createdAt: booking.created_at,
    // ... autres champs nécessaires
  }
};
```

---

## 7) POINTS D'ATTENTION

### ⚠️ Limitations connues

1. **Pas de filtre conditionnel natif** dans Supabase Database Webhooks:
   - Si tu veux déclencher uniquement sur `status='confirmed'`, il faut filtrer côté n8n
   - OU créer un trigger PostgreSQL personnalisé (plus complexe)

2. **Pas de retry automatique**:
   - Si n8n est down, Supabase ne réessaiera pas automatiquement
   - Les événements manqués ne seront pas rejoués

3. **Rate limiting**:
   - Vérifier les limites de taux côté n8n si beaucoup d'INSERTs

### ✅ Avantages

- ✅ **Simple**: Pas de code serveur, configuration pure Supabase
- ✅ **Fiable**: Déclenchement garanti à chaque INSERT
- ✅ **Scalable**: Géré par Supabase, pas de charge sur ton serveur

---

## 8) VALIDATION FINALE

**Checklist complète**:
- [ ] Webhook créé et actif dans Supabase Dashboard
- [ ] INSERT de test réussi
- [ ] n8n reçoit le webhook (visible dans Executions)
- [ ] Payload contient bien `record.id` et `record.status`
- [ ] Workflow n8n peut filtrer par `status` si nécessaire
- [ ] Email de test envoyé avec succès (si workflow configuré)

**Résultat attendu**:
- ✅ Chaque INSERT sur `public.bookings` déclenche automatiquement une requête POST vers n8n
- ✅ n8n reçoit le payload complet de la ligne insérée
- ✅ Le workflow n8n peut traiter/filtrer selon les besoins métier

