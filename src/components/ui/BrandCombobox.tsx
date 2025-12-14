import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  buttonClassName?: string;
};

export const BrandCombobox: React.FC<Props> = ({ value, onChange, options, placeholder = 'Sélectionner', buttonClassName }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => options.filter(o => o.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={buttonClassName || 'h-12 w-full justify-between'}>
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 w-64">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une marque..." className="mb-2" />
        <div className="max-h-64 overflow-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              className="w-full text-left px-3 py-2 rounded hover:bg-accent flex items-center gap-3"
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              <span className="flex-1">{opt}</span>
              <Check className={`h-4 w-4 ${opt === value ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground px-2 py-1.5">Aucun résultat</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BrandCombobox;


