import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Car, Euro, Zap, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import { getBookingDraft, updateBookingOptions } from "@/services/localStorage/bookingStorage";

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    imageUrl?: string;
  };
  rentalInfo: {
    pickupLocation?: string;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    rentalDays: number;
    pricePerDay: number;
    basePrice: number;
  };
  selectedOptions?: Array<{
    name: string;
    pricePerDay: number;
    totalPrice: number;
  }>;
}

export function BookingConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  vehicle,
  rentalInfo,
  selectedOptions = []
}: BookingConfirmationModalProps) {
  
  // État pour les options sélectionnées depuis localStorage
  const [draftOptions, setDraftOptions] = useState<Array<{
    id: string;
    name: string;
    pricePerDay: number;
    totalPrice: number;
    selected: boolean;
  }>>([]);
  
  // Charger le brouillon depuis localStorage quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      const draft = getBookingDraft();
      console.log('📖 [BookingConfirmationModal] Brouillon chargé:', draft);
      if (draft?.selectedOptions) {
        // Filtrer seulement les options sélectionnées
        const selectedOptionsFromDraft = draft.selectedOptions.filter(opt => opt.selected);
        setDraftOptions(selectedOptionsFromDraft);
        console.log('✅ [BookingConfirmationModal] Options sélectionnées:', selectedOptionsFromDraft);
      }
    }
  }, [isOpen]);
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SURVEILLER LES CHANGEMENTS DU BROUILLON POUR RECHARGER LES OPTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (isOpen) {
      // Créer un intervalle pour surveiller les changements du localStorage
      const interval = setInterval(() => {
        const draft = getBookingDraft();
        if (draft?.selectedOptions) {
          const selectedOptionsFromDraft = draft.selectedOptions.filter(opt => opt.selected);
          
          // Vérifier si les options ont changé
          const hasChanged = selectedOptionsFromDraft.length !== draftOptions.length ||
            !selectedOptionsFromDraft.every((opt, index) => 
              draftOptions[index]?.id === opt.id && draftOptions[index]?.totalPrice === opt.totalPrice
            );
          
          if (hasChanged) {
            console.log('🔄 [BookingConfirmationModal] Options mises à jour détectées:', selectedOptionsFromDraft);
            setDraftOptions(selectedOptionsFromDraft);
          }
        }
      }, 100); // Vérifier toutes les 100ms
      
      return () => clearInterval(interval);
    }
  }, [isOpen, draftOptions]);
  
  // Calculer le total des options (utiliser draftOptions au lieu de selectedOptions)
  const optionsTotal = draftOptions.reduce((sum, opt) => sum + opt.totalPrice, 0);
  
  // Calculer le sous-total
  const subtotal = rentalInfo.basePrice + optionsTotal;
  
  // Calculer les frais de service (15%)
  const serviceFee = Math.round(subtotal * 0.15 * 100) / 100;
  
  // Calculer le total final
  const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100;
  
  // Formater les dates
  const formattedStartDate = format(rentalInfo.startDate, "EEEE d MMMM yyyy", { locale: fr });
  const formattedEndDate = format(rentalInfo.endDate, "EEEE d MMMM yyyy", { locale: fr });
  
  // Calculer la durée réelle en heures pour affichage précis
  const calculateRealDuration = () => {
    const startDateTime = new Date(rentalInfo.startDate);
    const endDateTime = new Date(rentalInfo.endDate);
    
    const startHour = parseInt(rentalInfo.startTime.split(':')[0]);
    const startMinute = parseInt(rentalInfo.startTime.split(':')[1]);
    const endHour = parseInt(rentalInfo.endTime.split(':')[0]);
    const endMinute = parseInt(rentalInfo.endTime.split(':')[1]);
    
    startDateTime.setHours(startHour, startMinute, 0, 0);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    const completeDays = Math.floor(rentalHours / 24);
    const extraHours = Math.floor(rentalHours % 24);
    
    if (rentalHours < 24) {
      return '1 jour';
    } else if (extraHours === 0) {
      return `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}`;
    } else {
      // Toujours afficher les heures supplémentaires
      // Peu importe si heure retour < heure départ
      return `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}`;
    }
  };
  
  const realDurationText = calculateRealDuration();
  
  // Texte pour le nombre de jours (pour rétrocompatibilité)
  const daysText = rentalInfo.rentalDays === 1 
    ? "jour" 
    : rentalInfo.rentalDays % 1 === 0 
      ? "jours" 
      : "jours";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FONCTION POUR SUPPRIMER UNE OPTION DEPUIS LA MODAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleRemoveOption = (optionId: string) => {
    console.log('🗑️ [BookingConfirmationModal] Suppression de l\'option:', optionId);
    
    // Récupérer le brouillon actuel
    const draft = getBookingDraft();
    if (!draft?.selectedOptions) return;
    
    // Marquer l'option comme non sélectionnée
    const updatedOptions = draft.selectedOptions.map(option => 
      option.id === optionId ? { ...option, selected: false } : option
    );
    
    // Mettre à jour le localStorage
    updateBookingOptions(updatedOptions);
    
    console.log('✅ [BookingConfirmationModal] Option supprimée:', optionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-3xl lg:max-h-[95vh]">
        <DialogHeader className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="p-2 bg-primary rounded-full">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <DialogTitle className="text-3xl font-bold text-center text-primary">
            Confirmation de votre réservation
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Vérifiez les détails ci-dessous avant de confirmer
          </p>
        </DialogHeader>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche: Détails réservation */}
          <div className="lg:col-span-2 space-y-4">
          {/* Section Véhicule */}
          <div className="flex items-center gap-4 p-4 bg-gradient-soft rounded-xl border border-border/50">
            {vehicle.imageUrl && (
              <img 
                src={vehicle.imageUrl} 
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-20 h-20 object-cover rounded-lg shadow-sm"
              />
            )}
            <div>
              <h3 className="text-lg font-bold text-primary">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                Année {vehicle.year}
              </p>
            </div>
          </div>

          {/* Section Zone de prise en charge */}
          {rentalInfo.pickupLocation && (
            <>
              <Separator />
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-primary-soft rounded-lg">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Zone de prise en charge</p>
                  <p className="text-base font-semibold text-foreground">
                    {rentalInfo.pickupLocation}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Section Dates et Durée */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-primary-soft rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Dates de location</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-card rounded-lg border border-border/50 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Départ</p>
                <p className="text-sm font-bold text-foreground capitalize">{formattedStartDate}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{rentalInfo.startTime}</span>
                </div>
              </div>

              <div className="p-3 bg-card rounded-lg border border-border/50 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Retour</p>
                <p className="text-sm font-bold text-foreground capitalize">{formattedEndDate}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{rentalInfo.endTime}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Badge variant="default" className="text-sm px-4 py-1.5 bg-primary text-white font-semibold">
                Durée : {realDurationText}
              </Badge>
            </div>
          </div>
          </div>

          {/* Colonne droite: Récapitulatif prix */}
          <div className="lg:col-span-1">
          {/* Sticky en haut de la colonne droite sur desktop */}
          <div className="lg:sticky lg:top-0 space-y-4">
          
          {/* Section Tarif de Base */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary-soft rounded-lg">
                <Euro className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Tarif de base</span>
            </div>

            <div className="bg-card rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">
                  Location véhicule
                </span>
                <span className="text-base font-bold text-primary">
                  {rentalInfo.basePrice}€
                </span>
              </div>
              <p className="text-xs text-muted-foreground pl-1">
                {rentalInfo.pricePerDay}€/jour × {realDurationText}
              </p>
            </div>
          </div>

          {/* Section Options (si présentes) */}
          {draftOptions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-soft rounded-lg">
                    <Car className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Options sélectionnées</span>
                </div>

                <div className="bg-card rounded-lg border border-border/50 p-3 space-y-3">
                  {draftOptions.map((option, index) => (
                    <div key={option.id || index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => handleRemoveOption(option.id)}
                          className="opacity-70 hover:opacity-100 hover:bg-red-500/10 rounded-full p-1.5 transition-all duration-200 flex items-center justify-center hover:border-red-400 flex-shrink-0"
                          title="Supprimer cette option"
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </button>
                        <span className="text-sm text-foreground font-medium">
                          {option.name}
                        </span>
                      </div>
                      <span className="text-base font-bold text-primary min-w-[60px] text-right">
                        + {option.totalPrice}€
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/50 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-medium">Sous-total options</span>
                      <span className="text-base font-bold text-foreground">{optionsTotal}€</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Section Total */}
          <div className="space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-medium">Sous-total</span>
              <span className="text-base font-bold text-foreground min-w-[80px] text-right">{subtotal}€</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-medium">
                Frais de service (15%)
              </span>
              <span className="text-base font-bold text-muted-foreground min-w-[80px] text-right">+ {serviceFee}€</span>
            </div>

            <Separator className="border-primary/30" />

            <div className="flex justify-between items-baseline pt-2">
              <span className="text-base font-bold text-foreground">TOTAL À PAYER</span>
              <span className="text-3xl font-bold text-primary">
                {totalAmount}€
              </span>
            </div>
          </div>
          </div>
          </div>

        </div>

        {/* Informations importantes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">Réponse rapide</p>
              <p className="text-[10px] text-blue-700">Sous 24h</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">Paiement sûr</p>
              <p className="text-[10px] text-blue-700">Après validation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">Annulation</p>
              <p className="text-[10px] text-blue-700">Gratuite 48h</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200/50">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-xs font-bold text-blue-900">Confirmation</p>
              <p className="text-[10px] text-blue-700">Rapide</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Modifier
          </Button>
          <Button 
            onClick={onConfirm}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
          >
            <Zap className="h-5 w-5 mr-2 text-yellow-400" fill="currentColor" />
            Je confirme ma demande de réservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

