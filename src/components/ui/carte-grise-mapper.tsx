import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, CheckCircle, XCircle, FileText } from 'lucide-react';

interface CarteGriseMapperProps {
  vehicleData: {
    licensePlate: string;
    brand: string;
    model: string;
    color: string;
    year: string;
    vehicleCategory: string;
    mileage: string;
    fuel: string;
    transmission: string;
    seats: string;
    doors: string;
  };
}

interface FieldMapping {
  label: string;
  carteGriseField: string;
  value: string;
  isOnCarteGrise: boolean;
  tooltip: string;
  icon: 'check' | 'x' | 'info';
}

export const CarteGriseMapper: React.FC<CarteGriseMapperProps> = ({ vehicleData }) => {
  
  // Mapping des champs vers la carte grise
  const fieldMappings: FieldMapping[] = [
    {
      label: 'Plaque d\'immatriculation',
      carteGriseField: 'A - Numéro d\'immatriculation',
      value: vehicleData.licensePlate,
      isOnCarteGrise: true,
      tooltip: 'Numéro officiel qui identifie le véhicule. Toujours indiqué sur la carte grise.',
      icon: 'check'
    },
    {
      label: 'Marque',
      carteGriseField: 'D.1 - Marque constructeur',
      value: vehicleData.brand,
      isOnCarteGrise: true,
      tooltip: 'Marque du constructeur du véhicule. Correspond au champ D.1 de la carte grise.',
      icon: 'check'
    },
    {
      label: 'Modèle',
      carteGriseField: 'D.3 - Dénomination commerciale',
      value: vehicleData.model,
      isOnCarteGrise: true,
      tooltip: 'Nom commercial du modèle. Correspond au champ D.3 de la carte grise.',
      icon: 'check'
    },
    {
      label: 'Couleur',
      carteGriseField: 'Non indiqué sur la carte grise',
      value: vehicleData.color,
      isOnCarteGrise: false,
      tooltip: 'La couleur n\'apparaît pas sur la carte grise, c\'est une information supplémentaire pour l\'utilisateur.',
      icon: 'x'
    },
    {
      label: 'Année',
      carteGriseField: 'B - Date de première immatriculation',
      value: vehicleData.year,
      isOnCarteGrise: true,
      tooltip: 'Année de première immatriculation du véhicule. Correspond au champ B de la carte grise.',
      icon: 'check'
    },
    {
      label: 'Catégorie véhicule',
      carteGriseField: 'J.1 - Genre national + J.3 - Carrosserie nationale',
      value: vehicleData.vehicleCategory,
      isOnCarteGrise: true,
      tooltip: 'Catégorie du véhicule qui correspond aux champs J.1 (genre) et J.3 (carrosserie) de la carte grise.',
      icon: 'check'
    },
    {
      label: 'Kilométrage',
      carteGriseField: 'Non indiqué sur la carte grise',
      value: vehicleData.mileage,
      isOnCarteGrise: false,
      tooltip: 'Le kilométrage n\'est pas indiqué sur la carte grise car il évolue avec l\'usage du véhicule.',
      icon: 'x'
    },
    {
      label: 'Carburant',
      carteGriseField: 'P.3 - Type de carburant / énergie',
      value: vehicleData.fuel,
      isOnCarteGrise: true,
      tooltip: 'Type de carburant ou d\'énergie utilisé. Correspond au champ P.3 de la carte grise.',
      icon: 'check'
    },
    {
      label: 'Transmission',
      carteGriseField: 'Non indiqué sur la carte grise',
      value: vehicleData.transmission,
      isOnCarteGrise: false,
      tooltip: 'Le type de transmission (manuelle/automatique) n\'est pas indiqué sur la carte grise.',
      icon: 'x'
    },
    {
      label: 'Nombre de sièges',
      carteGriseField: 'S.1 - Nombre de places assises',
      value: vehicleData.seats,
      isOnCarteGrise: true,
      tooltip: 'Nombre de places assises disponibles. Correspond au champ S.1 de la carte grise.',
      icon: 'check'
    },
    {
      label: 'Nombre de portes',
      carteGriseField: 'Non indiqué sur la carte grise',
      value: vehicleData.doors,
      isOnCarteGrise: false,
      tooltip: 'Le nombre de portes n\'est pas indiqué sur la carte grise, c\'est une information pratique.',
      icon: 'x'
    }
  ];

  // Statistiques
  const totalFields = fieldMappings.length;
  const fieldsOnCarteGrise = fieldMappings.filter(field => field.isOnCarteGrise).length;
  const fieldsNotOnCarteGrise = totalFields - fieldsOnCarteGrise;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-6 w-6 text-primary" />
          Mapping Carte Grise
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{fieldsOnCarteGrise} champs sur carte grise</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-orange-500" />
            <span>{fieldsNotOnCarteGrise} champs supplémentaires</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fieldMappings.map((field, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                field.isOnCarteGrise 
                  ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                  : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-slate-700">
                      {field.label}
                    </h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-slate-400 cursor-help hover:text-primary transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{field.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="text-xs text-slate-600 mb-2">
                    {field.carteGriseField}
                  </div>
                  
                  <div className="text-sm font-medium text-slate-900">
                    {field.value || 'Non renseigné'}
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  {field.isOnCarteGrise ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sur carte grise
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Info supplémentaire
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Résumé */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-medium text-slate-700 mb-2">Résumé du mapping</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-green-700 mb-1">Champs présents sur la carte grise :</div>
              <ul className="text-slate-600 space-y-1">
                <li>• A - Numéro d'immatriculation</li>
                <li>• B - Date de première immatriculation</li>
                <li>• D.1 - Marque constructeur</li>
                <li>• D.3 - Dénomination commerciale</li>
                <li>• J.1 - Genre national</li>
                <li>• J.3 - Carrosserie nationale</li>
                <li>• P.3 - Type de carburant</li>
                <li>• S.1 - Nombre de places assises</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-orange-700 mb-1">Informations supplémentaires :</div>
              <ul className="text-slate-600 space-y-1">
                <li>• Couleur du véhicule</li>
                <li>• Kilométrage actuel</li>
                <li>• Type de transmission</li>
                <li>• Nombre de portes</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarteGriseMapper;

