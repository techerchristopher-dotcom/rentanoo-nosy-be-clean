# Diagnostic — Email EDL envoyé 6 fois

## 🔍 Problème identifié

Depuis les dernières modifications (compression/upload photos), l'email "état des lieux" est reçu **6 fois** au lieu d'une seule fois.

## 📊 Analyse du code

### 1) Point d'entrée : Envoi email

**Fichier** : `WORKFLOW-N8N-EDL-AUTO-EMAIL.md`

**Workflow n8n** :
- **Type** : Cron (samedi/dimanche, toutes les 10 min) OU Webhook DB
- **Requête SQL** : 
  ```sql
  SELECT * FROM checkin_depart
  WHERE status = 'completed'
    AND legal_pdf_url IS NOT NULL
    AND (edl_email_sent_at IS NULL OR edl_email_sent_at < validated_at)
  ```

**Hypothèse** : Le workflow n8n est probablement configuré avec un **webhook DB Supabase** qui se déclenche à chaque `UPDATE` sur `checkin_depart`, même si le statut ne change pas.

### 2) Déclenchement : Upload photos Step 3

**Fichiers** :
- `src/components/ExteriorInspectionAccordionSimple.tsx` (lignes 520, 559)
- `src/services/checkinDepartService.ts` (lignes 350-440)

**Problème identifié** :

Chaque upload de photo en Step 3 appelle `saveStep3ZoneDraft()` qui fait un **UPDATE** sur `checkin_depart` :

```typescript
// Après chaque upload de photo (zone, jante, dégât)
const result = await saveStep3ZoneDraft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  zoneKey: currentZoneKey,
  zonesPhotos: { [currentZoneKey]: uploadedPhotos },
  zonesHasDamage: { [currentZoneKey]: zonesHasDamage[currentZoneKey] },
  damageReports: allDamages,
});
```

**Impact** :
- Si 6 photos sont uploadées → 6 appels à `saveStep3ZoneDraft()` → 6 UPDATE sur `checkin_depart`
- Si le workflow n8n utilise un **webhook DB** (trigger), chaque UPDATE déclenche le webhook
- Même si le statut reste "draft", le webhook est appelé
- Quand le statut passe à "completed", le webhook est appelé **6 fois** (une fois par UPDATE précédent qui a été "retardé" ou "en attente")

### 3) Finalisation : Changement de statut

**Fichier** : `src/services/checkinDepartService.ts` (lignes 962-1201)

**Fonction** : `finalizeCheckinDepart()`

**Étapes** :
1. Sauvegarde Step 7 (signatures)
2. Création snapshot légal
3. **Changement statut → "completed"** (ligne 1059)
4. Génération PDF (non-bloquant)

**Problème** : Si le workflow n8n utilise un webhook DB, le changement de statut déclenche le webhook, mais si plusieurs UPDATE ont été faits juste avant, le webhook peut être appelé plusieurs fois.

## 🎯 Cause probable

**Hypothèse #1 (la plus probable)** : **Webhook DB Supabase déclenché à chaque UPDATE**

Le workflow n8n est configuré avec un **webhook Supabase Database** qui se déclenche à chaque `UPDATE` sur `checkin_depart`, même si :
- Le statut ne change pas
- Le statut passe de "draft" à "completed"

**Pourquoi 6 fois ?**
- 6 photos uploadées en Step 3 → 6 appels à `saveStep3ZoneDraft()` → 6 UPDATE
- Chaque UPDATE déclenche le webhook
- Quand le statut passe à "completed", le webhook est appelé 6 fois (une fois par UPDATE précédent)

**Hypothèse #2** : **Double submit côté front**

Le bouton "Finaliser" est cliqué plusieurs fois (double-click, retry, etc.), mais cela semble moins probable car `finalizeCheckinDepart()` est appelé une seule fois.

**Hypothèse #3** : **Retries automatiques n8n**

Le workflow n8n fait des retries automatiques si l'email échoue, mais cela ne devrait pas arriver 6 fois de suite.

## 🔧 Fix proposé

### Fix #1 : Idempotence dans le workflow n8n (OBLIGATOIRE)

**Fichier** : Workflow n8n (à modifier dans l'interface n8n)

**Modification** : Ajouter une vérification d'idempotence AVANT d'envoyer l'email :

```sql
-- Dans le workflow n8n, AVANT d'envoyer l'email :
UPDATE checkin_depart
SET edl_email_sent_status = 'sending'  -- Marquer comme "en cours"
WHERE id = :checkin_id
  AND (edl_email_sent_at IS NULL OR edl_email_sent_at < validated_at)
  AND (edl_email_sent_status IS NULL OR edl_email_sent_status != 'sending')
RETURNING id;
```

Si `RETURNING id` est vide, l'email a déjà été envoyé ou est en cours d'envoi → **skip**.

### Fix #2 : Filtrer les webhooks DB (si webhook utilisé)

**Configuration Supabase Database Webhook** :

Si le workflow n8n utilise un webhook DB, configurer le filtre pour ne déclencher QUE sur :
- `status = 'completed'` (changement de statut)
- `legal_pdf_url IS NOT NULL` (PDF disponible)

**Configuration webhook** :
```json
{
  "table": "checkin_depart",
  "events": ["UPDATE"],
  "filter": {
    "status": "completed",
    "legal_pdf_url": { "$ne": null }
  }
}
```

### Fix #3 : Utiliser un cron au lieu d'un webhook (RECOMMANDÉ)

**Avantage** : Le cron interroge la DB toutes les 10 minutes et ne déclenche l'email que si :
- `status = 'completed'`
- `legal_pdf_url IS NOT NULL`
- `edl_email_sent_at IS NULL` (ou `edl_email_sent_at < validated_at`)

**Inconvénient** : Délai jusqu'à 10 minutes (acceptable pour un email non-critique).

### Fix #4 : Réduire les UPDATE en Step 3 (OPTIONNEL)

**Fichier** : `src/components/ExteriorInspectionAccordionSimple.tsx`

**Modification** : Ne pas appeler `saveStep3ZoneDraft()` après chaque upload, mais seulement :
- Quand l'utilisateur change de zone
- Quand l'utilisateur clique sur "Suivant"
- Avec un debounce (ex: 2 secondes)

**Impact** : Réduit le nombre d'UPDATE de 6 à 1-2, mais ne résout pas le problème si le webhook est mal configuré.

## 📝 Instrumentation (preuve)

### Ajouter des logs dans `finalizeCheckinDepart()`

**Fichier** : `src/services/checkinDepartService.ts`

**Ligne** : Après ligne 1062 (après `updateCheckinStatus`)

```typescript
// ⭐ Instrumentation : Log pour tracer les déclenchements
const correlationId = `${params.checkinId}_${Date.now()}`;
console.log(`[CHECKIN_SERVICE] 📧 Email trigger correlationId=${correlationId}`, {
  checkinId: params.checkinId,
  bookingId: params.bookingId,
  status: finalizedCheckin.status,
  timestamp: new Date().toISOString(),
  stack: new Error().stack?.split('\n').slice(0, 5).join('\n'),
});
```

### Ajouter des logs dans le workflow n8n

Dans le workflow n8n, ajouter un node "Set" qui log :
- `checkin_id`
- `correlation_id` (timestamp)
- `reason` (cron / webhook)
- `status` (completed / draft)

## ✅ Fix minimal recommandé

**Priorité 1** : **Idempotence dans le workflow n8n**

1. Avant d'envoyer l'email, vérifier si `edl_email_sent_at` est récent (< 5 minutes)
2. Si oui, skip l'envoi
3. Marquer comme "sending" pendant l'envoi pour éviter les doubles

**Priorité 2** : **Vérifier la configuration du webhook n8n**

1. Si webhook DB utilisé, vérifier qu'il filtre sur `status = 'completed'`
2. Sinon, passer à un cron (plus sûr)

**Priorité 3** : **Migration SQL idempotence** (déjà prévue dans `WORKFLOW-N8N-EDL-AUTO-EMAIL.md`)

Appliquer la migration SQL pour ajouter les colonnes :
- `edl_email_sent_at`
- `edl_email_sent_status`
- `edl_email_retry_count`
- `edl_email_last_error`

## 🚀 Prochaines étapes

1. **Vérifier la configuration n8n** : Webhook DB ou Cron ?
2. **Appliquer la migration SQL** (si pas déjà fait)
3. **Ajouter l'idempotence** dans le workflow n8n
4. **Tester** avec un check-in de test
5. **Monitorer** les logs pour confirmer la cause

---

**Date** : 2025-01-XX  
**Version** : 1.0

