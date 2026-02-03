import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";

// ⭐ Configuration de compression pour état des lieux
const COMPRESSION = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.72,
  maxSizeMB: 0.3,
};

type PhotoCaptureFieldProps = {
  label: string;
  description?: string;
  value: string | string[] | null;
  onChange?: (val: string | string[]) => void; // ⭐ Optionnel si onFileChange est fourni
  onFileChange?: (files: File[]) => void; // ⭐ NOUVEAU : callback optionnel pour File[] (évite base64 ping-pong)
  multiple?: boolean;
  className?: string;
};

export function PhotoCaptureField({
  label,
  description,
  value,
  onChange,
  onFileChange,
  multiple = false,
  className,
}: PhotoCaptureFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // helper base64
    const fileToBase64 = async (file: File): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    // ⭐ mini-concurrency limiter (évite de saturer la mémoire sur mobile)
    const mapLimit = async <T, R>(
      items: T[],
      limit: number,
      fn: (item: T, idx: number) => Promise<R>
    ): Promise<R[]> => {
      const results: R[] = new Array(items.length);
      let nextIndex = 0;
      const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (true) {
          const i = nextIndex++;
          if (i >= items.length) break;
          results[i] = await fn(items[i], i);
        }
      });
      await Promise.all(workers);
      return results;
    };

    try {
      if (multiple) {
        const list = Array.from(files);
        const compressedFiles = await mapLimit(list, 2, async (f) => {
          try {
            return await compressImage(f, COMPRESSION);
          } catch (error) {
            console.warn("[PhotoCaptureField] Erreur compression, utilisation fichier original:", error);
            return f; // Fallback : utiliser le fichier original
          }
        });
        
        // ⭐ Si onFileChange fourni, renvoyer File[] directement (évite base64 ping-pong)
        if (onFileChange) {
          onFileChange(compressedFiles);
        } else if (onChange) {
          // Sinon, convertir en base64 (comportement par défaut)
          const base64s = await Promise.all(compressedFiles.map(fileToBase64));
          onChange(base64s);
        }
      } else {
        let compressed: File;
        try {
          compressed = await compressImage(files[0], COMPRESSION);
        } catch (error) {
          console.warn("[PhotoCaptureField] Erreur compression, utilisation fichier original:", error);
          compressed = files[0]; // Fallback : utiliser le fichier original
        }
        
        // ⭐ Si onFileChange fourni, renvoyer File[] directement
        if (onFileChange) {
          onFileChange([compressed]);
        } else if (onChange) {
          // Sinon, convertir en base64 (comportement par défaut)
          const b64 = await fileToBase64(compressed);
          onChange(b64);
        }
      }
    } catch (error) {
      console.error("[PhotoCaptureField] Erreur capture photo:", error);
    } finally {
      // Permet de re-sélectionner le même fichier (mobile)
      e.target.value = "";
    }
  }

  // pour l'aperçu, on affiche soit une seule image, soit une grille si c'est multiple
  function renderPreview() {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return (
        <p className="text-xs text-muted-foreground mt-2">
          Aucune photo pour l'instant. Elle s'affichera ici.
        </p>
      );
    }

    if (!Array.isArray(value)) {
      return (
        <div className="relative mt-2 h-32 w-full max-w-xs overflow-hidden rounded-lg border border-border">
          <img
            src={value}
            alt="aperçu"
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    return (
      <div className="mt-2 grid grid-cols-3 gap-2">
        {value.map((img, idx) => (
          <div
            key={idx}
            className="relative h-24 w-full overflow-hidden rounded-lg border border-border"
          >
            <img
              src={img}
              alt={`aperçu ${idx + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-2"
      >
        <Camera className="h-4 w-4" />
        Prendre une photo
      </Button>

      {renderPreview()}

      {/* input natif caché mais accessible pour mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        multiple={multiple}
        onChange={handleFileChange}
      />
    </div>
  );
}











