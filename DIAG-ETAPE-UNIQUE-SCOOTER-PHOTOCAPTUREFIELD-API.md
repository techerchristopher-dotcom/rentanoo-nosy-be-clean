# ÉTAPE UNIQUE — Nom exact de l'API utilisée par l'état des lieux SCOOTER (PhotoCaptureField)

## 1) Pages EDL SCOOTER utilisant PhotoCaptureField

| Fichier | Rôle | PhotoCaptureField |
|---------|------|-------------------|
| `src/modules/etatDesLieuxDepartMoto/sections/Section1IdentificationMoto.tsx` | Identification (permis recto/verso) | ✅ 2 instances (recto, verso) |
| `src/modules/etatDesLieuxDepartMoto/sections/Section2RelevesMoto.tsx` | Relevés (dashboard) | ✅ via wrapper → `Section2Releves` |
| `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx` | Retour — relevés dashboard | ✅ 1 instance |
| `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` | Retour — extérieur | ✅ par zone |
| `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` | Retour — intérieur | ✅ (masqué si `vehicleType === "moto"`) |

**Note** : Section3ExterieurMoto et Section5AccessoiresMoto utilisent un `<input type="file">` natif, pas PhotoCaptureField.

---

## 2) Chaîne d'appel complète (permis recto — Section1IdentificationMoto)

```
PhotoCaptureField (onChange)
  └─ handleFileChange (L40)           [src/components/ui/PhotoCaptureField.tsx]
       └─ compressImage(files[0], COMPRESSION)   [src/utils/imageCompression.ts]
       └─ fileToBase64(compressed)
       └─ onChange(b64)

handleUploadPermisRecto (L67)          [src/modules/etatDesLieuxDepartMoto/sections/Section1IdentificationMoto.tsx]
  └─ base64ToFile(base64, ...)
  └─ CheckinPhotoService.uploadLicenseRecto(file, bookingId, bookingReferenceNumber)

CheckinPhotoService.uploadLicenseRecto (L264)   [src/services/supabase/checkinPhotos.ts]
  └─ this.uploadCheckinPhoto({ file, subfolder: 'documents', bddColumnName: 'photo_permis_recto' })

uploadCheckinPhoto (L47, privé)        [src/services/supabase/checkinPhotos.ts]
  └─ compressForUpload(file)           [src/utils/compressForUpload.ts]
       └─ compressImage (2 passes, garde-fou 500KB)
  └─ supabase.storage.from('checkin-photos').upload(storagePath, fileToUpload, opts)
```

### Noms exacts

| Étape | Fichier | Fonction/Méthode |
|-------|---------|------------------|
| 1 | `src/components/ui/PhotoCaptureField.tsx` | `handleFileChange` |
| 2 | `src/utils/imageCompression.ts` | `compressImage` |
| 3 | `src/modules/etatDesLieuxDepartMoto/sections/Section1IdentificationMoto.tsx` | `handleUploadPermisRecto` |
| 4 | `src/services/supabase/checkinPhotos.ts` | `CheckinPhotoService.uploadLicenseRecto` |
| 5 | `src/services/supabase/checkinPhotos.ts` | `CheckinPhotoService.uploadCheckinPhoto` (privé) |
| 6 | `src/utils/compressForUpload.ts` | `compressForUpload` |
| 7 | Supabase client | `supabase.storage.from('checkin-photos').upload(...)` |

---

## 3) Identification de l'"API"

**Ce n'est pas une API HTTP.** Il s'agit du **Supabase Storage SDK** côté client.

- Pas de `fetch` ni d’URL d’endpoint classique.
- Appel direct : `supabase.storage.from('checkin-photos').upload(path, file, options)`
- Service interne : `CheckinPhotoService` (`src/services/supabase/checkinPhotos.ts`)

**Pourquoi ce n’est pas HTTP** : le client Supabase appelle directement l’API Storage de Supabase à partir du navigateur (avec l’URL configurée via `VITE_SUPABASE_URL`).

---

## 4) Localisation de la compression

### Compression 1 — dans PhotoCaptureField (avant base64)

| Fichier | Ligne | Paramètres |
|---------|-------|------------|
| `src/components/ui/PhotoCaptureField.tsx` | 8–14, 95 | `COMPRESSION` |

```ts
const COMPRESSION = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.72,
  maxSizeMB: 0.3,
};
```

### Compression 2 — dans CheckinPhotoService (avant upload)

| Fichier | Ligne | Paramètres |
|---------|-------|------------|
| `src/utils/compressForUpload.ts` | 14–26, 33–38 | Passe 1 + Passe 2 + garde-fou |

- **Passe 1** : maxWidth 1280, maxHeight 1280, quality 0.72, maxSizeMB 0.3  
- **Passe 2** (si > 350 KB) : maxWidth 1024, maxHeight 1024, quality 0.65, maxSizeMB 0.25  
- **Garde-fou** : rejet si > 500 KB (retour `null`)

---

## 5) Extraits de code

### A) PhotoCaptureField transmet le fichier/base64

```ts
// src/modules/etatDesLieuxDepartMoto/sections/Section1IdentificationMoto.tsx L294-304
<PhotoCaptureField
  label="Photo du permis (recto)"
  description={...}
  value={watch("conducteur.driver_license_photos_recto") || null}
  onChange={handleUploadPermisRecto}
  multiple={false}
/>
```

PhotoCaptureField appelle `onChange(b64)` avec une chaîne base64. Le parent convertit ensuite en `File` et appelle le service.

### B) Compression + upload

```ts
// src/services/supabase/checkinPhotos.ts L77-88, 142-148
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

---

## Résumé

- **Service utilisé** : `CheckinPhotoService.uploadLicenseRecto` / `uploadLicenseVerso`
- **Pas d’API HTTP** : usage du Supabase Storage SDK
- **Compression** : une fois dans PhotoCaptureField (compressImage), une fois dans CheckinPhotoService (compressForUpload)
- **Stockage** : bucket `checkin-photos`, chemins `resa_<N>/documents/photo_permis_recto_<N>_<ts>_<uuid>.jpg`
