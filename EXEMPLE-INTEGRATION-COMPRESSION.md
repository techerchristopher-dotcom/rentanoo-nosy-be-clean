# 📝 Exemple d'intégration de la compression d'images

Ce document montre comment intégrer la compression d'images dans `PhotoCaptureField` et les composants utilisateurs.

---

## 1. Modification de PhotoCaptureField.tsx

**Fichier** : `src/components/ui/PhotoCaptureField.tsx`

### Option A : Compression avec base64 (compatibilité maximale)

```typescript
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";  // ⭐ NOUVEAU

type PhotoCaptureFieldProps = {
  label: string;
  description?: string;
  value: string | string[] | null;
  onChange: (val: string | string[]) => void;
  multiple?: boolean;
  className?: string;
  // ⭐ NOUVEAU : Options de compression personnalisables
  compressionOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
  };
};

export function PhotoCaptureField({
  label,
  description,
  value,
  onChange,
  multiple = false,
  className,
  compressionOptions,  // ⭐ NOUVEAU
}: PhotoCaptureFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // helper base64
    async function fileToBase64(file: File): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // ⭐ NOUVEAU : Configuration de compression par défaut
    const defaultCompressionOptions = {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.85,
      maxSizeMB: 0.5,
      ...compressionOptions,  // Permet de surcharger
    };

    if (multiple) {
      const arr: string[] = [];
      for (const f of Array.from(files)) {
        try {
          // ⭐ COMPRESSION avant conversion base64
          console.log(`[PhotoCaptureField] Compression de ${(f.size / 1024).toFixed(0)}KB...`);
          const compressed = await compressImage(f, defaultCompressionOptions);
          const b64 = await fileToBase64(compressed);
          arr.push(b64);
        } catch (error) {
          console.error('[PhotoCaptureField] Erreur compression, utilisation fichier original:', error);
          // Fallback : utiliser le fichier original
          const b64 = await fileToBase64(f);
          arr.push(b64);
        }
      }
      onChange(arr);
    } else {
      try {
        // ⭐ COMPRESSION avant conversion base64
        console.log(`[PhotoCaptureField] Compression de ${(files[0].size / 1024).toFixed(0)}KB...`);
        const compressed = await compressImage(files[0], defaultCompressionOptions);
        const b64 = await fileToBase64(compressed);
        onChange(b64);
      } catch (error) {
        console.error('[PhotoCaptureField] Erreur compression, utilisation fichier original:', error);
        // Fallback : utiliser le fichier original
        const b64 = await fileToBase64(files[0]);
        onChange(b64);
      }
    }
  }

  // ... reste du code inchangé (renderPreview, return, etc.)
}
```

### Option B : Retourner File directement (plus efficace, nécessite modifications dans composants utilisateurs)

```typescript
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";  // ⭐ NOUVEAU

type PhotoCaptureFieldProps = {
  label: string;
  description?: string;
  value: File | File[] | null;  // ⭐ CHANGÉ : File au lieu de base64
  onChange: (val: File | File[]) => void;  // ⭐ CHANGÉ
  multiple?: boolean;
  className?: string;
  compressionOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
  };
};

export function PhotoCaptureField({
  label,
  description,
  value,
  onChange,
  multiple = false,
  className,
  compressionOptions,
}: PhotoCaptureFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const defaultCompressionOptions = {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.85,
      maxSizeMB: 0.5,
      ...compressionOptions,
    };

    if (multiple) {
      const compressedFiles: File[] = [];
      for (const f of Array.from(files)) {
        try {
          const compressed = await compressImage(f, defaultCompressionOptions);
          compressedFiles.push(compressed);
        } catch (error) {
          console.error('[PhotoCaptureField] Erreur compression:', error);
          compressedFiles.push(f);  // Fallback
        }
      }
      onChange(compressedFiles);
    } else {
      try {
        const compressed = await compressImage(files[0], defaultCompressionOptions);
        onChange(compressed);
      } catch (error) {
        console.error('[PhotoCaptureField] Erreur compression:', error);
        onChange(files[0]);  // Fallback
      }
    }
  }

  // ⭐ MODIFIÉ : Afficher preview depuis File
  function renderPreview() {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return (
        <p className="text-xs text-muted-foreground mt-2">
          Aucune photo pour l'instant. Elle s'affichera ici.
        </p>
      );
    }

    if (!Array.isArray(value)) {
      const previewUrl = URL.createObjectURL(value);
      return (
        <div className="relative mt-2 h-32 w-full max-w-xs overflow-hidden rounded-lg border border-border">
          <img
            src={previewUrl}
            alt="aperçu"
            className="h-full w-full object-cover"
            onLoad={() => URL.revokeObjectURL(previewUrl)}  // Nettoyer
          />
        </div>
      );
    }

    return (
      <div className="mt-2 grid grid-cols-3 gap-2">
        {value.map((file, idx) => {
          const previewUrl = URL.createObjectURL(file);
          return (
            <div
              key={idx}
              className="relative h-24 w-full overflow-hidden rounded-lg border border-border"
            >
              <img
                src={previewUrl}
                alt={`aperçu ${idx + 1}`}
                className="h-full w-full object-cover"
                onLoad={() => URL.revokeObjectURL(previewUrl)}  // Nettoyer
              />
            </div>
          );
        })}
      </div>
    );
  }

  // ... reste du code (return, etc.)
}
```

---

## 2. Modification de Section2Releves.tsx (exemple)

**Fichier** : `src/modules/etatDesLieuxDepart/sections/Section2Releves.tsx`

### Si on garde base64 (Option A) :

```typescript
// Aucune modification nécessaire, la compression est déjà dans PhotoCaptureField
// Le code existant fonctionne tel quel
```

### Si on passe à File (Option B) :

```typescript
// Modifier handleUploadDashboardPhotos
const handleUploadDashboardPhotos = async (files: File | File[]) => {
  const filesArray = Array.isArray(files) ? files : [files];
  
  if (filesArray.length === 0) {
    setValue("releves.dashboardPhotosData", [], { shouldDirty: true });
    setValue("releves.dashboardPhotos", [], { shouldDirty: true });
    return;
  }

  if (!bookingId) {
    toast({
      variant: "destructive",
      title: "❌ Erreur",
      description: "ID de réservation manquant pour l'upload",
    });
    return;
  }

  setUploadingDashboard(true);
  try {
    console.log(`[STEP2] 📸 Upload de ${filesArray.length} photo(s) dashboard...`);

    // ⭐ Upload direct depuis File (déjà compressé par PhotoCaptureField)
    const uploadPromises = filesArray.map(async (file) => {
      const { data, error } = await CheckinPhotoService.uploadDashboardPhoto(
        file,  // ⭐ File directement, pas besoin de base64ToFile
        bookingId,
        bookingReferenceNumber
      );
      
      if (error) {
        console.error('[STEP2] ❌ Erreur upload:', error);
        throw new Error(error);
      }

      console.log('[STEP2] ✅ Photo uploadée:', data!.storagePath);
      return data!;
    });

    const newPhotos = await Promise.all(uploadPromises);
    const alreadyUploaded: UploadedCheckinPhoto[] = watch("releves.dashboardPhotosData") || [];
    const allPhotos = [...alreadyUploaded, ...newPhotos];

    setValue("releves.dashboardPhotosData", allPhotos, { shouldDirty: true });
    setValue("releves.dashboardPhotos", allPhotos.map(p => p.publicUrl), { shouldDirty: true });

    toast({
      title: "📸 Photos dashboard uploadées",
      description: `${newPhotos.length} photo(s) ajoutée(s) dans checkin-photos`,
    });
  } catch (error: any) {
    console.error('[STEP2] ❌ Erreur upload:', error);
    toast({
      variant: "destructive",
      title: "❌ Erreur d'upload",
      description: error.message || "Impossible d'uploader les photos",
    });
  } finally {
    setUploadingDashboard(false);
  }
};
```

---

## 3. Modification de step3Helpers.ts (exemple)

**Fichier** : `src/modules/etatDesLieuxDepart/helpers/step3Helpers.ts`

### Si on garde base64 (Option A) :

```typescript
import { CheckinPhotoService } from '@/services/supabase/checkinPhotos';
import type { ExteriorPhoto } from '@/types/step3';
import { compressImage } from '@/utils/imageCompression';  // ⭐ NOUVEAU

export function base64ToFile(base64: string, filename: string): File {
  // ... code existant inchangé
}

export async function uploadZonePhoto(
  base64: string,
  bookingId: string,
  bookingReferenceNumber: number | null | undefined,
  zone: string
): Promise<ExteriorPhoto | null> {
  try {
    // ⭐ Compresser avant upload si nécessaire
    let file = base64ToFile(base64, `${zone}_${Date.now()}.jpg`);
    
    // Si le fichier est trop gros, le compresser
    if (file.size > 0.5 * 1024 * 1024) {  // > 500KB
      console.log(`[Step3] Compression zone ${zone} (${(file.size / 1024).toFixed(0)}KB)...`);
      file = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 0.5,
      });
    }
    
    const { data, error } = await CheckinPhotoService.uploadExteriorZonePhoto(
      file,
      bookingId,
      bookingReferenceNumber,
      zone
    );
    
    // ... reste du code inchangé
  } catch (err) {
    console.error(`[Step3] ❌ Exception upload zone ${zone}:`, err);
    return null;
  }
}
```

---

## 4. Parallélisation des uploads séquentiels

### ExteriorInspectionAccordionSimple.tsx

**Avant** (séquentiel) :
```typescript
for (const file of files) {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
  });
  const uploaded = await uploadDamagePhoto(...);
}
```

**Après** (parallèle) :
```typescript
import { compressImage } from '@/utils/imageCompression';

// Compresser toutes les images en parallèle
const compressedFiles = await Promise.all(
  files.map(file => compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    maxSizeMB: 0.5,
  }))
);

// Convertir en base64 en parallèle
const base64Promises = compressedFiles.map(file => 
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })
);
const base64Array = await Promise.all(base64Promises);

// Uploader en parallèle
const uploadPromises = base64Array.map(base64 =>
  uploadDamagePhoto(
    base64,
    bookingId,
    bookingReferenceNumber,
    damage.side,
    damage.indexGlobal
  )
);
const uploadedPhotos = await Promise.all(uploadPromises);
const successful = uploadedPhotos.filter(p => p !== null) as ExteriorPhoto[];

if (successful.length > 0) {
  updateDamage(damage.indexGlobal, "photos", [...currentPhotos, ...successful]);
  toast.success(`✅ ${successful.length} photo(s) de dégât uploadée(s)`);
}
```

---

## 5. Ajout de timeout/retry dans CheckinPhotoService

**Fichier** : `src/services/supabase/checkinPhotos.ts`

Voir le diagnostic complet (`DIAGNOSTIC-UPLOAD-PHOTOS-MOBILE-LENT.md`) pour le code complet avec timeout et retry.

---

## 📋 Checklist d'intégration

- [ ] Créer `src/utils/imageCompression.ts` ✅ (déjà fait)
- [ ] Modifier `PhotoCaptureField.tsx` pour compresser
- [ ] Tester compression sur iPhone (Safari)
- [ ] Tester compression sur Android (Chrome)
- [ ] Vérifier taille moyenne < 500KB
- [ ] Vérifier qualité visuelle acceptable
- [ ] Paralléliser uploads dans `ExteriorInspectionAccordionSimple.tsx`
- [ ] Paralléliser uploads dans `Section4Interieur.tsx`
- [ ] Ajouter timeout/retry dans `CheckinPhotoService`
- [ ] Tester sur connexion 4G réelle
- [ ] Mesurer gains (taille, temps)

---

## 🎯 Ordre d'implémentation recommandé

1. **Phase 1** : Compression dans `PhotoCaptureField` (Option A - base64 pour compatibilité)
2. **Phase 2** : Parallélisation des uploads séquentiels
3. **Phase 3** : Timeout/retry dans `CheckinPhotoService`
4. **Phase 4** (optionnel) : Migration vers File direct (Option B)

---

**Note** : L'Option A (compression avec base64) est recommandée pour commencer car elle nécessite moins de modifications dans les composants existants.

