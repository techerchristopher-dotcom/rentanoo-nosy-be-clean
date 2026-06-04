import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetRevenue,
  type AdminRevenueBooking,
  type AdminRevenueSummary,
} from "@/services/adminApi";
import { DualPrice } from "@/components/currency/DualPrice";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { cn } from "@/lib/utils";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtEur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function AdminRevenueAmount({ amountMga, className }: { amountMga: number; className?: string }) {
  return (
    <DualPrice
      amountMga={amountMga}
      variant="admin"
      className={cn("items-end", className)}
      primaryClassName="text-2xl font-bold tabular-nums"
      secondaryClassName="text-xs font-normal"
    />
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function paymentLabel(b: AdminRevenueBooking): string {
  if (b.offline_payment_method === "cash") return "Espèces";
  if (b.offline_payment_method === "card_terminal") return "CB (terminal)";
  if (b.stripe_payment_intent_id) return "Stripe";
  return "—";
}

export default function AdminRevenue() {
  const { toast } = useToast();
  const { footnote } = useExchangeRate();
  const today = todayYmd();

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<AdminRevenueBooking[]>([]);
  const [summary, setSummary] = useState<AdminRevenueSummary>({
    total: 0,
    totalCash: 0,
    totalCardTerminal: 0,
    totalStripe: 0,
    totalOther: 0,
  });

  const load = useCallback(
    async (from: string, to: string) => {
      setLoading(true);
      try {
        const data = await adminGetRevenue({ dateFrom: from, dateTo: to });
        setBookings(data.bookings);
        setSummary(data.summary);
      } catch (e: unknown) {
        toast({
          title: "Chargement impossible",
          description: e instanceof Error ? e.message : "Erreur",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void load(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = () => void load(dateFrom, dateTo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Encaissements</h1>
        <p className="text-muted-foreground text-sm">Récapitulatif des paiements enregistrés par période.</p>
        <p className="mt-2 text-sm">
          <Link to="/admin" className="text-primary font-medium hover:underline">
            ← Tableau de bord
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="rev-from">Du</Label>
              <Input id="rev-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rev-to">Au</Label>
              <Input id="rev-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button type="button" onClick={applyFilter} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total encaissé</CardDescription>
            <AdminRevenueAmount amountMga={summary.total} />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Espèces</CardDescription>
            <AdminRevenueAmount amountMga={summary.totalCash} className="text-emerald-700 dark:text-emerald-400" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CB (terminal)</CardDescription>
            <AdminRevenueAmount amountMga={summary.totalCardTerminal} className="text-sky-700 dark:text-sky-400" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stripe (en ligne)</CardDescription>
            <AdminRevenueAmount amountMga={summary.totalStripe} className="text-violet-700 dark:text-violet-400" />
          </CardHeader>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">{footnote}</p>

      <Card>
        <CardHeader>
          <CardTitle>Détail des encaissements</CardTitle>
          <CardDescription>
            {loading ? "Chargement…" : `${bookings.length} encaissement(s) sur la période`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">Aucun encaissement sur cette période.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Date encaissement</th>
                    <th className="pb-2 pr-4 font-medium">Réf.</th>
                    <th className="pb-2 pr-4 font-medium">Période location</th>
                    <th className="pb-2 pr-4 font-medium">Mode</th>
                    <th className="pb-2 pr-4 font-medium text-right">Montant</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(b.paid_at)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {b.reference_number != null ? `#${b.reference_number}` : b.id.slice(0, 8) + "…"}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {b.start_date} → {b.end_date}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            b.offline_payment_method === "cash" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
                            b.offline_payment_method === "card_terminal" && "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
                            b.stripe_payment_intent_id && !b.offline_payment_method && "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
                            !b.offline_payment_method && !b.stripe_payment_intent_id && "bg-muted text-muted-foreground"
                          )}
                        >
                          {paymentLabel(b)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <DualPrice amountMga={b.total_price} variant="admin" inline className="justify-end" />
                      </td>
                      <td className="py-2">
                        <Link to={`/admin/bookings/${b.id}`} className="text-primary text-xs hover:underline">
                          Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-medium">
                    <td colSpan={4} className="pt-3 text-right pr-4">Total</td>
                    <td className="pt-3 text-right pr-4">
                      <DualPrice amountMga={summary.total} variant="admin" inline />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
