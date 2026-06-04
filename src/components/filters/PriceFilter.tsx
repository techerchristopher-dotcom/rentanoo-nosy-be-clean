import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

interface PriceFilterProps {
  vehiclePrices: number[];
  priceMin?: number;
  priceMax?: number;
  onApply: (priceMin?: number, priceMax?: number) => void;
  onReset: () => void;
}

export const PriceFilter = ({ 
  vehiclePrices, 
  priceMin, 
  priceMax, 
  onApply, 
  onReset 
}: PriceFilterProps) => {
  const { formatClient } = useExchangeRate();
  const fmtMga = (amount: number) => formatClient(amount).primary;

  const minPrice = vehiclePrices.length > 0 ? Math.min(...vehiclePrices) : 0;
  const maxPrice = vehiclePrices.length > 0 ? Math.max(...vehiclePrices) : 500;
  
  const [localRange, setLocalRange] = useState<[number, number]>([
    priceMin ?? minPrice,
    priceMax ?? maxPrice
  ]);

  useEffect(() => {
    setLocalRange([
      priceMin ?? minPrice,
      priceMax ?? maxPrice
    ]);
  }, [priceMin, priceMax, minPrice, maxPrice]);

  // Create histogram data
  const createHistogram = () => {
    if (vehiclePrices.length === 0) return [];
    
    const bins = 10;
    const binSize = (maxPrice - minPrice) / bins;
    const histogram = new Array(bins).fill(0);
    
    vehiclePrices.forEach(price => {
      const binIndex = Math.min(Math.floor((price - minPrice) / binSize), bins - 1);
      histogram[binIndex]++;
    });
    
    const maxCount = Math.max(...histogram);
    return histogram.map(count => maxCount > 0 ? (count / maxCount) * 100 : 0);
  };

  const histogramData = createHistogram();

  const handleApply = () => {
    const [min, max] = localRange;
    onApply(
      min > minPrice ? min : undefined,
      max < maxPrice ? max : undefined
    );
  };

  const handleReset = () => {
    setLocalRange([minPrice, maxPrice]);
    onReset();
  };

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>PRIX TOTAL</DrawerTitle>
      </DrawerHeader>
      
      <div className="px-6 pb-6">
        {/* Histogram */}
        <div className="mb-6 h-20 flex items-end justify-between gap-1">
          {histogramData.map((height, index) => (
            <div 
              key={index} 
              className="bg-primary/20 rounded-t flex-1 transition-all duration-200"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        {/* Price Range Display */}
        <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
          <span>{fmtMga(minPrice)}</span>
          <span>{fmtMga(maxPrice)}</span>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <Slider
            value={localRange}
            onValueChange={(value) => setLocalRange(value as [number, number])}
            min={minPrice}
            max={maxPrice}
            step={5}
            className="w-full"
            aria-label="Fourchette de prix"
          />
        </div>

        {/* Selected Range Display */}
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>{fmtMga(localRange[0])}</span>
          <span className="text-muted-foreground text-sm">à</span>
          <span>{fmtMga(localRange[1])}</span>
        </div>
      </div>

      <DrawerFooter>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex-1"
            aria-label="Réinitialiser les prix"
          >
            Réinitialiser
          </Button>
          <Button 
            onClick={handleApply}
            className="flex-1"
            aria-label="Appliquer les filtres de prix"
          >
            Appliquer
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};