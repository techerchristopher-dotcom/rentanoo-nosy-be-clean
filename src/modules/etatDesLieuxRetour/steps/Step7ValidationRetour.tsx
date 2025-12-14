import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, CheckCircle2, AlertCircle } from "lucide-react";

interface StepProps {
  departData: any;
  returnData: any;
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
  checkinReturnStatus?: string;
  bookingData?: { startDate?: string; endDate?: string; startTime?: string; endTime?: string };
}

interface SignatureCanvasProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label: string;
  id?: string;
  className?: string;
}

function SignatureCanvas({ value, onChange, label, id, className }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#065F6B";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange("");
  };

  return (
    <div className={`space-y-2 ${className || ""}`} id={id}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs sm:text-sm font-medium text-gray-900">{label}</div>
        {hasSignature && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Effacer</span>
          </Button>
        )}
      </div>
      <div className="border-2 border-dashed border-muted rounded-lg p-2 sm:p-4 bg-muted/20">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-32 sm:h-48 border border-border rounded-lg bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
            Signez dans la zone ci-dessus
          </p>
        )}
      </div>
      {hasSignature && (
        <div className="text-xs text-gray-500">
          Signature enregistrée
        </div>
      )}
    </div>
  );
}

export default function Step7ValidationRetour({ setValue, watch, checkinReturnStatus }: StepProps) {
  // Récupération des signatures depuis RHF
  const validation = watch("returnData.step7.validation") || {};
  const ownerSignature = validation.ownerSignature || "";
  const renterSignature = validation.renterSignature || "";

  // Vérification si les signatures sont présentes
  const hasOwnerSignature = !!ownerSignature;
  const hasRenterSignature = !!renterSignature;
  const canFinalize = hasOwnerSignature && hasRenterSignature;
  const isCompleted = checkinReturnStatus === "completed";

  return (
    <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
      {/* En-tête - Typographie mobile-first */}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight sm:leading-none tracking-tight flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span className="break-words">Validation de l'état des lieux de retour</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          Vérifiez les informations de retour, puis faites signer le propriétaire et le locataire.
        </p>
      </div>

      {/* Rappel optionnel */}
      <Card className="bg-muted/30">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Les éventuels nouveaux dégâts et accessoires manquants ont été saisis aux étapes précédentes.
          </p>
        </CardContent>
      </Card>

      {/* Bloc Signature propriétaire */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Signature du propriétaire</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4">
          <SignatureCanvas
            value={ownerSignature}
            onChange={(dataUrl) => {
              setValue("returnData.step7.validation.ownerSignature", dataUrl);
              // Mettre à jour validatedAt si pas déjà défini
              const currentValidation = watch("returnData.step7.validation") || {};
              if (!currentValidation.validatedAt) {
                setValue("returnData.step7.validation.validatedAt", new Date().toISOString());
              }
            }}
            label="Signature du propriétaire"
            id="field-signature-owner"
          />
          {!hasOwnerSignature && (
            <p className="text-xs text-orange-600 mt-2">Signature requise</p>
          )}
        </CardContent>
      </Card>

      {/* Bloc Signature locataire */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Signature du locataire</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4">
          <SignatureCanvas
            value={renterSignature}
            onChange={(dataUrl) => {
              setValue("returnData.step7.validation.renterSignature", dataUrl);
              // Mettre à jour validatedAt si pas déjà défini
              const currentValidation = watch("returnData.step7.validation") || {};
              if (!currentValidation.validatedAt) {
                setValue("returnData.step7.validation.validatedAt", new Date().toISOString());
              }
            }}
            label="Signature du locataire"
            id="field-signature-renter"
          />
          {!hasRenterSignature && (
            <p className="text-xs text-orange-600 mt-2">Signature requise</p>
          )}
        </CardContent>
      </Card>

      {/* Texte de consentement */}
      <div className="border-t pt-3 sm:pt-4">
        <p className="text-xs sm:text-sm text-muted-foreground text-center leading-relaxed">
          En signant, vous confirmez l'exactitude des informations saisies dans cet état des lieux de retour.
        </p>
      </div>

      {/* Message de validation */}
      {isCompleted ? (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-green-700 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>L'état des lieux de retour a été finalisé avec succès. Un snapshot légal a été enregistré.</span>
            </p>
          </CardContent>
        </Card>
      ) : !canFinalize ? (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-orange-600 text-center flex items-center justify-center gap-2 flex-wrap">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Les deux signatures sont requises pour finaliser l'état des lieux de retour.</span>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
