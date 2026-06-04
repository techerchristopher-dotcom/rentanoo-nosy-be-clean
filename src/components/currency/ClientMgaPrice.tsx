import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { cn } from "@/lib/utils";

type ClientMgaPriceProps = {
  /** Montant de référence en ariary (MGA). */
  amountMga: number;
  prefix?: string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  secondarySuffix?: string;
};

/** Affichage client : € (principal) + Ar fixe (secondaire), comme les cartes accueil. */
export function ClientMgaPrice({
  amountMga,
  prefix = "",
  className,
  primaryClassName = "font-bold tabular-nums leading-none text-primary text-lg",
  secondaryClassName = "mt-0.5 text-xs tabular-nums text-muted-foreground",
  secondarySuffix = "",
}: ClientMgaPriceProps) {
  const { formatClient } = useExchangeRate();
  const { primary, secondary } = formatClient(amountMga);

  return (
    <div className={cn("flex flex-col items-end text-right", className)}>
      <span className={primaryClassName}>
        {prefix}
        {primary}
      </span>
      <span className={secondaryClassName}>
        {secondary}
        {secondarySuffix}
      </span>
    </div>
  );
}
