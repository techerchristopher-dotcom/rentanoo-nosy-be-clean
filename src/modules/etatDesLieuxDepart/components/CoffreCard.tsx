"use client";

import React, { useRef } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type CoffreCardProps = {
  stepNumber: number;
  photoCoffre: string[];
  onPhotoCoffreChange: (next: string[]) => void;
  giletTrianglePresent: boolean | null;
  onGiletTriangleChange: (val: boolean) => void;
  roueSecours: "roue" | "kit" | "aucun" | null;
  onRoueSecoursChange: (val: "roue" | "kit" | "aucun") => void;
  cableRechargePresent: "oui" | "non" | "na" | null;
  onCableRechargeChange: (val: "oui" | "non" | "na") => void;
  photosAccessoires: string[];
  onPhotosAccessoiresChange: (next: string[]) => void;
};

export function CoffreCard({
  stepNumber,
  photoCoffre,
  onPhotoCoffreChange,
  giletTrianglePresent,
  onGiletTriangleChange,
  roueSecours,
  onRoueSecoursChange,
  cableRechargePresent,
  onCableRechargeChange,
  photosAccessoires,
  onPhotosAccessoiresChange,
}: CoffreCardProps) {
  const photoCoffreInputRef = useRef<HTMLInputElement>(null);
  const photosAccessoiresInputRef = useRef<HTMLInputElement>(null);

  // Helper pour convertir un fichier en base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoCoffreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      newPhotos.push(b64);
    }
    onPhotoCoffreChange([...photoCoffre, ...newPhotos]);
    if (e.target) e.target.value = "";
  };

  const handlePhotosAccessoiresChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      newPhotos.push(b64);
    }
    onPhotosAccessoiresChange([...photosAccessoires, ...newPhotos]);
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
            Coffre & équipements
          </h3>
          <p className="text-sm text-gray-600">
            Ouvre le coffre. Prends une photo claire de l'intérieur et confirme les accessoires fournis.
          </p>
        </div>
      </header>

      {/* Photo coffre ouvert */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-900">
          Photo du coffre ouvert
        </label>
        <p className="text-xs text-gray-500">
          Prends une photo du coffre ouvert pour montrer l'état et le contenu.
        </p>
        <button
          type="button"
          onClick={() => photoCoffreInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 py-3 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Camera className="w-4 h-4 text-gray-600" />
          <span>Prendre une photo</span>
        </button>
        <input
          ref={photoCoffreInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handlePhotoCoffreChange}
        />
        <p className="text-xs text-gray-500">
          {photoCoffre.length === 0
            ? "Aucune photo pour l'instant. Elle s'affichera ici."
            : `${photoCoffre.length} photo(s) ajoutée(s).`}
        </p>
        {photoCoffre.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {photoCoffre.map((img, idx) => (
              <div
                key={idx}
                className="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200"
              >
                <img
                  src={img}
                  alt={`Coffre ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Séparateur */}
      <div className="border-t border-gray-200 pt-4 flex flex-col gap-4">
        {/* Gilet + triangle */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">
            Gilet + triangle présents ?
          </label>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => onGiletTriangleChange(true)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                giletTrianglePresent === true
                  ? "bg-green-100 border-green-400 text-green-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => onGiletTriangleChange(false)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                giletTrianglePresent === false
                  ? "bg-red-100 border-red-400 text-red-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              Non
            </button>
          </div>
        </div>

        {/* Roue / kit / aucun */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">
            Roue de secours / Kit anti-crevaison
          </label>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { val: "roue" as const, label: "Roue de secours" },
              { val: "kit" as const, label: "Kit anti-crevaison" },
              { val: "aucun" as const, label: "Aucun" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onRoueSecoursChange(opt.val)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                  roueSecours === opt.val
                    ? "bg-sky-100 border-sky-400 text-sky-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Câble recharge */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">
            Câble de recharge présent ?
          </label>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              { val: "oui" as const, label: "Oui" },
              { val: "non" as const, label: "Non" },
              { val: "na" as const, label: "N/A thermique" },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onCableRechargeChange(opt.val)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors",
                  cableRechargePresent === opt.val
                    ? "bg-emerald-100 border-emerald-400 text-emerald-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Photos accessoires */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-900">
            Photo(s) des accessoires dans le coffre
          </label>
          <p className="text-xs text-gray-500">
            Prends une photo du triangle, gilet, câble, etc. pour documenter leur présence.
          </p>
          <button
            type="button"
            onClick={() => photosAccessoiresInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 py-2 text-sm font-medium text-gray-700 hover:border-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Camera className="w-4 h-4 text-gray-600" />
            <span>Prendre une photo</span>
          </button>
          <input
            ref={photosAccessoiresInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handlePhotosAccessoiresChange}
          />
          <p className="text-xs text-gray-500">
            {photosAccessoires.length === 0
              ? "Prends une photo du triangle, gilet, câble, etc."
              : `${photosAccessoires.length} photo(s) ajoutée(s).`}
          </p>
          {photosAccessoires.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {photosAccessoires.map((img, idx) => (
                <div
                  key={idx}
                  className="relative h-24 w-full overflow-hidden rounded-lg border border-gray-200"
                >
                  <img
                    src={img}
                    alt={`Accessoire ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
