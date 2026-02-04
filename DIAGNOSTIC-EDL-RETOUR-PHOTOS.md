# 🔍 DIAGNOSTIC COMPLET - EDL RETOUR - Pipeline Photos

**Date** : 2026-02-04  
**Objectif** : Cartographie EXACTE de l'existant RETOUR pour optimisation (similaire à EDL DEPART)

---

## A) CARTE DES FICHIERS RETOUR

### Structure principale

```
src/
├── pages/
│   └── checkin-return/
│       └── [bookingId].tsx                    # Point d'entrée route
│
├── modules/
│   └── etatDesLieuxRetour/
│       ├── EtatDesLieuxRetourForm.tsx         # Form principal (orchestration steps)
│       └── steps/
│           ├── Step1DepartRecap.tsx           # Pas de photos
│           ├── Step2RelevesRetour.tsx         # ✅ PHOTOS dashboard retour
│           ├── Step3ExterieurRetour.tsx       # ✅ PHOTOS dégâts extérieurs
│           ├── Step4InterieurRetour.tsx       # ✅ PHOTOS dégâts intérieurs
│           ├── Step5AccessoiresRetour.tsx     # Pas de photos
│           ├── Step6RemarquesRetour.tsx       # Pas de photos
│           └── Step7ValidationRetour.tsx      # Signatures (canvas, pas photos)
│
└── services/
    ├── supabaseCheckinReturnService.ts        # CRUD Supabase (checkin_return table)
    ├── checkinReturnService.ts                # Service métier (orchestration steps)
    ├── checkinReturnSnapshotService.ts         # Snapshot légal
    ├── checkinReturnPdfService.ts             # Génération PDF
    └── supabase/
        └── checkinPhotos.ts                   # ⭐ Service upload photos (RETOUR + DEPART)
```

### Rôles des fichiers

| Fichier | Rôle | Photos ? |
|---------|------|----------|
| `EtatDesLieuxRetourForm.tsx` | Orchestration wizard, sauvegarde steps | ❌ |
| `Step2RelevesRetour.tsx` | Relevés km/carburant + photos dashboard | ✅ |
| `Step3ExterieurRetour.tsx` | Zones extérieures + nouveaux dégâts | ✅ |
| `Step4InterieurRetour.tsx` | Intérieur + nouveaux dégâts | ✅ |
| `checkinReturnService.ts` | Sauvegarde steps (merge JSONB) | ❌ |
| `checkinPhotos.ts` | Upload vers Supabase Storage | ✅ |

---

## B) PIPELINE PHOTOS PAR TYPE

### 📸 Type 1 : Photos Dashboard Retour (Step 2)

**Fichier** : `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx`

| Étape | Détails |
|-------|---------|
| **Capture** | `<input type="file" accept="image/*">` (ligne 222-229) |
| **Format sortie** | `File` (direct depuis `event.target.files?.[0]`) |
| **Compression côté front** | ❌ **AUCUNE** - Le fichier brut est passé au service |
| **Conversion** | ❌ Aucune conversion File→base64 ou base64→File |
| **Upload** | `CheckinPhotoService.uploadReturnDashboardPhoto(file, bookingId, referenceNumber)` (ligne 91) |
| **Compression côté service** | ✅ **OUI** - `compressForUpload()` dans `checkinPhotos.ts` ligne 79 |
| **Storage bucket** | `checkin-photos` |
| **Storage path** | `resa_<N>/retour/photos_dashboard_retour_<N>_<timestamp>_<uuid>.jpg` |
| **Stockage BDD** | `checkin_return.data.step2.releves.dashboardPhotosRetour[]` (array d'objets `{storagePath, publicUrl, uploadedAt}`) |
| **Concurrence** | ❌ **SÉQUENTIEL** - Un seul upload à la fois (`handleFileSelect` ligne 76) |

**Code clé** :
```typescript
// Step2RelevesRetour.tsx ligne 76-126
const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];  // File brut, pas de compression front
  // ...
  const { data, error } = await CheckinPhotoService.uploadReturnDashboardPhoto(
    file,  // ⚠️ File brut passé directement
    bookingId,
    bookingData?.referenceNumber ?? null
  );
  // Compression se fait dans uploadReturnDashboardPhoto() → uploadCheckinPhoto() → compressForUpload()
}
```

---

### 📸 Type 2 : Photos Dégâts Extérieurs Retour (Step 3)

**Fichier** : `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`

| Étape | Détails |
|-------|---------|
| **Capture** | `<input type="file" accept="image/*">` par zone (ligne 304-313) |
| **Format sortie** | `File` (direct depuis `event.target.files?.[0]`) |
| **Compression côté front** | ❌ **AUCUNE** |
| **Conversion** | ❌ Aucune |
| **Upload** | `CheckinPhotoService.uploadReturnExteriorDamagePhoto(file, bookingId, referenceNumber, zoneKey, damageIndex)` (ligne 121) |
| **Compression côté service** | ✅ **OUI** - `compressForUpload()` dans `checkinPhotos.ts` ligne 79 |
| **Storage bucket** | `checkin-photos` |
| **Storage path** | `resa_<N>/retour/degats_exterieur_<zone>_degat<index>_<N>_<timestamp>_<uuid>.jpg` |
| **Stockage BDD** | `checkin_return.data.step3.sections.<zoneKey>.newDamages[0].photos[]` |
| **Concurrence** | ❌ **SÉQUENTIEL** - Un upload par zone, mais pas de limite globale |

**Code clé** :
```typescript
// Step3ExterieurRetour.tsx ligne 103-167
const handleFileSelect = async (zoneKey: string, event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];  // File brut
  // ...
  const { data, error } = await CheckinPhotoService.uploadReturnExteriorDamagePhoto(
    file,
    bookingId,
    bookingData?.referenceNumber ?? null,
    zoneKey,
    damageIndex  // Généralement 0 pour V1
  );
}
```

**Zones supportées** :
- **Voiture** : `avant`, `droit`, `arriere`, `gauche`, `coffre`, `janteAvDroit`, `janteArDroit`, `janteAvGauche`, `janteArGauche`
- **Moto** : `avant`, `droit`, `arriere`, `gauche`, `janteAvant`, `janteArriere`

---

### 📸 Type 3 : Photos Dégâts Intérieurs Retour (Step 4)

**Fichier** : `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx`

| Étape | Détails |
|-------|---------|
| **Capture** | `<input type="file" accept="image/*">` (ligne 294-301) |
| **Format sortie** | `File` (direct depuis `event.target.files?.[0]`) |
| **Compression côté front** | ❌ **AUCUNE** |
| **Conversion** | ❌ Aucune |
| **Upload** | `CheckinPhotoService.uploadReturnInteriorDamagePhoto(file, bookingId, referenceNumber, area)` (ligne 98) |
| **Compression côté service** | ✅ **OUI** - `compressForUpload()` dans `checkinPhotos.ts` ligne 79 |
| **Storage bucket** | `checkin-photos` |
| **Storage path** | `resa_<N>/retour/degats_interieur_<area>_<N>_<timestamp>_<uuid>.jpg` |
| **Stockage BDD** | `checkin_return.data.step4.interior.newDamages[0].photos[]` |
| **Concurrence** | ❌ **SÉQUENTIEL** - Un seul upload à la fois |

**Code clé** :
```typescript
// Step4InterieurRetour.tsx ligne 80-135
const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];  // File brut
  const area = firstDamage.area || "interieur";  // Zone intérieure (ex: "sieges", "tableau de bord")
  // ...
  const { data, error } = await CheckinPhotoService.uploadReturnInteriorDamagePhoto(
    file,
    bookingId,
    bookingData?.referenceNumber ?? null,
    area
  );
}
```

---

## C) COMPARAISON RETOUR vs DEPART

### ✅ Ce qui est identique

| Aspect | RETOUR | DEPART |
|--------|--------|--------|
| **Service upload** | `CheckinPhotoService` | `CheckinPhotoService` |
| **Compression service** | `compressForUpload()` (2 passes) | `compressForUpload()` (2 passes) |
| **Bucket Storage** | `checkin-photos` | `checkin-photos` |
| **Timeout/Retry** | ✅ 30s timeout, 3 retries | ✅ 30s timeout, 3 retries |
| **Format stockage BDD** | `{storagePath, publicUrl, uploadedAt}` | `{storagePath, publicUrl, uploadedAt}` |

### ❌ Différences critiques

| Aspect | RETOUR | DEPART |
|--------|--------|--------|
| **Composant capture** | `<input type="file">` natif | `PhotoCaptureField` |
| **Compression front** | ❌ **AUCUNE** | ✅ **OUI** (1280x1280, quality 0.72, max 300KB) |
| **Parallélisation front** | ❌ **AUCUNE** | ✅ **OUI** (`mapLimit` avec limite 2) |
| **Format circulant** | `File` direct | `File[]` via `onFileChange` (ou base64 via `onChange`) |
| **Conversion base64** | ❌ Aucune | ⚠️ Optionnelle (si `onChange` utilisé au lieu de `onFileChange`) |

### 📊 Exemple DEPART (Step 2)

**Fichier** : `src/modules/etatDesLieuxDepart/sections/Section2Releves.tsx`

```typescript
// DEPART utilise PhotoCaptureField avec compression front
<PhotoCaptureField
  label="Photos du tableau de bord"
  value={watch("releves.dashboardPhotos") || []}
  onChange={handleUploadDashboardPhotos}  // ⚠️ Reçoit base64[] ou File[] selon config
  multiple={true}
/>

// PhotoCaptureField.tsx ligne 75-82
const compressedFiles = await mapLimit(list, 2, async (f) => {
  return await compressImage(f, COMPRESSION);  // ✅ Compression front AVANT upload
});
```

---

## D) PROBLÈMES PERFORMANCE IDENTIFIÉS

### 🔴 Problème 1 : Pas de compression côté front

**Impact** : 
- Fichiers bruts (potentiellement 5-10MB) envoyés au service
- Compression uniquement côté service = latence réseau + CPU serveur
- Risque timeout si connexion lente

**Où** : 
- `Step2RelevesRetour.tsx` ligne 76
- `Step3ExterieurRetour.tsx` ligne 103
- `Step4InterieurRetour.tsx` ligne 80

**Solution** : Utiliser `PhotoCaptureField` avec `onFileChange` (comme DEPART Step 2)

---

### 🔴 Problème 2 : Uploads séquentiels (pas de parallélisation)

**Impact** :
- Si l'utilisateur ajoute 5 photos dashboard, elles s'uploadent une par une
- Temps total = somme des temps individuels
- Sur mobile (connexion lente), très pénalisant

**Où** :
- `Step2RelevesRetour.tsx` : `handleFileSelect` gère un seul fichier
- `Step3ExterieurRetour.tsx` : `handleFileSelect` gère un seul fichier par zone
- `Step4InterieurRetour.tsx` : `handleFileSelect` gère un seul fichier

**Solution** : 
- Utiliser `PhotoCaptureField` avec `multiple={true}` et `onFileChange`
- Le composant gère déjà la parallélisation avec `mapLimit(2)`

---

### 🟡 Problème 3 : Pas de limite de concurrence globale

**Impact** :
- Si l'utilisateur ouvre plusieurs zones Step3 en parallèle, uploads simultanés non contrôlés
- Risque de saturer la connexion mobile

**Où** :
- `Step3ExterieurRetour.tsx` : Chaque zone a son propre `handleFileSelect` indépendant

**Solution** :
- Utiliser un hook/service global de gestion de queue d'uploads (comme pour DEPART Step 3 optimisé)
- Ou limiter à 2 uploads simultanés max (comme `PhotoCaptureField`)

---

### ✅ Ce qui fonctionne bien

1. **Compression côté service** : `compressForUpload()` avec 2 passes (standard + agressive)
2. **Timeout/Retry** : 30s timeout, 3 retries avec backoff exponentiel
3. **Naming intelligent** : `resa_<N>/retour/...` avec référence booking
4. **Stockage BDD** : Format cohérent `{storagePath, publicUrl, uploadedAt}`

---

## E) PLAN MINIMAL DE REFACTOR

### 🎯 Objectif : Unifier via PhotoCaptureField (comme DEPART)

**Stratégie** :
1. Remplacer `<input type="file">` par `PhotoCaptureField`
2. Utiliser `onFileChange` (pas `onChange`) pour éviter base64 ping-pong
3. Conserver l'UI existante (grille photos, boutons, etc.)
4. S'assurer que `compressForUpload` reste appliqué côté service (défense en profondeur)

---

### 📝 Fichiers à modifier

#### 1. `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx`

**Actions** :
- ✅ Remplacer `<input type="file">` + `fileInputRef` par `<PhotoCaptureField>`
- ✅ Utiliser `onFileChange` pour recevoir `File[]`
- ✅ Uploader chaque `File` via `CheckinPhotoService.uploadReturnDashboardPhoto()`
- ✅ Gérer le cas `multiple={true}` (plusieurs photos en une fois)
- ✅ Conserver la grille `PhotosGrid` existante

**Code cible** :
```typescript
// AVANT (ligne 222-250)
<input ref={fileInputRef} type="file" ... />
<Button onClick={() => fileInputRef.current?.click()} />

// APRÈS
<PhotoCaptureField
  label="Photos dashboard retour"
  value={dashboardPhotosRetour.map(p => p.publicUrl)}  // Pour preview
  onFileChange={async (files: File[]) => {
    // Upload parallèle avec limite de concurrence
    const uploads = await Promise.all(
      files.map(file => 
        CheckinPhotoService.uploadReturnDashboardPhoto(file, bookingId, referenceNumber)
      )
    );
    // Mettre à jour le form state
  }}
  multiple={true}
/>
```

**Lignes à modifier** : 60-126 (fonction `handleFileSelect`), 222-250 (JSX input)

---

#### 2. `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`

**Actions** :
- ✅ Remplacer `<input type="file">` par zone par `<PhotoCaptureField>` dans chaque Card
- ✅ Utiliser `onFileChange` pour recevoir `File[]`
- ✅ Uploader via `CheckinPhotoService.uploadReturnExteriorDamagePhoto()`
- ✅ Conserver la logique de zone (`zoneKey`, `damageIndex`)

**Code cible** :
```typescript
// AVANT (ligne 304-334)
<input ref={(el) => { fileInputRefs.current[zone.key] = el; }} ... />
<Button onClick={() => fileInputRefs.current[zone.key]?.click()} />

// APRÈS (dans chaque Card zone)
<PhotoCaptureField
  label={`Photos dégât ${zone.label}`}
  value={damagePhotos.map(p => p.publicUrl)}
  onFileChange={async (files: File[]) => {
    for (const file of files) {
      const { data } = await CheckinPhotoService.uploadReturnExteriorDamagePhoto(
        file, bookingId, referenceNumber, zone.key, 0
      );
      // Mettre à jour newDamages[0].photos
    }
  }}
  multiple={true}
/>
```

**Lignes à modifier** : 94-95 (`fileInputRefs`), 103-167 (`handleFileSelect`), 304-334 (JSX input)

---

#### 3. `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx`

**Actions** :
- ✅ Remplacer `<input type="file">` par `<PhotoCaptureField>`
- ✅ Utiliser `onFileChange` pour recevoir `File[]`
- ✅ Uploader via `CheckinPhotoService.uploadReturnInteriorDamagePhoto()`

**Code cible** :
```typescript
// AVANT (ligne 294-322)
<input ref={fileInputRef} type="file" ... />
<Button onClick={() => fileInputRef.current?.click()} />

// APRÈS
<PhotoCaptureField
  label="Photos du nouveau dégât"
  value={damagePhotos.map(p => p.publicUrl)}
  onFileChange={async (files: File[]) => {
    for (const file of files) {
      const { data } = await CheckinPhotoService.uploadReturnInteriorDamagePhoto(
        file, bookingId, referenceNumber, firstDamage.area || "interieur"
      );
      // Mettre à jour newDamages[0].photos
    }
  }}
  multiple={true}
/>
```

**Lignes à modifier** : 61 (`fileInputRef`), 80-135 (`handleFileSelect`), 294-322 (JSX input)

---

### 📦 Dépendances à vérifier

| Fichier | Import nécessaire |
|---------|-------------------|
| `Step2RelevesRetour.tsx` | `import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";` |
| `Step3ExterieurRetour.tsx` | `import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";` |
| `Step4InterieurRetour.tsx` | `import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";` |

**Vérification** : `PhotoCaptureField` existe déjà et est utilisé dans DEPART ✅

---

### ⚠️ Points d'attention

1. **Compression double** : 
   - Front (`PhotoCaptureField`) : 1280x1280, quality 0.72, max 300KB
   - Service (`compressForUpload`) : 2 passes (standard + agressive)
   - ✅ **OK** : Défense en profondeur, le service re-compresse si nécessaire

2. **Format preview** :
   - `PhotoCaptureField` attend `value: string | string[]` (URLs base64 ou publiques)
   - RETOUR stocke `{storagePath, publicUrl, uploadedAt}[]`
   - ✅ **Solution** : Passer `photos.map(p => p.publicUrl)` à `value`

3. **Gestion erreurs** :
   - `PhotoCaptureField` ne gère pas les toasts d'erreur upload
   - ✅ **Solution** : Gérer les erreurs dans `onFileChange` avec `useToast()`

4. **État uploading** :
   - `PhotoCaptureField` n'a pas d'état `uploading` intégré
   - ✅ **Solution** : Ajouter un état local `uploading` dans chaque step

---

## F) CONCLUSION : PEUT-ON UNIFIER VIA PhotoCaptureField ?

### ✅ **OUI, ABSOLUMENT**

**Raisons** :
1. ✅ `PhotoCaptureField` existe déjà et fonctionne (utilisé dans DEPART)
2. ✅ Supporte `onFileChange` pour éviter base64 ping-pong
3. ✅ Compression front intégrée (1280x1280, quality 0.72)
4. ✅ Parallélisation intégrée (`mapLimit` avec limite 2)
5. ✅ Compatible avec l'UI existante (grille photos externe)

**Bénéfices attendus** :
- ⚡ **Performance** : Compression front = moins de données réseau
- ⚡ **Parallélisation** : Plusieurs photos uploadées simultanément (limite 2)
- 🔧 **Maintenance** : Une seule route de capture (évite divergences)
- 📱 **Mobile** : Meilleure expérience sur connexions lentes

**Risques** :
- ⚠️ **Compression double** : Front + Service (acceptable, défense en profondeur)
- ⚠️ **Refactor** : 3 fichiers à modifier (Step2, Step3, Step4)

**Recommandation** : ✅ **FAIRE LE REFACTOR** - Bénéfices > Risques

---

## G) RÉSUMÉ EXÉCUTIF

| Critère | État actuel RETOUR | État après refactor |
|---------|-------------------|---------------------|
| **Compression front** | ❌ Non | ✅ Oui (PhotoCaptureField) |
| **Parallélisation** | ❌ Non (séquentiel) | ✅ Oui (limite 2) |
| **Composant capture** | `<input type="file">` | `PhotoCaptureField` |
| **Compression service** | ✅ Oui (2 passes) | ✅ Oui (conservée) |
| **Timeout/Retry** | ✅ Oui (30s, 3 retries) | ✅ Oui (conservé) |
| **Fichiers à modifier** | - | 3 (Step2, Step3, Step4) |

---

## H) DIAGNOSTIC IMAGES CASSÉES (storagePath au lieu de publicUrl)

**Date** : 2026-02-04  
**Symptôme** : Icône image cassée + texte `booking_<uuid>/depa...` affiché dans les cards photos.

### 1) Composants concernés (où `src` était calculé)

| Fichier | Ligne | Section | Source des photos |
|---------|-------|---------|-------------------|
| `Step1DepartRecap.tsx` | 46-60 | PhotosGrid | `departData.step2.releves.dashboardPhotos` (EDL départ recap) |
| `Step2RelevesRetour.tsx` | 33-47 | PhotosGrid | `dashboardPhotosDepart` / `dashboardPhotosRetour` |
| `Step3ExterieurRetour.tsx` | 57-71 | PhotosGrid | `returnData.step3.sections.<zone>.newDamages[0].photos` |
| `Step4InterieurRetour.tsx` | 32-46 | PhotosGrid | `returnData.step4.interior.newDamages[0].photos` |

### 2) Logique cassée (AVANT fix)

```ts
const photoUrl = p?.publicUrl || p?.url || p?.storagePath || "";
// ...
<img src={photoUrl} ... />
```

**Problème** : Quand `publicUrl` et `url` sont absents, le fallback `storagePath` est utilisé. Un `storagePath` est un chemin relatif (ex: `resa_8/retour/photos_dashboard_retour_8_xxx.jpg`). Le navigateur tente de charger `https://rentanoo.com/resa_8/retour/...` → 404, image cassée + alt affiche le path.

### 3) Origine des données

- **departData** : `checkin_depart.data` (hydraté dans EtatDesLieuxRetourForm, merge avec colonnes SQL km/carburant). Les photos viennent de `data.step2.releves.dashboardPhotos` ou `photos_dashboard`.
- **returnData** : `checkin_return.data` (hydraté depuis `retour?.data`). Photos dans `step2.releves.dashboardPhotosRetour`, `step3.sections.<zone>.newDamages[].photos`, `step4.interior.newDamages[].photos`.
- **Cause probable** : Enregistrements historiques ou cas où seul `storagePath` est présent (sans `publicUrl`), ou mapping/normalisation qui a perdu `publicUrl`.

### 4) CheckinPhotoService

✅ **Confirmé** : Le service retourne bien `{ storagePath, publicUrl, uploadedAt }` (ligne 209-210 de `checkinPhotos.ts`). Le problème est donc dans l’hydratation/lecture depuis la DB ou dans la UI qui utilisait `storagePath` en fallback direct.

### 5) FIX APPLIQUÉ (patch minimal)

**Fichier** : `src/utils/resolvePhotoUrl.ts` (nouveau)

```ts
export function resolvePhotoUrl(photo): string {
  if (photo?.publicUrl) return photo.publicUrl;
  if (photo?.url) return photo.url;
  if (photo?.storagePath) {
    return `${VITE_SUPABASE_URL}/storage/v1/object/public/checkin-photos/${photo.storagePath}`;
  }
  return "";
}
```

**Remplacement** : Dans les 4 PhotosGrid (Step1, Step2, Step3, Step4), `photoUrl = p?.publicUrl || p?.url || p?.storagePath || ""` → `photoUrl = resolvePhotoUrl(p)`.

**Résultat** : Plus aucun `src` n’est un path relatif ; les images avec `storagePath` seul s’affichent via l’URL publique Supabase Storage.

---

**FIN DU DIAGNOSTIC**
