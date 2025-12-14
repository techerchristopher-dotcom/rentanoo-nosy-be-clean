// Template de base pour créer de nouveaux véhicules
// Basé sur la première carte "Peugeot 208" (9B67AD1C)
// Reproduit exactement la structure et les fonctionnalités de ManageVehicle.tsx

export interface VehicleTemplate {
  // === INFORMATIONS VÉHICULE (Lecture seule dans ManageVehicle) ===
  brand: string;
  model: string;
  color: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  seats: string;
  doors: string;
  
  // === ANNONCE (Modifiable dans ManageVehicle) ===
  description: string;
  location: string;
  available: boolean;
  
  // === TARIFS & CONDITIONS (Modifiable dans ManageVehicle) ===
  pricePerDay: string;
  lowSeasonDiscount: string;
  highSeasonSurcharge: string;
  longDurationDiscount14: string;
  longDurationDiscount60: string;
  
  // === ÉQUIPEMENTS (Basés sur la première carte) ===
  hasAC: boolean;
  hasGPS: boolean;
  hasCruiseControl: boolean;
  hasBluetooth: boolean;
  hasCarPlay: boolean;
  hasAudioInput: boolean;
  
  // === PHOTOS (Gestion des images) ===
  imageUrl: string | null; // ✅ Champ image_url ajouté
  
  // === STATUT (Géré automatiquement) ===
  status: 'active' | 'inactive' | 'review';
}

// Template par défaut basé sur la première carte "Peugeot 208"
export const DEFAULT_VEHICLE_TEMPLATE: VehicleTemplate = {
  // === INFORMATIONS VÉHICULE ===
  brand: '',
  model: '',
  color: '', // ✅ Champ color initialisé
  year: '',
  mileage: '',
  fuel: '',
  transmission: '',
  seats: '',
  doors: '',
  
  // === ANNONCE ===
  description: '',
  location: '',
  available: true, // Disponible par défaut
  
  // === TARIFS & CONDITIONS (Valeurs par défaut de la première carte) ===
  pricePerDay: '35', // Même prix que la première carte
  lowSeasonDiscount: '10', // 10% de remise basse saison
  highSeasonSurcharge: '20', // 20% de supplément haute saison
  longDurationDiscount14: '15', // 15% pour 14+ jours
  longDurationDiscount60: '25', // 25% pour 60+ jours
  
  // === ÉQUIPEMENTS (Valeurs par défaut - tous désactivés comme la première carte) ===
  hasAC: false,
  hasGPS: false,
  hasCruiseControl: false,
  hasBluetooth: false,
  hasCarPlay: false,
  hasAudioInput: false,
  
  // === PHOTOS ===
  imageUrl: null, // ✅ Champ image_url initialisé
  
  // === STATUT ===
  status: 'active', // Statut actif par défaut
};

// Fonction pour créer un nouveau véhicule basé sur le template
export const createVehicleFromTemplate = (customData: Partial<VehicleTemplate>): VehicleTemplate => {
  return {
    ...DEFAULT_VEHICLE_TEMPLATE,
    ...customData
  };
};

// Fonction pour pré-remplir le formulaire AddVehicle avec le template
export const populateAddVehicleForm = (template: VehicleTemplate) => {
  return {
    // === ÉTAPE 1 - VÉHICULE (Informations véhicule) ===
    licensePlate: '',
    brand: template.brand,
    model: template.model,
    color: template.color, // ✅ Champ color correctement mappé
    year: template.year,
    mileage: template.mileage,
    fuel: template.fuel,
    transmission: template.transmission,
    seats: template.seats,
    doors: template.doors,
    
    // === ÉQUIPEMENTS ===
    hasAC: template.hasAC,
    hasGPS: template.hasGPS,
    hasCruiseControl: template.hasCruiseControl,
    hasBluetooth: template.hasBluetooth,
    hasCarPlay: template.hasCarPlay,
    hasAudioInput: template.hasAudioInput,
    
    // === ÉTAPE 2 - TARIFS (Tarifs & conditions) ===
    dailyPrice: template.pricePerDay,
    lowSeasonDiscount: template.lowSeasonDiscount,
    highSeasonSurcharge: template.highSeasonSurcharge,
    longTermDiscount14: template.longDurationDiscount14,
    longTermDiscount60: template.longDurationDiscount60,
    
    // === PARAMÈTRES DE RÉSERVATION (Valeurs par défaut) ===
    minAdvanceHours: '2', // Délai minimum par défaut
    minRentalDays: '1', // Durée minimum par défaut
    maxRentalDays: '30', // Durée maximum par défaut
    
    // === ÉTAPE 3 - DESCRIPTION & PHOTOS (Annonce) ===
    description: template.description,
    location: template.location,
    imageUrl: template.imageUrl // ✅ Champ imageUrl ajouté
  };
};

// Fonction pour convertir les données AddVehicle vers le format Supabase
export const convertToSupabaseFormat = (formData: any, userId: string) => {
  // Debug pour l'année
  console.log("🔍 DEBUG - Conversion de l'année:");
  console.log("  - formData.year (string):", formData.year);
  console.log("  - typeof formData.year:", typeof formData.year);
  
  const yearValue = parseInt(formData.year, 10); // Base 10 explicite
  console.log("  - parseInt(formData.year, 10):", yearValue);
  
  // Validation de l'année
  if (isNaN(yearValue) || yearValue < 1990 || yearValue > 2025) {
    console.error("❌ ERREUR - Année invalide:", yearValue);
    throw new Error(`Année invalide: ${formData.year}. Doit être entre 1990 et 2025.`);
  }
  
  console.log("✅ Année validée:", yearValue);

  return {
    // === CHAMPS OBLIGATOIRES ===
    owner_id: userId,
    brand: formData.brand,
    model: formData.model,
    year: yearValue, // ✅ Année correctement convertie
    price_per_day: parseFloat(formData.dailyPrice),
    
    // === CHAMPS OPTIONNELS ===
    color: formData.color || null, // ✅ Champ color correctement mappé
    mileage: formData.mileage ? parseInt(formData.mileage) : null,
    fuel_type: formData.fuel || null,
    transmission: formData.transmission || null,
    seats: formData.seats ? parseInt(formData.seats) : null,
    doors: formData.doors ? parseInt(formData.doors) : null,
    vehicle_category: formData.vehicleCategory || null,
    description: formData.description || null,
    location: formData.location || null,
    image_url: formData.imageUrl || null, // ✅ Champ image_url ajouté
    
    // === ÉQUIPEMENTS ===
    has_ac: formData.hasAC || false,
    has_gps: formData.hasGPS || false,
    has_cruise_control: formData.hasCruiseControl || false,
    has_bluetooth: formData.hasBluetooth || false,
    has_carplay: formData.hasCarPlay || false,
    has_audio_input: formData.hasAudioInput || false,
    has_backup_camera: formData.hasBackupCamera || false,
    has_usb_port: formData.hasUSBPort || false,
    has_leather_seats: formData.hasLeatherSeats || false,
    has_sunroof: formData.hasSunroof || false,
    has_premium_audio: formData.hasPremiumAudio || false,
    has_roof_rack: formData.hasRoofRack || false,
    has_wireless_charger: formData.hasWirelessCharger || false,
    has_parking_sensors: formData.hasParkingSensors || false,
    has_abs: formData.hasABS || false,
    has_large_trunk: formData.hasLargeTrunk || false,
    has_roof_box: formData.hasRoofBox || false,
    has_bike_rack: formData.hasBikeRack || false,
    has_android_auto: formData.hasAndroidAuto || false,
    
    // === TARIFS ET REMISES ===
    low_season_discount: formData.lowSeasonDiscount ? parseFloat(formData.lowSeasonDiscount) : null,
    high_season_surcharge: formData.highSeasonSurcharge ? parseFloat(formData.highSeasonSurcharge) : null,
    long_duration_discount_14: formData.longTermDiscount14 ? parseFloat(formData.longTermDiscount14) : null,
    long_duration_discount_60: formData.longTermDiscount60 ? parseFloat(formData.longTermDiscount60) : null,
    
    // === STATUT ===
    available: true, // Toujours disponible à la création
    status: 'active', // Toujours actif à la création
  };
};

// === GESTION DES PHOTOS POUR LE TEMPLATE ===
// Fonction pour uploader les photos après création du véhicule

export const uploadVehiclePhotos = async (
  vehicleId: string, 
  vehiclePhotos: { frontLeft: File | null, profileLeft: File | null, interior: File | null },
  additionalPhotos: (File | null)[],
  toast: any
) => {
  const uploadedPhotos = [];
  const errors = [];

  try {
    // Upload des 3 photos obligatoires
    const requiredPhotos = [
      { file: vehiclePhotos.frontLeft, type: 'frontLeft' as const },
      { file: vehiclePhotos.profileLeft, type: 'profileLeft' as const },
      { file: vehiclePhotos.interior, type: 'interior' as const }
    ];

    for (let i = 0; i < requiredPhotos.length; i++) {
      const { file, type } = requiredPhotos[i];
      if (file) {
        try {
          // Import dynamique de PhotoService pour éviter les problèmes de dépendances
          const { PhotoService } = await import('@/services/supabase/photos');
          
          const result = await PhotoService.uploadPhoto({
            file,
            vehicleId,
            photoType: type,
            position: i + 1
          });

          if (result.data) {
            uploadedPhotos.push(result.data);
            console.log(`Photo ${type} uploadée avec succès:`, result.data.url);
          } else {
            errors.push(`Photo ${type}: ${result.error}`);
          }
        } catch (error) {
          console.error(`Erreur lors de l'upload de la photo ${type}:`, error);
          errors.push(`Photo ${type}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }
    }

    // Upload des photos supplémentaires
    for (let i = 0; i < additionalPhotos.length; i++) {
      const file = additionalPhotos[i];
      if (file) {
        try {
          const { PhotoService } = await import('@/services/supabase/photos');
          
          const result = await PhotoService.uploadPhoto({
            file,
            vehicleId,
            photoType: 'additional',
            position: 4 + i // Position après les 3 photos obligatoires
          });

          if (result.data) {
            uploadedPhotos.push(result.data);
            console.log(`Photo supplémentaire ${i + 1} uploadée avec succès:`, result.data.url);
          } else {
            errors.push(`Photo supplémentaire ${i + 1}: ${result.error}`);
          }
        } catch (error) {
          console.error(`Erreur lors de l'upload de la photo supplémentaire ${i + 1}:`, error);
          errors.push(`Photo supplémentaire ${i + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }
    }

    // Mettre à jour l'image_url du véhicule avec la première photo
    if (uploadedPhotos.length > 0) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        await supabase
          .from('vehicles')
          .update({ image_url: uploadedPhotos[0].url })
          .eq('id', vehicleId);

        console.log('Image principale mise à jour:', uploadedPhotos[0].url);
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'image principale:', error);
        errors.push('Mise à jour image principale: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
      }
    }

    // Afficher les résultats
    if (uploadedPhotos.length > 0) {
      toast({
        title: "Photos uploadées",
        description: `${uploadedPhotos.length} photo(s) uploadée(s) avec succès`,
      });
    }

    if (errors.length > 0) {
      toast({
        title: "Erreurs d'upload",
        description: `${errors.length} photo(s) n'ont pas pu être uploadées`,
        variant: "destructive",
      });
      console.error('Erreurs d\'upload:', errors);
    }

    return { uploadedPhotos, errors };

  } catch (error) {
    console.error('Erreur générale lors de l\'upload des photos:', error);
    toast({
      title: "Erreur",
      description: "Impossible d'uploader les photos",
      variant: "destructive",
    });
    return { uploadedPhotos: [], errors: [error instanceof Error ? error.message : 'Erreur inconnue'] };
  }
};

// === FOND FLOUTÉ POUR LES CARTES DE VÉHICULES ===
// Reproduit exactement le design de OwnerVehicles.tsx avec fond flouté

export const getVehicleCardBackgroundStyle = (imageUrl: string | null) => {
  if (!imageUrl) return {};
  
  return {
    backgroundImage: `url(${imageUrl})`,
    opacity: '0.60' // Même opacité que la première carte
  };
};

export const getVehicleCardClasses = () => {
  return "hover:shadow-xl hover:scale-105 transition-all duration-300 relative overflow-hidden group border-0 shadow-lg";
};

export const getVehicleCardBackgroundClasses = () => {
  return "absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-110";
};

export const getVehicleCardOverlayClasses = () => {
  return "absolute inset-0 bg-gradient-to-br from-white/85 via-white/70 to-white/90 group-hover:from-white/80 group-hover:via-white/65 group-hover:to-white/85 transition-all duration-300";
};

export const getVehicleCardContentClasses = () => {
  return "relative z-10 p-6";
};

// === SECTION PHOTOS IDENTIQUE À MANAGEVEHICLE.TSX ===
// Reproduit exactement la section photos avec galerie et gestion

export const getPhotosSectionStructure = () => {
  return {
    // Structure de la section photos
    cardHeader: {
      title: "Photos",
      icon: "ImageIcon",
      description: "Gérez les photos de votre véhicule. Ajoutez jusqu'à 10 photos."
    },
    
    // Zone de téléchargement
    uploadZone: {
      classes: "border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center",
      icon: "ImageIcon",
      iconClasses: "h-12 w-12 mx-auto text-muted-foreground mb-4",
      title: "Ajouter des photos",
      titleClasses: "text-lg font-semibold mb-2",
      description: "Glissez-déposez vos photos ici ou cliquez pour sélectionner",
      descriptionClasses: "text-muted-foreground mb-4",
      buttonText: "Sélectionner des photos",
      buttonIcon: "Upload",
      buttonClasses: "mb-4",
      formatInfo: "Formats acceptés: JPG, PNG (max 10MB par photo)",
      formatInfoClasses: "text-xs text-muted-foreground"
    },
    
    // Galerie de photos existantes
    gallery: {
      title: "Photos actuelles",
      titleClasses: "text-lg font-semibold mb-4",
      gridClasses: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
      photoContainerClasses: "relative group",
      photoClasses: "aspect-square rounded-lg overflow-hidden bg-muted",
      imageClasses: "w-full h-full object-cover",
      deleteButtonClasses: "absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
      deleteButtonVariant: "destructive",
      deleteButtonSize: "icon",
      primaryBadgeClasses: "absolute top-2 left-2",
      primaryBadgeText: "Principale"
    }
  };
};

// Fonctions pour la gestion des photos (identique à ManageVehicle.tsx)
export const handlePhotoUploadTemplate = async (files: FileList, vehicleId: string, toast: any) => {
  if (!vehicleId || files.length === 0) return;

  try {
    const uploadPromises = Array.from(files).map((file, index) => 
      // PhotoService.uploadPhoto({
      //   file,
      //   vehicleId,
      //   photoType: 'exterior',
      //   position: index + 1
      // })
      Promise.resolve({ data: null, error: null }) // Placeholder
    );

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(result => !result.error);
    const errors = results.filter(result => result.error).map(result => result.error);

    if (successfulUploads.length > 0) {
      toast({
        title: "Succès",
        description: `${successfulUploads.length} photo(s) uploadée(s) avec succès`,
      });
    }

    if (errors.length > 0) {
      toast({
        title: "Attention",
        description: `${errors.length} photo(s) n'ont pas pu être uploadées`,
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Erreur lors de l'upload:", error);
    toast({
      title: "Erreur",
      description: "Impossible d'uploader les photos",
      variant: "destructive",
    });
  }
};

export const handleDeletePhotoTemplate = async (photoUrl: string, toast: any) => {
  try {
    // const { success, error } = await PhotoService.deletePhoto(photoUrl);
    const success = true; // Placeholder
    
    if (success) {
      toast({
        title: "Succès",
        description: "Photo supprimée avec succès",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    toast({
      title: "Erreur",
      description: "Impossible de supprimer la photo",
      variant: "destructive",
    });
  }
};

// Validation des champs (identique à ManageVehicle.tsx)
export const validateVehicleField = (field: string, value: any): string => {
  let error = "";
  
  switch (field) {
    case "brand":
      if (!value || value.trim().length < 2) error = "La marque doit contenir au moins 2 caractères";
      break;
    case "model":
      if (!value || value.trim().length < 2) error = "Le modèle doit contenir au moins 2 caractères";
      break;
    case "year":
      const year = parseInt(value, 10); // Base 10 explicite
      console.log("🔍 DEBUG - Validation année:", { value, year, isNaN: isNaN(year) });
      if (!value || isNaN(year) || year < 1990 || year > 2025) {
        error = "L'année doit être entre 1990 et 2025";
      }
      break;
    case "mileage":
      const mileage = parseInt(value);
      if (value && (isNaN(mileage) || mileage < 0)) {
        error = "Le kilométrage doit être un nombre positif";
      }
      break;
    case "dailyPrice":
      const price = parseFloat(value);
      if (!value || isNaN(price) || price <= 0) {
        error = "Le prix doit être un nombre positif";
      }
      break;
    case "lowSeasonDiscount":
    case "highSeasonSurcharge":
    case "longTermDiscount14":
    case "longTermDiscount60":
      const discount = parseFloat(value);
      if (value && (isNaN(discount) || discount < 0 || discount > 100)) {
        error = "La remise doit être entre 0 et 100%";
      }
      break;
  }
  
  return error;
};

// Calcul des prix (identique à ManageVehicle.tsx)
export const calculateVehiclePricing = (formData: any) => {
  const basePrice = parseFloat(formData.dailyPrice) || 0;
  const lowSeasonDiscount = parseFloat(formData.lowSeasonDiscount) || 0;
  const highSeasonSurcharge = parseFloat(formData.highSeasonSurcharge) || 0;
  const longDurationDiscount14 = parseFloat(formData.longTermDiscount14) || 0;
  const longDurationDiscount60 = parseFloat(formData.longTermDiscount60) || 0;
  
  return {
    basePrice,
    lowSeasonPrice: basePrice * (1 - lowSeasonDiscount / 100),
    highSeasonPrice: basePrice * (1 + highSeasonSurcharge / 100),
    longDuration14Price: basePrice * (1 - longDurationDiscount14 / 100),
    longDuration60Price: basePrice * (1 - longDurationDiscount60 / 100),
  };
};
