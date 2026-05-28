import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchParts } from "@/features/back-office/services/partsService";
import type { Part, RepairPartLineInput } from "@/features/back-office/types";
import { Plus, Trash2 } from "lucide-react";

type Line = RepairPartLineInput & { part?: Part; label?: string };

type Props = {
  lines: Line[];
  onChange: (lines: Line[]) => void;
  disabled?: boolean;
};

export function RepairPartsLineEditor({ lines, onChange, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const parts = await searchParts(q);
    setResults(parts);
  };

  const addPart = (part: Part) => {
    onChange([
      ...lines,
      {
        part_id: part.id,
        quantity: 1,
        client_request_id: crypto.randomUUID(),
        part,
        label: `${part.sku} — ${part.name} (stock: ${part.quantity_on_hand})`,
      },
    ]);
    setQuery("");
    setResults([]);
  };

  const updateQty = (idx: number, qty: number) => {
    const next = [...lines];
    next[idx] = { ...next[idx], quantity: Math.max(1, qty) };
    onChange(next);
  };

  const remove = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div>
        <Label>Rechercher une pièce</Label>
        <Input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="SKU ou nom..."
          disabled={disabled}
        />
        {results.length > 0 && (
          <ul className="border rounded-md mt-1 max-h-40 overflow-y-auto">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => addPart(p)}
                  disabled={disabled}
                >
                  {p.sku} — {p.name} ({p.quantity_on_hand} en stock)
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <ul className="space-y-2">
          {lines.map((line, idx) => (
            <li key={line.client_request_id ?? idx} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{line.label ?? line.part_id}</span>
              <Input
                type="number"
                min={1}
                className="w-20 h-8"
                value={line.quantity}
                onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                disabled={disabled}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(idx)} disabled={disabled}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {lines.length === 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Ajoutez des pièces via la recherche
        </p>
      )}
    </div>
  );
}
