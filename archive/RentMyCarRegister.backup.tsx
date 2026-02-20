import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { OwnerLocationDropdown } from '@/components/ui/owner-location-dropdown';
import { MultiCitySelector } from '@/components/ui/multi-city-selector';
import { Car, Upload, FileText, Calendar as CalendarIcon, Camera, CheckCircle, ArrowLeft, ArrowRight, Trash2, Plus, Edit, Save, MapPin, Plane, Ship, Clock, AlertTriangle, Truck, Baby, UserPlus, ArrowDownToLine, ArrowUpFromLine, Info, Gift, Euro } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { ProfileService } from "@/services/supabase/profile";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import { UserRoleUtils } from "@/types";

// Import placeholder images
import photoAvGauchePlaceholder from "@/assets/photo-av-gauche-placeholder.png";
import photoProfilPlaceholder from "@/assets/photo-profil-placeholder.png";
import photoHabitaclePlaceholder from "@/assets/photo-habitacle-placeholder.png";


const RentMyCar = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
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
  const [profileAvatar, setProfileAvatar] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    // Étape 1 - Véhicule & infos
    licensePlate: '',
    brand: '',
    model: '',
    color: '',
    year: '',
    mileage: '',
    fuel: '',
    transmission: '',
    seats: '',
    doors: '',
    hasAC: false,
    // Infos personnelles
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    parkingLocation: '',
    // Étape 2 - Conditions
    dailyPrice: '',
    lowSeasonDiscount: '',
    highSeasonSurcharge: '',
    longTermDiscount14: '',
    longTermDiscount60: '',
    minAdvanceHours: '',
    minRentalDays: '',
    maxRentalDays: '',
    // Zones de prise en charge
    pickupZones: [],
    // Options supplémentaires payantes
    airportPickupService: false,
    airportPickupRetrieval: false, // Retrait véhicule à l'aéroport
    airportPickupRetrievalFree: true, // Service gratuit par défaut
    airportPickupRetrievalPrice: '25', // Prix retrait aéroport
    airportPickupReturn: false,    // Restitution véhicule à l'aéroport
    airportPickupReturnFree: true, // Service gratuit par défaut
    airportPickupReturnPrice: '25', // Prix restitution aéroport
    bargePetiteTerreService: false,
    bargePetiteTerreRetrieval: false, // Retrait véhicule à la barge Petite Terre
    bargePetiteTerreRetrievalFree: true, // Service gratuit par défaut
    bargePetiteTerreRetrievalPrice: '15', // Prix retrait barge Petite Terre
    bargePetiteTerreReturn: false,    // Restitution véhicule à la barge Petite Terre
    bargePetiteTerreReturnFree: true, // Service gratuit par défaut
    bargePetiteTerreReturnPrice: '15', // Prix restitution barge Petite Terre
    bargeGrandeTerreService: false,
    bargeGrandeTerreRetrieval: false, // Retrait véhicule à la barge Grande Terre
    bargeGrandeTerreRetrievalFree: true, // Service gratuit par défaut
    bargeGrandeTerreRetrievalPrice: '15', // Prix retrait barge Grande Terre
    bargeGrandeTerreReturn: false,    // Restitution véhicule à la barge Grande Terre
    bargeGrandeTerreReturnFree: true, // Service gratuit par défaut
    bargeGrandeTerreReturnPrice: '15', // Prix restitution barge Grande Terre
    homeDeliveryService: false,
    homeDeliveryPickup: false, // Livraison à domicile (prise en charge)
    homeDeliveryPickupFree: true, // Service gratuit par défaut
    homeDeliveryPickupPrice: '20', // Prix livraison à domicile
    homeDeliveryReturn: false, // Récupération à domicile
    homeDeliveryReturnFree: true, // Service gratuit par défaut
    homeDeliveryReturnPrice: '20', // Prix récupération à domicile
    babySeatService: false,
    babySeatPrice: '1', // Prix siège bébé par jour
    additionalDriverService: false,
    additionalDriverPrice: '15', // Prix conducteur additionnel par jour
    photos: [],
    identityFiles: []
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarUpload = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image valide.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur", 
        description: "La photo de profil doit faire moins de 5MB.",
        variant: "destructive"
      });
      return;
    }

    setProfileAvatar(file);
    toast({
      title: "Photo de profil ajoutée",
      description: "Votre photo de profil a été mise à jour.",
    });
  };

  const getAvatarPreview = () => {
    if (profileAvatar) {
      return URL.createObjectURL(profileAvatar);
    }
    return null;
  };

  const triggerAvatarFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleAvatarUpload(file);
      }
    };
    input.click();
  };

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

  // Vérifier si les 3 photos obligatoires sont uploadées
  const areRequiredPhotosUploaded = () => {
    return vehiclePhotos.frontLeft && vehiclePhotos.profileLeft && vehiclePhotos.interior;
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
    
    setIsDescriptionEditing(false);
    toast({
      title: "Description enregistrée",
      description: "La description de votre véhicule a été sauvegardée.",
    });
  };

  const handleDescriptionClear = () => {
    if (window.confirm('Effacer la description ?')) {
      setVehicleDescription('');
      setDescriptionError('');
      toast({
        title: "Description effacée",
        description: "La description a été supprimée.",
      });
    }
  };

  const handleDescriptionEdit = () => {
    setIsDescriptionEditing(true);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Récupérer l'utilisateur actuel depuis Supabase
      const userResult = await ProfileService.getCurrentUserProfile();
      
      if (!userResult.data) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour publier un véhicule",
          variant: "destructive",
        });
        return;
      }

      const currentUser = userResult.data;

      // Vérifier si l'utilisateur peut créer des véhicules
      if (!UserRoleUtils.canCreateVehicles(currentUser)) {
        // Mettre à jour le rôle vers 'owner' si l'utilisateur n'a pas déjà un rôle élevé
        if (currentUser.roles.includes('renter') || !currentUser.roles.includes('admin')) {
          const roleResult = await ProfileService.updateUserRole(currentUser.id, 'owner');
          if (roleResult.error) {
            toast({
              title: "Erreur",
              description: "Impossible de mettre à jour le rôle propriétaire",
              variant: "destructive",
            });
            return;
          }
          
          toast({
            title: "Rôle mis à jour",
            description: "Vous êtes maintenant propriétaire !",
          });
        }
      }

      // Validation des champs obligatoires
      if (!formData.brand || !formData.model || !formData.color || !formData.year || !formData.dailyPrice) {
        toast({
          title: "Champs manquants",
          description: "Veuillez remplir tous les champs obligatoires (marque, modèle, couleur, année, prix)",
          variant: "destructive",
        });
        return;
      }

      // Créer le véhicule dans Supabase
      const vehicleResult = await SupabaseVehiclesService.createVehicle({
        owner_id: currentUser.id,
        brand: formData.brand,
        model: formData.model,
        color: formData.color,
        year: parseInt(formData.year, 10), // Base 10 explicite
        mileage: parseInt(formData.mileage) || undefined,
        price_per_day: parseFloat(formData.dailyPrice),
        description: vehicleDescription || undefined,
        location: formData.address || undefined,
        seats: parseInt(formData.seats) || undefined,
        transmission: formData.transmission || undefined,
        fuel_type: formData.fuel || undefined,
        image_url: null, // Sera mis à jour après l'upload des photos
      });
      
      if (!vehicleResult.data) {
        toast({
          title: "Erreur",
          description: vehicleResult.error || "Impossible de créer le véhicule",
          variant: "destructive",
        });
        return;
      }

      const vehicleId = vehicleResult.data.id;
      let primaryImageUrl: string | null = null;

      // Upload des photos obligatoires
      const photoUploads = [];
      
      if (vehiclePhotos.frontLeft) {
        photoUploads.push({
          file: vehiclePhotos.frontLeft,
          vehicleId,
          photoType: 'frontLeft' as const,
        });
      }
      
      if (vehiclePhotos.profileLeft) {
        photoUploads.push({
          file: vehiclePhotos.profileLeft,
          vehicleId,
          photoType: 'profileLeft' as const,
        });
      }
      
      if (vehiclePhotos.interior) {
        photoUploads.push({
          file: vehiclePhotos.interior,
          vehicleId,
          photoType: 'interior' as const,
        });
      }

      // Upload des photos supplémentaires
      additionalPhotos.forEach((photo, index) => {
        if (photo) {
          photoUploads.push({
            file: photo,
            vehicleId,
            photoType: 'additional' as const,
          });
        }
      });

      // Upload de toutes les photos
      if (photoUploads.length > 0) {
        const photoResult = await PhotoService.uploadMultiplePhotos(photoUploads);
        
        if (photoResult.data.length > 0) {
          // Utiliser la première photo (frontLeft) comme image principale
          primaryImageUrl = photoResult.data[0].url;
          
          // Mettre à jour le véhicule avec l'image principale
          await SupabaseVehiclesService.updateVehicleImage(vehicleId, primaryImageUrl);
        }

        if (photoResult.errors.length > 0) {
          console.warn('Erreurs lors de l\'upload de certaines photos:', photoResult.errors);
          toast({
            title: "Attention",
            description: `${photoResult.errors.length} photo(s) n'ont pas pu être uploadées`,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Succès",
        description: "Votre véhicule a été publié avec succès !",
      });
      
      // Afficher les données dans la console pour debug
      console.log('Véhicule créé:', vehicleResult.data);
      console.log('Photos uploadées:', photoUploads.length);
      console.log('Image principale:', primaryImageUrl);
      console.log('Données du formulaire:', formData);
      console.log('Description:', vehicleDescription);
      
      // Redirection vers la liste des véhicules
      navigate('/me/owner/vehicles');
    } catch (error) {
      console.error("Erreur lors de la publication du véhicule:", error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Mon véhicule & mes infos';
      case 2: return 'Mes conditions de location';
      case 3: return 'Mes disponibilités & mes photos';
      case 4: return 'Confirmation finale';
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
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                  Équipements
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm">❄️</span>
                      </div>
                      <Label className="text-sm font-medium text-slate-700 cursor-pointer">Climatisation</Label>
                    </div>
                    <Switch 
                      checked={formData.hasAC}
                      onCheckedChange={(value) => updateField('hasAC', value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle>Vos informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4 pb-6 border-b border-slate-200">
            <div className="relative">
              <div 
                className="w-24 h-24 rounded-full border-2 border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors"
                onClick={triggerAvatarFileInput}
              >
                {getAvatarPreview() ? (
                  <img 
                    src={getAvatarPreview()!} 
                    alt="Photo de profil du propriétaire" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <Camera className="h-8 w-8 text-slate-400" />
                  </div>
                )}
              </div>
              <button
                onClick={triggerAvatarFileInput}
                className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5 hover:bg-primary/90 transition-colors"
                aria-label="Changer la photo de profil"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Photo de profil</p>
              <p className="text-xs text-slate-500">Cliquez pour changer</p>
            </div>
          </div>

          {/* Personal Info Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Votre prénom"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Votre nom"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="votre@email.com"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className="w-full"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Rue de la Paix, 75001 Paris"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville *</Label>
              <OwnerLocationDropdown
                value={formData.city}
                onChange={(value) => updateField('city', value)}
                placeholder="Sélectionner votre ville"
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Vérification identité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Vérification d'identité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            🔒 Vos documents sont chiffrés et stockés de manière sécurisée conformément au RGPD. 
            Ils ne sont utilisés que pour la vérification d'identité.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Pièce d'identité (recto)</p>
              <p className="text-xs text-muted-foreground">CNI, Passeport</p>
            </div>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Pièce d'identité (verso)</p>
              <p className="text-xs text-muted-foreground">Si applicable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Fonction utilitaire pour calculer les prix avec validation
  const calculatePrice = (basePrice: string, percentage: string, isDiscount: boolean = true) => {
    const base = parseFloat(basePrice) || 0;
    let percent = parseFloat(percentage) || 0;
    
    if (base <= 0) return null;
    
    // Clamping des pourcentages
    if (isDiscount) {
      percent = Math.max(0, Math.min(100, percent));
    } else {
      percent = Math.max(0, Math.min(200, percent));
    }
    
    const calculation = isDiscount 
      ? base * (1 - percent / 100)
      : base * (1 + percent / 100);
    
    return Math.round(calculation * 100) / 100;
  };

  // Fonction pour formater le prix avec 2 décimales
  const formatPrice = (price: number | null) => {
    if (price === null) return null;
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

      {/* Zones de prise en charge */}
      <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 border-b border-primary/20">
          <CardTitle className="flex items-center gap-3 text-[22px] font-semibold text-foreground">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            Zones de prise en charge
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 bg-gradient-to-br from-background to-muted/5">
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                🎯 Sélectionnez les villes où vous acceptez de prendre en charge vos clients pour la location de votre véhicule.
              </p>
            </div>
            
            {/* Sélecteur de villes multiples avec design premium */}
            <MultiCitySelector
              selectedCities={formData.pickupZones}
              onChange={(cities) => {
                updateField('pickupZones', cities);
                
                // Activer automatiquement les services correspondants
                if (cities.includes("Aéroport")) {
                  updateField('airportPickupService', true);
                  updateField('airportPickupRetrieval', true);
                  updateField('airportPickupReturn', true);
                } else {
                  updateField('airportPickupService', false);
                  updateField('airportPickupRetrieval', false);
                  updateField('airportPickupReturn', false);
                }
                
                if (cities.includes("Barge Petite Terre")) {
                  updateField('bargePetiteTerreService', true);
                  updateField('bargePetiteTerreRetrieval', true);
                  updateField('bargePetiteTerreReturn', true);
                } else {
                  updateField('bargePetiteTerreService', false);
                  updateField('bargePetiteTerreRetrieval', false);
                  updateField('bargePetiteTerreReturn', false);
                }
                
                if (cities.includes("Barge Grande Terre")) {
                  updateField('bargeGrandeTerreService', true);
                  updateField('bargeGrandeTerreRetrieval', true);
                  updateField('bargeGrandeTerreReturn', true);
                } else {
                  updateField('bargeGrandeTerreService', false);
                  updateField('bargeGrandeTerreRetrieval', false);
                  updateField('bargeGrandeTerreReturn', false);
                }
              }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-primary/20"
            />
            
            {/* Aide avec design moderne */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-slate-50 to-green-50/20 rounded-xl border border-slate-200">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100/50 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">💡</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Conseil d'expert</p>
                <p className="text-xs text-slate-600">
                  Sélectionnez les villes où vous pouvez facilement vous déplacer pour récupérer et rendre votre véhicule. 
                  Cela améliore significativement votre visibilité dans les résultats de recherche et augmente vos chances de réservation.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options supplémentaires payantes */}
      <Card className="relative z-10 overflow-hidden border-2 border-primary/20 shadow-lg mb-8">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 border-b border-primary/20">
          <CardTitle className="flex items-center gap-3 text-[22px] font-semibold text-foreground">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            Options supplémentaires payantes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-8 bg-gradient-to-br from-background to-muted/5">
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800 font-medium">
                💰 Proposez des services premium à vos clients contre un supplément tarifaire
              </p>
            </div>
            
            {/* Services disponibles uniquement si des zones sont sélectionnées */}
            {formData.pickupZones.length > 0 ? (
              <div className="space-y-4">
              {/* Services conditionnels selon les zones sélectionnées */}
              
              {/* Service Aéroport - Version améliorée UX */}
              {formData.pickupZones.includes("Aéroport") && (
                <div className="relative">
                  {/* Service principal avec groupement visuel amélioré */}
                  <div className="relative p-1 bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 rounded-2xl border-2 border-blue-200 shadow-lg">
                    {/* Service principal */}
                    <div className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-blue-200/50 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
                          <Plane className="h-6 w-6 text-blue-700" />
                    </div>
                    <div>
                          <h4 className="text-base font-bold text-blue-900 flex items-center gap-2">
                            Dépôt/Restitution Aéroport
                            <div className="relative group">
                              <Info className="h-4 w-4 text-blue-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-blue-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                                Service complet de prise en charge et retour
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-blue-900"></div>
                              </div>
                            </div>
                          </h4>
                          <p className="text-sm text-blue-700 font-medium">Service de prise en charge et retour à l'aéroport</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.airportPickupService}
                        onCheckedChange={(checked) => {
                          updateField('airportPickupService', checked);
                          if (!checked) {
                            updateField('airportPickupRetrieval', false);
                            updateField('airportPickupReturn', false);
                          }
                        }}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                      />
                    </div>
                    
                    {/* Ligne de connexion visuelle */}
                    {formData.airportPickupService && (
                      <div className="flex justify-center py-2">
                        <div className="w-0.5 h-6 bg-gradient-to-b from-blue-300 to-blue-400 rounded-full"></div>
                </div>
              )}

                    {/* Sous-menus avec design amélioré */}
                    {formData.airportPickupService && (
                      <div className="space-y-3 px-4 pb-4">
                        {/* Retrait véhicule */}
                        <div className="relative">
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border-2 border-blue-300 rounded-full flex items-center justify-center z-10">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <div className="ml-8 p-4 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-blue-200/70 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg">
                                  <ArrowDownToLine className="h-4 w-4 text-green-700" />
                    </div>
                    <div>
                                  <h5 className="text-sm font-bold text-green-800">Retrait véhicule à l'aéroport</h5>
                                  <p className="text-xs text-green-600 font-medium">Les clients récupèrent votre véhicule à l'aéroport</p>
                                </div>
                              </div>
                              <Switch
                                checked={formData.airportPickupRetrieval}
                                onCheckedChange={(checked) => updateField('airportPickupRetrieval', checked)}
                                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                              />
                            </div>
                            {formData.airportPickupRetrieval && (
                              <div className="space-y-3 pl-4 border-l-2 border-green-200">
                                {/* Toggle Gratuit/Payant */}
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                  <div className="flex items-center gap-2">
                                    <Gift className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Gratuit</span>
                                  </div>
                                  <Switch
                                    checked={!formData.airportPickupRetrievalFree}
                                    onCheckedChange={(checked) => updateField('airportPickupRetrievalFree', !checked)}
                                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Euro className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Payant</span>
                                  </div>
                                </div>

                                {/* Champ de prix (affiché seulement si payant) */}
                                {!formData.airportPickupRetrievalFree && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <Label className="text-sm text-green-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          value={formData.airportPickupRetrievalPrice}
                                          onChange={(e) => updateField('airportPickupRetrievalPrice', e.target.value)}
                                          min="0"
                                          step="0.01"
                                          className="w-20 h-8 text-sm text-center border-2 border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 font-semibold"
                                        />
                                        <span className="text-sm text-green-700 font-bold">€</span>
                                        <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                          Standard: 25€
                                        </div>
                                      </div>
                                    </div>
                                    {parseFloat(formData.airportPickupRetrievalPrice) > 25 && (
                                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                        <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                        <div>
                                          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                          <p className="text-xs text-amber-700">
                                            Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">25€</span>.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Restitution véhicule */}
                        <div className="relative">
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border-2 border-blue-300 rounded-full flex items-center justify-center z-10">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <div className="ml-8 p-4 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-blue-200/70 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-200 rounded-lg">
                                  <ArrowUpFromLine className="h-4 w-4 text-purple-700" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-purple-800">Restitution véhicule à l'aéroport</h5>
                                  <p className="text-xs text-purple-600 font-medium">Les clients laissent votre véhicule à l'aéroport</p>
                                </div>
                              </div>
                              <Switch
                                checked={formData.airportPickupReturn}
                                onCheckedChange={(checked) => updateField('airportPickupReturn', checked)}
                                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                              />
                            </div>
                            {formData.airportPickupReturn && (
                              <div className="space-y-3 pl-4 border-l-2 border-purple-200">
                                {/* Toggle Gratuit/Payant */}
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                                  <div className="flex items-center gap-2">
                                    <Gift className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-700">Gratuit</span>
                                  </div>
                                  <Switch
                                    checked={!formData.airportPickupReturnFree}
                                    onCheckedChange={(checked) => updateField('airportPickupReturnFree', !checked)}
                                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Euro className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-700">Payant</span>
                                  </div>
                                </div>

                                {/* Champ de prix (affiché seulement si payant) */}
                                {!formData.airportPickupReturnFree && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <Label className="text-sm text-purple-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          value={formData.airportPickupReturnPrice}
                                          onChange={(e) => updateField('airportPickupReturnPrice', e.target.value)}
                                          min="0"
                                          step="0.01"
                                          className="w-20 h-8 text-sm text-center border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-semibold"
                                        />
                                        <span className="text-sm text-purple-700 font-bold">€</span>
                                        <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                                          Standard: 25€
                                        </div>
                                      </div>
                                    </div>
                                    {parseFloat(formData.airportPickupReturnPrice) > 25 && (
                                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                        <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                        <div>
                                          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                          <p className="text-xs text-amber-700">
                                            Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">25€</span>.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Barge Petite Terre - Version améliorée UX */}
              {formData.pickupZones.includes("Barge Petite Terre") && (
                <div className="relative">
                  {/* Service principal avec groupement visuel amélioré */}
                  <div className="relative p-1 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 rounded-2xl border-2 border-green-200 shadow-lg">
                    {/* Service principal */}
                    <div className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-green-200/50 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-sm">
                          <Ship className="h-6 w-6 text-green-700" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-green-900 flex items-center gap-2">
                            Dépôt/Restitution Barge Petite Terre
                            <div className="relative group">
                              <Info className="h-4 w-4 text-green-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-green-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                                Service de liaison maritime Petite Terre
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-green-900"></div>
                              </div>
                            </div>
                          </h4>
                          <p className="text-sm text-green-700 font-medium">Service de prise en charge et retour à la barge Petite Terre</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.bargePetiteTerreService}
                        onCheckedChange={(checked) => {
                          updateField('bargePetiteTerreService', checked);
                          if (!checked) {
                            updateField('bargePetiteTerreRetrieval', false);
                            updateField('bargePetiteTerreReturn', false);
                          }
                        }}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                      />
                    </div>
                  
                    {/* Ligne de connexion visuelle */}
                    {formData.bargePetiteTerreService && (
                      <div className="flex justify-center py-2">
                        <div className="w-0.5 h-6 bg-gradient-to-b from-green-300 to-green-400 rounded-full"></div>
                </div>
              )}

                    {/* Sous-menus avec design amélioré */}
                    {formData.bargePetiteTerreService && (
                      <div className="space-y-3 px-4 pb-4">
                        {/* Retrait véhicule */}
                        <div className="relative">
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border-2 border-green-300 rounded-full flex items-center justify-center z-10">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                          <div className="ml-8 p-4 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-green-200/70 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                                  <ArrowDownToLine className="h-4 w-4 text-blue-700" />
                    </div>
                    <div>
                                  <h5 className="text-sm font-bold text-blue-800">Retrait véhicule à la barge Petite Terre</h5>
                                  <p className="text-xs text-blue-600 font-medium">Les clients récupèrent votre véhicule à la barge Petite Terre</p>
                                </div>
                              </div>
                              <Switch
                                checked={formData.bargePetiteTerreRetrieval}
                                onCheckedChange={(checked) => updateField('bargePetiteTerreRetrieval', checked)}
                                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                              />
                            </div>
                            {formData.bargePetiteTerreRetrieval && (
                              <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                                {/* Toggle Gratuit/Payant */}
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2">
                                    <Gift className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-700">Gratuit</span>
                                  </div>
                                  <Switch
                                    checked={!formData.bargePetiteTerreRetrievalFree}
                                    onCheckedChange={(checked) => updateField('bargePetiteTerreRetrievalFree', !checked)}
                                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Euro className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-700">Payant</span>
                                  </div>
                                </div>

                                {/* Champ de prix (affiché seulement si payant) */}
                                {!formData.bargePetiteTerreRetrievalFree && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <Label className="text-sm text-blue-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          value={formData.bargePetiteTerreRetrievalPrice}
                                          onChange={(e) => updateField('bargePetiteTerreRetrievalPrice', e.target.value)}
                                          min="0"
                                          step="0.01"
                                          className="w-20 h-8 text-sm text-center border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 font-semibold"
                                        />
                                        <span className="text-sm text-blue-700 font-bold">€</span>
                                        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                                          Standard: 15€
                                        </div>
                                      </div>
                                    </div>
                                    {parseFloat(formData.bargePetiteTerreRetrievalPrice) > 15 && (
                                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                        <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                        <div>
                                          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                          <p className="text-xs text-amber-700">
                                            Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">15€</span>.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Restitution véhicule */}
                        <div className="relative">
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border-2 border-green-300 rounded-full flex items-center justify-center z-10">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                          <div className="ml-8 p-4 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-green-200/70 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg">
                                  <ArrowUpFromLine className="h-4 w-4 text-orange-700" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-orange-800">Restitution véhicule à la barge Petite Terre</h5>
                                  <p className="text-xs text-orange-600 font-medium">Les clients laissent votre véhicule à la barge Petite Terre</p>
                                </div>
                              </div>
                              <Switch
                                checked={formData.bargePetiteTerreReturn}
                                onCheckedChange={(checked) => updateField('bargePetiteTerreReturn', checked)}
                                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-orange-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                              />
                            </div>
                            {formData.bargePetiteTerreReturn && (
                              <div className="space-y-3 pl-4 border-l-2 border-orange-200">
                                {/* Toggle Gratuit/Payant */}
                                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-orange-50 rounded-lg border border-orange-200">
                                  <div className="flex items-center gap-2">
                                    <Gift className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-700">Gratuit</span>
                                  </div>
                                  <Switch
                                    checked={!formData.bargePetiteTerreReturnFree}
                                    onCheckedChange={(checked) => updateField('bargePetiteTerreReturnFree', !checked)}
                                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-500 data-[state=checked]:to-orange-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Euro className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium text-orange-700">Payant</span>
                                  </div>
                                </div>

                                {/* Champ de prix (affiché seulement si payant) */}
                                {!formData.bargePetiteTerreReturnFree && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <Label className="text-sm text-orange-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          value={formData.bargePetiteTerreReturnPrice}
                                          onChange={(e) => updateField('bargePetiteTerreReturnPrice', e.target.value)}
                                          min="0"
                                          step="0.01"
                                          className="w-20 h-8 text-sm text-center border-2 border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 font-semibold"
                                        />
                                        <span className="text-sm text-orange-700 font-bold">€</span>
                                        <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                                          Standard: 15€
                                        </div>
                                      </div>
                                    </div>
                                    {parseFloat(formData.bargePetiteTerreReturnPrice) > 15 && (
                                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                        <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                        <div>
                                          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                          <p className="text-xs text-amber-700">
                                            Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">15€</span>.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Barge Grande Terre - Version améliorée UX */}
              {formData.pickupZones.includes("Barge Grande Terre") && (
                <div className="relative">
                  {/* Service principal avec groupement visuel amélioré */}
                  <div className="relative p-1 bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-100 rounded-2xl border-2 border-teal-200 shadow-lg">
                    {/* Service principal */}
                    <div className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-teal-200/50 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl shadow-sm">
                          <Ship className="h-6 w-6 text-teal-700" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-teal-900 flex items-center gap-2">
                            Dépôt/Restitution Barge Grande Terre
                            <div className="relative group">
                              <Info className="h-4 w-4 text-teal-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-teal-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                                Service de liaison maritime Grande Terre
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-teal-900"></div>
                              </div>
                            </div>
                          </h4>
                          <p className="text-sm text-teal-700 font-medium">Service de prise en charge et retour à la barge Grande Terre</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.bargeGrandeTerreService}
                        onCheckedChange={(checked) => {
                          updateField('bargeGrandeTerreService', checked);
                          if (!checked) {
                            updateField('bargeGrandeTerreRetrieval', false);
                            updateField('bargeGrandeTerreReturn', false);
                          }
                        }}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-teal-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                      />
                    </div>
                  
                  {/* Sous-menus */}
                  {formData.bargeGrandeTerreService && (
                    <div className="ml-8 space-y-2">
                      {/* Retrait véhicule */}
                      <div className="space-y-3 p-3 bg-teal-25 rounded-lg border border-teal-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-medium text-teal-700">Retrait véhicule à la barge Grande Terre</h5>
                            <p className="text-xs text-teal-600">Les clients récupèrent votre véhicule à la barge Grande Terre</p>
                          </div>
                          <Switch
                            checked={formData.bargeGrandeTerreRetrieval}
                            onCheckedChange={(checked) => updateField('bargeGrandeTerreRetrieval', checked)}
                            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-teal-600 data-[state=unchecked]:bg-slate-200 transition-all duration-300 ease-in-out scale-110"
                          />
                        </div>
                        {formData.bargeGrandeTerreRetrieval && (
                          <div className="space-y-3 pl-4 border-l-2 border-teal-200">
                            {/* Toggle Gratuit/Payant */}
                            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-teal-50 rounded-lg border border-teal-200">
                              <div className="flex items-center gap-2">
                                <Gift className="h-4 w-4 text-teal-600" />
                                <span className="text-sm font-medium text-teal-700">Gratuit</span>
                              </div>
                              <Switch
                                checked={!formData.bargeGrandeTerreRetrievalFree}
                                onCheckedChange={(checked) => updateField('bargeGrandeTerreRetrievalFree', !checked)}
                                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-teal-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                              />
                              <div className="flex items-center gap-2">
                                <Euro className="h-4 w-4 text-teal-600" />
                                <span className="text-sm font-medium text-teal-700">Payant</span>
                              </div>
                            </div>

                            {/* Champ de prix (affiché seulement si payant) */}
                            {!formData.bargeGrandeTerreRetrievalFree && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <Label className="text-sm text-teal-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={formData.bargeGrandeTerreRetrievalPrice}
                                      onChange={(e) => updateField('bargeGrandeTerreRetrievalPrice', e.target.value)}
                                      min="0"
                                      step="0.01"
                                      className="w-20 h-8 text-sm text-center border-2 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-semibold"
                                    />
                                    <span className="text-sm text-teal-700 font-bold">€</span>
                                    <div className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-bold">
                                      Standard: 15€
                                    </div>
                                  </div>
                                </div>
                                {parseFloat(formData.bargeGrandeTerreRetrievalPrice) > 15 && (
                                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                    <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                      <p className="text-xs text-amber-700">
                                        Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">15€</span>.
                                      </p>
                                    </div>
                </div>
              )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Restitution véhicule */}
                      <div className="space-y-3 p-3 bg-teal-25 rounded-lg border border-teal-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-medium text-teal-700">Restitution véhicule à la barge Grande Terre</h5>
                            <p className="text-xs text-teal-600">Les clients laissent votre véhicule à la barge Grande Terre</p>
                          </div>
                          <Switch
                            checked={formData.bargeGrandeTerreReturn}
                            onCheckedChange={(checked) => updateField('bargeGrandeTerreReturn', checked)}
                            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-teal-600 data-[state=unchecked]:bg-slate-200 transition-all duration-300 ease-in-out scale-110"
                          />
                        </div>
                        {formData.bargeGrandeTerreReturn && (
                          <div className="space-y-3 pl-4 border-l-2 border-teal-200">
                            {/* Toggle Gratuit/Payant */}
                            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-teal-50 rounded-lg border border-teal-200">
                              <div className="flex items-center gap-2">
                                <Gift className="h-4 w-4 text-teal-600" />
                                <span className="text-sm font-medium text-teal-700">Gratuit</span>
                              </div>
                              <Switch
                                checked={!formData.bargeGrandeTerreReturnFree}
                                onCheckedChange={(checked) => updateField('bargeGrandeTerreReturnFree', !checked)}
                                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-teal-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                              />
                              <div className="flex items-center gap-2">
                                <Euro className="h-4 w-4 text-teal-600" />
                                <span className="text-sm font-medium text-teal-700">Payant</span>
                              </div>
                            </div>

                            {/* Champ de prix (affiché seulement si payant) */}
                            {!formData.bargeGrandeTerreReturnFree && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <Label className="text-sm text-teal-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={formData.bargeGrandeTerreReturnPrice}
                                      onChange={(e) => updateField('bargeGrandeTerreReturnPrice', e.target.value)}
                                      min="0"
                                      step="0.01"
                                      className="w-20 h-8 text-sm text-center border-2 border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-200 font-semibold"
                                    />
                                    <span className="text-sm text-teal-700 font-bold">€</span>
                                    <div className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-bold">
                                      Standard: 15€
                                    </div>
                                  </div>
                                </div>
                                {parseFloat(formData.bargeGrandeTerreReturnPrice) > 15 && (
                                  <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                    <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                      <p className="text-xs text-amber-700">
                                        Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">15€</span>.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* Service Livraison à domicile */}
              <div className="space-y-3">
                {/* Service principal */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                      <Truck className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                      <h4 className="text-sm font-semibold text-purple-800">Livraison à domicile</h4>
                      <p className="text-xs text-purple-600">Service de livraison et récupération de véhicule à domicile</p>
                  </div>
                </div>
                <Switch
                    checked={formData.homeDeliveryService}
                    onCheckedChange={(checked) => {
                      updateField('homeDeliveryService', checked);
                      // Désactiver les sous-services si le service principal est désactivé
                      if (!checked) {
                        updateField('homeDeliveryPickup', false);
                        updateField('homeDeliveryReturn', false);
                      } else {
                        // Activer automatiquement les sous-services avec prix par défaut
                        updateField('homeDeliveryPickup', true);
                        updateField('homeDeliveryReturn', true);
                      }
                    }}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

                {/* Sous-menus */}
                {formData.homeDeliveryService && (
                  <div className="ml-8 space-y-2">
                    {/* Livraison à domicile */}
                    <div className="space-y-3 p-3 bg-purple-25 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium text-purple-700">Livraison à domicile</h5>
                          <p className="text-xs text-purple-600">Vous livrez votre véhicule au client à son domicile</p>
                        </div>
                        <Switch
                          checked={formData.homeDeliveryPickup}
                          onCheckedChange={(checked) => updateField('homeDeliveryPickup', checked)}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-purple-600 data-[state=unchecked]:bg-slate-200 transition-all duration-300 ease-in-out scale-110"
                        />
                      </div>
                      {formData.homeDeliveryPickup && (
                        <div className="space-y-3 pl-4 border-l-2 border-purple-200">
                          {/* Toggle Gratuit/Payant */}
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-700">Gratuit</span>
                            </div>
                            <Switch
                              checked={!formData.homeDeliveryPickupFree}
                              onCheckedChange={(checked) => updateField('homeDeliveryPickupFree', !checked)}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-purple-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                            />
                            <div className="flex items-center gap-2">
                              <Euro className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-700">Payant</span>
                            </div>
                          </div>

                          {/* Champ de prix (affiché seulement si payant) */}
                          {!formData.homeDeliveryPickupFree && (
                            <div className="space-y-3">
                <div className="flex items-center gap-3">
                                <Label className="text-sm text-purple-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={formData.homeDeliveryPickupPrice}
                                    onChange={(e) => updateField('homeDeliveryPickupPrice', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="w-20 h-8 text-sm text-center border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-semibold"
                                  />
                                  <span className="text-sm text-purple-700 font-bold">€</span>
                                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                                    Standard: 20€
                  </div>
                                </div>
                              </div>
                              {parseFloat(formData.homeDeliveryPickupPrice) > 20 && (
                                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                  <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                                    <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                    <p className="text-xs text-amber-700">
                                      Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">20€</span>.
                                    </p>
                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Récupération à domicile */}
                    <div className="space-y-3 p-3 bg-purple-25 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between">
                  <div>
                          <h5 className="text-sm font-medium text-purple-700">Récupération à domicile</h5>
                          <p className="text-xs text-purple-600">Vous récupérez votre voiture au domicile du client</p>
                </div>
                <Switch
                          checked={formData.homeDeliveryReturn}
                          onCheckedChange={(checked) => updateField('homeDeliveryReturn', checked)}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-purple-600 data-[state=unchecked]:bg-slate-200 transition-all duration-300 ease-in-out scale-110"
                />
              </div>
                      {formData.homeDeliveryReturn && (
                        <div className="space-y-3 pl-4 border-l-2 border-purple-200">
                          {/* Toggle Gratuit/Payant */}
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-700">Gratuit</span>
                            </div>
                            <Switch
                              checked={!formData.homeDeliveryReturnFree}
                              onCheckedChange={(checked) => updateField('homeDeliveryReturnFree', !checked)}
                              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-purple-600 data-[state=unchecked]:bg-slate-300 transition-all duration-300 scale-110"
                            />
                            <div className="flex items-center gap-2">
                              <Euro className="h-4 w-4 text-purple-600" />
                              <span className="text-sm font-medium text-purple-700">Payant</span>
                            </div>
                          </div>

                          {/* Champ de prix (affiché seulement si payant) */}
                          {!formData.homeDeliveryReturnFree && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Label className="text-sm text-purple-700 font-semibold whitespace-nowrap">Prix de la prestation :</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={formData.homeDeliveryReturnPrice}
                                    onChange={(e) => updateField('homeDeliveryReturnPrice', e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="w-20 h-8 text-sm text-center border-2 border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-semibold"
                                  />
                                  <span className="text-sm text-purple-700 font-bold">€</span>
                                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                                    Standard: 20€
                                  </div>
                                </div>
                              </div>
                              {parseFloat(formData.homeDeliveryReturnPrice) > 20 && (
                                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                                  <AlertTriangle className="flex-shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Prix au-dessus du standard</p>
                                    <p className="text-xs text-amber-700">
                                      Un prix trop élevé risque de faire fuir les clients. Nous conseillons un tarif standard de <span className="font-bold text-amber-900">20€</span>.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Service Siège bébé */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Baby className="h-5 w-5 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-pink-800">Siège bébé</h4>
                    <p className="text-xs text-pink-600">Fourniture d'un siège bébé pour la location</p>
                    {formData.babySeatService && (
                      <div className="flex items-center gap-3 mt-2">
                        <Label className="text-xs text-pink-600 font-medium whitespace-nowrap">Prix par jour :</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={formData.babySeatPrice}
                            onChange={(e) => updateField('babySeatPrice', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-16 h-7 text-xs text-center border-pink-200 focus:border-pink-400 focus:ring-1 focus:ring-pink-200"
                          />
                          <span className="text-xs text-pink-600 font-medium">€/jour</span>
                        </div>
                        {parseFloat(formData.babySeatPrice) > 1 && (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="flex-shrink-0 w-3 h-3 text-amber-600" />
                            <p className="text-xs text-amber-800">
                              <span className="font-medium">Attention :</span> Nous conseillons un tarif de <span className="font-semibold">1€/jour</span>.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={formData.babySeatService}
                  onCheckedChange={(checked) => updateField('babySeatService', checked)}
                  className="data-[state=checked]:bg-pink-600"
                />
              </div>

              {/* Service Conducteur additionnel */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <UserPlus className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-indigo-800">Conducteur additionnel</h4>
                    <p className="text-xs text-indigo-600">Ajout d'un conducteur supplémentaire à la location</p>
                    {formData.additionalDriverService && (
                      <div className="flex items-center gap-3 mt-2">
                        <Label className="text-xs text-indigo-600 font-medium whitespace-nowrap">Prix par jour :</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={formData.additionalDriverPrice}
                            onChange={(e) => updateField('additionalDriverPrice', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-16 h-7 text-xs text-center border-indigo-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                          />
                          <span className="text-xs text-indigo-600 font-medium">€/jour</span>
                        </div>
                        {parseFloat(formData.additionalDriverPrice) > 15 && (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="flex-shrink-0 w-3 h-3 text-amber-600" />
                            <p className="text-xs text-amber-800">
                              <span className="font-medium">Attention :</span> Nous conseillons un tarif de <span className="font-semibold">15€/jour</span>.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={formData.additionalDriverService}
                  onCheckedChange={(checked) => updateField('additionalDriverService', checked)}
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>

            </div>
            ) : (
              <div className="text-center py-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 mt-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-slate-100 rounded-full">
                    <MapPin className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Aucune option disponible</p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Sélectionnez d'abord vos zones de prise en charge pour voir les services disponibles
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 pt-4">

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

  const renderStep4 = () => (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Récapitulatif de votre véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Infos véhicule */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Véhicule</h4>
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 hover:underline cursor-pointer transition-colors"
                aria-label="Modifier la section véhicule"
              >
                <Edit className="h-4 w-4" />
                Modifier
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {formData.brand || '-'} {formData.model || '-'} ({formData.year || '-'}) - {formData.licensePlate || '-'}
            </p>
            <p className="text-sm text-muted-foreground">
              {formData.color || '-'} • {formData.fuel || '-'} • {formData.transmission || '-'} • {formData.seats || '-'} places
            </p>
          </div>

          {/* Tarifs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Tarification</h4>
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 hover:underline cursor-pointer transition-colors"
                aria-label="Modifier la section tarification"
              >
                <Edit className="h-4 w-4" />
                Modifier
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Prix de base: {formData.dailyPrice || '-'}€/jour
            </p>
          </div>

          {/* Contact */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Contact</h4>
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800 hover:underline cursor-pointer transition-colors"
                aria-label="Modifier la section contact"
              >
                <Edit className="h-4 w-4" />
                Modifier
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full border border-slate-300 overflow-hidden bg-slate-100 flex-shrink-0">
                {getAvatarPreview() ? (
                  <img 
                    src={getAvatarPreview()!} 
                    alt="Photo de profil du propriétaire" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </div>
              {/* Contact Info */}
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {formData.firstName || '-'} {formData.lastName || '-'} - {formData.phone || '-'}
                </p>
                {formData.address && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.address}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">
              Votre véhicule est prêt à être publié !
            </p>
          </div>
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
          <h1 className="text-3xl font-bold mb-2">Louer ma voiture</h1>
          <p className="text-muted-foreground">
            Inscrivez votre véhicule en quelques minutes et commencez à gagner de l'argent
          </p>
        </div>

        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Étape {currentStep} sur 4
            </span>
            <span className="text-sm text-muted-foreground">
              {getStepTitle()}
            </span>
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-2" />
        </div>

        {/* Contenu des étapes */}
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
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
              {currentStep < 4 ? (
                <Button 
                  onClick={nextStep}
                  className="w-full sm:w-auto sm:min-w-[180px] bg-gradient-lagoon hover:opacity-90 text-white flex items-center justify-center gap-2 h-12"
                >
                  {currentStep === 1 && "Étape suivante"}
                  {currentStep === 2 && "Étape suivante"}
                  {currentStep === 3 && "Confirmer"}
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
                      Publication...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Publier mon véhicule
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

export default RentMyCar;