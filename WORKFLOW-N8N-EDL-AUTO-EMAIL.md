# Workflow n8n — Envoi automatique EDL (PDF) — Implémentation complète

**Objectif** : Implémenter un workflow n8n qui s'exécute automatiquement quand un état des lieux est finalisé (checkin "depart" moto/voiture), afin d'envoyer **2 emails** :
1. **Locataire** : confirmation + PDF EDL en PJ
2. **Propriétaire** : confirmation + PDF EDL en PJ

---

## 📋 Table des matières

1. [Phase 1 : Inspection DB](#phase-1--inspection-db)
2. [Phase 2 : Choix d'architecture n8n](#phase-2--choix-darchitecture-n8n)
3. [Phase 3 : Idempotence (migration SQL)](#phase-3--idempotence-migration-sql)
4. [Phase 4 : Récupération du PDF](#phase-4--récupération-du-pdf)
5. [Phase 5 : Envoi email](#phase-5--envoi-email)
6. [Phase 6 : Gestion erreurs + retries](#phase-6--gestion-erreurs--retries)
7. [Phase 7 : Workflow n8n complet](#phase-7--workflow-n8n-complet)
8. [Phase 8 : Checklist de tests](#phase-8--checklist-de-tests)

---

## Phase 1 : Inspection DB

### 📊 Tableau récapitulatif "Champ → Où → Exemple"

| **Champ** | **Table/Relation** | **Type** | **Exemple** | **Notes** |
|-----------|-------------------|----------|-------------|-----------|
| **Check-in ID** | `checkin_depart.id` | `uuid` | `5f7ff83d-6b67-4b94-b8ae-ecff21393e0f` | Identifiant unique du check-in |
| **Statut finalisé** | `checkin_depart.status` | `text` | `'completed'` | ✅ Valeur exacte pour déclencher |
| **URL PDF** | `checkin_depart.legal_pdf_url` | `text` | `https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/checkin-photos/resa_unknown/documents/etat_des_lieux_depart_5f7ff83d-6b67-4b94-b8ae-ecff21393e0f.pdf` | URL publique du PDF (peut être NULL si génération échoue) |
| **Email propriétaire** | `checkin_depart.owner_email` | `text` | `techerchristopher@gmail.com` | ✅ Stocké directement (snapshot) |
| **Email locataire** | `profiles.email` (via `bookings.user_id`) | `text` | `christopher.techer@alegria.academy` | ⚠️ Via relation : `checkin_depart.booking_id` → `bookings.user_id` → `profiles.id` → `profiles.email` |
| **Référence booking** | `checkin_depart.booking_reference_number` | `integer` | `123` | Numéro de réservation (peut être NULL) |
| **Booking ID** | `checkin_depart.booking_id` | `uuid` | `33b55c9d-052e-4905-a728-d04280854a3e` | Pour jointures |
| **Date validation** | `checkin_depart.validated_at` | `timestamptz` | `2025-01-15T10:30:00Z` | Date de finalisation |
| **Véhicule type** | `vehicles.vehicle_type` (via `bookings.vehicle_id`) | `text` | `'car'` ou `'moto'` | Pour personnaliser le message |

### 🔍 Requête SQL pour identifier les check-ins à traiter

```sql
SELECT 
  cd.id AS checkin_id,
  cd.status,
  cd.legal_pdf_url,
  cd.owner_email,
  cd.booking_reference_number,
  cd.validated_at,
  cd.booking_id,
  b.user_id AS renter_user_id,
  p_renter.email AS renter_email,
  p_renter.first_name AS renter_first_name,
  p_renter.last_name AS renter_last_name,
  p_owner.email AS owner_email_from_profile,
  p_owner.first_name AS owner_first_name,
  p_owner.last_name AS owner_last_name,
  v.vehicle_type,
  v.brand,
  v.model
FROM checkin_depart cd
LEFT JOIN bookings b ON cd.booking_id = b.id
LEFT JOIN profiles p_renter ON b.user_id = p_renter.id
LEFT JOIN profiles p_owner ON cd.owner_id = p_owner.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
WHERE cd.status = 'completed'
  AND cd.legal_pdf_url IS NOT NULL  -- PDF doit exister
  AND (cd.edl_email_sent_at IS NULL OR cd.edl_email_sent_at < cd.validated_at)  -- Pas encore envoyé ou ré-envoi si PDF régénéré
ORDER BY cd.validated_at DESC;
```

**Note** : La colonne `edl_email_sent_at` sera créée dans la migration SQL (Phase 3).

---

## Phase 2 : Choix d'architecture n8n

### Option A — Trigger DB (recommandé si possible)

**Avantages** :
- ✅ Déclenchement instantané (pas de délai)
- ✅ Pas de polling inutile
- ✅ Moins de charge sur la DB

**Inconvénients** :
- ⚠️ Nécessite un webhook Supabase Database (fonctionnalité payante)
- ⚠️ Configuration plus complexe
- ⚠️ Gestion des retries plus délicate

**Implémentation** :
1. Créer un webhook Supabase Database sur `checkin_depart`
2. Filtrer sur `status = 'completed'` ET `legal_pdf_url IS NOT NULL`
3. Déclencher uniquement sur UPDATE (pas INSERT)
4. URL webhook n8n : `https://n8n.srv1285649.hstgr.cloud/webhook/checkin-depart-completed`

### Option B — Cron "week-end" + rattrapage (recommandé par défaut)

**Avantages** :
- ✅ Simple à implémenter
- ✅ Pas de dépendance à une fonctionnalité payante
- ✅ Rattrape les check-ins manqués
- ✅ Contrôle total sur la fréquence

**Inconvénients** :
- ⚠️ Délai jusqu'à 10 minutes (si cron toutes les 10 min)
- ⚠️ Polling régulier (charge minime)

**Implémentation** :
1. Cron n8n : **Samedi et dimanche, toutes les 10 minutes** (ex: `*/10 * * * 0,6`)
2. Requête Supabase pour trouver les check-ins `completed` non envoyés
3. Traiter chaque check-in et marquer comme envoyé

### ✅ RECOMMANDATION : **Option B (Cron week-end)**

**Raison** : L'utilisateur a explicitement mentionné "workflow week-end", donc on part sur un cron samedi/dimanche. De plus, c'est plus simple à maintenir et ne nécessite pas de fonctionnalité payante Supabase.

**Fréquence recommandée** :
- **Week-end (samedi/dimanche)** : Toutes les 10 minutes
- **Semaine** : Optionnel (toutes les heures si besoin de rattrapage)

**Cron expression** :
```
*/10 * * * 0,6  # Toutes les 10 minutes le samedi (6) et dimanche (0)
```

---

## Phase 3 : Idempotence (migration SQL)

### 🎯 Objectif

Empêcher l'envoi en double du même EDL. Deux approches possibles :

### Approche 1 : Colonnes simples (recommandée)

Ajouter 2 colonnes dans `checkin_depart` :
- `edl_email_sent_at` : Timestamp du dernier envoi
- `edl_email_sent_status` : Statut (`'sent'`, `'failed'`, `'retrying'`)

**Avantages** :
- ✅ Simple
- ✅ Pas de table supplémentaire
- ✅ Facile à requêter

### Approche 2 : Table dédiée (plus flexible)

Créer une table `checkin_notifications` pour tracker tous les envois.

**Avantages** :
- ✅ Historique complet
- ✅ Support multi-notifications (email, SMS, etc.)
- ✅ Retries avec compteur

**Inconvénients** :
- ⚠️ Plus complexe
- ⚠️ Jointure supplémentaire

### ✅ RECOMMANDATION : **Approche 1 (colonnes simples)**

### 📝 Migration SQL

```sql
-- ============================================================================
-- Migration : Ajout colonnes idempotence pour envoi EDL par email
-- ============================================================================
-- Date : 2025-01-XX
-- Description : Ajoute les colonnes nécessaires pour éviter les envois en double
--               et tracker le statut d'envoi des emails EDL

-- Colonne 1 : Timestamp du dernier envoi email EDL
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_sent_at TIMESTAMPTZ;

-- Colonne 2 : Statut de l'envoi email EDL
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_sent_status TEXT
  CHECK (edl_email_sent_status IS NULL OR edl_email_sent_status IN ('sent', 'failed', 'retrying'));

-- Colonne 3 : Compteur de tentatives (pour retries)
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_retry_count INTEGER DEFAULT 0;

-- Colonne 4 : Dernière erreur (pour debugging)
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_last_error TEXT;

-- Index pour requêtes rapides (check-ins non envoyés)
CREATE INDEX IF NOT EXISTS idx_checkin_depart_edl_email_pending
ON public.checkin_depart(status, edl_email_sent_at)
WHERE status = 'completed' 
  AND legal_pdf_url IS NOT NULL 
  AND (edl_email_sent_at IS NULL OR edl_email_sent_status = 'failed');

-- Commentaires pour documentation
COMMENT ON COLUMN public.checkin_depart.edl_email_sent_at IS 'Timestamp du dernier envoi email EDL (locataire + propriétaire)';
COMMENT ON COLUMN public.checkin_depart.edl_email_sent_status IS 'Statut de l''envoi: sent (succès), failed (échec), retrying (en cours de retry)';
COMMENT ON COLUMN public.checkin_depart.edl_email_retry_count IS 'Nombre de tentatives d''envoi (max 3)';
COMMENT ON COLUMN public.checkin_depart.edl_email_last_error IS 'Message d''erreur de la dernière tentative (pour debugging)';
```

### 🔄 Requête SQL pour marquer comme envoyé

```sql
-- Après envoi réussi des 2 emails
UPDATE checkin_depart
SET 
  edl_email_sent_at = NOW(),
  edl_email_sent_status = 'sent',
  edl_email_retry_count = edl_email_retry_count + 1,
  edl_email_last_error = NULL
WHERE id = :checkin_id;
```

### 🔄 Requête SQL pour marquer comme échec

```sql
-- Après échec d'envoi
UPDATE checkin_depart
SET 
  edl_email_sent_status = 'failed',
  edl_email_retry_count = edl_email_retry_count + 1,
  edl_email_last_error = :error_message
WHERE id = :checkin_id;
```

---

## Phase 4 : Récupération du PDF

### 📍 Où est stocké le PDF ?

**Bucket Supabase Storage** : `checkin-photos`

**Path** : `resa_{referenceNumber}/documents/etat_des_lieux_depart_{checkinId}.pdf`

**URL publique** : Stockée dans `checkin_depart.legal_pdf_url`

**Exemple** :
```
https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/checkin-photos/resa_unknown/documents/etat_des_lieux_depart_5f7ff83d-6b67-4b94-b8ae-ecff21393e0f.pdf
```

### 🔧 Méthode de récupération dans n8n

**Option 1 : Download depuis URL publique (recommandée)**

Le PDF est accessible via URL publique, donc n8n peut le télécharger directement avec le node **HTTP Request**.

**Configuration n8n** :
1. Node **HTTP Request**
2. Method : `GET`
3. URL : `{{ $json.legal_pdf_url }}`
4. Response Format : `File`
5. Output : Binary data (pour attacher à l'email)

**Avantages** :
- ✅ Simple
- ✅ Pas besoin d'authentification Supabase
- ✅ Fonctionne directement

**Inconvénients** :
- ⚠️ Si le bucket devient privé, ça ne fonctionnera plus

**Option 2 : Download via Supabase Storage API (si bucket privé)**

Si le bucket devient privé, utiliser l'API Supabase Storage avec une URL signée.

**Configuration n8n** :
1. Node **HTTP Request**
2. Method : `GET`
3. URL : Générer une URL signée via Supabase (nécessite `SUPABASE_SERVICE_ROLE_KEY`)
4. Headers : `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`

### ✅ RECOMMANDATION : **Option 1 (URL publique)**

Le bucket `checkin-photos` est public (confirmé par le code), donc on utilise directement l'URL publique.

### 📝 Exemple de node n8n (HTTP Request)

```json
{
  "parameters": {
    "method": "GET",
    "url": "={{ $json.legal_pdf_url }}",
    "options": {
      "response": {
        "response": {
          "responseFormat": "file"
        }
      }
    }
  },
  "name": "Download PDF",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1
}
```

---

## Phase 5 : Envoi email

### 🔧 Provider email

**Choix** : Le projet utilise **n8n** pour les notifications, donc on utilise le node **Email (SMTP)** de n8n ou un provider intégré (SendGrid, Postmark, etc.).

**Recommandation** : Utiliser le node **Email (SMTP)** de n8n avec la configuration SMTP existante du projet.

**Variables d'environnement n8n** (à configurer dans n8n) :
- `SMTP_HOST` : `smtp.gmail.com` (ou autre)
- `SMTP_PORT` : `587`
- `SMTP_USER` : Email expéditeur
- `SMTP_PASS` : Mot de passe app
- `EMAIL_FROM` : `noreply@rentanoo.com` (ou équivalent)

### 📧 Template email — Locataire

**Sujet** :
```
État des lieux de départ — Réservation #{{ booking_reference_number }}
```

**Contenu (HTML)** :
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rentanoo — État des lieux de départ</h1>
    </div>
    <div class="content">
      <p>Bonjour {{ renter_first_name }},</p>
      
      <p>Votre état des lieux de départ pour la réservation <strong>#{{ booking_reference_number }}</strong> a été finalisé avec succès.</p>
      
      <p><strong>Détails de la réservation :</strong></p>
      <ul>
        <li><strong>Véhicule :</strong> {{ vehicle_brand }} {{ vehicle_model }}</li>
        <li><strong>Date de départ :</strong> {{ booking_departure_date }}</li>
        <li><strong>Date de retour prévue :</strong> {{ booking_return_date }}</li>
      </ul>
      
      <p>Vous trouverez ci-joint le PDF de l'état des lieux de départ signé par vous et le propriétaire.</p>
      
      <p>Ce document est important et doit être conservé pour la durée de la location.</p>
      
      <p>En cas de question, n'hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br>L'équipe Rentanoo</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
      <p>&copy; 2025 Rentanoo — Location de véhicules à Nosy Be</p>
    </div>
  </div>
</body>
</html>
```

**Contenu (texte brut)** :
```
Bonjour {{ renter_first_name }},

Votre état des lieux de départ pour la réservation #{{ booking_reference_number }} a été finalisé avec succès.

Détails de la réservation :
- Véhicule : {{ vehicle_brand }} {{ vehicle_model }}
- Date de départ : {{ booking_departure_date }}
- Date de retour prévue : {{ booking_return_date }}

Vous trouverez ci-joint le PDF de l'état des lieux de départ signé par vous et le propriétaire.

Ce document est important et doit être conservé pour la durée de la location.

En cas de question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe Rentanoo
```

### 📧 Template email — Propriétaire

**Sujet** :
```
État des lieux de départ — Réservation #{{ booking_reference_number }}
```

**Contenu (HTML)** :
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rentanoo — État des lieux de départ</h1>
    </div>
    <div class="content">
      <p>Bonjour {{ owner_first_name }},</p>
      
      <p>L'état des lieux de départ pour la réservation <strong>#{{ booking_reference_number }}</strong> a été finalisé avec succès.</p>
      
      <p><strong>Détails de la réservation :</strong></p>
      <ul>
        <li><strong>Véhicule :</strong> {{ vehicle_brand }} {{ vehicle_model }}</li>
        <li><strong>Locataire :</strong> {{ renter_first_name }} {{ renter_last_name }}</li>
        <li><strong>Date de départ :</strong> {{ booking_departure_date }}</li>
        <li><strong>Date de retour prévue :</strong> {{ booking_return_date }}</li>
      </ul>
      
      <p>Vous trouverez ci-joint le PDF de l'état des lieux de départ signé par vous et le locataire.</p>
      
      <p>Ce document est important et doit être conservé pour la durée de la location.</p>
      
      <p>En cas de question, n'hésitez pas à nous contacter.</p>
      
      <p>Cordialement,<br>L'équipe Rentanoo</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
      <p>&copy; 2025 Rentanoo — Location de véhicules à Nosy Be</p>
    </div>
  </div>
</body>
</html>
```

**Contenu (texte brut)** :
```
Bonjour {{ owner_first_name }},

L'état des lieux de départ pour la réservation #{{ booking_reference_number }} a été finalisé avec succès.

Détails de la réservation :
- Véhicule : {{ vehicle_brand }} {{ vehicle_model }}
- Locataire : {{ renter_first_name }} {{ renter_last_name }}
- Date de départ : {{ booking_departure_date }}
- Date de retour prévue : {{ booking_return_date }}

Vous trouverez ci-joint le PDF de l'état des lieux de départ signé par vous et le locataire.

Ce document est important et doit être conservé pour la durée de la location.

En cas de question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe Rentanoo
```

### 📎 Variables utilisées

| Variable | Source | Exemple |
|----------|--------|---------|
| `booking_reference_number` | `checkin_depart.booking_reference_number` | `123` |
| `renter_first_name` | `profiles.first_name` (via `bookings.user_id`) | `Christopher` |
| `renter_last_name` | `profiles.last_name` | `Techer` |
| `owner_first_name` | `profiles.first_name` (via `checkin_depart.owner_id`) | `Jean` |
| `owner_last_name` | `profiles.last_name` | `Dupont` |
| `vehicle_brand` | `vehicles.brand` | `Toyota` |
| `vehicle_model` | `vehicles.model` | `Corolla` |
| `booking_departure_date` | `checkin_depart.booking_departure_datetime` (formaté) | `15 janvier 2025` |
| `booking_return_date` | `checkin_depart.booking_return_datetime` (formaté) | `20 janvier 2025` |

### 📎 Nom du fichier PDF en PJ

```
etat-des-lieux-depart-{{ booking_reference_number }}.pdf
```

Exemple : `etat-des-lieux-depart-123.pdf`

---

## Phase 6 : Gestion erreurs + retries

### 🔄 Règles de retry

1. **PDF manquant** (`legal_pdf_url IS NULL`) :
   - ❌ **Ne pas envoyer** d'email sans PDF
   - ✅ Marquer comme `failed` avec erreur `"PDF_NOT_AVAILABLE"`
   - ✅ Retry automatique au prochain cron (si PDF généré entre-temps)

2. **Email fail (locataire ou propriétaire)** :
   - ✅ Retry jusqu'à **3 tentatives** (max)
   - ✅ Délai entre retries : **30 minutes**
   - ✅ Si échec après 3 tentatives : marquer comme `failed` et loguer l'erreur

3. **Email partiel (un succès, un échec)** :
   - ✅ Marquer comme `failed` si au moins un email a échoué
   - ✅ Retry uniquement l'email qui a échoué

### 📊 Logs en DB

Les erreurs sont stockées dans `checkin_depart.edl_email_last_error`.

**Format d'erreur** :
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "error_type": "EMAIL_SEND_FAILED",
  "recipient": "renter" | "owner",
  "email": "user@example.com",
  "error_message": "SMTP timeout",
  "retry_count": 2
}
```

### 🚨 Alertes (optionnel — Slack)

Si configuré, envoyer une alerte Slack après 3 échecs consécutifs :

```
🚨 Échec envoi EDL après 3 tentatives
Check-in ID: 5f7ff83d-6b67-4b94-b8ae-ecff21393e0f
Réservation: #123
Erreur: SMTP timeout
```

---

## Phase 7 : Workflow n8n complet

### 📊 Diagramme du workflow

```
┌─────────────────┐
│  Cron Trigger   │  (Samedi/Dimanche, toutes les 10 min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Query │  (Récupérer check-ins completed non envoyés)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Split Items   │  (Traiter chaque check-in)
└────────┬────────┘
         │
         ├─────────────────────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────┐              ┌─────────────────┐
│  Download PDF   │              │  Download PDF    │  (Même PDF pour les 2)
│  (HTTP Request) │              │  (HTTP Request)  │
└────────┬────────┘              └────────┬────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────┐              ┌─────────────────┐
│  Email Locataire │              │  Email Propriétaire │
│  (SMTP)         │              │  (SMTP)          │
└────────┬────────┘              └────────┬────────┘
         │                                   │
         └───────────┬───────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  IF: Tous succès ?    │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Update DB      │    │  Update DB       │
│  (sent)         │    │  (failed)        │
└─────────────────┘    └─────────────────┘
```

### 🔧 Structure des nodes n8n

#### Node 1 : Cron Trigger

**Type** : `n8n-nodes-base.cron`

**Configuration** :
- **Cron Expression** : `*/10 * * * 0,6` (toutes les 10 min samedi/dimanche)
- **Timezone** : `Europe/Paris` (ou `Indian/Antananarivo` pour Madagascar)

#### Node 2 : Supabase Query

**Type** : `n8n-nodes-base.postgres` (ou `n8n-nodes-base.httpRequest` si API Supabase)

**Configuration** :
- **Operation** : `Execute Query`
- **Query** :
```sql
SELECT 
  cd.id AS checkin_id,
  cd.status,
  cd.legal_pdf_url,
  cd.owner_email,
  cd.booking_reference_number,
  cd.validated_at,
  cd.booking_id,
  b.user_id AS renter_user_id,
  p_renter.email AS renter_email,
  p_renter.first_name AS renter_first_name,
  p_renter.last_name AS renter_last_name,
  p_owner.email AS owner_email_from_profile,
  p_owner.first_name AS owner_first_name,
  p_owner.last_name AS owner_last_name,
  v.vehicle_type,
  v.brand AS vehicle_brand,
  v.model AS vehicle_model,
  cd.booking_departure_datetime,
  cd.booking_return_datetime
FROM checkin_depart cd
LEFT JOIN bookings b ON cd.booking_id = b.id
LEFT JOIN profiles p_renter ON b.user_id = p_renter.id
LEFT JOIN profiles p_owner ON cd.owner_id = p_owner.id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
WHERE cd.status = 'completed'
  AND cd.legal_pdf_url IS NOT NULL
  AND (cd.edl_email_sent_at IS NULL 
       OR (cd.edl_email_sent_status = 'failed' AND cd.edl_email_retry_count < 3))
ORDER BY cd.validated_at DESC
LIMIT 50;
```

#### Node 3 : Split Items

**Type** : `n8n-nodes-base.splitInBatches`

**Configuration** :
- **Batch Size** : `1` (traiter un check-in à la fois)

#### Node 4 : Download PDF (Locataire)

**Type** : `n8n-nodes-base.httpRequest`

**Configuration** :
- **Method** : `GET`
- **URL** : `={{ $json.legal_pdf_url }}`
- **Response Format** : `File`
- **Options** → **Response** → **Response Format** : `file`

#### Node 5 : Download PDF (Propriétaire)

**Identique au Node 4** (ou réutiliser le même PDF)

#### Node 6 : Email Locataire

**Type** : `n8n-nodes-base.emailSend`

**Configuration** :
- **From Email** : `noreply@rentanoo.com` (ou variable env)
- **To Email** : `={{ $json.renter_email }}`
- **Subject** : `État des lieux de départ — Réservation #{{ $json.booking_reference_number }}`
- **Email Type** : `HTML`
- **Message** : Template HTML locataire (voir Phase 5)
- **Attachments** :
  - **Name** : `etat-des-lieux-depart-{{ $json.booking_reference_number }}.pdf`
  - **Data** : Binary data du Node 4

#### Node 7 : Email Propriétaire

**Type** : `n8n-nodes-base.emailSend`

**Configuration** :
- **From Email** : `noreply@rentanoo.com`
- **To Email** : `={{ $json.owner_email || $json.owner_email_from_profile }}`
- **Subject** : `État des lieux de départ — Réservation #{{ $json.booking_reference_number }}`
- **Email Type** : `HTML`
- **Message** : Template HTML propriétaire (voir Phase 5)
- **Attachments** :
  - **Name** : `etat-des-lieux-depart-{{ $json.booking_reference_number }}.pdf`
  - **Data** : Binary data du Node 5

#### Node 8 : IF — Tous succès ?

**Type** : `n8n-nodes-base.if`

**Configuration** :
- **Condition** : 
  - `{{ $json['Email Locataire'].success }} === true`
  - **AND**
  - `{{ $json['Email Propriétaire'].success }} === true`

#### Node 9 : Update DB — Succès

**Type** : `n8n-nodes-base.postgres`

**Configuration** :
- **Operation** : `Execute Query`
- **Query** :
```sql
UPDATE checkin_depart
SET 
  edl_email_sent_at = NOW(),
  edl_email_sent_status = 'sent',
  edl_email_retry_count = edl_email_retry_count + 1,
  edl_email_last_error = NULL
WHERE id = '{{ $json.checkin_id }}';
```

#### Node 10 : Update DB — Échec

**Type** : `n8n-nodes-base.postgres`

**Configuration** :
- **Operation** : `Execute Query`
- **Query** :
```sql
UPDATE checkin_depart
SET 
  edl_email_sent_status = 'failed',
  edl_email_retry_count = edl_email_retry_count + 1,
  edl_email_last_error = :error_message
WHERE id = '{{ $json.checkin_id }}';
```

**Note** : `:error_message` doit être construit depuis les erreurs des nodes Email.

### 📦 Export JSON n8n (pseudo-export)

Voir fichier séparé : `workflow-n8n-edl-export.json` (à créer manuellement dans n8n)

---

## Phase 8 : Checklist de tests

### ✅ Cas 1 : Envoi normal (succès)

**Prérequis** :
- [ ] Check-in `completed` avec `legal_pdf_url` valide
- [ ] Emails locataire et propriétaire valides
- [ ] PDF accessible via URL publique

**Actions** :
1. [ ] Créer un check-in test avec `status = 'completed'` et `legal_pdf_url` valide
2. [ ] Exécuter le workflow n8n manuellement
3. [ ] Vérifier que les 2 emails sont envoyés
4. [ ] Vérifier que les PDFs sont en PJ
5. [ ] Vérifier que `edl_email_sent_at` est mis à jour
6. [ ] Vérifier que `edl_email_sent_status = 'sent'`

**Résultat attendu** : ✅ 2 emails reçus avec PDF en PJ, DB mise à jour

### ✅ Cas 2 : PDF manquant

**Prérequis** :
- [ ] Check-in `completed` avec `legal_pdf_url = NULL`

**Actions** :
1. [ ] Créer un check-in test avec `status = 'completed'` et `legal_pdf_url = NULL`
2. [ ] Exécuter le workflow n8n
3. [ ] Vérifier qu'**aucun email n'est envoyé**
4. [ ] Vérifier que `edl_email_sent_status = 'failed'`
5. [ ] Vérifier que `edl_email_last_error` contient `"PDF_NOT_AVAILABLE"`

**Résultat attendu** : ✅ Aucun email, DB marquée comme `failed`

### ✅ Cas 3 : Email invalide (locataire)

**Prérequis** :
- [ ] Check-in `completed` avec `legal_pdf_url` valide
- [ ] Email locataire invalide (ex: `invalid-email`)

**Actions** :
1. [ ] Créer un check-in test avec email locataire invalide
2. [ ] Exécuter le workflow n8n
3. [ ] Vérifier que l'email propriétaire est envoyé
4. [ ] Vérifier que l'email locataire échoue
5. [ ] Vérifier que `edl_email_sent_status = 'failed'`
6. [ ] Vérifier que `edl_email_retry_count = 1`

**Résultat attendu** : ✅ 1 email envoyé (propriétaire), 1 échec (locataire), DB marquée comme `failed`

### ✅ Cas 4 : Retry après échec

**Prérequis** :
- [ ] Check-in avec `edl_email_sent_status = 'failed'` et `edl_email_retry_count = 1`
- [ ] Email maintenant valide (ou problème résolu)

**Actions** :
1. [ ] Corriger l'email invalide dans la DB
2. [ ] Exécuter le workflow n8n
3. [ ] Vérifier que les emails sont envoyés
4. [ ] Vérifier que `edl_email_sent_status = 'sent'`
5. [ ] Vérifier que `edl_email_retry_count = 2`

**Résultat attendu** : ✅ Emails envoyés, DB mise à jour avec `sent`

### ✅ Cas 5 : Double envoi (idempotence)

**Prérequis** :
- [ ] Check-in avec `edl_email_sent_at` déjà rempli et `edl_email_sent_status = 'sent'`

**Actions** :
1. [ ] Exécuter le workflow n8n sur un check-in déjà envoyé
2. [ ] Vérifier qu'**aucun email n'est envoyé** (requête SQL filtre déjà)
3. [ ] Vérifier que `edl_email_sent_at` n'est pas modifié

**Résultat attendu** : ✅ Aucun email en double, DB inchangée

### ✅ Cas 6 : Max retries (3 tentatives)

**Prérequis** :
- [ ] Check-in avec `edl_email_retry_count = 3`

**Actions** :
1. [ ] Exécuter le workflow n8n
2. [ ] Vérifier qu'**aucun email n'est envoyé** (requête SQL filtre `retry_count < 3`)
3. [ ] Vérifier que `edl_email_sent_status` reste `'failed'`

**Résultat attendu** : ✅ Aucun email, pas de retry supplémentaire

---

## 📝 Résumé des livrables

### ✅ 1. Diagramme / Description workflow n8n

Voir [Phase 7 : Workflow n8n complet](#phase-7--workflow-n8n-complet)

### ✅ 2. Requête Supabase pour trouver les check-ins à traiter

Voir [Phase 1 : Inspection DB](#phase-1--inspection-db) — Requête SQL complète

### ✅ 3. Migration SQL (idempotence)

Voir [Phase 3 : Idempotence (migration SQL)](#phase-3--idempotence-migration-sql)

### ✅ 4. Structure finale des nodes n8n

Voir [Phase 7 : Workflow n8n complet](#phase-7--workflow-n8n-complet) — Structure des nodes

### ✅ 5. JSON export n8n

À créer manuellement dans n8n après configuration des nodes (ou utiliser l'export depuis l'interface n8n)

### ✅ 6. Checklist de tests

Voir [Phase 8 : Checklist de tests](#phase-8--checklist-de-tests)

---

## 🚀 Prochaines étapes

1. **Appliquer la migration SQL** (Phase 3)
2. **Créer le workflow n8n** (Phase 7)
3. **Configurer les variables d'environnement n8n** (SMTP)
4. **Tester avec un check-in de test** (Phase 8)
5. **Activer le cron** (samedi/dimanche)

---

## 📚 Références

- **Bucket Storage** : `checkin-photos`
- **Table principale** : `checkin_depart`
- **Colonnes idempotence** : `edl_email_sent_at`, `edl_email_sent_status`, `edl_email_retry_count`, `edl_email_last_error`
- **URL n8n** : `https://n8n.srv1285649.hstgr.cloud` (à confirmer)

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Auteur** : Cursor AI

