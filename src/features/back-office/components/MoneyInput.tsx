import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  value: number | string;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function MoneyInput({ value, onChange, className, placeholder, disabled }: MoneyInputProps) {
  return (
    <div className="relative">
      <Input
        type="number"
        min={0}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn("pr-8", className)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
    </div>
  );
}

export function formatMoney(amount: number | null | undefined): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount ?? 0);
}
