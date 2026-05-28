import { Link, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Download, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/features/back-office/components/MoneyInput";
import { useCancelSale, useSale } from "@/features/back-office/hooks/useSales";

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: sale, isLoading, refetch } = useSale(id);
  const cancelSale = useCancelSale();

  if (isLoading || !sale) return <PageLoader />;

  const lines = (sale.sale_lines ?? []) as Array<{
    id: string;
    quantity: number;
    unit_sale_price: number;
    line_total: number;
    line_margin: number;
    parts: { sku: string; name: string } | null;
  }>;

  const generateReceipt = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reçu — Rentanoo Nosy Be", 20, 20);
    doc.setFontSize(10);
    doc.text(`N° ${sale.id.slice(0, 8).toUpperCase()}`, 20, 30);
    doc.text(`Date: ${new Date(sale.sale_date).toLocaleString("fr-FR")}`, 20, 38);
    doc.text(`Client: ${sale.customer_name ?? "Comptoir"}`, 20, 46);

    let y = 58;
    lines.forEach((l) => {
      doc.text(
        `${l.parts?.sku ?? ""} x${l.quantity} — ${formatMoney(l.line_total)}`,
        20,
        y
      );
      y += 8;
    });

    y += 4;
    doc.text(`Total: ${formatMoney(sale.total_amount)}`, 20, y);
    doc.text(`Marge: ${formatMoney(sale.margin_total)}`, 20, y + 8);
    doc.save(`recu-${sale.id.slice(0, 8)}.pdf`);
  };

  const handleCancel = async () => {
    if (!id || !confirm("Annuler cette vente et restaurer le stock ?")) return;
    try {
      await cancelSale.mutateAsync(id);
      toast({ title: "Vente annulée" });
      refetch();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Vente #{sale.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(sale.sale_date).toLocaleString("fr-FR")} — {sale.customer_name ?? "Comptoir"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateReceipt}>
            <Download className="h-4 w-4 mr-1" />
            Reçu PDF
          </Button>
          {!sale.cancelled_at && (
            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelSale.isPending}>
              <XCircle className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(sale.total_amount)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Marge</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(sale.margin_total)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Payé</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(sale.amount_paid)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lignes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pièce</TableHead>
                <TableHead>Qté</TableHead>
                <TableHead>Prix unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Marge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.parts ? `${l.parts.sku} — ${l.parts.name}` : "—"}</TableCell>
                  <TableCell>{l.quantity}</TableCell>
                  <TableCell>{formatMoney(l.unit_sale_price)}</TableCell>
                  <TableCell>{formatMoney(l.line_total)}</TableCell>
                  <TableCell>{formatMoney(l.line_margin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button variant="link" asChild className="px-0">
        <Link to="/admin/sales">Retour aux ventes</Link>
      </Button>
    </div>
  );
}
