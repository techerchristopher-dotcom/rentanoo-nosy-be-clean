# Fix — Email EDL envoyé 6 fois

## 🎯 Cause identifiée

**Problème** : Le workflow n8n est probablement configuré avec un **webhook DB Supabase** qui se déclenche à chaque `UPDATE` sur `checkin_depart`, même si le statut ne change pas.

**Pourquoi 6 fois ?**
- 6 photos uploadées en Step 3 → 6 appels à `saveStep3ZoneDraft()` → 6 UPDATE sur `checkin_depart`
- Chaque UPDATE déclenche le webhook n8n
- Quand le statut passe à "completed", le webhook est appelé 6 fois

## ✅ Fix minimal (3 étapes)

### Étape 1 : Migration SQL — Idempotence (OBLIGATOIRE)

**Fichier** : `supabase/migrations/YYYYMMDDHHMMSS_add_edl_email_tracking.sql`

**Action** : Appliquer la migration SQL pour ajouter les colonnes d'idempotence :

```sql
-- Colonne 1 : Timestamp du dernier envoi email EDL
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_sent_at TIMESTAMPTZ;

-- Colonne 2 : Statut de l'envoi email EDL
ALTER TABLE public.checkin_depart
ADD COLUMN IF NOT EXISTS edl_email_sent_status TEXT
  CHECK (edl_email_sent_status IS NULL OR edl_email_sent_status IN ('sent', 'failed', 'retrying', 'sending'));

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
```

### Étape 2 : Modifier le workflow n8n (OBLIGATOIRE)

**Action** : Dans l'interface n8n, modifier le workflow pour ajouter une vérification d'idempotence AVANT d'envoyer l'email.

#### Option A : Si webhook DB utilisé

**Node 1 : Vérification idempotence (SQL)**

```sql
-- Marquer comme "sending" et vérifier si déjà envoyé
UPDATE checkin_depart
SET edl_email_sent_status = 'sending',
    edl_email_retry_count = edl_email_retry_count + 1
WHERE id = :checkin_id
  AND status = 'completed'
  AND legal_pdf_url IS NOT NULL
  AND (
    edl_email_sent_at IS NULL 
    OR edl_email_sent_at < validated_at
    OR (edl_email_sent_status = 'failed' AND edl_email_retry_count < 3)
  )
  AND edl_email_sent_status != 'sending'  -- Éviter les doubles
RETURNING id, edl_email_sent_at, edl_email_retry_count;
```

**Si `RETURNING` est vide** → Skip (déjà envoyé ou en cours)

**Node 2 : Envoi email** (uniquement si Node 1 retourne un ID)

**Node 3 : Update succès**

```sql
UPDATE checkin_depart
SET edl_email_sent_at = NOW(),
    edl_email_sent_status = 'sent',
    edl_email_last_error = NULL
WHERE id = :checkin_id;
```

**Node 4 : Update échec** (si email échoue)

```sql
UPDATE checkin_depart
SET edl_email_sent_status = 'failed',
    edl_email_last_error = :error_message
WHERE id = :checkin_id;
```

#### Option B : Si cron utilisé (RECOMMANDÉ)

**Node 1 : Requête SQL (avec filtre idempotence)**

```sql
SELECT 
  cd.id AS checkin_id,
  cd.status,
  cd.legal_pdf_url,
  cd.owner_email,
  cd.booking_reference_number,
  cd.validated_at,
  cd.booking_id,
  cd.edl_email_sent_at,
  cd.edl_email_sent_status,
  cd.edl_email_retry_count,
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
  AND (
    cd.edl_email_sent_at IS NULL 
    OR cd.edl_email_sent_at < cd.validated_at
    OR (cd.edl_email_sent_status = 'failed' AND cd.edl_email_retry_count < 3)
  )
  AND cd.edl_email_sent_status != 'sending'  -- Éviter les doubles
ORDER BY cd.validated_at DESC
LIMIT 50;
```

**Node 2 : Split Items** (traiter chaque check-in)

**Node 3 : Marquer comme "sending"** (AVANT envoi)

```sql
UPDATE checkin_depart
SET edl_email_sent_status = 'sending',
    edl_email_retry_count = edl_email_retry_count + 1
WHERE id = :checkin_id
  AND edl_email_sent_status != 'sending';  -- Double vérification
```

**Node 4 : Download PDF**

**Node 5 : Email Locataire**

**Node 6 : Email Propriétaire**

**Node 7 : IF — Tous succès ?**

**Node 8 : Update succès**

```sql
UPDATE checkin_depart
SET edl_email_sent_at = NOW(),
    edl_email_sent_status = 'sent',
    edl_email_last_error = NULL
WHERE id = :checkin_id;
```

**Node 9 : Update échec**

```sql
UPDATE checkin_depart
SET edl_email_sent_status = 'failed',
    edl_email_last_error = :error_message
WHERE id = :checkin_id;
```

### Étape 3 : Vérifier la configuration webhook (si webhook utilisé)

**Action** : Dans Supabase Dashboard → Database → Webhooks

**Vérifier** :
1. Le webhook est configuré sur `checkin_depart`
2. Le filtre est : `status = 'completed'` ET `legal_pdf_url IS NOT NULL`
3. Sinon, **désactiver le webhook** et utiliser un **cron** (plus sûr)

## 📊 Instrumentation ajoutée

**Fichier** : `src/services/checkinDepartService.ts` (ligne ~1075)

**Log ajouté** :
```typescript
const correlationId = `${params.checkinId}_${Date.now()}`;
console.log(`[CHECKIN_SERVICE] 📧 Email trigger correlationId=${correlationId}`, {
  checkinId: params.checkinId,
  bookingId: params.bookingId,
  status: finalizedCheckin.status,
  timestamp: new Date().toISOString(),
  caller: new Error().stack?.split('\n').slice(1, 4).map(l => l.trim()).join(' | '),
});
```

**Utilisation** : Vérifier dans les logs si `finalizeCheckinDepart()` est appelé plusieurs fois.

## 🚀 Checklist de déploiement

- [ ] Appliquer la migration SQL (Étape 1)
- [ ] Modifier le workflow n8n avec idempotence (Étape 2)
- [ ] Vérifier/désactiver le webhook DB si mal configuré (Étape 3)
- [ ] Tester avec un check-in de test
- [ ] Monitorer les logs pour confirmer la cause

## 📝 Notes

- **Si webhook DB** : Le problème vient probablement du fait que le webhook se déclenche à chaque UPDATE, même si le statut ne change pas.
- **Si cron** : Le problème vient probablement du fait que la requête SQL ne filtre pas correctement les check-ins déjà envoyés.
- **Fix recommandé** : Utiliser un **cron** au lieu d'un webhook DB (plus sûr et plus prévisible).

---

**Date** : 2025-01-XX  
**Version** : 1.0

