import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { ariaryToEur, eurToAriary, roundAriaryToThousand } from "@/utils/dualCurrency";

type OwnerDualCurrencyInputProps = {
  id: string;
  label: string;
  valueMga: string;
  onChangeMga: (value: string) => void;
  required?: boolean;
  minMga?: number;
  error?: string;
  showValidIcon?: boolean;
  arPlaceholder?: string;
  eurPlaceholder?: string;
  hint?: string;
  allowEmpty?: boolean;
};

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

export function OwnerDualCurrencyInput({
  id,
  label,
  valueMga,
  onChangeMga,
  required = false,
  minMga = 1000,
  error,
  showValidIcon = false,
  arPlaceholder = "100000",
  eurPlaceholder = "20",
  hint,
  allowEmpty = false,
}: OwnerDualCurrencyInputProps) {
  const { config, footnote } = useExchangeRate();
  const [eurDraft, setEurDraft] = useState("");
  const [eurFocused, setEurFocused] = useState(false);

  const parsedMga = parseAmount(valueMga);
  const hasMga = valueMga.trim() !== "" && !Number.isNaN(parsedMga) && parsedMga > 0;
  const computedEur =
    hasMga ? ariaryToEur(roundAriaryToThousand(parsedMga), config.rate) : 0;

  useEffect(() => {
    if (eurFocused) return;
    if (!hasMga) {
      setEurDraft("");
      return;
    }
    setEurDraft(computedEur > 0 ? String(computedEur) : "");
  }, [valueMga, computedEur, eurFocused, hasMga]);

  const handleArChange = (raw: string) => {
    onChangeMga(raw);
  };

  const handleEurChange = (raw: string) => {
    setEurDraft(raw);
    if (raw.trim() === "") {
      if (allowEmpty) onChangeMga("");
      return;
    }
    const eur = parseAmount(raw);
    if (Number.isNaN(eur) || eur <= 0) {
      if (allowEmpty) onChangeMga("");
      return;
    }
    onChangeMga(String(eurToAriary(eur, config.rate)));
  };

  const isValid =
    showValidIcon &&
    !error &&
    (allowEmpty
      ? !valueMga.trim() || (!Number.isNaN(parsedMga) && parsedMga >= minMga)
      : hasMga && parsedMga >= minMga);

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-ar`} className="flex items-center gap-2">
        {label}
        {required && " *"}
        {error ? (
          <AlertCircle className="h-4 w-4 text-red-500" />
        ) : isValid ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : null}
      </Label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-ar`} className="text-xs font-normal text-muted-foreground">
            Ariary (Ar)
          </Label>
          <Input
            id={`${id}-ar`}
            type="number"
            value={valueMga}
            onChange={(e) => handleArChange(e.target.value)}
            placeholder={arPlaceholder}
            min={minMga}
            step={1000}
            className={error ? "border-red-500 focus:border-red-500" : ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-eur`} className="text-xs font-normal text-muted-foreground">
            Euro (€)
          </Label>
          <Input
            id={`${id}-eur`}
            type="number"
            value={eurDraft}
            onChange={(e) => handleEurChange(e.target.value)}
            onFocus={() => setEurFocused(true)}
            onBlur={() => setEurFocused(false)}
            placeholder={eurPlaceholder}
            min={0}
            step={0.01}
            className={error ? "border-red-500 focus:border-red-500" : ""}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {hint ?? `Saisissez l'un ou l'autre — ${footnote}`}
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
