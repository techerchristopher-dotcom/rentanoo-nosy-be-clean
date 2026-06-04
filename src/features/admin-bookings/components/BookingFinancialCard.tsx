import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/features/back-office/components/MoneyInput";
import type { BookingFinancials } from "../utils/bookingFinancials";

type BookingFinancialCardProps = {
  financials: BookingFinancials;
  isAdminPricing: boolean;
};

export function BookingFinancialCard({ financials, isAdminPricing }: BookingFinancialCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail financier</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Prix de location</span>
            <span className="font-medium tabular-nums">{formatMoney(financials.basePrice)}</span>
          </div>

          {financials.options.length > 0 ? (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <div className="text-muted-foreground">Options</div>
              <ul className="space-y-1.5">
                {financials.options.map((option, index) => (
                  <li
                    key={option.raw?.id ?? `${option.name}-${index}`}
                    className="flex justify-between gap-4 pl-2"
                  >
                    <span>{option.name}</span>
                    <span className="font-medium tabular-nums shrink-0">{formatMoney(option.totalPrice)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between gap-4 border-t border-border/40 pt-2">
                <span className="text-muted-foreground">Total options</span>
                <span className="font-medium tabular-nums">{formatMoney(financials.optionsTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-4 border-t border-border/60 pt-3">
              <span className="text-muted-foreground">Options</span>
              <span className="text-muted-foreground">Aucune</span>
            </div>
          )}

          <div className="flex justify-between gap-4 border-t border-border/60 pt-3">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="font-medium tabular-nums">{formatMoney(financials.subtotal)}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {isAdminPricing ? "Frais de service plateforme" : "Frais de service (15 %)"}
            </span>
            <span className="font-medium tabular-nums">
              {isAdminPricing ? "—" : formatMoney(financials.serviceFee)}
            </span>
          </div>

          <div className="flex justify-between gap-4 border-t border-border pt-3">
            <span className="font-semibold">Total TTC locataire</span>
            <span className="font-bold tabular-nums text-base">{formatMoney(financials.totalTTC)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
