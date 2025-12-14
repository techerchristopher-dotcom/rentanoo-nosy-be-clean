import React, { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { VehicleCategory } from '@/data/vehicleCategories';

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: VehicleCategory[];
  placeholder?: string;
  buttonClassName?: string;
};

export const VehicleCategoryCombobox: React.FC<Props> = ({ value, onChange, options, placeholder = 'Sélectionner', buttonClassName }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  
  const filtered = useMemo(
    () => options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );

  const selected = options.find(o => o.name === value);

  const renderCategoryChip = (category?: VehicleCategory) => {
    if (!category) return placeholder;
    const IconComponent = category.icon;
    return (
      <span className="flex items-center gap-2">
        <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
        <span>{category.name}</span>
      </span>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={buttonClassName || 'h-12 w-full justify-between'}>
          {selected ? renderCategoryChip(selected) : (placeholder || 'Sélectionner')}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 w-80">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une catégorie..." className="mb-2" />
        <div className="max-h-64 overflow-auto">
          {filtered.map(opt => {
            const IconComponent = opt.icon;
            return (
              <button
                key={opt.name}
                className="w-full text-left px-3 py-2 rounded hover:bg-accent flex items-center gap-3"
                onClick={() => { onChange(opt.name); setOpen(false); }}
              >
                <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{opt.name}</div>
                  {opt.examples.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ex: {opt.examples.join(', ')}
                    </div>
                  )}
                </div>
                <Check className={`h-4 w-4 ${opt.name === value ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground px-2 py-1.5">Aucun résultat</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VehicleCategoryCombobox;
