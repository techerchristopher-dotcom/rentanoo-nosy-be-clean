import React, { useState } from 'react';
import { IOSPicker, MultiColumnIOSPicker } from '@/components/ui/ios-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DriverLicenseFormData {
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingCountry: string;
  licenseCategory: string;
  issueTime: string;
}

const countries = [
  { value: 'FR', label: 'France' },
  { value: 'MG', label: 'Madagascar' },
  { value: 'RE', label: 'La Réunion' },
  { value: 'GP', label: 'Guadeloupe' },
  { value: 'MQ', label: 'Martinique' },
  { value: 'GF', label: 'Guyane' },
  { value: 'NC', label: 'Nouvelle-Calédonie' },
  { value: 'PF', label: 'Polynésie française' },
  { value: 'WF', label: 'Wallis-et-Futuna' },
  { value: 'PM', label: 'Saint-Pierre-et-Miquelon' },
  { value: 'BL', label: 'Saint-Barthélemy' },
  { value: 'MF', label: 'Saint-Martin' },
];

const licenseCategories = [
  { value: 'A', label: 'A - Motocycles' },
  { value: 'A1', label: 'A1 - Motocycles légères' },
  { value: 'A2', label: 'A2 - Motocycles moyennes' },
  { value: 'B', label: 'B - Voitures' },
  { value: 'BE', label: 'BE - Voiture + remorque' },
  { value: 'C', label: 'C - Poids lourds' },
  { value: 'CE', label: 'CE - Poids lourds + remorque' },
  { value: 'D', label: 'D - Autobus' },
  { value: 'DE', label: 'DE - Autobus + remorque' },
];

const months = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const years = Array.from({ length: 50 }, (_, i) => {
  const year = new Date().getFullYear() - 30 + i;
  return { value: year.toString(), label: year.toString() };
});

const hours = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString().padStart(2, '0'),
  label: i.toString().padStart(2, '0')
}));

const minutes = Array.from({ length: 60 }, (_, i) => ({
  value: i.toString().padStart(2, '0'),
  label: i.toString().padStart(2, '0')
}));

export const DriverLicenseForm: React.FC = () => {
  const [formData, setFormData] = useState<DriverLicenseFormData>({
    licenseNumber: '',
    issueDate: '',
    expiryDate: '',
    issuingCountry: '',
    licenseCategory: '',
    issueTime: '',
  });

  const handleInputChange = (field: keyof DriverLicenseFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Driver License Form Data:', formData);
    // Handle form submission
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Informations du permis de conduire
        </CardTitle>
        <p className="text-center text-gray-600">
          Renseignez les informations de votre permis de conduire
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Numéro de permis */}
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Numéro de permis de conduire</Label>
            <Input
              id="licenseNumber"
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              placeholder="Ex: 1234567890123456"
              required
            />
          </div>

          {/* Pays d'émission */}
          <div className="space-y-2">
            <Label>Pays d'émission du permis</Label>
            <IOSPicker
              items={countries}
              selectedValue={formData.issuingCountry}
              onSelect={(value) => handleInputChange('issuingCountry', value)}
              placeholder="Sélectionner un pays"
            />
          </div>

          {/* Catégorie de permis */}
          <div className="space-y-2">
            <Label>Catégorie de permis</Label>
            <IOSPicker
              items={licenseCategories}
              selectedValue={formData.licenseCategory}
              onSelect={(value) => handleInputChange('licenseCategory', value)}
              placeholder="Sélectionner une catégorie"
            />
          </div>

          {/* Date d'émission */}
          <div className="space-y-2">
            <Label>Date d'émission du permis</Label>
            <MultiColumnIOSPicker
              columns={[
                {
                  items: months,
                  selectedValue: formData.issueDate.split('/')[1],
                  onSelect: (value) => {
                    const currentDate = formData.issueDate.split('/');
                    handleInputChange('issueDate', `${currentDate[0] || ''}/${value}/${currentDate[2] || ''}`);
                  }
                },
                {
                  items: years,
                  selectedValue: formData.issueDate.split('/')[2],
                  onSelect: (value) => {
                    const currentDate = formData.issueDate.split('/');
                    handleInputChange('issueDate', `${currentDate[0] || ''}/${currentDate[1] || ''}/${value}`);
                  }
                }
              ]}
            />
          </div>

          {/* Date d'expiration */}
          <div className="space-y-2">
            <Label>Date d'expiration du permis</Label>
            <MultiColumnIOSPicker
              columns={[
                {
                  items: months,
                  selectedValue: formData.expiryDate.split('/')[1],
                  onSelect: (value) => {
                    const currentDate = formData.expiryDate.split('/');
                    handleInputChange('expiryDate', `${currentDate[0] || ''}/${value}/${currentDate[2] || ''}`);
                  }
                },
                {
                  items: years,
                  selectedValue: formData.expiryDate.split('/')[2],
                  onSelect: (value) => {
                    const currentDate = formData.expiryDate.split('/');
                    handleInputChange('expiryDate', `${currentDate[0] || ''}/${currentDate[1] || ''}/${value}`);
                  }
                }
              ]}
            />
          </div>

          {/* Heure d'émission (optionnel) */}
          <div className="space-y-2">
            <Label>Heure d'émission (optionnel)</Label>
            <MultiColumnIOSPicker
              columns={[
                {
                  items: hours,
                  selectedValue: formData.issueTime.split(':')[0],
                  onSelect: (value) => {
                    const currentTime = formData.issueTime.split(':');
                    handleInputChange('issueTime', `${value}:${currentTime[1] || '00'}`);
                  }
                },
                {
                  items: minutes,
                  selectedValue: formData.issueTime.split(':')[1],
                  onSelect: (value) => {
                    const currentTime = formData.issueTime.split(':');
                    handleInputChange('issueTime', `${currentTime[0] || '00'}:${value}`);
                  }
                }
              ]}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              Continuer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

