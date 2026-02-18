# ÉTAPE 1 — DIAG "Système réduction images (État des lieux)"

## 1) Vue d’ensemble

Le système actuel comporte **deux flux distincts** :

| Flux | Où | Compression avant upload | Optimisation à l’affichage |
|------|-----|--------------------------|----------------------------|
| **État des lieux (EDL)** | checkin-photos | ✅ Oui (client) | ❌ Non (URL object/public) |
| **Photos véhicules** | vehicle-photos | ❌ Non | ✅ Oui (render/image à l’affichage) |

Ce diagnostic concerne uniquement le flux **état des lieux**.

---

## 2) Pipeline état des lieux (check-in photos)

```
A) SOURCE
   └─ Fichier utilisateur (File) via camera ou file picker
      └─ Section2Releves (dashboard), Section3Exterieur (zones), Section4Interieur, etc.
      └─ Composants : PhotoCaptureField, ExteriorInspectionAccordionSimple, inputs file

B) TRAITEMENT (100 % côté client / navigateur)
   └─ compressForUpload(file)  [src/utils/compressForUpload.ts]
      └─ compressImage(file, opts)  [src/utils/imageCompression.ts]
      └─ Passe 1 : maxWidth 1280, maxHeight 1280, quality 0.72, maxSizeMB 0.3
      └─ Passe 2 (si > 350KB) : maxWidth 1024, maxHeight 1024, quality 0.65, maxSizeMB 0.25
      └─ Garde-fou : si > 500KB après 2 passes → return null (pas d’upload)

C) FORMAT DE SORTIE
   └─ Format : image/jpeg (JPEG)
   └─ Qualité : 0.72 puis 0.65 si trop lourd
   └─ Dimensions max : 1280×1280 ou 1024×1024
   └─ Taille max : 500 KB (sinon null)
   └─ Pas de WebP/AVIF à l’upload (uniquement JPEG)

D) UPLOAD VERS SUPABASE
   └─ Bucket : checkin-photos
   └─ Structure : resa_<referenceNumber>/<subfolder>/<bddColumnName>_<ref>_<timestamp>_<random>.<ext>
   └─ Subfolders : depart/, retour/, documents/
   └─ Exemple : resa_8/depart/photos_dashboard_8_1730846300000_abcd1234.jpg
   └─ API : supabase.storage.from('checkin-photos').upload(path, file, opts)
   └─ Permissions : bucket public (lecture) ou RLS selon config

E) URL RETOURNÉE ET UTILISÉE
   └─ publicUrl : getPublicUrl(storagePath) → /storage/v1/object/public/checkin-photos/...
   └─ Stockage BDD : checkin_depart.releves.dashboardPhotosData[].publicUrl
   └─ Affichage : resolvePhotoUrl(photo) → retourne publicUrl ou construit via getPublicUrl
   └─ Pas de transformation à l’affichage (object/public, pas render/image)
```

---

## 3) Fichiers, fonctions et paramètres

### 3.1 Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `src/utils/compressForUpload.ts` | Compression 2 passes + garde-fou 500KB |
| `src/utils/imageCompression.ts` | Compression Canvas (resize, qualité JPEG) |
| `src/services/supabase/checkinPhotos.ts` | Service upload → CheckinPhotoService |
| `src/modules/etatDesLieuxDepart/sections/Section2Releves.tsx` | Upload dashboard |
| `src/modules/etatDesLieuxDepart/helpers/step3Helpers.ts` | uploadZonePhoto, uploadWheelPhoto, etc. |
| `src/modules/etatDesLieuxDepart/helpers/step4Helpers.ts` | Upload intérieur |
| `src/components/ExteriorInspectionAccordionSimple.tsx` | Upload zones extérieures |
| `src/modules/etatDesLieuxDepart/sections/Section1Identification.tsx` | Upload permis |
| `src/utils/resolvePhotoUrl.ts` | Résolution URL pour affichage |

### 3.2 Fonctions clés

| Fonction | Fichier | Rôle |
|----------|---------|------|
| `compressForUpload(file, onError?)` | compressForUpload.ts | Orchestration 2 passes, garde-fou |
| `compressImage(file, opts)` | imageCompression.ts | Redimensionnement + compression JPEG |
| `CheckinPhotoService.uploadCheckinPhoto(...)` | checkinPhotos.ts | Upload générique vers checkin-photos |
| `CheckinPhotoService.uploadDashboardPhoto(...)` | checkinPhotos.ts | Spécialisation dashboard |
| `CheckinPhotoService.uploadExteriorZonePhoto(...)` | checkinPhotos.ts | Zones avant/droit/arrière/gauche |
| `uploadZonePhoto(fileOrBase64, ...)` | step3Helpers.ts | Wrapper zone extérieure |
| `resolvePhotoUrl(photo)` | resolvePhotoUrl.ts | publicUrl ou getPublicUrl(storagePath) |

### 3.3 Endpoint

Pas d’API dédiée côté serveur. Utilisation directe de :

- **Supabase Storage** : `supabase.storage.from('checkin-photos').upload(path, file, opts)`
- **Méthode** : POST (SDK)
- **Body** : File (Blob)
- **Réponse** : `{ data: { path }, error }` puis `getPublicUrl(path)`

### 3.4 Paramètres d’optimisation

| Paramètre | Passe 1 | Passe 2 (si > 350KB) |
|-----------|---------|----------------------|
| maxWidth | 1280 | 1024 |
| maxHeight | 1280 | 1024 |
| quality | 0.72 | 0.65 |
| maxSizeMB | 0.3 | 0.25 |
| mimeType | image/jpeg | image/jpeg |
| Garde-fou final | — | Rejet si > 500 KB |

### 3.5 Garde-fous

| Garde-fou | Emplacement | Comportement |
|-----------|-------------|--------------|
| MIME image | checkinPhotos.ts L69-71 | `file.type.startsWith('image/')` → erreur sinon |
| Taille max 10 MB | checkinPhotos.ts L67-68, L34 | Rejet avant compression |
| Garde-fou 500 KB | compressForUpload.ts L43-52 | Retourne null si > 500 KB |
| Retry upload | checkinPhotos.ts L124-165 | MAX_RETRIES=3, TIMEOUT_MS=30000 |
| upsert: false | checkinPhotos.ts L147 | Évite écrasement accidentel |

---

## 4) Extraits de code

### 4.1 Appel compression + upload (Section2Releves)

```ts
// Section2Releves.tsx L119-155
const file = base64ToFile(base64, `dashboard_${Date.now()}.jpg`);
const { data, error } = await CheckinPhotoService.uploadDashboardPhoto(
  file,
  bookingId,
  bookingReferenceNumber
);
```

### 4.2 Compression puis upload (CheckinPhotoService)

```ts
// checkinPhotos.ts L77-88
const compressed = await compressForUpload(file, (sizeKB) => {});
if (!compressed) {
  return { data: null, error: `Photo trop lourde (${sizeKB} KB). Réessayez.` };
}
const fileToUpload = compressed;
// ...
const uploadPromise = supabase.storage
  .from(this.BUCKET_NAME)
  .upload(storagePath, fileToUpload, {
    cacheControl: '3600',
    contentType: fileToUpload.type || 'image/jpeg',
    upsert: false,
  });
```

### 4.3 Compression 2 passes (compressForUpload)

```ts
// compressForUpload.ts L28-55
let compressed = await compressImage(file, PHOTO_COMPRESSION);  // 1280, 0.72, 300KB
if (compressed.size > 350 * 1024) {
  compressed = await compressImage(compressed, PHOTO_COMPRESSION_AGGRESSIVE);  // 1024, 0.65
}
if (compressed.size > 500 * 1024) {
  if (onError) onError((compressed.size / 1024).toFixed(0));
  return null;
}
return compressed;
```

### 4.4 Upload Supabase (checkinPhotos)

```ts
// checkinPhotos.ts L142-148
const uploadPromise = supabase.storage
  .from(this.BUCKET_NAME)
  .upload(storagePath, fileToUpload, {
    cacheControl: '3600',
    contentType: fileToUpload.type || 'image/jpeg',
    upsert: false,
  });
```

---

## 5) Bilan

### Où ça s’applique

- Toutes les photos d’état des lieux (départ + retour) :
  - Dashboard (Section2Releves)
  - Zones extérieures (Section3Exterieur / ExteriorInspectionAccordionSimple)
  - Jantes, coffre, dégâts
  - Intérieur (Section4Interieur)
  - Permis (Section1Identification)
  - Documents associés

### Pourquoi ça marche

- Compression **avant** upload : 3–8 MB → 150–400 KB par photo.
- Réduction de 85–95 % sur les gros fichiers.
- Temps d’upload plus courts, surtout sur mobile.
- Pas de traitement serveur, tout est fait côté client (Canvas + `toBlob`).

### Ce qui manque pour les photos “ajout voiture”

- `PhotoService.uploadPhoto()` (`src/services/supabase/photos.ts`) :
  - Pas d’appel à `compressForUpload`.
  - Upload direct du fichier original (jusqu’à 10 MB).
- Les photos véhicules sont optimisées **uniquement à l’affichage** via `getOptimizedImageUrl()` → Supabase `render/image`.
- À l’upload, les originaux (souvent 500 KB–2 MB) sont stockés tels quels dans `vehicle-photos`.
- Conséquences : temps d’upload plus longs, stockage plus volumineux, pas de réduction à la source comme pour l’EDL.
