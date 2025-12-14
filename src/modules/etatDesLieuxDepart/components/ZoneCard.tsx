"use client";

import React, { useRef } from "react";
import { Camera } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ZoneCardProps = {
  stepNumber: number;
  title: string;
  subtitle: string;
  photosValue: string[];
  onPhotosChange: (next: string[]) => void;
  degatPresentValue: boolean | null;
  onDegatPresentChange: (val: boolean) => void;
  degatDescriptionValue?: string;
  onDegatDescriptionChange?: (val: string) => void;
  degatPhotosValue?: string[];
  onDegatPhotosChange?: (next: string[]) => void;
  janteAvLabel?: string;
  janteAvValue?: string[];
  onJanteAvChange?: (next: string[]) => void;
  janteArLabel?: string;
  janteArValue?: string[];
  onJanteArChange?: (next: string[]) => void;
};

export function ZoneCard({
  stepNumber,
  title,
  subtitle,
  photosValue,
  onPhotosChange,
  degatPresentValue,
  onDegatPresentChange,
  degatDescriptionValue,
  onDegatDescriptionChange,
  degatPhotosValue,
  onDegatPhotosChange,
  janteAvLabel,
  janteAvValue,
  onJanteAvChange,
  janteArLabel,
  janteArValue,
  onJanteArChange,
}: ZoneCardProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const degatPhotoInputRef = useRef<HTMLInputElement>(null);
  const janteAvInputRef = useRef<HTMLInputElement>(null);
  const janteArInputRef = useRef<HTMLInputElement>(null);

  // Helper pour convertir un fichier en base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      newPhotos.push(b64);
    }
    onPhotosChange([...photosValue, ...newPhotos]);
    if (e.target) e.target.value = "";
  };

  const handleDegatPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      newPhotos.push(b64);
    }
    onDegatPhotosChange?.([...(degatPhotosValue || []), ...newPhotos]);
    if (e.target) e.target.value = "";
  };

  const handleJanteAvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      newPhotos.push(b64);
    }
    onJanteAvChange?.([...(janteAvValue || []), ...newPhotos]);
    if (e.target) e.target.value = "";
  };

  const handleJanteArChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      newPhotos.push(b64);
    }
    onJanteArChange?.([...(janteArValue || []), ...newPhotos]);
    if (e.target) e.target.value = "";
  };

  return (
    <section className="relative bg-white shadow-sm border border-gray-200 rounded-xl p-5 flex flex-col gap-5">
      {/* Header étape */}
      <header className="flex items-start gap-3">
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold leading-none shrink-0">
          {stepNumber}
        </div>
        <div className="flex flex-col">
          <h3 className="text-base font-semibold text-gray-900">
            {title}
          </h3>
          <p className="text-sm text-gray-600">
            {subtitle}
          </p>
        </div>
      </header>

      {/* Zone photo principale */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-900">
          Photo de la zone
        </label>
        <p className="text-xs text-gray-500">
          Prends une photo générale de cette zone du véhicule.
        </p>
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 py-3 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Camera className="w-4 h-4 text-gray-600" />
          <span>Prendre une photo</span>
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handlePhotoChange}
        />
        <p className="text-xs text-gray-500">
          {photosValue.length === 0
            ? "Aucune photo pour l'instant. Elle s'affichera ici."
            : `${photosValue.length} photo(s) ajoutée(s).`}
        </p>
        {photosValue.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {photosValue.map((img, idx) => (
              <div
                key={idx}
                className="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200"
              >
                <img
                  src={img}
                  alt={`Zone ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Séparateur */}
      <div className="border-t border-gray-200 pt-4 flex flex-col gap-4">
        {/* Dégât visible ? */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">
            Dégât visible ?
          </label>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => onDegatPresentChange(true)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                degatPresentValue === true
                  ? "bg-red-100 border-red-400 text-red-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              Oui, il y a un dégât
            </button>
            <button
              type="button"
              onClick={() => onDegatPresentChange(false)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                degatPresentValue === false
                  ? "bg-green-100 border-green-400 text-green-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              Non, tout est OK
            </button>
          </div>
        </div>

        {/* Bloc dégât détaillé */}
        {degatPresentValue === true && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-4 transition-opacity duration-200">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900">
                Décris le dégât
              </label>
              <Textarea
                className="w-full rounded border border-gray-300 text-sm p-2 bg-white min-h-[80px]"
                placeholder="Rayure aile droite, bosse pare-chocs, etc."
                value={degatDescriptionValue ?? ""}
                onChange={(e) => onDegatDescriptionChange?.(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900">
                Photo(s) du dégât
              </label>
              <button
                type="button"
                onClick={() => degatPhotoInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-white py-2 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-4 h-4 text-gray-600" />
                <span>Prendre une photo du dégât</span>
              </button>
              <input
                ref={degatPhotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleDegatPhotoChange}
              />
              <p className="text-xs text-gray-600">
                {degatPhotosValue && degatPhotosValue.length > 0
                  ? `${degatPhotosValue.length} photo(s) ajoutée(s).`
                  : "Ajoute des gros plans du dégât pour documenter précisément."}
              </p>
              {degatPhotosValue && degatPhotosValue.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {degatPhotosValue.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative h-24 w-full overflow-hidden rounded-lg border border-red-200"
                    >
                      <img
                        src={img}
                        alt={`Dégât ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bloc jantes pour les côtés */}
      {(janteAvLabel || janteArLabel) && (
        <div className="border-t border-gray-200 pt-4 flex flex-col gap-4">
          {janteAvLabel && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900">
                {janteAvLabel}
              </label>
              <button
                type="button"
                onClick={() => janteAvInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Camera className="w-4 h-4 text-gray-600" />
                <span>Prendre une photo</span>
              </button>
              <input
                ref={janteAvInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleJanteAvChange}
              />
              <p className="text-xs text-gray-500">
                {janteAvValue && janteAvValue.length > 0
                  ? `${janteAvValue.length} photo(s) ajoutée(s).`
                  : "Zoome sur la jante avant."}
              </p>
              {janteAvValue && janteAvValue.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {janteAvValue.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200"
                    >
                      <img
                        src={img}
                        alt={`Jante avant ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {janteArLabel && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900">
                {janteArLabel}
              </label>
              <button
                type="button"
                onClick={() => janteArInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Camera className="w-4 h-4 text-gray-600" />
                <span>Prendre une photo</span>
              </button>
              <input
                ref={janteArInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleJanteArChange}
              />
              <p className="text-xs text-gray-500">
                {janteArValue && janteArValue.length > 0
                  ? `${janteArValue.length} photo(s) ajoutée(s).`
                  : "Zoome sur la jante arrière."}
              </p>
              {janteArValue && janteArValue.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {janteArValue.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200"
                    >
                      <img
                        src={img}
                        alt={`Jante arrière ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
