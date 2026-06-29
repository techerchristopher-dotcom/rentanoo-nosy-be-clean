import { Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoWithPrimaryToggleProps {
  photoUrl: string;
  isPrimary: boolean;
  onSetPrimary: () => void;
  onDelete?: () => void;
  /** Si true, cette photo est la seule — automatiquement principale, radio non interactif */
  isOnly?: boolean;
}

export function PhotoWithPrimaryToggle({
  photoUrl,
  isPrimary,
  onSetPrimary,
  onDelete,
  isOnly = false,
}: PhotoWithPrimaryToggleProps) {
  return (
    <div className="relative group flex flex-col items-center gap-1">
      {/* Miniature */}
      <div
        className={cn(
          "relative w-20 h-20 rounded-md overflow-hidden border-2 transition-colors",
          isPrimary ? "border-primary" : "border-border"
        )}
      >
        <img
          src={photoUrl}
          alt="Photo du véhicule"
          className="w-full h-full object-cover"
        />

        {/* Badge étoile si principale */}
        {isPrimary && (
          <div className="absolute top-0.5 right-0.5 bg-primary rounded-full p-0.5">
            <Star className="w-3 h-3 text-primary-foreground fill-primary-foreground" />
          </div>
        )}

        {/* Bouton supprimer */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute top-0.5 left-0.5 bg-destructive/80 hover:bg-destructive rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3 text-white" />
          </button>
        )}
      </div>

      {/* Radio sélection principale */}
      <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
        <input
          type="radio"
          name="primaryPhoto"
          checked={isPrimary}
          onChange={onSetPrimary}
          disabled={isOnly}
          className="accent-primary"
        />
        <span className={cn(isOnly ? "text-muted-foreground" : "")}>
          {isPrimary ? "Principale" : "Définir principale"}
        </span>
      </label>
    </div>
  );
}
