# 📊 Instrumentation Timings Phase 2 vs Phase 3

**Date** : 2026-02-03  
**Objectif** : Mesurer exactement où le temps est dépensé en Phase 3 vs Phase 2

---

## ✅ Instrumentation ajoutée

### 1. Niveau "upload réel" (source de vérité)

**Fichier** : `src/services/supabase/checkinPhotos.ts`

**Logs ajoutés** :
- `[UPLOAD] step=... path=... sizeKB=... type=... attempt=1 START`
- `[UPLOAD] step=... path=... sizeKB=... attempt=1 SUCCESS uploadMs=... publicUrlMs=... attemptMs=... totalMs=...`
- `[UPLOAD] step=... path=... sizeKB=... attempt=1 FAILED uploadMs=... error="..."`
- `[UPLOAD] step=... path=... sizeKB=... attempt=1 BACKOFF backoffMs=...`

**Mesures** :
- `uploadMs` : Temps réel `supabase.storage.upload()`
- `publicUrlMs` : Temps `getPublicUrl()`
- `attemptMs` : Temps total de la tentative (upload + publicUrl)
- `totalMs` : Temps total avec retries
- `backoffMs` : Délai avant retry

### 2. Niveau "handler Phase 3 extérieur"

**Fichier** : `src/components/ExteriorInspectionAccordionSimple.tsx`

**Logs ajoutés** :
- `[STEP3_EXT] photoId=... compressMs=... beforeKB=... afterKB=... uploadMs=... totalMs=...`

**Mesures** :
- `photoId` : Identifiant unique par photo (`${Date.now()}_${idx}_${zone}`)
- `compressMs` : Temps compression
- `beforeKB` / `afterKB` : Taille avant/après compression
- `uploadMs` : Temps appel helper upload (inclut upload réel + conversion si base64)
- `totalMs` : Temps total par photo

**Zones instrumentées** :
- Zones (avant/droit/arrière/gauche)
- Jantes
- Dégâts (zones et jantes)

### 3. Niveau "UI freeze"

**Fichier** : `src/components/ExteriorInspectionAccordionSimple.tsx`

**Logs ajoutés** :
- `[STEP3_EXT_UI] setValueCostMs=... zone=... photosCount=...`

**Mesures** :
- `setValueCostMs` : Temps entre `setValue()` et `requestAnimationFrame()` (coût re-render)
- Mesuré avec `requestAnimationFrame()` pour capturer le vrai coût UI

### 4. Niveau "Phase 2" (référence rapide)

**Fichier** : `src/modules/etatDesLieuxDepart/sections/Section2Releves.tsx`

**Logs ajoutés** :
- `[STEP2] photoId=... convertMs=... beforeKB=... afterKB=... uploadMs=... totalMs=...`
- `[STEP2_UI] setValueCostMs=... photosCount=...`

**Mesures** :
- `convertMs` : Temps conversion base64 → File
- `uploadMs` : Temps upload réel
- `setValueCostMs` : Coût UI (comme Phase 3)

---

## 📋 Format des logs

### Exemple Phase 3 (zones)

```
[STEP3_EXT] photoId=1736000000_0_avant compressMs=450 beforeKB=2800 afterKB=180 uploadMs=1200 totalMs=1650
[UPLOAD] step=depart path=resa_8/depart/photos_exterieur_avant_8_1736000000_abcd.jpg sizeKB=180 type=image/jpeg attempt=1 START
[UPLOAD] step=depart path=resa_8/depart/photos_exterieur_avant_8_1736000000_abcd.jpg sizeKB=180 attempt=1 SUCCESS uploadMs=1150 publicUrlMs=5 attemptMs=1155 totalMs=1155
[STEP3_EXT_UI] setValueCostMs=25 zone=avant photosCount=1
```

### Exemple Phase 2 (dashboard)

```
[STEP2] photoId=1736000000_0_dashboard convertMs=120 beforeKB=2100 afterKB=180 uploadMs=1100 totalMs=1220
[UPLOAD] step=depart path=resa_8/depart/photos_dashboard_8_1736000000_xyz.jpg sizeKB=180 type=image/jpeg attempt=1 START
[UPLOAD] step=depart path=resa_8/depart/photos_dashboard_8_1736000000_xyz.jpg sizeKB=180 attempt=1 SUCCESS uploadMs=1080 publicUrlMs=4 attemptMs=1084 totalMs=1084
[STEP2_UI] setValueCostMs=15 photosCount=1
```

---

## 🔍 Comment interpréter les résultats

### Si `uploadMs` est énorme (ex: 8000-20000ms)

**Causes possibles** :
- Réseau lent (3G/4G mobile)
- Latence Supabase Storage élevée
- Fichier encore trop gros (compression inefficace)
- Retries multiples (voir `attempt=2/3`)

**Actions** :
- Vérifier taille réelle uploadée (`sizeKB` dans logs)
- Vérifier nombre de retries (`attempt=2/3`)
- Comparer avec Phase 2 (même réseau)

### Si `compressMs` est énorme (ex: >2000ms)

**Causes possibles** :
- Compression trop lourde (images énormes)
- Problème iOS (ImageBitmap plus lent)
- Plusieurs downsizes nécessaires

**Actions** :
- Vérifier `beforeKB` (taille originale)
- Vérifier `afterKB` (taille compressée)
- Comparer avec Phase 2 (même compression)

### Si `setValueCostMs` est énorme (ex: >200ms)

**Causes possibles** :
- UI bloque (preview base64 lourde)
- Re-render massif (trop de photos)
- Watch déclenché après chaque photo

**Actions** :
- Vérifier `photosCount` (nombre de photos)
- Vérifier si preview base64 est générée
- Comparer avec Phase 2 (même nombre de photos)

### Si tu vois `attempt=2/3` souvent

**Causes possibles** :
- Erreurs intermittentes Supabase
- RLS policies bloquantes
- Collision storagePath
- Timeout réseau

**Actions** :
- Vérifier message d'erreur dans logs (`error="..."`)
- Vérifier `backoffMs` (délai avant retry)
- Comparer avec Phase 2 (même bucket/service)

---

## 📊 Tableau comparatif attendu

Après test sur mobile, compiler les moyennes :

| Métrique | Phase 2 (dashboard) | Phase 3 (extérieur) | Différence |
|----------|---------------------|---------------------|------------|
| `compressMs` | ~400ms | ~450ms | +50ms |
| `convertMs` | ~120ms | 0ms ✅ | -120ms |
| `uploadMs` (handler) | ~1100ms | ~1200ms | +100ms |
| `uploadMs` (réel) | ~1080ms | ~1150ms | +70ms |
| `totalMs` | ~1220ms | ~1650ms | +430ms |
| `setValueCostMs` | ~15ms | ~25ms | +10ms |
| Retries (oui/non) | Non | Oui (parfois) | ⚠️ |

**Interprétation** :
- Si `uploadMs` Phase 3 > Phase 2 : **réseau/storage** (pas code)
- Si `totalMs` Phase 3 >> Phase 2 : **conversion base64** (déjà fixé) ou **retries**
- Si `setValueCostMs` Phase 3 > Phase 2 : **UI freeze** (re-render)

---

## 🎯 Cause #1 identifiée

**À compléter après test** avec les logs réels.

**Hypothèses** :
1. **Réseau/storage** : Si `uploadMs` Phase 3 > Phase 2 → latence Supabase différente selon path/bucket
2. **Retries** : Si `attempt=2/3` souvent → erreurs intermittentes
3. **UI freeze** : Si `setValueCostMs` > 100ms → re-render massif

---

## ✅ Activation

**Mode DEV uniquement** : Logs activés si `NODE_ENV !== "production"`

**Test** :
1. Ouvrir console mobile (Chrome DevTools remote)
2. Uploader photos Phase 2 et Phase 3
3. Copier les logs `[STEP2]`, `[STEP3_EXT]`, `[UPLOAD]`
4. Comparer les timings

---

## 📝 Notes

- Les logs `[UPLOAD]` sont la **source de vérité** (upload réel Supabase)
- Les logs `[STEP3_EXT]` incluent conversion base64 si encore présente
- Les logs `[STEP3_EXT_UI]` mesurent le coût UI (re-render)
- `photoId` permet de suivre une photo bout en bout

