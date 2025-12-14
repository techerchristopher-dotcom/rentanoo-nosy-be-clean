import { useState } from "react";
import { Plane, ArrowDown, ArrowUp, Gift, Euro } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AirportServiceData {
  enabled: boolean;
  pickup: {
    enabled: boolean;
    pricing: 'free' | 'paid';
    price: number;
  };
  dropoff: {
    enabled: boolean;
    pricing: 'free' | 'paid';
    price: number;
  };
}

interface AirportServicesProps {
  data: AirportServiceData;
  onChange: (data: AirportServiceData) => void;
}

export const AirportServices = ({ data, onChange }: AirportServicesProps) => {
  const updateService = (service: 'pickup' | 'dropoff', updates: any) => {
    onChange({
      ...data,
      [service]: { ...data[service], ...updates }
    });
  };

  const updatePricing = (service: 'pickup' | 'dropoff', pricing: 'free' | 'paid') => {
    updateService(service, { 
      pricing,
      price: pricing === 'free' ? 0 : 25 // Prix par défaut
    });
  };

  return (
    <div className="space-y-6">
      {/* Header principal */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary/5 to-primary-soft/10 rounded-2xl border border-primary/20">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-primary">Service Aéroport</h2>
            <p className="text-sm text-muted-foreground">Prise en charge et retour à l'aéroport</p>
          </div>
        </div>
        <Switch
          checked={data.enabled}
          onCheckedChange={(enabled) => onChange({ ...data, enabled })}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {data.enabled && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Pick-up */}
          <ServiceCard
            title="Retrait"
            description="Le client récupère le véhicule"
            icon={ArrowDown}
            data={data.pickup}
            onChange={(updates) => updateService('pickup', updates)}
            onPricingChange={(pricing) => updatePricing('pickup', pricing)}
            color="success"
          />

          {/* Service Drop-off */}
          <ServiceCard
            title="Restitution"
            description="Le client dépose le véhicule"
            icon={ArrowUp}
            data={data.dropoff}
            onChange={(updates) => updateService('dropoff', updates)}
            onPricingChange={(pricing) => updatePricing('dropoff', pricing)}
            color="accent"
          />
        </div>
      )}
    </div>
  );
};

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  data: { enabled: boolean; pricing: 'free' | 'paid'; price: number };
  onChange: (updates: any) => void;
  onPricingChange: (pricing: 'free' | 'paid') => void;
  color: 'success' | 'accent';
}

const ServiceCard = ({ title, description, icon: Icon, data, onChange, onPricingChange, color }: ServiceCardProps) => {
  const colorClasses = {
    success: {
      bg: 'bg-success/5',
      border: 'border-success/20',
      icon: 'text-success',
      iconBg: 'bg-success/10'
    },
    accent: {
      bg: 'bg-accent/5',
      border: 'border-accent/20', 
      icon: 'text-accent',
      iconBg: 'bg-accent/10'
    }
  };

  const colors = colorClasses[color];

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lagoon", colors.bg, colors.border)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg", colors.iconBg)}>
              <Icon className={cn("h-5 w-5", colors.icon)} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(enabled) => onChange({ enabled })}
          />
        </div>
      </CardHeader>

      {data.enabled && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Toggle tarification */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tarification</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant={data.pricing === 'free' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPricingChange('free')}
                  className="flex-1"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Gratuit
                </Button>
                <Button
                  variant={data.pricing === 'paid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPricingChange('paid')}
                  className="flex-1"
                >
                  <Euro className="h-4 w-4 mr-2" />
                  Payant
                </Button>
              </div>
            </div>

            {/* Champ prix */}
            {data.pricing === 'paid' && (
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-medium">
                  Prix du service
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="price"
                    type="number"
                    value={data.price}
                    onChange={(e) => onChange({ price: Number(e.target.value) })}
                    className="flex-1"
                    min="0"
                    step="5"
                  />
                  <span className="text-sm font-medium text-muted-foreground">€</span>
                  <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    Standard: 25€
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export type { AirportServiceData, AirportServicesProps };
