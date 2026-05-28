import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MoneyInput } from "@/features/back-office/components/MoneyInput";
import { useCreateSale } from "@/features/back-office/hooks/useSales";
import { searchParts } from "@/features/back-office/services/partsService";
import type { Part, SaleLineInput } from "@/features/back-office/types";

type Line = SaleLineInput & { label?: string };

export default function SaleForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createSale = useCreateSale();

  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setResults(await searchParts(q));
  };

  const addLine = (part: Part) => {
    setLines((l) => [
      ...l,
      {
        part_id: part.id,
        quantity: 1,
        unit_sale_price: part.sale_price ?? 0,
        label: `${part.sku} — ${part.name}`,
      },
    ]);
    setQuery("");
    setResults([]);
  };

  const subtotal = lines.reduce(
    (sum, l) => sum + l.quantity * (l.unit_sale_price ?? 0),
    0
  );
  const total = Math.max(subtotal - discount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast({ title: "Ajoutez au moins une pièce", variant: "destructive" });
      return;
    }

    try {
      const saleId = await createSale.mutateAsync({
        customer_name: customerName || null,
        discount,
        amount_paid: amountPaid,
        payment_method: paymentMethod as "cash",
        lines,
      });
      toast({ title: "Vente enregistrée" });
      navigate(`/admin/sales/${saleId}`);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/sales">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">Nouvelle vente comptoir</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nom client (comptoir)</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Client de passage" />
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Carte</SelectItem>
                  <SelectItem value="transfer">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant payé</Label>
              <MoneyInput value={amountPaid} onChange={setAmountPaid} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lignes de vente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={query} onChange={(e) => search(e.target.value)} placeholder="Rechercher une pièce..." />
            {results.length > 0 && (
              <ul className="border rounded-md max-h-32 overflow-y-auto">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => addLine(p)}>
                      <Plus className="inline h-3 w-3 mr-1" />
                      {p.sku} — {p.name} ({p.quantity_on_hand} stock) — {p.sale_price ?? 0}€
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm border rounded p-2">
                <span className="flex-1">{line.label}</span>
                <Input
                  type="number"
                  min={1}
                  className="w-16 h-8"
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx] = { ...line, quantity: parseInt(e.target.value) || 1 };
                    setLines(next);
                  }}
                />
                <MoneyInput
                  value={line.unit_sale_price ?? 0}
                  onChange={(v) => {
                    const next = [...lines];
                    next[idx] = { ...line, unit_sale_price: v };
                    setLines(next);
                  }}
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Remise</span>
              <MoneyInput value={discount} onChange={setDiscount} className="w-28" />
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={createSale.isPending || lines.length === 0}>
          Enregistrer la vente
        </Button>
      </form>
    </div>
  );
}
