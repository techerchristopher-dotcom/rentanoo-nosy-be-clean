import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";

// ⭐ Configuration de compression pour état des lieux
const COMPRESSION = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  maxSizeMB: 0.5,
};

type PhotoCaptureFieldProps = {
  label: string;
  description?: string;
  value: string | string[] | null;
  onChange: (val: string | string[]) => void;
  multiple?: boolean;
  className?: string;
};

export function PhotoCaptureField({
  label,
  description,
  value,
  onChange,
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
    async function fileToBase64(file: File): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    if (multiple) {
      const arr: string[] = [];
      for (const f of Array.from(files)) {
        try {
          // ⭐ Compression avant conversion base64
          const compressed = await compressImage(f, COMPRESSION);
          const b64 = await fileToBase64(compressed);
          arr.push(b64);
        } catch (error) {
          console.error("[PhotoCaptureField] Erreur compression, utilisation fichier original:", error);
          // Fallback : utiliser le fichier original
          const b64 = await fileToBase64(f);
          arr.push(b64);
        }
      }
      onChange(arr);
    } else {
      try {
        // ⭐ Compression avant conversion base64
        const compressed = await compressImage(files[0], COMPRESSION);
        const b64 = await fileToBase64(compressed);
        onChange(b64);
      } catch (error) {
        console.error("[PhotoCaptureField] Erreur compression, utilisation fichier original:", error);
        // Fallback : utiliser le fichier original
        const b64 = await fileToBase64(files[0]);
        onChange(b64);
      }
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











