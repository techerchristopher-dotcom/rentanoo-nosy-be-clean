import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DualPrice } from "@/components/currency/DualPrice";
import { AdminPriceRow } from "@/components/currency/PriceRows";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import type { BookingFinancials } from "../utils/bookingFinancials";

type BookingFinancialCardProps = {
  financials: BookingFinancials;
  isAdminPricing: boolean;
};

function AdminAmount({ amountMga, bold }: { amountMga: number; bold?: boolean }) {
  return (
    <DualPrice
      amountMga={amountMga}
      variant="admin"
      className="items-end text-right shrink-0"
      primaryClassName={bold ? "font-bold text-base tabular-nums" : "font-medium tabular-nums"}
      secondaryClassName="text-xs"
    />
  );
}

export function BookingFinancialCard({ financials, isAdminPricing }: BookingFinancialCardProps) {
  const { footnote } = useExchangeRate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail financier</CardTitle>
        <p className="text-xs text-muted-foreground">{footnote}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <AdminPriceRow label="Prix de location" amountMga={financials.basePrice} />

          {financials.options.length > 0 ? (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <div className="text-muted-foreground">Options</div>
              <ul className="space-y-1.5">
                {financials.options.map((option, index) => (
                  <li
                    key={option.raw?.id ?? `${option.name}-${index}`}
                    className="flex justify-between gap-4 pl-2 items-start"
                  >
                    <span>{option.name}</span>
                    <AdminAmount amountMga={option.totalPrice} />
                  </li>
                ))}
              </ul>
              <AdminPriceRow
                label="Total options"
                amountMga={financials.optionsTotal}
                className="border-t border-border/40 pt-2"
              />
            </div>
          ) : (
            <div className="flex justify-between gap-4 border-t border-border/60 pt-3">
              <span className="text-muted-foreground">Options</span>
              <span className="text-muted-foreground">Aucune</span>
            </div>
          )}

          <AdminPriceRow
            label="Sous-total"
            amountMga={financials.subtotal}
            className="border-t border-border/60 pt-3"
          />

          <div className="flex justify-between gap-4 items-start">
            <span className="text-muted-foreground">
              {isAdminPricing ? "Frais de service plateforme" : "Frais de service (15 %)"}
            </span>
            {isAdminPricing ? (
              <span className="font-medium">—</span>
            ) : (
              <AdminAmount amountMga={financials.serviceFee} />
            )}
          </div>

          <AdminPriceRow
            label={<span className="font-semibold">Total TTC locataire</span>}
            amountMga={financials.totalTTC}
            bold
            className="border-t border-border pt-3"
          />
        </div>
      </CardContent>
    </Card>
  );
}
