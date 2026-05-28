import { useEffect, useState } from "react";
import { ImageOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Vignette véhicule (photo principale). Cliquable pour lightbox. Fallback initiales.
 */
export function VehicleAvatar({
  src,
  brand,
  model,
  onOpen,
  size = 36,
}: {
  src: string | null;
  brand: string;
  model: string;
  onOpen?: () => void;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const initials = `${(brand ?? "")[0] ?? "?"}${(model ?? "")[0] ?? ""}`
    .toUpperCase()
    .slice(0, 2);
  const hasPhoto = !!src && !errored;

  const inner = hasPhoto ? (
    <img
      src={src!}
      alt={`${brand} ${model}`}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
      onError={() => setErrored(true)}
    />
  ) : (
    <span
      className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground font-semibold"
      style={{ fontSize: Math.max(10, Math.floor(size * 0.36)) }}
      aria-hidden
    >
      {initials || <ImageOff className="h-3.5 w-3.5" />}
    </span>
  );

  if (!hasPhoto || !onOpen) {
    return (
      <div
        className="shrink-0 rounded-md overflow-hidden border border-border bg-muted"
        style={{ width: size, height: size }}
        title={`${brand} ${model}`}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={`Agrandir la photo de ${brand} ${model}`}
      title="Agrandir la photo"
      className={cn(
        "shrink-0 rounded-md overflow-hidden border border-border bg-muted",
        "transition-all hover:ring-2 hover:ring-primary/40 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      )}
      style={{ width: size, height: size }}
    >
      {inner}
    </button>
  );
}

export function VehiclePhotoLightbox({
  src,
  brand,
  model,
  onClose,
}: {
  src: string;
  brand: string;
  model: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo de ${brand} ${model}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-5 w-5" />
      </button>
      <figure
        className="flex flex-col items-center gap-3 max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={`${brand} ${model}`}
          className="max-h-[80vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
        />
        <figcaption className="text-white/90 text-sm sm:text-base font-medium text-center">
          {brand} {model}
        </figcaption>
      </figure>
    </div>
  );
}
