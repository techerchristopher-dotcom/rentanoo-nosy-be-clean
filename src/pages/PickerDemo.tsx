import React from 'react';
import { DriverLicenseForm } from '@/components/forms/DriverLicenseForm';

export const PickerDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Démonstration du Picker iOS
          </h1>
          <p className="text-gray-600">
            Interface de sélection inspirée d'iOS pour le formulaire d'inscription
          </p>
        </div>
        
        <DriverLicenseForm />
        
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Fonctionnalités du Picker</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• Design mobile-first avec interface iOS</li>
            <li>• Scroll snap pour un alignement parfait</li>
            <li>• Support des zones de sécurité (safe-area-inset)</li>
            <li>• Masquage des scrollbars</li>
            <li>• Dégradés de fondu en haut et bas</li>
            <li>• Support du mode sombre</li>
            <li>• Accessibilité avec ARIA</li>
            <li>• Responsive (mobile et tablette)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

