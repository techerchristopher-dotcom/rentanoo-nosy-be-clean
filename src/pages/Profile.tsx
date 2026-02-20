import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { useMobileBreakpoint } from "@/hooks/use-mobile-breakpoint";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { User as UserType } from "@/types";
import { ProfileService } from "@/services/supabase/profile";
import { LazyPhoneInput } from "@/components/ui/lazy-phone-input";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/config/features";

export default function Profile() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const phoneSectionRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'address' | 'license'>('basic'); // New state for navigation
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set()); // Track completed sections
  const [originalData, setOriginalData] = useState<any>(null); // Stocker les données originales
  const [hasError, setHasError] = useState(false); // State pour gérer les erreurs
  const isMobile = useMobileBreakpoint();


  // Fonction pour vérifier si l'utilisateur a un document de permis
  const hasDriverLicenseDocument = () => {
    return !!(currentUser?.driverLicenseFilePath || driverLicenseFile);
  };

  // Fonction pour gérer le changement de section avec vérification du permis
  const handleSectionChange = (newSection: 'basic' | 'address' | 'license') => {
    // Désactiver l'accès aux sections non disponibles en MVP
    if (newSection === 'address' && !FEATURES.profileAddressEnabled) return;
    if (newSection === 'license' && !FEATURES.profileDrivingLicenseEnabled) return;
    // Si on est dans la section permis et qu'on veut changer de section
    if (activeSection === 'license' && newSection !== 'license') {
      // Vérifier si l'utilisateur n'a pas de document de permis
      if (!hasDriverLicenseDocument()) {
        setPendingSectionChange(newSection);
        setShowLicenseAlert(true);
        return;
      }
    }
    
    // Sinon, changer de section normalement
    setActiveSection(newSection);
  };

  // Fonction pour confirmer le changement de section malgré l'absence de permis
  const confirmSectionChange = () => {
    if (pendingSectionChange) {
      setActiveSection(pendingSectionChange);
      setPendingSectionChange(null);
    }
    setShowLicenseAlert(false);
  };

  // Fonction pour annuler le changement de section
  const cancelSectionChange = () => {
    setPendingSectionChange(null);
    setShowLicenseAlert(false);
  };

  // Fonction pour calculer le pourcentage de completion du profil
  const calculateProfileCompletion = () => {
    try {
      const fields: string[] = [
        // Section informations de base
        firstName,
        lastName,
        phone || '',
        birthDate ? format(birthDate, 'yyyy-MM-dd') : '',
        placeOfBirth,
        bio, // Champ de présentation (optionnel mais recommandé)
      ];

      // Inclure l'adresse seulement si la section est activée
      if (FEATURES.profileAddressEnabled) {
        fields.push(
          addressLine1,
          postalCode,
          city,
          country,
        );
      }

      // Inclure le permis seulement si la section est activée
      if (FEATURES.profileDrivingLicenseEnabled) {
        fields.push(
          driverLicenseNumber,
          driverLicenseIssueDate ? format(driverLicenseIssueDate, 'yyyy-MM-dd') : '',
          driverLicenseCategory, // Toujours rempli par défaut avec "B"
          driverLicenseCountry,
        );
      }

      const completedFields = fields.filter(field => field && field.trim() !== '').length;
      const totalFields = fields.length;
      
      return Math.round((completedFields / totalFields) * 100);
    } catch (error) {
      console.error('Erreur dans calculateProfileCompletion:', error);
      return 0;
    }
  };
  const [profileImage, setProfileImage] = useState<string>("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [birthDate, setBirthDate] = useState<Date>();
  const [birthDay, setBirthDay] = useState<string>("");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [placeOfBirth, setPlaceOfBirth] = useState<string>("");
  const [addressLine1, setAddressLine1] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [driverLicenseNumber, setDriverLicenseNumber] = useState<string>("");
  const [driverLicenseIssueDate, setDriverLicenseIssueDate] = useState<Date>();
  const [driverLicenseExpirationDate, setDriverLicenseExpirationDate] = useState<Date>();
  const [driverLicenseCategory, setDriverLicenseCategory] = useState<string>("B");
  const [driverLicenseDay, setDriverLicenseDay] = useState<string>("");
  const [driverLicenseMonth, setDriverLicenseMonth] = useState<string>("");
  const [driverLicenseYear, setDriverLicenseYear] = useState<string>("");
  const [driverLicenseCountry, setDriverLicenseCountry] = useState<string>("");
  const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
  const [driverLicenseFileName, setDriverLicenseFileName] = useState<string>("");
  const [hasUploadedFile, setHasUploadedFile] = useState<boolean>(false); // Nouveau state pour tracker les uploads
  const [bio, setBio] = useState<string>(""); // Champ de présentation personnelle
  const [showImageModal, setShowImageModal] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [showLicenseAlert, setShowLicenseAlert] = useState(false); // State pour l'alerte du permis
  const [pendingSectionChange, setPendingSectionChange] = useState<'basic' | 'address' | null>(null); // Section vers laquelle l'utilisateur veut aller
  const { toast } = useToast();

  // Liste des mois localisée (utilisée pour les selects de dates)
  const monthKeys = useMemo(
    () => ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
    []
  );
  const months = useMemo(
    () =>
      monthKeys.map((key, index) =>
        t(`profile.months.${key}`, new Date(0, index).toLocaleDateString("fr-FR", { month: "long" }))
      ),
    [t, monthKeys]
  );

  // Fonction pour vérifier si des modifications ont été apportées à une section
  const hasSectionChanges = (section: 'basic' | 'address' | 'license') => {
    try {
      if (!originalData) return false;

      if (section === 'basic') {
        return (
          firstName !== originalData.firstName ||
          lastName !== originalData.lastName ||
          phone !== originalData.phone ||
          (birthDate ? format(birthDate, 'yyyy-MM-dd') : '') !== (originalData.birthDate ? format(new Date(originalData.birthDate), 'yyyy-MM-dd') : '') ||
          placeOfBirth !== originalData.placeOfBirth ||
          bio !== originalData.bio
        );
      }
      
      if (section === 'address') {
        return (
          addressLine1 !== originalData.addressLine1 ||
          postalCode !== originalData.postalCode ||
          city !== originalData.city ||
          country !== originalData.country
        );
      }
      
      if (section === 'license') {
        return (
          driverLicenseNumber !== originalData.driverLicenseNumber ||
          (driverLicenseIssueDate ? format(driverLicenseIssueDate, 'yyyy-MM-dd') : '') !== (originalData.driverLicenseIssueDate ? format(new Date(originalData.driverLicenseIssueDate), 'yyyy-MM-dd') : '') ||
          (driverLicenseExpirationDate ? format(driverLicenseExpirationDate, 'yyyy-MM-dd') : '') !== (originalData.driverLicenseExpirationDate ? format(new Date(originalData.driverLicenseExpirationDate), 'yyyy-MM-dd') : '') ||
          driverLicenseCategory !== (originalData.driverLicenseCategory || 'B') ||
          driverLicenseCountry !== originalData.driverLicenseCountry ||
          (currentUser?.driverLicenseFilePath || '') !== (originalData.driverLicenseFilePath || '') ||
          hasUploadedFile // Détecter si un fichier a été uploadé
        );
      }
      
      return false;
    } catch (error) {
      console.error('Erreur dans hasSectionChanges:', error);
      return false;
    }
  };

  // Fonction pour reconstruire la date de naissance à partir des dropdowns
  const updateBirthDate = (day: string, month: string, year: string) => {
    if (day && month && year) {
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      setBirthDate(date);
    }
  };

  // Fonction pour reconstruire la date à partir des dropdowns
  const updateDriverLicenseDate = (day: string, month: string, year: string) => {
    if (day && month && year) {
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      setDriverLicenseIssueDate(date);
    }
  };

  // Parser les query params pour gérer section=phone et returnTo
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const section = searchParams.get('section');
    
    // Si section=phone, activer la section "Informations de base" qui contient le téléphone
    if (section === 'phone') {
      setActiveSection('basic');
    }
  }, [location.search]);

  // Scroll robuste vers le champ téléphone quand section=phone ET activeSection=basic ET profil chargé
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const section = searchParams.get('section');
    
    // Conditions : section=phone ET activeSection=basic ET currentUser chargé
    if (section === 'phone' && activeSection === 'basic' && currentUser) {
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryScroll = () => {
        attempts++;
        
        if (phoneSectionRef.current) {
          // Ref disponible → scroll
          phoneSectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        } else if (attempts < maxAttempts) {
          // Ref pas encore disponible → retry au frame suivant
          requestAnimationFrame(tryScroll);
        }
      };
      
      // Démarrer le scroll au prochain frame
      requestAnimationFrame(tryScroll);
    }
  }, [location.search, activeSection, currentUser]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data, error } = await ProfileService.getCurrentUserProfile();
        if (error) {
        toast({
          title: t("profile.toasts.loadError.title", "Erreur"),
          description: t(
            "profile.toasts.loadError.description",
            "Impossible de charger le profil : {{error}}",
            { error: String(error) }
          ),
          variant: "destructive",
        });
        } else if (data) {
          // S'assurer que les rôles sont toujours définis
          const userWithRoles = {
            ...data,
            roles: data.roles || ['renter']
          };
          setCurrentUser(userWithRoles);
          setFirstName(data.firstName);
          setLastName(data.lastName);
          setPhone(data.phone);
          setPlaceOfBirth(data.placeOfBirth || "");
          setAddressLine1(data.addressLine1 || "");
          setPostalCode(data.postalCode || "");
          setCity(data.city || "");
          setCountry(data.country || "");
          setDriverLicenseNumber(data.driverLicenseNumber || "");
          setDriverLicenseCountry(data.driverLicenseCountry || "");
          setDriverLicenseCategory(data.driverLicenseCategory || "B");
          setBio(data.bio || ""); // Initialiser la bio
          if (data.driverLicenseExpirationDate) {
            const date = new Date(data.driverLicenseExpirationDate);
            setDriverLicenseExpirationDate(date);
          }
          // Initialiser l'image de profil
          setProfileImage(data.avatarUrl || "");
          if (data.driverLicenseIssueDate) {
            const date = new Date(data.driverLicenseIssueDate);
            setDriverLicenseIssueDate(date);
            setDriverLicenseDay(date.getDate().toString().padStart(2, '0'));
            setDriverLicenseMonth((date.getMonth() + 1).toString().padStart(2, '0'));
            setDriverLicenseYear(date.getFullYear().toString());
          }
          if (data.driverLicenseFilePath) {
            // Extraire le nom du fichier de l'URL
            const fileName = data.driverLicenseFilePath.split('/').pop() || 'Fichier permis';
            setDriverLicenseFileName(fileName);
          }
          // Convertir la date de naissance si elle existe
          if (data.birthDate) {
            const date = new Date(data.birthDate);
            setBirthDate(date);
            setBirthDay(date.getDate().toString().padStart(2, '0'));
            setBirthMonth((date.getMonth() + 1).toString().padStart(2, '0'));
            setBirthYear(date.getFullYear().toString());
          }

          // Stocker les données originales pour détecter les modifications
          setOriginalData({
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            birthDate: data.birthDate,
            placeOfBirth: data.placeOfBirth,
            bio: data.bio,
            addressLine1: data.addressLine1,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
            driverLicenseNumber: data.driverLicenseNumber,
            driverLicenseIssueDate: data.driverLicenseIssueDate,
            driverLicenseExpirationDate: data.driverLicenseExpirationDate,
            driverLicenseCategory: data.driverLicenseCategory,
            driverLicenseCountry: data.driverLicenseCountry,
            driverLicenseFilePath: data.driverLicenseFilePath,
          });
        }
      } catch (error) {
        console.error("Error loading user:", error);
        toast({
          title: t("profile.toasts.unexpectedLoadError.title", "Erreur"),
          description: t(
            "profile.toasts.unexpectedLoadError.description",
            "Une erreur est survenue lors du chargement du profil.",
          ),
          variant: "destructive",
        });
      }
    };
    loadUser();
  }, [toast]);

  const handleDriverLicenseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("profile.toasts.licenseFileTooLarge.title", "Erreur"),
          description: t(
            "profile.toasts.licenseFileTooLarge.description",
            "Le fichier ne doit pas dépasser 10MB."
          ),
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t("profile.toasts.licenseFileTypeError.title", "Erreur"),
          description: t(
            "profile.toasts.licenseFileTypeError.description",
            "Veuillez sélectionner un fichier PDF, JPG ou PNG."
          ),
          variant: "destructive",
        });
        return;
      }

          // Mettre à jour l'aperçu immédiatement
          setDriverLicenseFile(file);
          setDriverLicenseFileName(file.name);
          setHasUploadedFile(true); // Marquer qu'un fichier a été sélectionné

          setIsUploadingLicense(true);
      try {
        const { data: fileUrl, error } = await ProfileService.uploadDriverLicenseFile(file);
        
        if (error) {
          toast({
            title: t("profile.toasts.licenseUploadError.title", "Erreur"),
            description: t(
              "profile.toasts.licenseUploadError.description",
              "Erreur lors de l'upload : {{error}}",
              { error: String(error) }
            ),
            variant: "destructive",
          });
          // En cas d'erreur, réinitialiser l'aperçu
          setDriverLicenseFile(null);
          setDriverLicenseFileName("");
        } else if (fileUrl) {
          const { data: updatedUser, error: updateError } = await ProfileService.updateProfile({
            driverLicenseFilePath: fileUrl
          });

          if (updateError) {
            toast({
              title: t("profile.toasts.licenseUpdateError.title", "Erreur"),
              description: t(
                "profile.toasts.licenseUpdateError.description",
                "Erreur lors de la mise à jour : {{error}}",
                { error: String(updateError) }
              ),
              variant: "destructive",
            });
            // En cas d'erreur, réinitialiser l'aperçu
            setDriverLicenseFile(null);
            setDriverLicenseFileName("");
              } else if (updatedUser) {
                setCurrentUser(updatedUser);
                
            // Mettre à jour les données originales après upload
            setOriginalData(prev => ({
              ...prev,
              driverLicenseFilePath: updatedUser.driverLicenseFilePath,
            }));
            
            setHasUploadedFile(false); // Réinitialiser le flag après upload réussi
            
            toast({
              title: t("profile.toasts.licenseUploadSuccess.title", "Succès"),
              description: t(
                "profile.toasts.licenseUploadSuccess.description",
                "Fichier permis uploadé avec succès."
              ),
            });
              }
        }
      } catch (error) {
        console.error("Error uploading driver license file:", error);
        toast({
          title: t("profile.toasts.licenseUploadUnexpectedError.title", "Erreur"),
          description: t(
            "profile.toasts.licenseUploadUnexpectedError.description",
            "Une erreur est survenue lors de l'upload du fichier."
          ),
          variant: "destructive",
        });
        // En cas d'erreur, réinitialiser l'aperçu
            setDriverLicenseFile(null);
            setDriverLicenseFileName("");
            setHasUploadedFile(false); // Réinitialiser le flag en cas d'erreur
          } finally {
            setIsUploadingLicense(false);
          }
    }
  };

  const handleRemoveDriverLicense = async () => {
    setIsLoading(true);
    try {
      const { data: updatedUser, error } = await ProfileService.updateProfile({
        driverLicenseFilePath: null
      });

      if (error) {
        toast({
          title: t("profile.toasts.licenseRemoveError.title", "Erreur"),
          description: t(
            "profile.toasts.licenseRemoveError.description",
            "Erreur lors de la suppression : {{error}}",
            { error: String(error) }
          ),
          variant: "destructive",
        });
          } else if (updatedUser) {
            setCurrentUser(updatedUser);
            setDriverLicenseFile(null);
            setDriverLicenseFileName("");
            
            // Mettre à jour les données originales après suppression
            setOriginalData(prev => ({
              ...prev,
              driverLicenseFilePath: updatedUser.driverLicenseFilePath,
            }));
            
            toast({
              title: t("profile.toasts.licenseRemoveSuccess.title", "Succès"),
              description: t(
                "profile.toasts.licenseRemoveSuccess.description",
                "Fichier permis supprimé avec succès."
              ),
            });
          }
    } catch (error) {
      console.error("Error removing driver license file:", error);
      toast({
        title: t("profile.toasts.licenseRemoveUnexpectedError.title", "Erreur"),
        description: t(
          "profile.toasts.licenseRemoveUnexpectedError.description",
          "Une erreur est survenue lors de la suppression."
        ),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("profile.toasts.avatarTooLarge.title", "Erreur"),
          description: t(
            "profile.toasts.avatarTooLarge.description",
            "L'image ne doit pas dépasser 5MB."
          ),
          variant: "destructive",
        });
        return;
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        toast({
          title: t("profile.toasts.avatarTypeError.title", "Erreur"),
          description: t(
            "profile.toasts.avatarTypeError.description",
            "Veuillez sélectionner un fichier image valide."
          ),
          variant: "destructive",
        });
        return;
      }

      setIsUploadingImage(true);
      try {
        // Upload l'image vers Supabase Storage
        const { data: imageUrl, error } = await ProfileService.uploadProfileImage(file);
        
        if (error) {
          console.error("Erreur upload:", error);
          toast({
            title: t("profile.toasts.avatarUploadError.title", "Erreur"),
            description: t(
              "profile.toasts.avatarUploadError.description",
              "Erreur lors de l'upload : {{error}}",
              { error: String(error) }
            ),
            variant: "destructive",
          });
        } else if (imageUrl) {
          // Mettre à jour le profil avec la nouvelle URL d'avatar
          const { data: updatedUser, error: updateError } = await ProfileService.updateProfile({
            avatarUrl: imageUrl
          });

          if (updateError) {
            console.error("Erreur mise à jour:", updateError);
            toast({
              title: t("profile.toasts.avatarUpdateError.title", "Erreur"),
              description: t(
                "profile.toasts.avatarUpdateError.description",
                "Erreur lors de la mise à jour : {{error}}",
                { error: String(updateError) }
              ),
              variant: "destructive",
            });
          } else if (updatedUser) {
            setCurrentUser(updatedUser);
            setProfileImage(imageUrl);
            toast({
              title: t("profile.toasts.avatarUploadSuccess.title", "Succès"),
              description: t(
                "profile.toasts.avatarUploadSuccess.description",
                "Photo de profil mise à jour avec succès."
              ),
            });
          }
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          title: t("profile.toasts.avatarUploadUnexpectedError.title", "Erreur"),
          description: t(
            "profile.toasts.avatarUploadUnexpectedError.description",
            "Une erreur est survenue lors de l'upload de l'image."
          ),
          variant: "destructive",
        });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

      // Fonction pour sauvegarder une section spécifique
      const saveSection = async (section: 'basic' | 'address' | 'license') => {
        if (!currentUser) return;

        setIsLoading(true);

        try {
          let updateData: any = {};

          if (section === 'basic') {
            updateData = {
              firstName: firstName,
              lastName: lastName,
              phone: phone || undefined,
              birthDate: birthDate ? format(birthDate, 'yyyy-MM-dd') : undefined,
              placeOfBirth: placeOfBirth || undefined,
              bio: bio || undefined,
            };
          } else if (section === 'address') {
            updateData = {
              addressLine1: addressLine1 || undefined,
              postalCode: postalCode || undefined,
              city: city || undefined,
              country: country || undefined,
            };
          } else if (section === 'license') {
            updateData = {
              driverLicenseNumber: driverLicenseNumber || undefined,
              driverLicenseIssueDate: driverLicenseIssueDate ? format(driverLicenseIssueDate, 'yyyy-MM-dd') : undefined,
              driverLicenseExpirationDate: driverLicenseExpirationDate ? format(driverLicenseExpirationDate, 'yyyy-MM-dd') : undefined,
              driverLicenseCategory: driverLicenseCategory || "B",
              driverLicenseCountry: driverLicenseCountry || undefined,
            };
          }

          const { data: updatedUser, error } = await ProfileService.updateProfile(updateData);

        if (error) {
            toast({
              title: t("profile.toasts.sectionSaveError.title", "Erreur"),
              description: t(
                "profile.toasts.sectionSaveError.description",
                "Erreur lors de la sauvegarde : {{error}}",
                { error: String(error) }
              ),
              variant: "destructive",
            });
          } else if (updatedUser) {
            setCurrentUser(updatedUser);
            setCompletedSections(prev => new Set([...prev, section]));
            
            // Mettre à jour les données originales après sauvegarde
            setOriginalData(prev => ({
              ...(prev || {}),
              firstName: updatedUser.firstName,
              lastName: updatedUser.lastName,
              phone: updatedUser.phone,
              birthDate: updatedUser.birthDate,
              placeOfBirth: updatedUser.placeOfBirth,
              bio: updatedUser.bio,
              addressLine1: updatedUser.addressLine1,
              postalCode: updatedUser.postalCode,
              city: updatedUser.city,
              country: updatedUser.country,
              driverLicenseNumber: updatedUser.driverLicenseNumber,
              driverLicenseIssueDate: updatedUser.driverLicenseIssueDate,
              driverLicenseExpirationDate: updatedUser.driverLicenseExpirationDate,
              driverLicenseCategory: updatedUser.driverLicenseCategory,
              driverLicenseCountry: updatedUser.driverLicenseCountry,
              driverLicenseFilePath: updatedUser.driverLicenseFilePath,
            }));
            
            // Réinitialiser le flag d'upload après sauvegarde
            if (section === 'license') {
              setHasUploadedFile(false);
            }
            
            toast({
              title: t("profile.toasts.sectionSaveSuccess.title", "Section sauvegardée"),
              description: t(
                section === 'basic'
                  ? "profile.toasts.sectionSaveSuccess.basic"
                  : section === 'address'
                  ? "profile.toasts.sectionSaveSuccess.address"
                  : "profile.toasts.sectionSaveSuccess.license",
                section === 'basic'
                  ? "Vos informations de base ont été sauvegardées."
                  : section === 'address'
                  ? "Vos informations d'adresse ont été sauvegardées."
                  : "Vos informations de permis ont été sauvegardées."
              ),
            });

            // 🔄 Gérer le retour vers la réservation si returnTo présent et téléphone renseigné
            const searchParams = new URLSearchParams(location.search);
            const returnTo = searchParams.get('returnTo');
            
            if (returnTo && updatedUser.phone && updatedUser.phone.trim().length > 0) {
              // Vérifier si pendingBooking existe dans sessionStorage
              const pendingBooking = sessionStorage.getItem('pendingBooking');
              
              if (pendingBooking) {
                // Nettoyer sessionStorage
                sessionStorage.removeItem('pendingBooking');
              }
              
              // Décoder et rediriger vers returnTo
              const decodedReturnTo = decodeURIComponent(returnTo);
              navigate(decodedReturnTo);
            }
          }
        } catch (error) {
          console.error("Error saving section:", error);
          toast({
            title: t("profile.toasts.sectionSaveUnexpectedError.title", "Erreur"),
            description: t(
              "profile.toasts.sectionSaveUnexpectedError.description",
              "Erreur lors de la sauvegarde : {{error}}",
              { error: error instanceof Error ? error.message : 'Erreur inconnue' }
            ),
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      // Fonction pour sauvegarder tout (pour le bouton principal)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
        if (!currentUser) return;

    setIsLoading(true);

        try {
          const updateData = {
            firstName: firstName,
            lastName: lastName,
            phone: phone || undefined,
            birthDate: birthDate ? format(birthDate, 'yyyy-MM-dd') : undefined,
            placeOfBirth: placeOfBirth || undefined,
            bio: bio || undefined,
            addressLine1: addressLine1 || undefined,
            postalCode: postalCode || undefined,
            city: city || undefined,
            country: country || undefined,
            driverLicenseNumber: driverLicenseNumber || undefined,
            driverLicenseIssueDate: driverLicenseIssueDate ? format(driverLicenseIssueDate, 'yyyy-MM-dd') : undefined,
            driverLicenseExpirationDate: driverLicenseExpirationDate ? format(driverLicenseExpirationDate, 'yyyy-MM-dd') : undefined,
            driverLicenseCategory: driverLicenseCategory || "B",
            driverLicenseCountry: driverLicenseCountry || undefined,
          };

          console.log('Données à sauvegarder:', updateData);

          const { data: updatedUser, error } = await ProfileService.updateProfile(updateData);

          if (error) {
      toast({
              title: t("profile.toasts.profileUpdateError.title", "Erreur"),
              description: t(
                "profile.toasts.profileUpdateError.description",
                "Erreur lors de la mise à jour : {{error}}",
                { error: String(error) }
              ),
              variant: "destructive",
            });
          } else if (updatedUser) {
            setCurrentUser(updatedUser);
            setCompletedSections(new Set(['basic', 'address', 'license']));
            toast({
              title: t("profile.toasts.profileUpdateSuccess.title", "Profil complet mis à jour"),
              description: t(
                "profile.toasts.profileUpdateSuccess.description",
                "Toutes vos informations ont été sauvegardées avec succès."
              ),
            });

            // 🔄 Gérer le retour vers la réservation si returnTo présent et téléphone renseigné
            const searchParams = new URLSearchParams(location.search);
            const returnTo = searchParams.get('returnTo');
            
            if (returnTo && updatedUser.phone && updatedUser.phone.trim().length > 0) {
              // Vérifier si pendingBooking existe dans sessionStorage
              const pendingBooking = sessionStorage.getItem('pendingBooking');
              
              if (pendingBooking) {
                // Nettoyer sessionStorage
                sessionStorage.removeItem('pendingBooking');
              }
              
              // Décoder et rediriger vers returnTo
              const decodedReturnTo = decodeURIComponent(returnTo);
              navigate(decodedReturnTo);
            }
          }
    } catch (error) {
          console.error("Error updating profile:", error);
      toast({
        title: t("profile.toasts.profileUpdateUnexpectedError.title", "Erreur"),
        description: t(
          "profile.toasts.profileUpdateUnexpectedError.description",
          "Erreur lors de la mise à jour du profil : {{error}}",
          { error: error instanceof Error ? error.message : 'Erreur inconnue' }
        ),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gestionnaire d'erreur global pour éviter les pages blanches
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Erreur globale capturée:', error);
      toast({
        title: t("profile.toasts.globalError.title", "Erreur"),
        description: t(
          "profile.toasts.globalError.description",
          "Une erreur inattendue s'est produite. Veuillez recharger la page."
        ),
        variant: "destructive",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Promesse rejetée non gérée:', event.reason);
      toast({
        title: t("profile.toasts.globalSaveError.title", "Erreur"),
        description: t(
          "profile.toasts.globalSaveError.description",
          "Une erreur de sauvegarde s'est produite. Veuillez réessayer."
        ),
        variant: "destructive",
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [toast]);

  // Gestionnaire d'erreur pour éviter les pages blanches
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Erreur JavaScript capturée:', error);
      setHasError(true);
      toast({
        title: t("profile.toasts.javascriptError.title", "Erreur"),
        description: t(
          "profile.toasts.javascriptError.description",
          "Une erreur inattendue s'est produite. Veuillez recharger la page."
        ),
        variant: "destructive",
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [toast]);

  // Affichage d'erreur si une erreur critique s'est produite
  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {t("profile.error.title", "Erreur")}
          </h1>
          <p className="text-gray-600 mb-6">
            {t("profile.error.description", "Une erreur s'est produite lors du chargement du profil.")}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t("profile.error.reload", "Recharger la page")}
          </Button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">
            {t("profile.loading", "Chargement de votre profil...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-background">
      {/* Hero Section avec gradient */}
      <div className="relative bg-gradient-lagoon text-white py-12 sm:py-16">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("profile.hero.back", "Retour à l'accueil")}
            </Link>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t("profile.hero.title", "Mon Profil")}
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
              {t(
                "profile.hero.subtitle",
                "Gérez vos informations personnelles et personnalisez votre expérience"
              )}
            </p>
          </div>
        </div>
        </div>

          {/* Contenu principal */}
          <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
            {/* Badge de statut du profil */}
            <div className="mb-6">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                calculateProfileCompletion() === 100 
                  ? 'bg-success-soft text-success border border-success-soft/30' 
                  : calculateProfileCompletion() >= 75
                  ? 'bg-primary-soft text-primary border border-primary-soft/30'
                  : calculateProfileCompletion() >= 50
                  ? 'bg-warning-soft text-warning border border-warning-soft/30'
                  : 'bg-muted text-muted-foreground border border-muted/30'
              }`}>
                {calculateProfileCompletion() === 100 ? (
                  <>
                    <span className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></span>
                    {t("profile.completion.full", "Profil complet ✓")}
                  </>
                ) : (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full mr-2 ${
                        calculateProfileCompletion() >= 75
                          ? "bg-primary animate-pulse"
                          : calculateProfileCompletion() >= 50
                          ? "bg-warning animate-pulse"
                          : "bg-muted-foreground"
                      }`}
                    ></span>
                    {t(
                      "profile.completion.partial",
                      "Profil {{percent}}% complété",
                      { percent: calculateProfileCompletion() }
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Section profil avec avatar en vedette */}
        <div className="relative -mt-16 mb-8">
          <div className="bg-white rounded-2xl shadow-lagoon p-6 sm:p-8 border border-primary-soft/20">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8">
              {/* Avatar avec effet de profondeur */}
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-lagoon rounded-full opacity-20 blur-sm"></div>
                <div className="relative">
                  <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={profileImage} className="object-cover" />
                    <AvatarFallback className="bg-gradient-lagoon text-white text-2xl sm:text-3xl font-bold">
                    {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                  
                  {/* Overlay de chargement avec animation */}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                        <span className="text-xs text-white font-medium">Upload...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Informations utilisateur */}
                <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {currentUser.firstName} {currentUser.lastName}
                </h2>
                <p className="text-muted-foreground mb-4">{currentUser.email}</p>
                
                {/* Badges de statut */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary">
                    {currentUser.roles?.includes("admin")
                      ? t("profile.badges.role.admin", "⚙️ Administrateur")
                      : currentUser.roles?.includes("owner")
                      ? t("profile.badges.role.owner", "🏠 Propriétaire")
                      : t("profile.badges.role.renter", "👤 Locataire")}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      currentUser.kycStatus === "verified"
                        ? "bg-success-soft text-success"
                        : currentUser.kycStatus === "pending"
                        ? "bg-warning-soft text-warning"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentUser.kycStatus === "verified"
                      ? t("profile.badges.kyc.verified", "✅ Vérifié")
                      : currentUser.kycStatus === "pending"
                      ? t("profile.badges.kyc.pending", "⏳ En attente")
                      : t("profile.badges.kyc.unverified", "❌ Non vérifié")}
                  </span>
                </div>
                
                {/* Bouton changer photo */}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="profile-image"
                    disabled={isUploadingImage}
                  />
                  <Label htmlFor="profile-image" className={cn(
                    "cursor-pointer",
                    isUploadingImage && "cursor-not-allowed opacity-50"
                  )}>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="bg-white hover:bg-primary-soft/10 border-primary-soft text-primary hover:text-primary-foreground transition-all duration-200" 
                      disabled={isUploadingImage}
                      asChild
                    >
                      <span>
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("profile.buttons.uploading", "Upload en cours...")}
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            {t("profile.buttons.avatar.changePhoto", "Changer la photo")}
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isUploadingImage
                      ? t(
                          "profile.form.avatar.loading",
                          "Téléchargement en cours..."
                        )
                      : t(
                          "profile.form.avatar.helper",
                          "Formats acceptés : JPG, PNG. Taille max : 5MB"
                        )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

            {/* Navigation par onglets pour organiser les sections */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center mb-4">
              <button
                type="button"
                onClick={() => handleSectionChange('basic')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeSection === 'basic'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white/80 text-primary border border-primary-soft/30 hover:bg-primary-soft/10'
                }`}
              >
                📝 {t("profile.tabs.basic", "Informations de base")}
              </button>
              {FEATURES.profileAddressEnabled && (
                <button
                  type="button"
                  onClick={() => handleSectionChange('address')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeSection === 'address'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white/80 text-primary border border-primary-soft/30 hover:bg-primary-soft/10'
                  }`}
                >
                  🏠 {t("profile.tabs.address", "Adresse")}
                </button>
              )}
              {FEATURES.profileDrivingLicenseEnabled && (
                <button
                  type="button"
                  onClick={() => handleSectionChange('license')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeSection === 'license'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white/80 text-primary border border-primary-soft/30 hover:bg-primary-soft/10'
                  }`}
                >
                  🚗 {t("profile.tabs.license", "Permis de conduire")}
                </button>
              )}
          </div>
          
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Personal Information Form */}
          {activeSection === 'basic' && (
            <Card className="bg-white/90 backdrop-blur-sm border-primary-soft/20 shadow-soft hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="bg-gradient-to-r from-primary-soft/20 via-primary-soft/10 to-transparent border-b border-primary-soft/10 p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-primary flex items-center">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary text-lg">👤</span>
                  </div>
                  {t("profile.sections.basic.title", "Informations personnelles")}
                </CardTitle>
                <div className="text-sm text-muted-foreground bg-white/60 px-3 py-1 rounded-full">
                  {t(
                    "profile.sections.basic.step",
                    `Étape 1/${1 + (FEATURES.profileAddressEnabled ? 1 : 0) + (FEATURES.profileDrivingLicenseEnabled ? 1 : 0)}`
                  )}
                </div>
              </div>
              <p className="text-muted-foreground mt-2 ml-12">
                {t(
                  "profile.sections.basic.subtitle",
                  "Vos informations de base pour personnaliser votre expérience"
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              {/* Groupe identité */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary text-sm">🆔</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t("profile.sections.basic.identity.title", "Identité")}
                  </h3>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-muted-foreground flex items-center">
                    {t("profile.form.firstName.label", "Prénom")}
                    {firstName && firstName.trim() !== '' && (
                      <span className="ml-2 w-2 h-2 bg-success rounded-full"></span>
                    )}
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t("profile.form.firstName.placeholder", "Votre prénom")}
                      className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                  />
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-muted-foreground">
                      {t("profile.form.lastName.label", "Nom")}
                    </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    placeholder={t("profile.form.lastName.placeholder", "Votre nom")}
                      className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                  />
                  </div>
                </div>
              </div>
              
              {/* Groupe contact */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary text-sm">📧</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t("profile.sections.basic.contact.title", "Contact")}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                      {t("profile.form.email.label", "Email")}
                    </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={currentUser.email}
                  placeholder={t(
                    "profile.form.email.placeholder",
                    "votre.email@exemple.com"
                  )}
                      className="h-11 bg-muted/20 border-primary-soft/20 text-muted-foreground rounded-lg"
                      disabled
                />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "profile.form.email.helper",
                        "L'email ne peut pas être modifié"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Groupe informations personnelles */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary text-sm">🎂</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t("profile.sections.basic.personal.title", "Informations personnelles")}
                  </h3>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("profile.form.birthDate.label", "Date de naissance")}
                    </Label>
                <div>
                    {isMobile ? (
                      <MobileDatePicker
                        value={birthDate}
                        onChange={(date) => {
                          setBirthDate(date);
                          if (date) {
                            setBirthDay(date.getDate().toString().padStart(2, '0'));
                            setBirthMonth((date.getMonth() + 1).toString().padStart(2, '0'));
                            setBirthYear(date.getFullYear().toString());
                          }
                        }}
                        placeholder={t(
                          "profile.form.birthDate.placeholder",
                          "Sélectionner une date"
                        )}
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={birthDay} onValueChange={(value) => {
                          setBirthDay(value);
                          updateBirthDate(value, birthMonth, birthYear);
                        }}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("profile.form.birthDate.day.placeholder", "Jour")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                                {(i + 1).toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={birthMonth} onValueChange={(value) => {
                          setBirthMonth(value);
                          updateBirthDate(birthDay, value, birthYear);
                        }}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("profile.form.birthDate.month.placeholder", "Mois")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                                {months[i]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={birthYear} onValueChange={(value) => {
                          setBirthYear(value);
                          updateBirthDate(birthDay, birthMonth, value);
                        }}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("profile.form.birthDate.year.placeholder", "Année")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 125 }, (_, i) => {
                              const year = new Date().getFullYear() - i;
                              return (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                </div>
                    )}
                    </div>
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthPlace" className="text-sm font-medium text-muted-foreground">
                      {t("profile.form.birthPlace.label", "Lieu de naissance")}
                    </Label>
                  <Input
                    id="birthPlace"
                    name="birthPlace"
                      value={placeOfBirth}
                      onChange={(e) => setPlaceOfBirth(e.target.value)}
                    placeholder={t("profile.form.birthPlace.placeholder", "Ville, Pays")}
                      className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                  />
                  </div>
                </div>
              </div>

              {/* Groupe présentation personnelle */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary flex items-center">
                  <span className="mr-2">💬</span>
                  {t("profile.sections.basic.bio.title", "Présentation personnelle")}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label 
                      htmlFor="bio"
                      className="text-sm font-medium text-slate-600 flex items-center"
                    >
                      <span className="mr-2">📝</span>
                      {t("profile.form.bio.label", "Présentez-vous en quelques mots")}
                      <span className="text-xs text-muted-foreground ml-2">
                        {t("profile.form.optional", "(optionnel)")}
                      </span>
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t(
                        "profile.form.bio.placeholder",
                        "Parlez-nous de vous, de vos passions, de votre style de conduite... Cela aidera les autres utilisateurs à mieux vous connaître !"
                      )}
                      className="min-h-[100px] bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg resize-none"
                      maxLength={500}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {t("profile.form.bio.counter", "{{count}}/500 caractères", {
                        count: bio.length,
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Groupe téléphone */}
              <div ref={phoneSectionRef} className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary text-sm">📱</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t("profile.sections.basic.phone.title", "Téléphone")}
                  </h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                    {t("profile.form.phone.label", "Numéro de téléphone")}
                  </Label>
                  <LazyPhoneInput
                    placeholder={t(
                      "profile.form.phone.placeholder",
                      "Numéro de téléphone"
                    )}
                    value={phone}
                    onChange={setPhone}
                    defaultCountry="FR"
                    international
                    countryCallingCodeEditable={false}
                    className="flex h-11 w-full rounded-lg border border-primary-soft/20 bg-background/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              
              {/* Groupe statut */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary text-sm">✅</span>
                </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t("profile.sections.basic.status.title", "Statut de votre compte")}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center px-4 py-2 bg-primary-soft/10 border border-primary-soft/20 rounded-full">
                    <span className="text-sm font-medium text-primary">
                    {currentUser.roles?.includes('admin')
                      ? t("profile.badges.role.admin", "⚙️ Administrateur")
                      : currentUser.roles?.includes('owner')
                      ? t("profile.badges.role.owner", "🏠 Propriétaire")
                      : t("profile.badges.role.renter", "👤 Locataire")}
                    </span>
                  </div>
                  <div className={`flex items-center px-4 py-2 rounded-full border ${
                    currentUser.kycStatus === 'verified' 
                      ? 'bg-success-soft/20 border-success-soft/30 text-success' 
                      : currentUser.kycStatus === 'pending'
                      ? 'bg-warning-soft/20 border-warning-soft/30 text-warning'
                      : 'bg-muted/20 border-muted/30 text-muted-foreground'
                  }`}>
                    <span className="text-sm font-medium">
                      {currentUser.kycStatus === 'verified'
                        ? t("profile.badges.kyc.verified", "✅ Vérifié")
                        : currentUser.kycStatus === 'pending'
                        ? t("profile.badges.kyc.pending", "⏳ En attente")
                        : t("profile.badges.kyc.unverified", "❌ Non vérifié")}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            
            {/* Bouton de sauvegarde pour cette section */}
            <div className="px-8 pb-6">
              <div className="flex justify-between items-center pt-4 border-t border-primary-soft/10">
                <div className="flex items-center space-x-2">
                  {completedSections.has('basic') && (
                    <span className="text-xs text-success font-medium flex items-center">
                      <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
                      {t("profile.sections.basic.saved", "Sauvegardé")}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => saveSection('basic')}
                  disabled={isLoading || !hasSectionChanges('basic')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    hasSectionChanges('basic') 
                      ? 'bg-primary hover:bg-primary/90 text-white' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("profile.buttons.saving", "Sauvegarde...")}
                    </>
                  ) : (
                    hasSectionChanges('basic') 
                      ? (completedSections.has('basic')
                          ? t("profile.buttons.saveBasicChanges", "Sauvegarder mes modifications")
                          : t("profile.buttons.saveBasicInfo", "Sauvegarder mes informations"))
                      : t("profile.buttons.saveSection", "Sauvegarder cette section")
                  )}
                </Button>
              </div>
            </div>
          </Card>
          )}

          {/* Address Information */}
          {FEATURES.profileAddressEnabled && activeSection === 'address' && (
            <Card className="bg-white/90 backdrop-blur-sm border-primary-soft/20 shadow-soft hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="bg-gradient-to-r from-primary-soft/20 via-primary-soft/10 to-transparent border-b border-primary-soft/10 p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-primary flex items-center">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary text-lg">🏠</span>
                  </div>
                  {t("profile.sections.address.title", "Adresse")}
                </CardTitle>
                <div className="text-sm text-muted-foreground bg-white/60 px-3 py-1 rounded-full">
                  {t("profile.sections.address.step", "Étape 2/3")}
                </div>
              </div>
              <p className="text-muted-foreground mt-2 ml-12">
                {t(
                  "profile.sections.address.subtitle",
                  "Votre adresse pour les livraisons et la localisation"
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street" className="text-sm font-medium text-muted-foreground">
                    {t("profile.form.address.street.label", "Adresse")}
                  </Label>
                <Input
                  id="street"
                  name="street"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder={t(
                    "profile.form.address.street.placeholder",
                    "Numéro et nom de rue"
                  )}
                    className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                />
              </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-muted-foreground">
                    {t("profile.form.address.city.label", "Ville")}
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t(
                      "profile.form.address.city.placeholder",
                      "Saint-Denis"
                    )}
                    className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-sm font-medium text-muted-foreground">
                    {t("profile.form.address.postalCode.label", "Code postal")}
                  </Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={t(
                      "profile.form.address.postalCode.placeholder",
                      "97400"
                    )}
                    className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-muted-foreground">
                    {t("profile.form.address.country.label", "Pays")}
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg">
                    <SelectValue
                      placeholder={t(
                        "profile.form.address.country.placeholder",
                        "Sélectionner un pays"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="France">{t("profile.countries.france", "France")}</SelectItem>
                      <SelectItem value="La Réunion">{t("profile.countries.reunion", "La Réunion")}</SelectItem>
                      <SelectItem value="Nosy Be, Madagascar">{t("profile.countries.mayotte", "Nosy Be, Madagascar")}</SelectItem>
                      <SelectItem value="Guadeloupe">{t("profile.countries.guadeloupe", "Guadeloupe")}</SelectItem>
                      <SelectItem value="Martinique">{t("profile.countries.martinique", "Martinique")}</SelectItem>
                      <SelectItem value="Guyane">{t("profile.countries.guyane", "Guyane")}</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>
            </CardContent>
            
            {/* Bouton de sauvegarde pour cette section */}
            <div className="px-8 pb-6">
              <div className="flex justify-between items-center pt-4 border-t border-primary-soft/10">
                <div className="flex items-center space-x-2">
                  {completedSections.has('address') && (
                    <span className="text-xs text-success font-medium flex items-center">
                      <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
                      {t("profile.sections.address.saved", "Sauvegardé")}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => saveSection('address')}
                  disabled={isLoading || !hasSectionChanges('address')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    hasSectionChanges('address') 
                      ? 'bg-primary hover:bg-primary/90 text-white' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("profile.buttons.saving", "Sauvegarde...")}
                    </>
                  ) : (
                    hasSectionChanges('address') 
                      ? (completedSections.has('address')
                          ? t("profile.buttons.saveAddressChanges", "Sauvegarder mes modifications")
                          : t("profile.buttons.saveAddress", "Sauvegarder mon adresse"))
                      : t("profile.buttons.saveSection", "Sauvegarder cette section")
                  )}
                </Button>
              </div>
            </div>
          </Card>
          )}

          {/* Driver License */}
          {FEATURES.profileDrivingLicenseEnabled && activeSection === 'license' && (
            <Card className="bg-white/90 backdrop-blur-sm border-primary-soft/20 shadow-soft hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="bg-gradient-to-r from-primary-soft/20 via-primary-soft/10 to-transparent border-b border-primary-soft/10 p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-primary flex items-center">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary text-lg">🚗</span>
                  </div>
                  Permis de conduire
                </CardTitle>
                <div className="text-sm text-muted-foreground bg-white/60 px-3 py-1 rounded-full">
                  Étape 3/3
                </div>
              </div>
              <p className="text-muted-foreground mt-2 ml-12">
                Votre permis pour louer des véhicules en toute sécurité
              </p>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="driverLicenseNumber" className="text-sm font-medium text-muted-foreground">
                    Numéro de permis
                  </Label>
                <Input
                  id="driverLicenseNumber"
                  name="driverLicenseNumber"
                    value={driverLicenseNumber}
                    onChange={(e) => setDriverLicenseNumber(e.target.value)}
                  placeholder="ex : 121075012XXX"
                    className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pour un permis européen, le numéro indiqué dans la section 5. <a href="#" className="underline text-primary hover:text-primary/80">En savoir plus...</a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseCountry" className="text-sm font-medium text-muted-foreground">
                    Pays d'émission
                  </Label>
                  <Select value={driverLicenseCountry} onValueChange={setDriverLicenseCountry}>
                    <SelectTrigger className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg">
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="La Réunion">La Réunion</SelectItem>
                      <SelectItem value="Nosy Be, Madagascar">Nosy Be, Madagascar</SelectItem>
                      <SelectItem value="Belgique">Belgique</SelectItem>
                      <SelectItem value="Suisse">Suisse</SelectItem>
                      <SelectItem value="Allemagne">Allemagne</SelectItem>
                      <SelectItem value="Espagne">Espagne</SelectItem>
                      <SelectItem value="Italie">Italie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Document du permis</Label>
                <div className="mt-1">
                  {currentUser?.driverLicenseFilePath || driverLicenseFileName ? (
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="space-y-3">
                        {/* Aperçu du fichier */}
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {driverLicenseFileName.toLowerCase().endsWith('.pdf') ? (
                              <div className="w-16 h-20 bg-blue-100 rounded-lg flex items-center justify-center border">
                                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                              </div>
                            ) : (
                              <div 
                                className="w-16 h-20 bg-gray-100 rounded-lg border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowImageModal(true)}
                              >
                                {currentUser?.driverLicenseFilePath ? (
                                  <img 
                                    src={currentUser.driverLicenseFilePath} 
                                    alt="Aperçu du permis de conduire"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback si l'image ne charge pas
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                            <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                            </svg>
                                          </div>
                                        `;
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log('Image chargée avec succès:', currentUser.driverLicenseFilePath);
                                    }}
                                  />
                                ) : driverLicenseFile ? (
                                  <img 
                                    src={URL.createObjectURL(driverLicenseFile)} 
                                    alt="Aperçu du permis de conduire"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {driverLicenseFileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {driverLicenseFileName.toLowerCase().endsWith('.pdf') ? 'Document PDF' : 'Image'}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Fichier uploadé avec succès
                            </p>
                    </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('license-upload')?.click()}
                            disabled={isUploadingLicense || isLoading}
                          >
                            {isUploadingLicense ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Upload...
                              </>
                            ) : (
                              "Changer"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveDriverLicense}
                            disabled={isUploadingLicense || isLoading}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                        <p className="text-sm text-muted-foreground mb-2">
                          Cliquez pour uploader votre permis de conduire
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Formats acceptés : PDF, JPG, PNG. Taille max : 10MB
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('license-upload')?.click()}
                          disabled={isUploadingLicense}
                        >
                          {isUploadingLicense ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Upload en cours...
                            </>
                          ) : (
                            "Choisir un fichier"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  <input
                    id="license-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDriverLicenseUpload}
                    className="hidden"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Date d'obtention</Label>
                <div className="mt-1">
                  {isMobile ? (
                    <MobileDatePicker
                      value={driverLicenseIssueDate}
                      onChange={(date) => {
                        setDriverLicenseIssueDate(date);
                        if (date) {
                          setDriverLicenseDay(date.getDate().toString().padStart(2, '0'));
                          setDriverLicenseMonth((date.getMonth() + 1).toString().padStart(2, '0'));
                          setDriverLicenseYear(date.getFullYear().toString());
                        }
                      }}
                      placeholder="Sélectionner une date"
                    />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={driverLicenseDay} onValueChange={(value) => {
                        setDriverLicenseDay(value);
                        updateDriverLicenseDate(value, driverLicenseMonth, driverLicenseYear);
                      }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Jour" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                          {(i + 1).toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                      <Select value={driverLicenseMonth} onValueChange={(value) => {
                        setDriverLicenseMonth(value);
                        updateDriverLicenseDate(driverLicenseDay, value, driverLicenseYear);
                      }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                          {new Date(0, i).toLocaleDateString('fr-FR', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                      <Select value={driverLicenseYear} onValueChange={(value) => {
                        setDriverLicenseYear(value);
                        updateDriverLicenseDate(driverLicenseDay, driverLicenseMonth, value);
                      }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                          {Array.from({ length: 75 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour un permis européen, sa date de début de validité pour les véhicules de catégorie B. <a href="#" className="underline">En savoir plus...</a>
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="driver_license_category" className="text-sm font-medium text-muted-foreground">
                    Catégorie du permis
                  </Label>
                  <Input
                    id="driver_license_category"
                    type="text"
                    value={driverLicenseCategory}
                    onChange={(e) => setDriverLicenseCategory(e.target.value)}
                    placeholder="Ex: B"
                    className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Catégorie du permis (par défaut : B pour voiture)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="driver_license_expiration_date" className="text-sm font-medium text-muted-foreground">
                    Date d'expiration
                  </Label>
                  {isMobile ? (
                    <MobileDatePicker
                      value={driverLicenseExpirationDate}
                      onChange={setDriverLicenseExpirationDate}
                      placeholder="Sélectionner une date"
                    />
                  ) : (
                    <Input
                      id="driver_license_expiration_date"
                      type="date"
                      value={driverLicenseExpirationDate ? format(driverLicenseExpirationDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDriverLicenseExpirationDate(new Date(e.target.value));
                        } else {
                          setDriverLicenseExpirationDate(undefined);
                        }
                      }}
                      className="h-11 bg-background/30 border-primary-soft/20 focus:border-primary focus:ring-primary/10 transition-all duration-200 rounded-lg"
                    />
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="licenseCountry" className="text-sm font-medium">Pays d'émission</Label>
                <Select value={driverLicenseCountry} onValueChange={setDriverLicenseCountry}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner un pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="France">France</SelectItem>
                    <SelectItem value="La Réunion">La Réunion</SelectItem>
                    <SelectItem value="Nosy Be, Madagascar">Nosy Be, Madagascar</SelectItem>
                    <SelectItem value="Belgique">Belgique</SelectItem>
                    <SelectItem value="Suisse">Suisse</SelectItem>
                    <SelectItem value="Allemagne">Allemagne</SelectItem>
                    <SelectItem value="Espagne">Espagne</SelectItem>
                    <SelectItem value="Italie">Italie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            
            {/* Bouton de sauvegarde pour cette section */}
            <div className="px-8 pb-6">
              <div className="flex justify-between items-center pt-4 border-t border-primary-soft/10">
                <div className="flex items-center space-x-2">
                  {completedSections.has('license') && (
                    <span className="text-xs text-success font-medium flex items-center">
                      <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
                      Sauvegardé
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={() => saveSection('license')}
                  disabled={isLoading || !hasSectionChanges('license')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    hasSectionChanges('license') 
                      ? 'bg-primary hover:bg-primary/90 text-white' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    hasSectionChanges('license') 
                      ? (completedSections.has('license') ? 'Sauvegarder mes modifications' : 'Sauvegarder mes infos du permis')
                      : 'Sauvegarder cette section'
                  )}
                </Button>
              </div>
            </div>
          </Card>
          )}

          {/* Submit Button - Visible seulement si profil incomplet */}
          {calculateProfileCompletion() < 100 && (
            <div className="pt-6 sm:pt-8 pb-6 sm:pb-8">
              <div className="bg-gradient-to-r from-primary-soft/20 to-primary-soft/10 rounded-2xl p-6 border border-primary-soft/30">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-primary mb-2">
                    {t(
                      "profile.banner.title",
                      "Profil {{percent}}% complété",
                      { percent: calculateProfileCompletion() }
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {t(
                      "profile.banner.description",
                      "{{percent}}% du profil complété. Cliquez pour sauvegarder toutes les modifications.",
                      { percent: calculateProfileCompletion() }
                    )}
                  </p>
            <Button
              type="submit"
              disabled={isLoading}
                    className="bg-gradient-lagoon text-white hover:opacity-90 shadow-lagoon transition-all duration-300 font-medium py-4 px-8 text-lg min-h-[56px] rounded-xl hover:scale-105 transform"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {t(
                          "profile.buttons.saving",
                          "Sauvegarde en cours..."
                        )}
                      </>
                    ) : (
                      t(
                        "profile.buttons.saveAll",
                        "Sauvegarder tout le profil"
                      )
                    )}
            </Button>
          </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal pour afficher l'image en grand */}
        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {t(
                  "profile.modal.licensePreview.title",
                  "Aperçu du permis de conduire"
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center p-4">
              {currentUser?.driverLicenseFilePath ? (
                <img 
                  src={currentUser.driverLicenseFilePath} 
                  alt={t(
                    "profile.modal.licensePreview.alt",
                    "Permis de conduire"
                  )}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'block';
                    }
                  }}
                />
              ) : driverLicenseFile ? (
                <img 
                  src={URL.createObjectURL(driverLicenseFile)} 
                  alt={t(
                    "profile.modal.licensePreview.alt",
                    "Permis de conduire"
                  )}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : null}
              
              {/* Fallback si l'image ne charge pas */}
              <div 
                className="hidden flex flex-col items-center justify-center p-8 text-center"
                style={{ display: 'none' }}
              >
                <svg className="w-16 h-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-muted-foreground mb-2">
                  {t(
                    "profile.modal.licensePreview.errorTitle",
                    "Impossible de charger l'image"
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "profile.modal.licensePreview.errorDescription",
                    "Vérifiez que le fichier est bien uploadé et accessible"
                  )}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}