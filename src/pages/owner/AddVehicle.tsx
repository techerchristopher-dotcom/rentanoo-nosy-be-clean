import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SupabaseVehiclesService } from '@/services/supabaseVehiclesService';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_VEHICLE_TEMPLATE, populateAddVehicleForm, convertToSupabaseFormat, validateVehicleField, calculateVehiclePricing, uploadVehiclePhotos } from '@/templates/vehicleTemplate';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import EquipmentSelector from '@/components/ui/equipment-selector';
import { 
  ArrowLeft, 
  ArrowRight,
  Car, 
  Camera, 
  Upload, 
  Save, 
  Loader2,
  MapPin,
  Euro,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  Users,
  Car as CarIcon,
  FileText,
  CheckCircle,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';

interface FormData {
  // Étape 1 - Véhicule
  licensePlate: string;
  brand: string;
  model: string;
  color: string; // ✅ Champ color présent
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  seats: string;
  doors: string;
  hasAC: boolean;
  hasGPS: boolean;
  hasCruiseControl: boolean;
  hasBluetooth: boolean;
  hasCarPlay: boolean;
  hasAudioInput: boolean;
  // Étape 2 - Tarifs
  dailyPrice: string;
  lowSeasonDiscount: string;
  highSeasonSurcharge: string;
  longTermDiscount14: string;
  longTermDiscount60: string;
  minAdvanceHours: string;
  minRentalDays: string;
  maxRentalDays: string;
  // Étape 3 - Description & Photos
  description: string;
  location: string;
  imageUrl: string | null; // ✅ Champ imageUrl ajouté
}

const AddVehicle: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [vehiclePhotos, setVehiclePhotos] = useState({
    frontLeft: null as File | null,
    profileLeft: null as File | null,
    interior: null as File | null
  });
  const [additionalPhotos, setAdditionalPhotos] = useState<(File | null)[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(true);
  const [descriptionError, setDescriptionError] = useState('');
  const [equipment, setEquipment] = useState({
    hasAC: false,
    hasGPS: false,
    hasCruiseControl: false,
    hasBluetooth: false,
    hasCarPlay: false,
    hasAudioInput: false,
    hasBackupCamera: false,
    hasUSBPort: false,
    hasLeatherSeats: false,
    hasSunroof: false,
    hasPremiumAudio: false,
    hasRoofRack: false,
    hasWirelessCharger: false,
    hasParkingSensors: false,
    hasABS: false,
    hasLargeTrunk: false,
    hasRoofBox: false,
    hasBikeRack: false,
    hasAndroidAuto: false,
  });

  // Synchroniser l'état equipment avec formData
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      hasAC: equipment.hasAC,
      hasGPS: equipment.hasGPS,
      hasCruiseControl: equipment.hasCruiseControl,
      hasBluetooth: equipment.hasBluetooth,
      hasCarPlay: equipment.hasCarPlay,
      hasAudioInput: equipment.hasAudioInput,
      hasBackupCamera: equipment.hasBackupCamera,
      hasUSBPort: equipment.hasUSBPort,
      hasLeatherSeats: equipment.hasLeatherSeats,
      hasSunroof: equipment.hasSunroof,
      hasPremiumAudio: equipment.hasPremiumAudio,
      hasRoofRack: equipment.hasRoofRack,
      hasWirelessCharger: equipment.hasWirelessCharger,
      hasParkingSensors: equipment.hasParkingSensors,
      hasABS: equipment.hasABS,
      hasLargeTrunk: equipment.hasLargeTrunk,
      hasRoofBox: equipment.hasRoofBox,
      hasBikeRack: equipment.hasBikeRack,
      hasAndroidAuto: equipment.hasAndroidAuto,
    }));
  }, [equipment]);
  // Initialiser le formulaire avec le template par défaut (basé sur la première carte)
  const [formData, setFormData] = useState<FormData>(() => {
    return populateAddVehicleForm(DEFAULT_VEHICLE_TEMPLATE);
  });

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validation en temps réel (identique à ManageVehicle.tsx)
    const error = validateVehicleField(field, value);
    if (error) {
      console.warn(`Erreur de validation pour ${field}:`, error);
    }
  };

  // Fonctions pour gérer les photos
  const handlePhotoUpload = (photoType: 'frontLeft' | 'profileLeft' | 'interior', file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image valide.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erreur", 
        description: "La photo doit faire moins de 10MB.",
        variant: "destructive"
      });
      return;
    }

    setVehiclePhotos(prev => ({
      ...prev,
      [photoType]: file
    }));

    setFeedbackMessage('Photo ajoutée');
    toast({
      title: "Photo ajoutée",
      description: "Votre photo a été ajoutée avec succès.",
    });
  };

  const triggerFileInput = (photoType: 'frontLeft' | 'profileLeft' | 'interior') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(photoType, file);
      }
    };
    input.click();
  };

  const getPhotoPreview = (file: File | null) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  };

  // Gérer l'upload des photos supplémentaires
  const handleAdditionalPhotoUpload = (file: File, index: number) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image valide.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erreur", 
        description: "La photo doit faire moins de 10MB.",
        variant: "destructive"
      });
      return;
    }

    setAdditionalPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos[index] = file;
      return newPhotos;
    });

    setFeedbackMessage('Photo ajoutée');
    toast({
      title: "Photo ajoutée",
      description: "Votre photo supplémentaire a été ajoutée avec succès.",
    });
  };

  // Supprimer une photo supplémentaire
  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });

    setFeedbackMessage('Photo supprimée');
    toast({
      title: "Photo supprimée",
      description: "La photo a été supprimée avec succès.",
    });
  };

  // Déclencher l'input file pour les photos supplémentaires
  const triggerAdditionalFileInput = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleAdditionalPhotoUpload(file, index);
      }
    };
    input.click();
  };

  // Ajouter une nouvelle photo supplémentaire (max 3)
  const addNewAdditionalPhoto = () => {
    if (additionalPhotos.length < 3) {
      triggerAdditionalFileInput(additionalPhotos.length);
    }
  };

  // Fonctions pour la description du véhicule
  const handleDescriptionSave = () => {
    setDescriptionError('');
    
    if (vehicleDescription.length > 800) {
      setDescriptionError('La description ne peut pas dépasser 800 caractères.');
      return;
    }

    updateField('description', vehicleDescription);
    setIsDescriptionEditing(false);
    setFeedbackMessage('Description sauvegardée');
    toast({
      title: "Description sauvegardée",
      description: "Votre description a été mise à jour.",
    });
  };

  const handleDescriptionEdit = () => {
    setIsDescriptionEditing(true);
  };

  const handleDescriptionClear = () => {
    setVehicleDescription('');
    updateField('description', '');
    setDescriptionError('');
    setFeedbackMessage('Description effacée');
    toast({
      title: "Description effacée",
      description: "La description a été supprimée.",
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour ajouter un véhicule",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Utiliser le template pour convertir les données vers le format Supabase
      // Cela garantit que la structure est identique à la première carte
      const vehicleData = convertToSupabaseFormat(formData, user.id);
      
      // Utiliser la description du formulaire si disponible, sinon celle du template
      if (formData.description) {
        vehicleData.description = formData.description;
      } else if (vehicleDescription) {
        vehicleData.description = vehicleDescription;
      }

      console.log("Données du véhicule à créer (basées sur le template de la première carte):", vehicleData);

      // Utiliser directement le client Supabase pour éviter les problèmes de types
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicleData)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }

      console.log("Véhicule créé avec succès - Structure identique à la première carte:", data);

      // Upload des photos après création du véhicule
      const hasPhotos = vehiclePhotos.frontLeft || vehiclePhotos.profileLeft || vehiclePhotos.interior || additionalPhotos.some(photo => photo !== null);
      
      if (hasPhotos) {
        console.log("Upload des photos en cours...");
        
        const photoResult = await uploadVehiclePhotos(
          data.id,
          vehiclePhotos,
          additionalPhotos,
          toast
        );

        if (photoResult.uploadedPhotos.length > 0) {
          console.log(`${photoResult.uploadedPhotos.length} photos uploadées avec succès`);
        }
        
        if (photoResult.errors.length > 0) {
          console.warn("Erreurs d'upload de photos:", photoResult.errors);
        }
      }

      toast({
        title: "Succès !",
        description: "Votre véhicule a été ajouté avec succès - Structure identique à votre première carte",
      });

      // Redirection vers la liste des véhicules
      navigate('/me/owner/vehicles');
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout du véhicule:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'ajouter le véhicule: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Informations du véhicule';
      case 2: return 'Tarifs et conditions';
      case 3: return 'Description et photos';
      default: return '';
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Informations véhicule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Informations du véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Explication upload carte grise */}
          <div className="bg-primary-soft p-4 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-full shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-primary mb-1">Gagnez du temps !</h4>
                <p className="text-sm text-primary/80">
                  Uploadez votre carte grise pour remplir automatiquement toutes les informations de votre véhicule. 
                  Plus rapide et sans erreur !
                </p>
              </div>
            </div>
          </div>

          {/* Upload carte grise */}
          <div>
            <Label className="text-base font-medium">1. Carte grise (recommandé)</Label>
            <div className="mt-3 border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/60 transition-colors cursor-pointer bg-primary/5">
              <Upload className="h-10 w-10 mx-auto text-primary mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Cliquez pour télécharger ou glissez votre carte grise
              </p>
              <p className="text-xs text-muted-foreground">
                Format accepté: PDF, JPG, PNG (max 5MB)
              </p>
            </div>
          </div>

          {/* Séparateur */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-xs text-muted-foreground bg-background px-2">OU</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Saisie manuelle */}
          <div>
            <Label className="text-base font-medium mb-6 block">2. Saisie manuelle des informations</Label>
            
            <div className="space-y-8">
              {/* Section Identification */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                  Identification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Plaque d'immatriculation *</Label>
                    <Input 
                      value={formData.licensePlate}
                      onChange={(e) => updateField('licensePlate', e.target.value)}
                      placeholder="AB-123-CD"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Marque *</Label>
                    <Select value={formData.brand} onValueChange={(value) => updateField('brand', value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Peugeot">Peugeot</SelectItem>
                        <SelectItem value="Renault">Renault</SelectItem>
                        <SelectItem value="Citroën">Citroën</SelectItem>
                        <SelectItem value="Dacia">Dacia</SelectItem>
                        <SelectItem value="Toyota">Toyota</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Modèle *</Label>
                    <Input 
                      value={formData.model}
                      onChange={(e) => updateField('model', e.target.value)}
                      placeholder="ex: 208, Clio..."
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Couleur *</Label>
                    <Select value={formData.color} onValueChange={(value) => updateField('color', value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Sélectionner la couleur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blanc">Blanc</SelectItem>
                        <SelectItem value="Noir">Noir</SelectItem>
                        <SelectItem value="Gris">Gris</SelectItem>
                        <SelectItem value="Argent">Argent</SelectItem>
                        <SelectItem value="Bleu">Bleu</SelectItem>
                        <SelectItem value="Rouge">Rouge</SelectItem>
                        <SelectItem value="Vert">Vert</SelectItem>
                        <SelectItem value="Jaune">Jaune</SelectItem>
                        <SelectItem value="Orange">Orange</SelectItem>
                        <SelectItem value="Marron">Marron</SelectItem>
                        <SelectItem value="Beige">Beige</SelectItem>
                        <SelectItem value="Violet">Violet</SelectItem>
                        <SelectItem value="Rose">Rose</SelectItem>
                        <SelectItem value="Doré">Doré</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Année *</Label>
                    <Input 
                      type="number"
                      value={formData.year}
                      onChange={(e) => updateField('year', e.target.value)}
                      placeholder="2020"
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Section Caractéristiques techniques */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                  Caractéristiques techniques
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Kilométrage</Label>
                    <Input 
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => updateField('mileage', e.target.value)}
                      placeholder="50000"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Carburant *</Label>
                    <Select value={formData.fuel} onValueChange={(value) => updateField('fuel', value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasoline">Essence</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electric">Électrique</SelectItem>
                        <SelectItem value="hybrid">Hybride</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-slate-600">Transmission *</Label>
                    <Select value={formData.transmission} onValueChange={(value) => updateField('transmission', value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manuelle</SelectItem>
                        <SelectItem value="automatic">Automatique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section Dimensions */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                  Dimensions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Nombre de sièges</Label>
                    <Select value={formData.seats} onValueChange={(value) => updateField('seats', value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 places</SelectItem>
                        <SelectItem value="4">4 places</SelectItem>
                        <SelectItem value="5">5 places</SelectItem>
                        <SelectItem value="7">7 places</SelectItem>
                        <SelectItem value="9">9 places</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-600">Nombre de portes</Label>
                    <Select value={formData.doors} onValueChange={(value) => updateField('doors', value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 portes</SelectItem>
                        <SelectItem value="5">5 portes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section Équipements */}
              <EquipmentSelector 
                equipment={equipment}
                onEquipmentChange={setEquipment}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Fonction utilitaire pour calculer les prix avec validation
  const calculatePrice = (basePrice: string, percentage: string, isDiscount: boolean = true) => {
    const base = parseFloat(basePrice);
    const percent = parseFloat(percentage);
    
    if (isNaN(base) || isNaN(percent) || base <= 0) return 0;
    
    if (isDiscount) {
      return base * (1 - percent / 100);
    } else {
      return base * (1 + percent / 100);
    }
  };

  // Fonction pour formater les prix
  const formatPrice = (price: number) => {
    if (isNaN(price) || price <= 0) return '0,00';
    return price.toFixed(2);
  };

  const renderStep2 = () => (
    <div className="space-y-8">
      {/* Tarifs */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-background to-muted/20 border-b">
          <CardTitle className="text-[22px] font-semibold text-foreground">Tarification</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="max-w-4xl space-y-6">
            {/* Prix de base - pleine largeur */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-600">Prix journalier de base (€) *</Label>
              <Input 
                type="number"
                value={formData.dailyPrice}
                onChange={(e) => updateField('dailyPrice', e.target.value)}
                placeholder="35"
                min="0"
                step="0.01"
                className="h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
              />
            </div>
            
            {/* Grille 2x2 avec aperçus intégrés */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Réduction basse saison */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-600 block">
                  Réduction basse saison (%)
                </Label>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <div className="md:w-[70%]">
                    <Input 
                      type="number"
                      value={formData.lowSeasonDiscount}
                      onChange={(e) => updateField('lowSeasonDiscount', e.target.value)}
                      placeholder="10"
                      min="0"
                      max="100"
                      step="1"
                      className="h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="md:w-[30%] md:text-right">
                    {parseFloat(formData.dailyPrice) > 0 ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 border border-green-200/50 text-lg font-semibold text-green-700 transition-all duration-150 ease-out">
                        {formatPrice(calculatePrice(formData.dailyPrice, formData.lowSeasonDiscount, true)) || '0,00'} €
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">— €</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Supplément haute saison */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-600 block">
                  Supplément haute saison (%)
                </Label>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <div className="md:w-[70%]">
                    <Input 
                      type="number"
                      value={formData.highSeasonSurcharge}
                      onChange={(e) => updateField('highSeasonSurcharge', e.target.value)}
                      placeholder="20"
                      min="0"
                      max="200"
                      step="1"
                      className="h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="md:w-[30%] md:text-right">
                    {parseFloat(formData.dailyPrice) > 0 ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200/50 text-lg font-semibold text-orange-700 transition-all duration-150 ease-out">
                        {formatPrice(calculatePrice(formData.dailyPrice, formData.highSeasonSurcharge, false)) || '0,00'} €
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">— €</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Réduction longue durée ≥14j */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-600 block">
                  Réduction longue durée ≥14j (%)
                </Label>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <div className="md:w-[70%]">
                    <Input 
                      type="number"
                      value={formData.longTermDiscount14}
                      onChange={(e) => updateField('longTermDiscount14', e.target.value)}
                      placeholder="15"
                      min="0"
                      max="100"
                      step="1"
                      className="h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="md:w-[30%] md:text-right">
                    {parseFloat(formData.dailyPrice) > 0 ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 border border-green-200/50 text-lg font-semibold text-green-700 transition-all duration-150 ease-out">
                        {formatPrice(calculatePrice(formData.dailyPrice, formData.longTermDiscount14, true)) || '0,00'} €
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">— €</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Réduction longue durée ≥60j */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-600 block">
                  Réduction longue durée ≥60j (%)
                </Label>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <div className="md:w-[70%]">
                    <Input 
                      type="number"
                      value={formData.longTermDiscount60}
                      onChange={(e) => updateField('longTermDiscount60', e.target.value)}
                      placeholder="25"
                      min="0"
                      max="100"
                      step="1"
                      className="h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="md:w-[30%] md:text-right">
                    {parseFloat(formData.dailyPrice) > 0 ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 border border-green-200/50 text-lg font-semibold text-green-700 transition-all duration-150 ease-out">
                        {formatPrice(calculatePrice(formData.dailyPrice, formData.longTermDiscount60, true)) || '0,00'} €
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">— €</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Texte d'aide */}
            <p className="text-sm text-slate-500 mt-8 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-200">
              💡 Calculs indicatifs, arrondis à 2 décimales. Les frais/assurances s'ajoutent ensuite.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres de réservation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[22px] font-semibold text-foreground">Paramètres de réservation</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">
                Délai min. (heures) avant réservation
              </Label>
              <Input 
                type="number"
                value={formData.minAdvanceHours}
                onChange={(e) => updateField('minAdvanceHours', e.target.value)}
                placeholder="2"
                className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">
                Durée min. (jours) de réservation
              </Label>
              <Input 
                type="number"
                value={formData.minRentalDays}
                onChange={(e) => updateField('minRentalDays', e.target.value)}
                placeholder="1"
                className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">
                Durée max. (jours) de réservation
              </Label>
              <Input 
                type="number"
                value={formData.maxRentalDays}
                onChange={(e) => updateField('maxRentalDays', e.target.value)}
                placeholder="30"
                className="h-11 rounded-lg bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      {/* Localisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Localisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-slate-600">Localisation</Label>
            <Input 
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Ville, quartier, adresse approximative..."
              className="mt-2 h-12 text-base rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-2">
              📍 Indiquez où se trouve votre véhicule pour les locataires
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Photos du véhicule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Photos du véhicule (minimum 3)
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-sm text-muted-foreground">{additionalPhotos.length}/3</span>
              {additionalPhotos.length < 3 && (
                <Button 
                  onClick={addNewAdditionalPhoto}
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter des photos
                </Button>
              )}
              {additionalPhotos.length >= 3 && (
                <span className="text-xs text-muted-foreground">Limite atteinte (3 photos)</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="sr-only" 
            aria-live="polite" 
            aria-atomic="true"
          >
            {feedbackMessage}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avant Gauche */}
            <div className="group relative border-2 border-dashed border-muted-foreground/25 rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/50">
              <div 
                onClick={() => triggerFileInput('frontLeft')}
                className="relative h-32 w-full cursor-pointer"
              >
                {/* Bandeau Photo principale */}
                <div className="absolute top-2 left-2 bg-[#16A34A] text-white text-xs font-bold px-2 py-1 rounded-br-md z-10 md:text-xs md:px-2 md:py-1 sm:text-[11px] sm:px-1.5 sm:py-0.5" 
                     aria-label="Photo principale de l'annonce">
                  Photo principale
                </div>
                {vehiclePhotos.frontLeft ? (
                  <img 
                    src={getPhotoPreview(vehiclePhotos.frontLeft)} 
                    alt="Avant gauche" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 relative bg-slate-50/50">
                    <svg 
                      viewBox="0 0 120 120" 
                      className="w-full h-full absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity"
                      style={{ imageRendering: 'auto', shapeRendering: 'geometricPrecision' }}
                    >
                      {/* Contour de voiture vue avant gauche */}
                      <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-muted-foreground">
                        {/* Carrosserie principale */}
                        <rect x="25" y="40" width="70" height="45" rx="8" />
                        {/* Pare-brise */}
                        <path d="M30 40 L35 30 L85 30 L90 40" />
                        {/* Phares */}
                        <circle cx="35" cy="50" r="4" />
                        <circle cx="85" cy="50" r="4" />
                        {/* Roues */}
                        <circle cx="35" cy="90" r="8" />
                        <circle cx="85" cy="90" r="8" />
                        {/* Grille */}
                        <rect x="40" y="65" width="40" height="15" rx="2" />
                        <line x1="45" y1="68" x2="75" y2="68" />
                        <line x1="45" y1="72" x2="75" y2="72" />
                        <line x1="45" y1="76" x2="75" y2="76" />
                      </g>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                      <div className="bg-primary/90 text-white rounded-full p-2">
                        <Upload className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white rounded-b-xl">
                <p className="text-sm font-medium text-slate-700 mb-1">Avant Gauche</p>
                {vehiclePhotos.frontLeft ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-[#16A34A]" />
                      <span className="text-xs text-[#16A34A] font-medium">Ajoutée</span>
                    </div>
                    <button
                      onClick={(e) => {e.stopPropagation(); triggerFileInput('frontLeft');}}
                      className="flex items-center gap-1 text-xs text-[#DC2626] hover:text-red-700 hover:underline transition-all duration-150"
                    >
                      <ArrowRight className="h-3 w-3 rotate-180" />
                      Changer ma photo
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Avant Gauche – Angle de vue recommandé</p>
                )}
              </div>
            </div>

            {/* Profil gauche */}
            <div className="group relative border-2 border-dashed border-muted-foreground/25 rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/50">
              <div 
                onClick={() => triggerFileInput('profileLeft')}
                className="relative h-32 w-full cursor-pointer"
              >
                {vehiclePhotos.profileLeft ? (
                  <img 
                    src={getPhotoPreview(vehiclePhotos.profileLeft)} 
                    alt="Profil gauche" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 relative bg-slate-50/50">
                    <svg 
                      viewBox="0 0 120 120" 
                      className="w-full h-full absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity"
                      style={{ imageRendering: 'auto', shapeRendering: 'geometricPrecision' }}
                    >
                      {/* Contour de voiture vue profil gauche */}
                      <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-muted-foreground">
                        {/* Carrosserie principale */}
                        <path d="M20 70 L25 50 L35 40 L85 40 L95 50 L100 70 L100 80 L20 80 Z" />
                        {/* Toit */}
                        <path d="M35 40 L40 25 L80 25 L85 40" />
                        {/* Portes */}
                        <line x1="45" y1="40" x2="45" y2="80" strokeDasharray="2,2" />
                        <line x1="75" y1="40" x2="75" y2="80" strokeDasharray="2,2" />
                        {/* Fenêtres */}
                        <path d="M40 25 L42 30 L78 30 L80 25" />
                        <rect x="35" y="45" width="20" height="15" rx="2" />
                        <rect x="65" y="45" width="20" height="15" rx="2" />
                        {/* Roues */}
                        <circle cx="35" cy="85" r="8" />
                        <circle cx="85" cy="85" r="8" />
                        {/* Phares */}
                        <circle cx="95" cy="55" r="3" />
                        {/* Feux arrière */}
                        <circle cx="25" cy="55" r="3" />
                      </g>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                      <div className="bg-primary/90 text-white rounded-full p-2">
                        <Upload className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white rounded-b-xl">
                <p className="text-sm font-medium text-slate-700 mb-1">Profil gauche</p>
                {vehiclePhotos.profileLeft ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-[#16A34A]" />
                      <span className="text-xs text-[#16A34A] font-medium">Ajoutée</span>
                    </div>
                    <button
                      onClick={(e) => {e.stopPropagation(); triggerFileInput('profileLeft');}}
                      className="flex items-center gap-1 text-xs text-[#DC2626] hover:text-red-700 hover:underline transition-all duration-150"
                    >
                      <ArrowRight className="h-3 w-3 rotate-180" />
                      Changer ma photo
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Profil gauche – Angle de vue recommandé</p>
                )}
              </div>
            </div>

            {/* Habitacle intérieur */}
            <div className="group relative border-2 border-dashed border-muted-foreground/25 rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/50">
              <div 
                onClick={() => triggerFileInput('interior')}
                className="relative h-32 w-full cursor-pointer"
              >
                {vehiclePhotos.interior ? (
                  <img 
                    src={getPhotoPreview(vehiclePhotos.interior)} 
                    alt="Habitacle intérieur" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 relative bg-slate-50/50">
                    <svg 
                      viewBox="0 0 120 120" 
                      className="w-full h-full absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity"
                      style={{ imageRendering: 'auto', shapeRendering: 'geometricPrecision' }}
                    >
                      {/* Contour habitacle intérieur */}
                      <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-muted-foreground">
                        {/* Contour habitacle */}
                        <rect x="20" y="25" width="80" height="70" rx="8" />
                        {/* Sièges avant */}
                        <rect x="30" y="35" width="15" height="20" rx="3" />
                        <rect x="75" y="35" width="15" height="20" rx="3" />
                        {/* Sièges arrière */}
                        <rect x="30" y="70" width="60" height="15" rx="3" />
                        {/* Volant */}
                        <circle cx="82" cy="45" r="8" />
                        <circle cx="82" cy="45" r="5" />
                        {/* Tableau de bord */}
                        <path d="M25 30 L95 30 L90 40 L30 40 Z" />
                        {/* Console centrale */}
                        <rect x="50" y="50" width="20" height="25" rx="2" />
                        {/* Portes */}
                        <line x1="20" y1="45" x2="30" y2="45" strokeWidth="2" />
                        <line x1="90" y1="45" x2="100" y2="45" strokeWidth="2" />
                        {/* Vitres */}
                        <rect x="25" y="15" width="70" height="8" rx="2" opacity="0.3" />
                      </g>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                      <div className="bg-primary/90 text-white rounded-full p-2">
                        <Upload className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white rounded-b-xl">
                <p className="text-sm font-medium text-slate-700 mb-1">Habitacle intérieur</p>
                {vehiclePhotos.interior ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-[#16A34A]" />
                      <span className="text-xs text-[#16A34A] font-medium">Ajoutée</span>
                    </div>
                    <button
                      onClick={(e) => {e.stopPropagation(); triggerFileInput('interior');}}
                      className="flex items-center gap-1 text-xs text-[#DC2626] hover:text-red-700 hover:underline transition-all duration-150"
                    >
                      <ArrowRight className="h-3 w-3 rotate-180" />
                      Changer ma photo
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Habitacle intérieur – Angle de vue recommandé</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Photos supplémentaires intégrées */}
          {additionalPhotos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {additionalPhotos.map((photo, index) => (
                <div key={index} className="group relative border-2 border-dashed border-muted-foreground/25 rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/50">
                  <div 
                    onClick={() => triggerAdditionalFileInput(index)}
                    className="relative h-32 w-full cursor-pointer"
                  >
                    {photo ? (
                      <img 
                        src={getPhotoPreview(photo)} 
                        alt={`Photo supplémentaire ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-4 bg-slate-50">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">Ajouter une photo</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white rounded-b-xl">
                    <p className="text-sm font-medium text-slate-700 mb-1">Photo {index + 1}</p>
                    {photo ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-[#16A34A]" />
                          <span className="text-xs text-[#16A34A] font-medium">Ajoutée</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {e.stopPropagation(); triggerAdditionalFileInput(index);}}
                            className="flex items-center gap-1 text-xs text-[#DC2626] hover:text-red-700 hover:underline transition-all duration-150"
                          >
                            <ArrowRight className="h-3 w-3 rotate-180" />
                            Changer ma photo
                          </button>
                          <button
                            onClick={(e) => {e.stopPropagation(); removeAdditionalPhoto(index);}}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-slate-600 hover:underline transition-all duration-150"
                          >
                            <Trash2 className="h-3 w-3" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Optionnel</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Description du véhicule */}
          <div className="mt-8 p-4 border border-slate-200 rounded-xl bg-slate-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h4 className="text-base font-medium text-slate-900 mb-1">Description du véhicule</h4>
                <p className="text-xs text-muted-foreground">
                  Conseil : soyez précis (entretien, options, équipements, restrictions). Évitez les informations personnelles.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDescriptionEdit}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all duration-150"
                  aria-label="Modifier la description"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </button>
                <button
                  onClick={handleDescriptionClear}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-150"
                  aria-label="Supprimer la description"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Effacer
                </button>
                <Button
                  onClick={handleDescriptionSave}
                  size="sm"
                  className="flex items-center gap-1.5 text-xs h-8 px-3 bg-primary hover:bg-primary/90"
                  aria-label="Sauvegarder la description"
                >
                  <Save className="h-3.5 w-3.5" />
                  Enregistrer
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Textarea
                value={vehicleDescription}
                onChange={(e) => {
                  setVehicleDescription(e.target.value);
                  if (e.target.value.length <= 800) {
                    setDescriptionError('');
                  }
                }}
                placeholder={`Bonjour,
Mon véhicule est en excellent état, confortable et économique.
Climatisation, Bluetooth, support téléphone et 3 prises USB disponibles.
Idéal pour vos déplacements en ville comme pour de longs trajets.
N'hésitez pas à me contacter pour toute demande spécifique (mise à dispo flexible, sièges enfants sur demande, etc.).`}
                className="min-h-[140px] max-h-[300px] resize-none bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                style={{ 
                  resize: 'vertical',
                  minHeight: '140px'
                }}
                readOnly={!isDescriptionEditing}
              />
              
              <div className="flex justify-between items-center">
                {descriptionError && (
                  <p className="text-xs text-red-600">{descriptionError}</p>
                )}
                <div className="ml-auto">
                  <span className={`text-xs ${vehicleDescription.length > 800 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {vehicleDescription.length}/800
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            💡 Ajoutez des photos de qualité pour attirer plus de locataires
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Ajouter un véhicule</h1>
          <p className="text-muted-foreground">
            Remplissez les informations de votre nouveau véhicule en quelques minutes
          </p>
        </div>

        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Étape {currentStep} sur 3
            </span>
            <span className="text-sm text-muted-foreground">
              {getStepTitle()}
            </span>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-2" />
        </div>

        {/* Contenu des étapes */}
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Boutons de navigation */}
        <div className="px-4 sm:px-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
            {currentStep > 1 ? (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="flex items-center justify-center gap-2 h-12 w-full sm:w-auto sm:min-w-[180px] order-2 sm:order-1 border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Étape précédente
              </Button>
            ) : (
              <div className="hidden sm:block"></div>
            )}
            
            <div className="order-1 sm:order-2 w-full sm:w-auto">
              {currentStep < 3 ? (
                <Button 
                  onClick={nextStep}
                  className="w-full sm:w-auto sm:min-w-[180px] bg-gradient-lagoon hover:opacity-90 text-white flex items-center justify-center gap-2 h-12"
                >
                  Étape suivante
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full sm:w-auto sm:min-w-[180px] bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 h-12 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Ajouter le véhicule
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AddVehicle;
