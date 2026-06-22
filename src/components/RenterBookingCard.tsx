// src/components/RenterBookingCard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPublicListingPath, getPublicDiscussionPath } from '@/utils/vehicleType'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Euro,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Car,
  FileText,
  XCircle,
  CheckCircle,
  Plus,
  Plane,
  Ship,
  Home,
  Baby,
  UserPlus,
  Info,
  MapPin,
  Zap,
  CreditCard,
  Shield,
  Bell,
  Mail,
  Building2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { StatusBadge } from '@/components/ui/status-badge'
import { PaymentCountdown } from '@/components/ui/payment-countdown'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { normalizeBookingOptions } from '@/utils/bookingOptions'
import { Booking, Vehicle, Photo, User, CheckinDepartSummary } from '@/types'
import { cn } from '@/lib/utils'
import { ProfileService } from '@/services/supabase/profile'
import { SupabaseBookingsService } from '@/services/supabase/bookings'
import { ConversationsService } from '@/services/supabase/conversations'
import { supabase } from '@/integrations/supabase/client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { enUS } from 'date-fns/locale/en-US'
import { it as itLocale } from 'date-fns/locale/it'
import { de as deLocale } from 'date-fns/locale/de'
import { Separator } from '@/components/ui/separator'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Download } from 'lucide-react'
import { BookingMoreActionsMenu } from '@/components/BookingMoreActionsMenu'
import { formatCurrency } from '@/utils/currency'
import { DualPrice } from '@/components/currency/DualPrice'
import { ClientPriceRow } from '@/components/currency/PriceRows'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'
import {
  buildReservationPaymentFromBooking,
  getRenterPaymentAmountsFromBooking,
  isCashOnSitePayment,
} from '@/utils/renterPaymentFromBooking'
import { getBookingRentalPricing } from '@/utils/rentalPriceFromDates'
import { formatBillableDays } from '@/utils/formatDuration'
import { isAdminCreatedBooking } from '@/utils/bookingAdmin'
import { AdminBookingBadge } from '@/components/AdminBookingBadge'

type BookingWithDetails = Booking & {
  vehicle?: Vehicle
  primaryPhoto?: Photo
  renter?: User
  depositStatus?: 'pending' | 'paid' | 'refunded' | 'card_registered' | 'not_required' | null
  depositAmount?: number | null
  depositAmountSnapshot?: number | null
  stripePaymentMethodId?: string | null
  checkinDepart?: CheckinDepartSummary
}

type RenterBookingCardProps = {
  booking: BookingWithDetails
  isExpanded: boolean
  toggleExpanded: (id: string) => void
  formatDate: (date: string) => string
  getDuration: (start: string, end: string) => string
  onBookingDeleted?: (bookingId: string) => void
  onBookingUpdated?: (bookingId: string) => void
  onRequestPay?: (reservation: {
    id: string | number
    voiture: string
    dateDebut: string
    dateFin: string
    duree: string
    montantDeBase: number
    fraisService: number
    totalTTC: number
    extras?: Array<{ label: string; price: number }>
  }) => void
  onRequestDeposit?: (booking: BookingWithDetails) => void
}

export default function RenterBookingCard({
  booking,
  isExpanded,
  toggleExpanded,
  formatDate,
  getDuration,
  onBookingDeleted,
  onBookingUpdated,
  onRequestPay,
  onRequestDeposit,
}: RenterBookingCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t, i18n } = useTranslation() // defaultNS = "translation" où duration.* est déplié depuis common.duration.*
  
  // Locale du calendrier / formatage des dates en fonction de la langue active
  const currentLang = i18n.language || "fr"
  const dateLocale =
    currentLang.startsWith("fr") ? fr :
    currentLang.startsWith("it") ? itLocale :
    currentLang.startsWith("de") ? deLocale :
    enUS
  
  // Locale pour le formatage monétaire (dérivée de i18n.language)
  const currencyLocale =
    currentLang.startsWith("fr") ? "fr-FR" :
    currentLang.startsWith("it") ? "it-IT" :
    currentLang.startsWith("de") ? "de-DE" :
    "en-US"
  
  // Helper pour formater les montants avec la locale dynamique
  const formatMoney = (amount: number, currency: string = "EUR") => {
    return formatCurrency(amount, currencyLocale, currency)
  }

  const { formatClientInline, footnote } = useExchangeRate()
  useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[bookings-date-locale]", { 
        lang: i18n.language, 
        resolvedLocale: currentLang.startsWith("fr") ? "fr-FR" :
                        currentLang.startsWith("it") ? "it-IT" :
                        currentLang.startsWith("de") ? "de-DE" :
                        "en-US"
      })
      // Log exemple de formatage monétaire (FR vs EN)
      const exampleAmount = 62.10
      // eslint-disable-next-line no-console
      console.info("[bookings-currency-format]", {
        locale: currencyLocale,
        example: formatMoney(exampleAmount),
        frExample: formatCurrency(exampleAmount, "fr-FR", "EUR"),
        enExample: formatCurrency(exampleAmount, "en-US", "EUR"),
      })
    }
  }, [i18n.language, currentLang, currencyLocale])
  
  const [owner, setOwner] = useState<User | null>(null)
  const [renterFromFetch, setRenterFromFetch] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState<string>('')
  const [customCancelReason, setCustomCancelReason] = useState<string>('')
  const [unreadCount, setUnreadCount] = useState(0)

  // Évite de démonter un Dialog Radix encore "ouvert" quand le Collapsible se referme
  // (overlay portal pouvant rester et bloquer les clics).
  useEffect(() => {
    if (!isExpanded) {
      setShowCancelModal(false)
    }
  }, [isExpanded])
  
  // DEV-only: Debug i18n pour diagnostiquer les textes FR résiduels
  useEffect(() => {
    if (import.meta.env.DEV) {
      const criticalKeys = [
        'bookings.card.startLabel',
        'bookings.card.endLabel',
        'bookings.card.totalLabel',
        'bookings.status.paymentConfirmed',
        'bookings.status.depositPending',
        'bookings.status.readyToGo',
        'bookings.status.active',
        'bookings.status.completed',
        'bookings.status.cancelled',
        'bookings.cancel.title',
        'common.annuler',
      ]
      
      const sampleResults = criticalKeys.map(key => ({
        key,
        exists: i18n.exists(key),
        t_current: t(key),
        t_en: t(key, { lng: 'en' }),
        t_fr: t(key, { lng: 'fr' }),
      }))
      
      // eslint-disable-next-line no-console
      console.info('[card-i18n-debug]', {
        language: i18n.language,
        resolvedLanguage: i18n.resolvedLanguage,
        defaultNS: i18n.options.defaultNS,
        fallbackLng: i18n.options.fallbackLng,
        sample: sampleResults,
      })
    }
  }, [i18n, t])

  // DEV-only: Diagnostic complet i18n pour la carte de réservation
  useEffect(() => {
    if (import.meta.env.DEV) {
      const resolvedLang = i18n.resolvedLanguage || i18n.language
      const storeData = i18n.store?.data || {}
      
      // Calculer des exemples de dates formatées
      const exampleDate = new Date(booking.startDate)
      const exampleTime = (booking as any).startTime || '08:00'
      const [hour, minute] = exampleTime.split(':')
      exampleDate.setHours(parseInt(hour), parseInt(minute), 0, 0)
      const startDateTimeFormatted = format(exampleDate, "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })
      
      const exampleEndDate = new Date(booking.endDate)
      const exampleEndTime = (booking as any).endTime || '10:00'
      const [endHour, endMinute] = exampleEndTime.split(':')
      exampleEndDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
      const endDateTimeFormatted = format(exampleEndDate, "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })
      
      // Clés critiques à tester
      const criticalKeys = [
        'bookings.status.depositPending', // Pour "En attente"
        'bookings.card.durationLabel', // Pour "Durée:"
        'duration.day_other', // Pour vérifier duration
        'annuler', // Pour le bouton
        'common.annuler', // Pour le bouton (ancienne clé)
        'bookings.cancel.confirm', // Alternative possible
      ]
      
      const keyTests = criticalKeys.map(key => ({
        key,
        exists: i18n.exists(key),
        t_current: t(key),
        t_en: t(key, { lng: 'en' }),
        t_fr: t(key, { lng: 'fr' }),
        t_de: t(key, { lng: 'de' }),
        isRawKey: t(key) === key,
      }))
      
      // eslint-disable-next-line no-console
      console.info('[booking-card-i18n-diag]', {
        // A) Langue et namespaces runtime
        language: {
          i18n_language: i18n.language,
          i18n_resolvedLanguage: i18n.resolvedLanguage,
          i18n_languages: i18n.languages,
          defaultNS: i18n.options.defaultNS,
          ns: i18n.options.ns,
          fallbackLng: i18n.options.fallbackLng,
        },
        
        // Store i18n
        store: {
          availableLanguages: Object.keys(storeData),
          namespacesForResolvedLang: resolvedLang ? Object.keys(storeData[resolvedLang] || {}) : [],
        },
        
        // B) Tests clés i18n critiques
        keyTests,
        
        // C) Dates / locale runtime
        dates: {
          i18n_language: i18n.language,
          currentLang: currentLang,
          dateLocale_used: dateLocale === fr ? 'fr' : 
                           dateLocale === itLocale ? 'it' :
                           dateLocale === deLocale ? 'de' : 'enUS',
          startDateTimeFormatted,
          endDateTimeFormatted,
          separator_in_string: "'à'", // Le "à" est hardcodé dans la string format
        },
        
        // D) Éléments problématiques identifiés
        problematicElements: {
          statusBadge: {
            source: 'src/components/ui/status-badge.tsx:15',
            type: 'hardcoded',
            value: 'En attente',
          },
          durationLabel: {
            source: 'src/components/RenterBookingCard.tsx:960',
            type: 'hardcoded',
            value: 'Durée:',
          },
          dateSeparator: {
            source: 'src/components/RenterBookingCard.tsx:935,950',
            type: 'hardcoded_in_format_string',
            value: "'à'",
          },
          cancelButton: {
            source: 'src/components/RenterBookingCard.tsx:1261',
            type: 'wrong_key_or_namespace',
            key_used: 'common.annuler',
            current_namespace: i18n.options.defaultNS,
          },
        },
      })
    }
  }, [i18n, t, booking.startDate, booking.endDate, currentLang, dateLocale])
  
  const cardStartTime = (booking as any).startTime || '06:30'
  const cardEndTime = (booking as any).endTime || '14:00'
  const cardRentalPricing = booking.vehicle?.dailyPrice
    ? getBookingRentalPricing({
        pricePerDay: booking.vehicle.dailyPrice,
        startDate: booking.startDate,
        endDate: booking.endDate,
        startTime: cardStartTime,
        endTime: cardEndTime,
      })
    : null
  const cardOptionsTotal = normalizeBookingOptions(booking.selectedOptions).reduce(
    (sum, option) => sum + option.totalPrice,
    0
  )
  const cardBasePrice =
    cardRentalPricing?.basePrice ?? (booking as any).basePrice ?? 0
  const cardSubtotal = cardBasePrice + cardOptionsTotal
  const dbPayment = getRenterPaymentAmountsFromBooking(booking as Record<string, unknown>)
  const displaySubtotal = dbPayment.subtotal > 0 ? dbPayment.subtotal : cardSubtotal
  const displayServiceFee = dbPayment.serviceFeeRenter
  const displayTotal =
    dbPayment.amountTotalExpected > 0 ? dbPayment.amountTotalExpected : displaySubtotal
  const displayFeePercent = dbPayment.serviceFeePercentApplied
  const isCashPayment = isCashOnSitePayment(dbPayment.paymentMethod)
  const cardDurationText =
    (cardRentalPricing &&
      (formatBillableDays(t, cardRentalPricing.billableDays) ??
        t('duration.day', { count: 1 }))) ||
    t('duration.day', { count: 1 })

  const calculateRealDuration = () => cardDurationText

  // Fonction pour générer le badge de statut enrichi et le CTA selon les règles métier (locataire)
  const getUserBookingStatusUI = () => {
    const now = new Date()
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    const depositStatus = (booking as any).depositStatus || null
    const depositAmount = (booking as any).depositAmount ?? (booking as any).depositAmountSnapshot ?? null
    const stripePmId = (booking as any).stripePaymentMethodId ?? (booking as any).stripe_payment_method_id ?? null
    const depositOk = depositStatus === 'paid' || depositStatus === 'card_registered'

    // Snapshot numeric: Number() pour éviter bug PostgREST string
    const snapshot = Number(depositAmount ?? 0);

    // Cas A: confirmed/accepted + deposit_status pending + deposit_amount_snapshot > 0 + pas de PM déjà enregistrée
    const isPaidStatus = booking.status === 'confirmed' || booking.status === 'accepted';
    if (isPaidStatus && depositStatus === 'pending' && snapshot > 0 && !stripePmId) {
      return {
        badgeLabel: t('bookings.status.paymentConfirmed'),
        badgeNote: t('bookings.status.depositPending'),
        badgeColorClass: 'bg-orange-100 text-orange-800 border border-orange-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: 'text-orange-700 text-xs font-medium',
        showDepositCTA: true,
        depositCTALabel: t('bookings.card.activateDeposit', 'Activer la caution')
      }
    }

    // Cas B: confirmed + deposit_status paid/card_registered + start_date > now
    if (booking.status === 'confirmed' && depositOk && startDate > now) {
      return {
        badgeLabel: t('bookings.status.readyToGo'),
        badgeNote: t('bookings.status.paymentDepositValidated'),
        badgeColorClass: 'bg-green-100 text-green-800 border border-green-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: 'text-green-700 text-xs font-medium',
        showDepositCTA: false
      }
    }

    // Cas C: active OU (confirmed + deposit paid/card_registered + dates chevauchantes)
    if (booking.status === 'active' || 
        (booking.status === 'confirmed' && depositOk && startDate <= now && endDate >= now)) {
      return {
        badgeLabel: t('bookings.status.active'),
        badgeNote: null,
        badgeColorClass: 'bg-green-100 text-green-800 border border-green-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: null,
        showDepositCTA: false
      }
    }

    // Cas D: completed
    if (booking.status === 'completed') {
      return {
        badgeLabel: t('bookings.status.completed'),
        badgeNote: null,
        badgeColorClass: 'bg-gray-100 text-gray-700 border border-gray-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: null,
        showDepositCTA: false
      }
    }

    // Cas E: cancelled, rejected, declined
    if (booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'declined') {
      return {
        badgeLabel: t('bookings.status.cancelled'),
        badgeNote: null,
        badgeColorClass: 'bg-gray-100 text-gray-500 border border-gray-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: null,
        showDepositCTA: false
      }
    }

    // Fallback: retourner null pour utiliser le StatusBadge standard
    return null
  }

  // Helper partagé de normalisation (priorise totalPrice puis price)
  const getServicesFromOptions = normalizeBookingOptions;

  // Fonction pour déterminer l'icône selon le nom du service (copié-collé de VehicleServiceOptions)
  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case "Prise en charge à l'aéroport":
      case 'Récupération à l\'aéroport':
        return <Plane className="h-4 w-4 text-primary" />;
      case "Restitution à l'aéroport":
      case 'Retour à l\'aéroport':
        return <Plane className="h-4 w-4 text-primary" />;
      case 'Récupération Barge Grande Terre':
        return <Ship className="h-4 w-4 text-primary" />;
      case 'Retour Barge Grande Terre':
        return <Ship className="h-4 w-4 text-primary" />;
      case 'Récupération Barge Petite Terre':
        return <Ship className="h-4 w-4 text-primary" />;
      case 'Retour Barge Petite Terre':
        return <Ship className="h-4 w-4 text-primary" />;
      case 'Livraison à domicile (aller)':
        return <Home className="h-4 w-4 text-primary" />;
      case 'Livraison à domicile (retour)':
        return <Home className="h-4 w-4 text-primary" />;
      case 'Siège bébé':
        return <Baby className="h-4 w-4 text-primary" />;
      case 'Conducteur additionnel':
        return <UserPlus className="h-4 w-4 text-primary" />;
      default:
        return <Plane className="h-4 w-4 text-primary" />; // Icône par défaut
    }
  };


  // Fonction pour annuler une réservation (changer le statut à 'cancelled')
  const handleCancelBooking = async () => {
    setIsDeleting(true)
    
    try {
      console.log('🗑️ [RenterBookingCard] Annulation de la réservation:', booking.id)
      
      // Mettre à jour le statut à 'cancelled' dans Supabase
      const result = await SupabaseBookingsService.updateBookingStatus(booking.id, 'cancelled')
      
      if (result.error) {
        console.error('❌ [RenterBookingCard] Erreur lors de l\'annulation:', result.error)
        toast({
          title: 'Erreur',
          description: "Impossible d'annuler la réservation: " + result.error,
          variant: 'destructive',
        })
        setIsDeleting(false)
        return
      }
      
      console.log('✅ [RenterBookingCard] Réservation annulée avec succès:', result.data)
      
      toast({
        title: 'Réservation annulée',
        description: 'Votre réservation a été annulée. Le propriétaire sera notifié.',
      })
      
      // Appeler le callback pour mettre à jour la liste avec le nouveau statut
      if (onBookingUpdated) {
        onBookingUpdated(booking.id)
      } else if (onBookingDeleted) {
        // Fallback si onBookingUpdated n'est pas fourni
        onBookingDeleted(booking.id)
      }
      
    } catch (error: any) {
      console.error('❌ [RenterBookingCard] Erreur inattendue:', error)
      toast({
        title: 'Erreur',
        description: error.message || "Une erreur est survenue",
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  // Nouvelle confirmation d'annulation avec motif
  const handleConfirmCancel = async () => {
    setIsDeleting(true)
    try {
      const reason = customCancelReason || cancelReason
      if (!reason) {
        toast({ title: 'Motif requis', description: 'Veuillez sélectionner un motif ou saisir un message.', variant: 'destructive' })
        setIsDeleting(false)
        return
      }
      const result = await (SupabaseBookingsService as any).updateBookingStatusWithReason(booking.id, 'cancelled', reason)
      if (result.error) {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' })
        setIsDeleting(false)
        return
      }
      toast({ title: 'Réservation annulée', description: 'Votre réservation a été annulée.' })
      setShowCancelModal(false)
      setCancelReason('')
      setCustomCancelReason('')
      if (onBookingUpdated) onBookingUpdated(booking.id)
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Une erreur est survenue', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    const loadOwner = async () => {
      if (booking.vehicle?.ownerId) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', booking.vehicle.ownerId)
            .single()

          if (error) {
            console.error('Erreur lors du chargement du propriétaire:', error)
            return
          }

          if (profile) {
            const user: User = {
              id: profile.id,
              email: profile.email || '',
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              phone: profile.phone || undefined,
              bio: profile.bio || undefined,
              roles: profile.role ? [profile.role] : ['renter'],
              kycStatus: profile.kyc_status || 'pending',
              avatarUrl: profile.avatar_url || undefined,
            }
            setOwner(user)
          }
        } catch (error) {
          console.error('Erreur lors du chargement du propriétaire:', error)
        }
      }
    }
    
    loadOwner()
  }, [booking.vehicle?.ownerId])

  // Locataire de la réservation (pas l'utilisateur connecté — important pour les résas admin)
  useEffect(() => {
    if (booking.renter) {
      setRenterFromFetch(null)
      return
    }
    if (!booking.renterId) {
      setRenterFromFetch(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const result = await ProfileService.getUserProfile(booking.renterId)
        if (!cancelled && result.data) setRenterFromFetch(result.data)
        else if (!cancelled) setRenterFromFetch(null)
      } catch (error) {
        console.error('Erreur lors du chargement du locataire:', error)
        if (!cancelled) setRenterFromFetch(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [booking.renter, booking.renterId])

  const renter = booking.renter ?? renterFromFetch

  // Charger les données de l'utilisateur actuel
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data, error } = await ProfileService.getCurrentUserProfile()
        if (!error && data) {
          setCurrentUser(data)
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur actuel:', error)
      }
    }
    
    loadCurrentUser()
  }, [])

  // Charger le nombre de messages non lus
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!currentUser || !booking.id) return

      try {
        // Utiliser getConversationByBookingId pour éviter toute création automatique (READ-ONLY)
        const convResult = await ConversationsService.getConversationByBookingId(booking.id)

        if (convResult.error || !convResult.data) {
          // Pas de conversation existante, pas de messages non lus
          setUnreadCount(0)
          return
        }

        // Compter les messages non lus envoyés par le propriétaire
        const { count, error: messagesError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convResult.data.id)
          .eq('is_read', false)
          .neq('sender_id', currentUser.id) // Messages envoyés par le propriétaire (pas le locataire)

        if (messagesError) {
          console.error('Erreur lors du comptage des messages non lus:', messagesError)
          return
        }

        setUnreadCount(count || 0)
      } catch (error) {
        console.error('Erreur lors du chargement des messages non lus:', error)
      }
    }

    loadUnreadCount()

    // S'abonner aux nouveaux messages en temps réel
    const subscription = supabase
      .channel(`messages-${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${booking.id}`
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentUser, booking.id])

  const handleDownloadPDF = async () => {
    try {
      // Récupérer l'élément à exporter (toute la modal sauf le bouton fermer)
      const modalContent = document.querySelector('[data-modal-content]')
      if (!modalContent) return

      // Capturer le contenu en image haute qualité
      const canvas = await html2canvas(modalContent as HTMLElement, {
        scale: 2, // Haute résolution
        useCORS: true,
        logging: false,
      })

      // Créer le PDF en format A4 portrait
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const imgHeightRatio = imgHeight / imgWidth
      const pdfImgWidth = pdfWidth - 20 // Marges gauche et droite
      const pdfImgHeight = pdfImgWidth * imgHeightRatio

      // Ajuster si le contenu dépasse une page
      if (pdfImgHeight > pdfHeight - 20) {
        // Si trop grand, diviser en plusieurs pages
        const totalPages = Math.ceil(pdfImgHeight / (pdfHeight - 20))
        const pageHeight = pdfHeight - 20
        let position = 0

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage()
          }
          
          const srcY = i * pageHeight * (canvas.height / pdfImgHeight)
          const srcHeight = Math.min(pageHeight * (canvas.height / pdfImgHeight), imgHeight - srcY)
          
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = imgWidth
          tempCanvas.height = srcHeight
          const ctx = tempCanvas.getContext('2d')
          ctx?.drawImage(canvas, 0, -srcY)
          
          const pageImg = tempCanvas.toDataURL('image/png')
          pdf.addImage(pageImg, 'PNG', 10, 10, pdfImgWidth, pdfImgHeight / totalPages)
        }
      } else {
        // Une seule page, centrer l'image
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, pdfImgWidth, pdfImgHeight)
      }

      // Télécharger le PDF
      pdf.save(`reservation-${(booking as any).referenceNumber || booking.id.substring(0, 8)}.pdf`)

      toast({
        title: 'PDF téléchargé',
        description: 'Votre document de réservation a été téléchargé avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF. Veuillez réessayer.',
        variant: 'destructive',
      })
    }
  }

  // DEBUG Phase 3.2.3 — Renter caution UI
  console.log("BOOKING RENTER CARD 👉", {
    id: booking.id,
    status: booking.status,
    depositStatus: (booking as any).depositStatus,
    depositAmount: (booking as any).depositAmount,
    depositAmountSnapshot: (booking as any).depositAmountSnapshot,
    stripePaymentMethodId: (booking as any).stripePaymentMethodId,
    rawBookingKeys: Object.keys(booking || {}),
  });

  return (
    <>
    <Collapsible
          key={booking.id}
          open={isExpanded}
          onOpenChange={() => toggleExpanded(booking.id)}
        >
          <Card className={cn(
            "transition-all duration-300 relative",
            booking.status === 'cancelled' || booking.status === 'declined'
              ? "opacity-60 grayscale-[0.7] bg-muted/50" 
              : booking.status === 'terminated'
              ? "bg-green-50/50 border-green-200/50"
              : "hover:shadow-lagoon hover:scale-[1.01] bg-gradient-to-br from-card to-card/50"
          )}>
        <CollapsibleTrigger asChild>
          <CardContent className={cn(
            "p-4",
            (booking.status === 'cancelled' || booking.status === 'declined' || booking.status === 'terminated') ? "cursor-default" : "cursor-pointer"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Informations principales */}
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* Mini photo */}
                <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={
                      booking.primaryPhoto?.url ||
                      'https://images.unsplash.com/photo-1549924231-f129b911e442?w=100&h=75&fit=crop'
                    }
                    alt={
                      booking.vehicle
                        ? `${booking.vehicle.brand} ${booking.vehicle.model}`
                        : 'Véhicule'
                    }
                    className={cn(
                      "w-full h-full object-cover",
                      (booking.status === 'cancelled' || booking.status === 'declined') && "opacity-40",
                      booking.status === 'terminated' && "opacity-90"
                    )}
                  />
                </div>

                {/* Détails principaux */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {booking.vehicle
                        ? `${booking.vehicle.brand} ${booking.vehicle.model}`
                        : 'Véhicule supprimé'}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>
                        {formatDate(booking.startDate).split(' ')[0]}{' '}
                        {formatDate(booking.startDate).split(' ')[1]}
                      </span>
                    </div>
                    <span>→</span>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>
                        {formatDate(booking.endDate).split(' ')[0]}{' '}
                        {formatDate(booking.endDate).split(' ')[1]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions et statut — flex-wrap sur mobile pour éviter débordement */}
              <div className="flex flex-col sm:flex-col items-end gap-2 min-w-0 shrink-0">
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <div className="flex flex-col items-end gap-1">
                    {/* Badge statut enrichi */}
                    {(() => {
                      const statusUI = getUserBookingStatusUI()
                      if (statusUI) {
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={cn(statusUI.badgeColorClass)}>
                              {statusUI.badgeLabel}
                            </span>
                            {statusUI.badgeNote && (
                              <span className={cn(statusUI.noteColorClass)}>
                                {statusUI.badgeNote}
                              </span>
                            )}
                          </div>
                        )
                      }
                      // Fallback vers StatusBadge pour les autres statuts
                      return <StatusBadge status={booking.status} size="sm" />
                    })()}
                    {isAdminCreatedBooking(booking) && (
                      <AdminBookingBadge />
                    )}
                    
                    {/* Motif d'annulation + date de mise à jour */}
                    {(booking.status === 'cancelled' || booking.status === 'declined') && (() => {
                      const cancellation = (booking.selectedOptions as any)?.cancellation || {};
                      const cancellationReason = cancellation?.reason;
                      const updatedTs = cancellation?.cancelledAt || (booking as any).updatedAt || (booking as any).updated_at;
                      const updatedText = updatedTs
                        ? (() => {
                            const date = new Date(updatedTs)
                            const datePart = format(date, "d MMMM yyyy", { locale: dateLocale })
                            const timePart = format(date, "HH:mm", { locale: dateLocale })
                            const joiner = i18n.language.startsWith("fr") ? " à " : " "
                            return `${datePart}${joiner}${timePart}`
                          })()
                        : undefined;
                      
                      if (booking.status === 'cancelled' && cancellationReason) {
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground/70 italic">
                              {cancellationReason}
                            </span>
                            {updatedText && (
                              // TODO(i18n): bookings.details.updatedAt
                              <span className="text-[10px] text-muted-foreground/60">Mise à jour le : {updatedText}</span>
                            )}
                          </div>
                        );
                      } else if (booking.status === 'declined') {
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground/70 italic">
                              {/* TODO(i18n): bookings.details.bookingRefused */}
                              {cancellationReason || 'Réservation refusée'}
                            </span>
                            {updatedText && (
                              // TODO(i18n): bookings.details.updatedAt
                              <span className="text-[10px] text-muted-foreground/60">Mise à jour le : {updatedText}</span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Compte à rebours si en attente de paiement (hors résa admin) */}
                  {booking.status === 'pending_payment' &&
                    booking.updatedAt &&
                    !isAdminCreatedBooking(booking) && (
                    <PaymentCountdown confirmedAt={new Date(booking.updatedAt)} />
                  )}
                  
                  {/* Avatar propriétaire avec tooltip flottant */}
                {booking.status !== 'cancelled' && booking.status !== 'declined' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity group relative z-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(
                              getPublicDiscussionPath(booking.vehicle ?? { id: 'unknown', license: 'unknown' })
                            )
                          }}
                        >
                          {/* Avatar avec contraintes strictes et badge messages non lus */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20 flex items-center justify-center shadow-sm mb-2 group-hover:shadow-md transition-shadow">
                              {owner?.avatarUrl ? (
                                <img
                                  src={owner.avatarUrl}
                                  alt={owner.firstName || t('bookings.card.ownerFallback')}
                                  className="w-full h-full object-cover object-center"
                                  style={{
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    width: '100%',
                                    height: '100%'
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                                  {owner?.firstName?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                            {/* Badge messages non lus */}
                            {unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 bg-destructive rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 border-2 border-white shadow-lg">
                                {unreadCount > 9 ? (
                                  <span className="text-[10px] font-bold text-white">9+</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-white">{unreadCount}</span>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Bouton message avec icône */}
                          <div className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            <MessageSquare className="h-3 w-3" />
                            <span>Message</span>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="z-[9999] relative"
                        side="top"
                        align="center"
                        sideOffset={8}
                      >
                        <p className="text-sm font-medium">
                          {t('bookings.card.messageTooltip', { ownerName: owner?.firstName || t('bookings.card.ownerFallback') })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                  {/* Chevron */}
                  <div className="flex items-center justify-center w-6 h-6">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-border/50">
            <div className="pt-4 space-y-4">
              {/* Détails complets avec espacement optimisé */}
              <div className="space-y-6">
                {/* Informations principales */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                      <span className="font-medium text-foreground">{t('bookings.card.startLabel')}</span>
                      <span className="ml-2 font-semibold text-primary">
                        {(() => {
                          const date = new Date(booking.startDate)
                          const time = (booking as any).startTime || '08:00'
                          const [hour, minute] = time.split(':')
                          date.setHours(parseInt(hour), parseInt(minute), 0, 0)
                          const datePart = format(date, "d MMMM yyyy", { locale: dateLocale })
                          const timePart = format(date, "HH:mm", { locale: dateLocale })
                          const joiner = i18n.language.startsWith("fr") ? " à " : " "
                          return `${datePart}${joiner}${timePart}`
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                      <span className="font-medium text-foreground">{t('bookings.card.endLabel')}</span>
                      <span className="ml-2 font-semibold text-primary">
                        {(() => {
                          const date = new Date(booking.endDate)
                          const time = (booking as any).endTime || '10:00'
                          const [hour, minute] = time.split(':')
                          date.setHours(parseInt(hour), parseInt(minute), 0, 0)
                          const datePart = format(date, "d MMMM yyyy", { locale: dateLocale })
                          const timePart = format(date, "HH:mm", { locale: dateLocale })
                          const joiner = i18n.language.startsWith("fr") ? " à " : " "
                          return `${datePart}${joiner}${timePart}`
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                      <span className="font-medium text-foreground">{t('booking.durationLabel')}</span>
                      <span className="ml-2 font-semibold text-primary">
                        {calculateRealDuration()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Euro className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                      <span className="font-medium text-foreground">{t('bookings.card.totalLabel')}</span>
                      <span className="ml-2">
                        <DualPrice
                          amountMga={cardRentalPricing ? displayTotal : (booking.totalAmount || 0)}
                          variant="client"
                          primaryClassName="font-bold text-primary text-lg"
                          secondaryClassName="text-xs"
                        />
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="ml-2 text-muted-foreground hover:text-primary transition-colors">
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs" side="top" align="start">
                            <div className="space-y-2 text-sm">
                              <div className="font-semibold mb-2">Détail du prix :</div>
                              {cardRentalPricing ? (
                                <>
                                  <div className="flex justify-between">
                                    <span>Location ({cardDurationText})</span>
                                    <span className="font-semibold">{formatClientInline(cardBasePrice)}</span>
                                  </div>
                                  {cardOptionsTotal > 0 && (
                                    <div className="flex justify-between">
                                      <span>Options supplémentaires</span>
                                      <span className="font-semibold">+{formatClientInline(cardOptionsTotal)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between border-t pt-1">
                                    <span>Sous-total</span>
                                    <span className="font-semibold">{formatClientInline(displaySubtotal)}</span>
                                  </div>
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>
                                      {displayFeePercent > 0
                                        ? t('booking.serviceFee', { percent: displayFeePercent })
                                        : t('booking.paymentMethod.serviceFeeGeneric', 'Frais de service')}
                                    </span>
                                    <span>+{formatClientInline(displayServiceFee)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold border-t pt-1">
                                    <span>TOTAL</span>
                                    <span>{formatClientInline(displayTotal)}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground pt-1">{footnote}</p>
                                </>
                              ) : null}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {/* Caution snapshot (read-only) — Phase 3.2.3 */}
                    {(() => {
                      const status = (booking as any).depositStatus ?? null;
                      const snapshotRaw = (booking as any).depositAmount ?? (booking as any).depositAmountSnapshot ?? null;
                      const snapshot = Number(snapshotRaw ?? 0);
                      if (status == null && snapshotRaw == null) return null;
                      if (status === 'card_registered') {
                        return (
                          <div className="flex items-center text-sm">
                            <Shield className="h-4 w-4 mr-3 flex-shrink-0 text-green-600" />
                            <span className="font-medium text-foreground">{t('bookings.deposit.status.activated', 'Caution : activée')}</span>
                          </div>
                        );
                      }
                      if (status === 'pending' && snapshot > 0) {
                        return (
                          <div className="flex items-center text-sm">
                            <Shield className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                            <span className="font-medium text-foreground">{t('bookings.deposit.status.todo', 'Caution : à activer')} — {formatClientInline(snapshot)}</span>
                          </div>
                        );
                      }
                      if (status === 'not_required' || snapshot === 0) {
                        return (
                          <div className="flex items-center text-sm">
                            <Shield className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">{t('bookings.deposit.status.none', 'Caution : aucune')}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Services supplémentaires sélectionnés */}
                {getServicesFromOptions(booking.selectedOptions).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center">
                      ✨ Services supplémentaires:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getServicesFromOptions(booking.selectedOptions).map((option, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20"
                        >
                          {/* Icône du service */}
                          <div className="flex-shrink-0">
                            {getServiceIcon(option.name)}
                          </div>
                          
                          {/* Nom du service */}
                          <span className="font-medium text-xs">{option.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions supplémentaires */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2 border-t border-border/50">
                {/* Bouton "Finaliser ma réservation" si nécessaire */}
                {(() => {
                  const statusUI = getUserBookingStatusUI()
                  if (statusUI && statusUI.showDepositCTA) {
                    return (
                      <Button
                        size="lg"
                        className="relative bg-gradient-lagoon hover:opacity-90 text-white shadow-lg hover:shadow-2xl transition-all w-full min-w-0 sm:min-w-[200px] sm:flex-1 overflow-hidden group border-2 border-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRequestDeposit?.(booking)
                        }}
                      >
                        {/* Effet shimmer au hover */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        
                        <div className="relative flex items-center justify-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          <span className="font-semibold">{statusUI.depositCTALabel}</span>
                          <Shield className="h-4 w-4 opacity-75" />
                        </div>
                      </Button>
                    )
                  }
                  return null
                })()}
                
                {/* Paiement en ligne (card_online) ou encart cash_on_site */}
                {booking.status === 'pending_payment' && isCashPayment && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 w-full min-w-0 sm:min-w-[200px] sm:flex-1">
                    <p className="font-semibold">
                      {t('booking.paymentMethod.noOnlinePaymentRequired', "Aucun paiement en ligne n'est nécessaire")}
                    </p>
                    <p className="text-amber-800 mt-1 text-xs">
                      {t('booking.paymentMethod.cashOnSite.modalHint', "Règlement lors de la remise des clés à l'agence.")}
                    </p>
                  </div>
                )}
                {booking.status === 'pending_payment' && !isCashPayment && (
                  <Button
                    size="lg"
                    className="relative bg-gradient-lagoon hover:opacity-90 text-white shadow-lg hover:shadow-2xl transition-all w-full min-w-0 sm:min-w-[200px] sm:flex-1 overflow-hidden group border-2 border-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      const selectedExtras: Array<{ label: string; price: number }> = Array.isArray(
                        (booking as any).selectedOptions
                      )
                        ? ((booking as any).selectedOptions || []).map((opt: any) => ({
                            label: opt.name,
                            price: opt.totalPrice,
                          }))
                        : []
                      onRequestPay?.(
                        buildReservationPaymentFromBooking(booking as Record<string, unknown>, {
                          voiture: booking.vehicle
                            ? `${booking.vehicle.brand} ${booking.vehicle.model}`
                            : 'Véhicule',
                          dateDebut: formatDate(booking.startDate),
                          dateFin: formatDate(booking.endDate),
                          duree: calculateRealDuration(),
                          extras: selectedExtras,
                        })
                      )
                    }}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="relative flex items-center justify-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-semibold">Payer ma location</span>
                      <Shield className="h-4 w-4 opacity-75" />
                    </div>
                  </Button>
                )}
                
                <BookingMoreActionsMenu
                  checkinDepart={booking.checkinDepart}
                  onViewDetails={() => setShowDetailsModal(true)}
                  onViewVehicle={() => {
                    if (booking.vehicle) {
                      navigate(getPublicListingPath(booking.vehicle))
                    }
                  }}
                />

                {booking.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDeleting}
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('annuler')}
                    </Button>
                  </>
                )}

                {booking.status === 'accepted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement confirm booking
                      toast({
                        title: 'Fonctionnalité à venir',
                        description:
                          'La confirmation de réservation sera bientôt disponible',
                      })
                    }}
                    className="text-success border-success hover:bg-success hover:text-success-foreground transition-all duration-300"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmer
                  </Button>
                )}

              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>

    {booking.status === 'pending' && (
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">{t('bookings.cancel.title')}</DialogTitle>
            <DialogDescription>{t('bookings.cancel.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={t('bookings.cancel.reason.dateChange')} id="cancel1" />
                  <Label htmlFor="cancel1" className="flex-1 cursor-pointer">{t('bookings.cancel.reason.dateChange')}</Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={t('bookings.cancel.reason.otherOption')} id="cancel2" />
                  <Label htmlFor="cancel2" className="flex-1 cursor-pointer">{t('bookings.cancel.reason.otherOption')}</Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={t('bookings.cancel.reason.personalIssue')} id="cancel3" />
                  <Label htmlFor="cancel3" className="flex-1 cursor-pointer">{t('bookings.cancel.reason.personalIssue')}</Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={t('bookings.cancel.reason.bookingError')} id="cancel4" />
                  <Label htmlFor="cancel4" className="flex-1 cursor-pointer">{t('bookings.cancel.reason.bookingError')}</Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={t('bookings.cancel.reason.custom')} id="cancel5" />
                  <Label htmlFor="cancel5" className="flex-1 cursor-pointer">{t('bookings.cancel.reason.custom')}</Label>
                </div>
              </div>
            </RadioGroup>
            {cancelReason === t('bookings.cancel.reason.custom') && (
              <div className="space-y-2">
                <Label htmlFor="customCancelReason">{t('bookings.cancel.reasonLabel')}</Label>
                <Textarea id="customCancelReason" value={customCancelReason} onChange={(e) => setCustomCancelReason(e.target.value)} placeholder={t('bookings.cancel.reasonPlaceholder')} />
              </div>
            )}
            <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
              Le remboursement dépend du délai avant le retrait/l'arrivée.{' '}
              <a
                href="/politique-annulation"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Voir la politique d'annulation →
              </a>
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)} disabled={isDeleting}>{t('bookings.cancel.back')}</Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirmCancel} disabled={isDeleting || (!cancelReason && !customCancelReason)}>
              {isDeleting ? t('bookings.cancel.processing') : t('bookings.cancel.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Modal détails réservation */}
    <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-3xl lg:max-h-[95vh]">
        {/* Wrapper pour export PDF */}
        <div data-modal-content>
          {/* Logo entreprise en haut à gauche */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-lagoon rounded-xl shadow-lagoon">
                <Car className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-lagoon bg-clip-text text-transparent">
                Rentanoo
              </span>
            </div>
          </div>

          {/* Titre centré */}
          <DialogHeader className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-primary rounded-full">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
            <DialogTitle className="text-3xl font-bold text-center text-primary">
              {t('bookings.details.title')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t(
                'bookings.details.a11yDescription',
                'Détails de la réservation : véhicule, dates, montant et options.'
              )}
            </DialogDescription>
            <div className="flex items-center justify-center gap-2 mt-2">
              <p className="text-sm text-muted-foreground">
                {t('bookings.details.referenceNumber', { referenceNumber: (booking as any).referenceNumber || booking.id.substring(0, 8) })}
              </p>
              <span className="text-sm text-muted-foreground">•</span>
              <p className="text-sm text-muted-foreground">
                {t('bookings.details.createdAt', { 
                  date: (() => {
                    const date = new Date(booking.createdAt)
                    const datePart = format(date, "d MMMM yyyy", { locale: dateLocale })
                    const timePart = format(date, "HH:mm", { locale: dateLocale })
                    const joiner = i18n.language.startsWith("fr") ? " à " : " "
                    return `${datePart}${joiner}${timePart}`
                  })()
                })}
              </p>
            </div>
          </DialogHeader>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche: Détails réservation */}
          <div className="lg:col-span-2 space-y-4">
            {/* Section Véhicule */}
            {booking.vehicle && (
              <div className="flex items-center gap-4 p-4 bg-gradient-soft rounded-xl border border-border/50">
                {booking.primaryPhoto && (
                  <img 
                    src={booking.primaryPhoto.url} 
                    alt={`${booking.vehicle.brand} ${booking.vehicle.model}`}
                    className="w-20 h-20 object-cover rounded-lg shadow-sm"
                  />
                )}
                <div>
                  <h3 className="text-lg font-bold text-primary">
                    {booking.vehicle.brand} {booking.vehicle.model}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t('bookings.details.yearLabel', { year: booking.vehicle.year })}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Section Informations client */}
            {renter && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="p-2 bg-primary-soft rounded-lg">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{t('bookings.details.clientInfo')}</h4>
                    {isAdminCreatedBooking(booking) && <AdminBookingBadge />}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('bookings.details.lastName')}</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{renter.lastName || t('bookings.details.notProvided')}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('bookings.details.firstName')}</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{renter.firstName || t('bookings.details.notProvided')}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('bookings.details.phone')}</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{renter.phone || t('bookings.details.notProvided')}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">{t('bookings.details.email')}</p>
                      <p className="text-sm font-bold text-foreground break-all leading-tight">{renter.email || t('bookings.details.notProvided')}</p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Section Zone de prise en charge */}
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-primary-soft rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{t('bookings.details.pickupZone')}</p>
                <p className="text-base font-semibold text-foreground">
                  {(booking as any).pickupLocation || t('bookings.details.notSpecified')}
                </p>
              </div>
            </div>

            {(booking as any).returnLocation &&
              (booking as any).returnLocation !== (booking as any).pickupLocation && (
              <>
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-primary-soft rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{t('bookings.details.returnZone')}</p>
                    <p className="text-base font-semibold text-foreground">
                      {(booking as any).returnLocation}
                    </p>
                  </div>
                </div>
              </>
            )}

            {(booking as any).hotelName && (
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-primary-soft rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{t('bookings.details.hotelName')}</p>
                  <p className="text-base font-semibold text-foreground">
                    {(booking as any).hotelName}
                  </p>
                </div>
              </div>
            )}

            {(booking as any).notes && (
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-primary-soft rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{t('bookings.details.notes')}</p>
                  <p className="text-base font-semibold text-foreground whitespace-pre-wrap">
                    {(booking as any).notes}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Section Dates et Durée */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-primary-soft rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">{t('bookings.details.rentalDates')}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-card rounded-lg border border-border/50 space-y-1">
                  {/* TODO(i18n): bookings.details.departure */}
                  <p className="text-xs text-muted-foreground font-medium">Départ</p>
                  <p className="text-sm font-bold text-foreground">
                    {format(new Date(booking.startDate), "EEEE d MMMM yyyy", { locale: dateLocale })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{(booking as any).startTime || '08:00'}</span>
                  </div>
                </div>

                <div className="p-3 bg-card rounded-lg border border-border/50 space-y-1">
                  {/* TODO(i18n): bookings.details.return */}
                  <p className="text-xs text-muted-foreground font-medium">Retour</p>
                  <p className="text-sm font-bold text-foreground">
                    {format(new Date(booking.endDate), "EEEE d MMMM yyyy", { locale: dateLocale })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{(booking as any).endTime || '10:00'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-center">
                <Badge variant="default" className="text-sm px-4 py-1.5 bg-primary text-white font-semibold">
                  {/* TODO(i18n): bookings.details.duration */}
                  Durée : {calculateRealDuration()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Colonne droite: Récapitulatif prix */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-0 space-y-4">
              {/* Section Tarif de Base */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-soft rounded-lg">
                    <Euro className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t('bookings.details.baseRate')}</span>
                </div>

                <div className="bg-card rounded-lg border border-border/50 p-3 space-y-2">
                  <ClientPriceRow
                    label="Location véhicule"
                    amountMga={cardRentalPricing ? cardBasePrice : 0}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formatClientInline(booking.vehicle?.dailyPrice || 0)}/jour × {cardDurationText}
                  </p>
                </div>
              </div>

              {/* Section Options (si présentes) */}
              {getServicesFromOptions(booking.selectedOptions).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary-soft rounded-lg">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      {/* TODO(i18n): bookings.details.selectedOptions */}
                      <span className="text-sm font-semibold text-foreground">Options sélectionnées</span>
                    </div>

                    <div className="bg-card rounded-lg border border-border/50 p-3 space-y-3">
                      {getServicesFromOptions(booking.selectedOptions).map((option, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-foreground font-medium">
                            {option.name}
                          </span>
                          <DualPrice
                            amountMga={option.totalPrice}
                            variant="client"
                            className="items-end min-w-[80px]"
                            primaryClassName="text-base font-bold text-primary"
                            secondaryClassName="text-xs"
                          />
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border/50 mt-2">
                        <ClientPriceRow
                          label="Sous-total options"
                          amountMga={getServicesFromOptions(booking.selectedOptions).reduce((sum, opt) => sum + opt.totalPrice, 0)}
                          bold
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Section Total - avec alignement parfait */}
              <div className="space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
                <ClientPriceRow label="Sous-total" amountMga={cardRentalPricing ? displaySubtotal : 0} bold />
                <ClientPriceRow
                  label={
                    displayFeePercent > 0
                      ? t('booking.serviceFee', { percent: displayFeePercent })
                      : t('booking.paymentMethod.serviceFeeGeneric', 'Frais de service')
                  }
                  amountMga={cardRentalPricing ? displayServiceFee : 0}
                />

                <Separator className="border-primary/30" />

                <div className="flex justify-between items-start pt-2 gap-4">
                  <span className="text-lg font-bold text-foreground">TOTAL À PAYER</span>
                  <DualPrice
                    amountMga={cardRentalPricing ? displayTotal : (booking.totalAmount || 0)}
                    variant="client"
                    className="items-end text-right min-w-[100px]"
                    primaryClassName="text-3xl font-bold text-primary"
                    secondaryClassName="text-sm"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right">{footnote}</p>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('bookings.details.downloadPdf')}
          </Button>
          <Button
            variant="default"
            onClick={() => setShowDetailsModal(false)}
            className="flex-1"
          >
            {t('bookings.details.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}
