// src/components/OwnerBookingCard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getPublicListingPath, getPublicDiscussionPath } from '@/utils/vehicleType'
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
  Zap,
  CreditCard,
  Shield,
  Bell,
  Download,
  User as UserIcon,
  MapPin as MapPinIcon,
  AlertCircle,
  Loader2,
  RotateCcw,
  Building2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { StatusBadge } from '@/components/ui/status-badge'
import { PaymentCountdown } from '@/components/ui/payment-countdown'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { normalizeBookingOptions } from '@/utils/bookingOptions'
import { Booking, Vehicle, Photo, User, CheckinDepartSummary, CheckinReturnSummary } from '@/types'
import { cn } from '@/lib/utils'
import { getBookingRentalPricing } from '@/utils/rentalPriceFromDates'
import { formatBillableDays } from '@/utils/formatDuration'
import { ProfileService } from '@/services/supabase/profile'
import { SupabaseBookingsService } from '@/services/supabase/bookings'
import { supabase } from '@/integrations/supabase/client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Separator } from '@/components/ui/separator'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConversationsService } from '@/services/supabase/conversations'
import { MessagesService } from '@/services/supabase/messages'
import { BookingMoreActionsMenu } from '@/components/BookingMoreActionsMenu'
import { calcServiceFeeRenter, calcRenterTotal, SERVICE_FEE_PERCENT_RENTER } from '@/utils/serviceFees'
import { useTranslation } from 'react-i18next'
import { forceDepositForOwner } from '@/lib/depositCaution'
import { isAdminCreatedBooking } from '@/utils/bookingAdmin'
import { AdminBookingBadge } from '@/components/AdminBookingBadge'
import { DualPrice } from '@/components/currency/DualPrice'
import { AdminPriceRow } from '@/components/currency/PriceRows'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'

/** Libellé locataire pour header, tooltips, alt (pas d’email ici). */
function formatRenterDisplayName(user: User | null | undefined): string {
  const first = user?.firstName?.trim() ?? ''
  const last = user?.lastName?.trim() ?? ''
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return 'Locataire'
}

function renterAvatarInitials(user: User | null | undefined): string {
  const first = user?.firstName?.trim()
  const last = user?.lastName?.trim()
  if (first?.charAt(0) && last?.charAt(0)) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  if (first?.charAt(0)) return first.charAt(0).toUpperCase()
  if (last?.charAt(0)) return last.charAt(0).toUpperCase()
  return 'L'
}

type BookingWithDetails = Booking & {
  vehicle?: Vehicle
  primaryPhoto?: Photo
  renter?: User
  conversation?: {
    id: string
  }
  pickupLocation?: string
  selectedOptions?: any[]
  pricePerDay?: number
  rentalDays?: number
  subtotal?: number
  serviceFee?: number
  totalPrice?: number
  depositStatus?: 'pending' | 'paid' | 'refunded' | null
   checkinDepart?: CheckinDepartSummary
  checkinReturn?: CheckinReturnSummary
}

type OwnerBookingCardProps = {
  booking: BookingWithDetails
  isExpanded: boolean
  toggleExpanded: (id: string) => void
  formatDate: (date: string) => string
  getDuration: (start: string, end: string) => string
  onBookingDeleted?: (bookingId: string) => void
  onBookingUpdated?: (bookingId: string) => void
}

export default function OwnerBookingCard({
  booking,
  isExpanded,
  toggleExpanded,
  formatDate,
  getDuration,
  onBookingDeleted,
  onBookingUpdated,
}: OwnerBookingCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation() // defaultNS = "translation" où duration.* est déplié depuis common.duration.*
  const { formatAdminInline, footnote } = useExchangeRate()
  /** Profil chargé uniquement si le parent n’a pas fourni `booking.renter`. */
  const [renterFromFetch, setRenterFromFetch] = useState<User | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [customRejectReason, setCustomRejectReason] = useState<string>('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [isStartingCheckin, setIsStartingCheckin] = useState(false)
  const [isForcingDeposit, setIsForcingDeposit] = useState(false)

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
    (sum, option) => sum + (option.totalPrice || 0),
    0
  )
  const cardBasePrice =
    cardRentalPricing?.basePrice ?? (booking as any).basePrice ?? (booking as any).base_price ?? 0
  const cardSubtotal =
    (booking as any).subtotal ?? cardBasePrice + cardOptionsTotal
  // % réellement appliqué à cette réservation (figé en base au moment de la création,
  // ne pas recalculer avec une constante : dépend de la catégorie + mode de paiement choisis à ce moment-là)
  const cardFeePercentApplied = (booking as any).serviceFeePercentApplied ?? SERVICE_FEE_PERCENT_RENTER
  const cardFeePercentDisplay = Math.round(cardFeePercentApplied * 100)
  const cardServiceFeeRenter =
    (booking as any).serviceFeeRenter ?? (booking as any).serviceFee ?? calcServiceFeeRenter(cardSubtotal)
  const cardTotalAmount =
    (booking as any).amountTotalExpected ?? Math.round((cardSubtotal + cardServiceFeeRenter) * 100) / 100
  const cardServiceFeeOwner = cardServiceFeeRenter
  const cardOwnerPayout = Math.round((cardSubtotal - cardServiceFeeOwner) * 100) / 100
  const cardDurationText =
    (cardRentalPricing &&
      (formatBillableDays(t, cardRentalPricing.billableDays) ??
        t('duration.day', { count: 1 }))) ||
    t('duration.day', { count: 1 })

  const calculateRealDuration = () => cardDurationText

  // Fonction pour déterminer l'icône selon le nom du service
  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'Récupération à l\'aéroport':
        return <Plane className="h-4 w-4 text-primary" />;
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
        return <Plane className="h-4 w-4 text-primary" />;
    }
  };

  // Locataire : priorité au parent ; fetch seulement si absent (évite N+1 et flicker).
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
  const renterDisplayName = formatRenterDisplayName(renter)

  // Charger les données de l'utilisateur actuel (propriétaire)
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

  // Charger le nombre de messages non lus (READ-ONLY, ne crée jamais de conversation)
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!currentUser || !booking.id) return

      try {
        // Utiliser getConversationByBookingId pour éviter toute création automatique
        const convResult = await ConversationsService.getConversationByBookingId(booking.id)

        if (convResult.error || !convResult.data) {
          // Pas de conversation existante, pas de messages non lus
          setUnreadCount(0)
          return
        }

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convResult.data.id)
          .eq('is_read', false)
          .neq('sender_id', currentUser.id)

        setUnreadCount(count || 0)
      } catch (error) {
        console.error('Erreur lors du chargement des messages non lus:', error)
        setUnreadCount(0)
      }
    }

    loadUnreadCount()
  }, [currentUser, booking.id])

  // DEV-only: Diagnostic des actions propriétaire au rendu
  useEffect(() => {
    if (import.meta.env.DEV) {
      const shouldShowActions_pendingOnly = booking.status === 'pending'
      const shouldShowActions_pendingOrPayment = booking.status === 'pending' || booking.status === 'pending_payment'
      
      console.info('[owner-actions-diag]', {
        bookingId: booking.id,
        status: booking.status,
        isExpanded,
        shouldShowActions_pendingOnly,
        shouldShowActions_pendingOrPayment,
        location: 'Component render',
        inCollapsibleContent: true, // Les actions sont toujours dans CollapsibleContent
      })
    }
  }, [booking.id, booking.status, isExpanded])

  const handleAccept = async () => {
    setIsUpdating(true)
    try {
      const result = await SupabaseBookingsService.updateBookingToPendingPaymentWithDepositSnapshot(booking.id, booking.vehicleId)
      
      if (result.error) {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      // Envoyer un message automatique de confirmation
      try {
        const currentUserResult = await ProfileService.getCurrentUserProfile()
        const owner = currentUserResult.data

        if (!owner || !booking.vehicle || !renter) {
          console.warn('[handleAccept] Données manquantes pour l\'envoi du message', {
            hasOwner: !!owner,
            hasVehicle: !!booking.vehicle,
            hasRenter: !!renter
          })
          // Ne pas bloquer le flow, juste avertir
        } else {
          // Récupérer ou créer la conversation (gère gracieusement les erreurs 406)
          const convResult = await ConversationsService.getOrCreateConversation({
            vehicleId: booking.vehicleId,
            renterId: booking.renterId,
            ownerId: owner.id,
            bookingId: booking.id,
          })

          if (!convResult.data || convResult.error) {
            console.warn('[handleAccept] Pas de conversation disponible, message auto pas envoyé', {
              error: convResult.error,
              hasData: !!convResult.data
            })
            // Ne pas bloquer le flow, juste avertir
          } else {
            // Formater les dates
            const formatDate = (dateString: string) => {
              return new Date(dateString).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
            };
            
            // Construire les variables nécessaires
            const vehicleTitle = `${booking.vehicle.brand} ${booking.vehicle.model}`
            const startTime = (booking as any).startTime || '08:00'
            const endTime = (booking as any).endTime || '10:00'
            const formattedStartDate = formatDate(booking.startDate)
            const formattedEndDate = formatDate(booking.endDate)
            
            // Calculer le total TTC (avec frais de service 15%)
            let basePrice: number
            let optionsTotal: number
            
            // Essayer d'utiliser les valeurs depuis le booking si disponibles
            if ((booking as any).base_price !== undefined && (booking as any).base_price !== null) {
              basePrice = (booking as any).base_price
              optionsTotal = (booking as any).options_total || 0
            } else {
              const dailyPrice = booking.vehicle?.dailyPrice || 0
              const pricing = getBookingRentalPricing({
                pricePerDay: dailyPrice,
                startDate: booking.startDate,
                endDate: booking.endDate,
                startTime,
                endTime,
              })
              basePrice = pricing?.basePrice ?? dailyPrice
              
              // Calculer optionsTotal depuis selectedOptions
              optionsTotal = booking.selectedOptions?.reduce((sum, opt) => sum + (opt.totalPrice || opt.price || 0), 0) || 0
            }
            
            const subtotal = basePrice + optionsTotal
            
            // Calculer le total TTC avec les frais de service
            const totalPrice = calcRenterTotal(subtotal)
            
            // Construire le message selon le format exact demandé
            let messageText = `✅ Réservation confirmée !\n` +
              `Bonjour ${renterDisplayName}, Votre demande de réservation pour le ${vehicleTitle} a été acceptée.\n` +
              `📅 Dates: ${formattedStartDate} → ${formattedEndDate}\n` +
              `⏰ Début: ${startTime} ⏰ Fin: ${endTime}\n`
            
            // Ajouter la ligne des options si présentes
            if (booking.selectedOptions && booking.selectedOptions.length > 0) {
              const optionsLabels = booking.selectedOptions.map(opt => opt.name).join(', ')
              messageText += `🧩 Options supplémentaires : ${optionsLabels}\n`
            }
            
            messageText += `💰 Total: ${formatAdminInline(totalPrice)}\n` +
              `⏰ IMPORTANT: Vous avez 24 heures pour finaliser le paiement.`
            
            console.log('[handleAccept] Envoi message de confirmation', { 
              convId: convResult.data.id, 
              bookingId: booking.id,
              messageLength: messageText.length
            })
            
            // Envoyer le message (ne pas bloquer le flow si l'envoi échoue)
            try {
              const sentMessageResult = await MessagesService.sendMessage({
                conversationId: convResult.data.id,
                senderId: owner.id,
                content: messageText,
                messageType: 'text',
              })
              
              if (sentMessageResult.error) {
                console.error('[handleAccept] Erreur lors de l\'envoi du message:', sentMessageResult.error)
              } else {
                console.log('[handleAccept] Message de confirmation envoyé avec succès')
              }
            } catch (sendError) {
              console.error('[handleAccept] Exception lors de l\'envoi du message:', sendError)
              // Ne pas throw, juste logger l'erreur
            }
          }
        }
      } catch (messageError) {
        console.error('[handleAccept] Erreur lors de la préparation du message:', messageError)
        // Ne pas bloquer le flow même si l'envoi du message échoue
      }

      toast({
        title: 'Demande acceptée',
        description: 'La réservation a été confirmée.',
      })
      
      if (onBookingUpdated) {
        onBookingUpdated(booking.id)
      }
    } catch (error) {
      console.error('[handleAccept] Erreur générale:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accepter la demande',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = () => {
    setShowRejectModal(true)
  }

  const handleOpenCancelModal = () => {
    console.log('[OwnerBookingCard] ouverture modale annulation', { bookingId: booking.id, status: booking.status })
    setShowCancelModal(true)
  }

  const handleConfirmReject = async () => {
    if (!rejectReason && !customRejectReason) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner ou saisir un motif de refus',
        variant: 'destructive',
      })
      return
    }

    setIsUpdating(true)
    try {
      const reason = customRejectReason || rejectReason

      // Mettre à jour le statut avec le motif
      const result = await (SupabaseBookingsService as any).updateBookingStatusWithReason(
        booking.id, 
        'declined',
        reason
      )
      
      if (result.error) {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      // Fermer la conversation associée à cette réservation
      console.log('[OwnerBookingCard] Fermeture conversation demandée pour booking', booking.id);
      await ConversationsService.closeConversationForBooking(booking.id);
      console.log('[OwnerBookingCard] Fermeture conversation exécutée');

      // Envoyer un message dans la conversation
      if (booking.conversation && currentUser) {
        const message = `Votre demande de réservation a été refusée. Motif: ${reason}`
        await MessagesService.sendMessage({
          conversationId: booking.conversation.id,
          content: message,
          senderId: currentUser.id
        })
      }

      toast({
        title: 'Demande refusée',
        description: 'La réservation a été refusée et le locataire a été informé.',
      })
      
      // Fermer la modal et réinitialiser
      setShowRejectModal(false)
      setRejectReason('')
      setCustomRejectReason('')
      
      if (onBookingUpdated) {
        onBookingUpdated(booking.id)
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de refuser la demande',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: 'Erreur',
        description: `Veuillez saisir une raison d'annulation`,
        variant: 'destructive',
      })
      return
    }

    setIsUpdating(true)
    try {
      console.log('[handleCancelBooking] >>> Début fonction appelé', { bookingId: booking.id })
      
      const result = await (SupabaseBookingsService as any).updateBookingStatusWithReason(
        booking.id,
        'cancelled',
        cancellationReason
      )

      if (result.error) {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      // Fermer la conversation associée à cette réservation
      console.log('[OwnerBookingCard] Fermeture conversation demandée pour booking', booking.id);
      await ConversationsService.closeConversationForBooking(booking.id);
      console.log('[OwnerBookingCard] Fermeture conversation exécutée');

      // Envoyer un message dans la conversation
      if (booking.conversation && currentUser) {
        const message = `Cette réservation a été annulée par le propriétaire. Motif: ${cancellationReason}`
        await MessagesService.sendMessage({
          conversationId: booking.conversation.id,
          content: message,
          senderId: currentUser.id
        })
      }

      toast({
        title: 'Réservation annulée',
        description: `Le locataire a été informé de l'annulation.`,
      })

      setShowCancelModal(false)
      setCancellationReason('')

      if (onBookingUpdated) {
        onBookingUpdated(booking.id)
      }
    } catch (error) {
      console.error('[handleCancelBooking] Erreur:', error)
      toast({
        title: 'Erreur',
        description: `Impossible d'annuler la réservation`,
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStartCheckin = async (bookingId: string) => {
    setIsStartingCheckin(true)
    try {
      const res = await fetch('/api/checkin/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erreur lors de l\'initialisation' }))
        throw new Error(errorData.error || errorData.message || 'Erreur lors de l\'initialisation')
      }

      const data = await res.json()
      // Utiliser le redirectUrl de la réponse ou construire l'URL avec checkin_id
      const redirectUrl = data.redirectUrl || `/checking/${bookingId}`
      navigate(redirectUrl)
    } catch (error) {
      console.error('[handleStartCheckin] Erreur:', error)
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'ouvrir l\'état des lieux',
        variant: 'destructive',
      })
    } finally {
      setIsStartingCheckin(false)
    }
  }

  const handleForceDeposit = async () => {
    setIsForcingDeposit(true)
    try {
      const result = await forceDepositForOwner(booking.id)
      if (result.ok) {
        toast({ title: 'Caution forcée', description: 'La caution est maintenant marquée comme déposée. Vous pouvez effectuer l\'état des lieux.' })
        onBookingUpdated?.(booking.id)
      } else {
        toast({ title: 'Erreur', description: result.error || 'Impossible de forcer la caution', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de forcer la caution', variant: 'destructive' })
    } finally {
      setIsForcingDeposit(false)
    }
  }

  // Fonction pour générer le badge de statut enrichi selon les règles métier
  const getEnrichedStatusBadge = () => {
    const now = new Date()
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    const depositStatus = (booking as any).depositStatus || null

    // Règle 1: confirmed + deposit_status pending
    if (booking.status === 'confirmed' && depositStatus === 'pending') {
      return {
        badgeLabel: 'Paiement confirmé',
        badgeColor: 'bg-orange-100 text-orange-800 border border-orange-300',
        note: 'En attente de la caution',
        noteColor: 'text-orange-700'
      }
    }

    // Règle 2: confirmed + deposit_status paid/card_registered + startDate > now
    const depositOk = depositStatus === 'paid' || depositStatus === 'card_registered'
    if (booking.status === 'confirmed' && depositOk && startDate > now) {
      return {
        badgeLabel: 'Prêt à partir',
        badgeColor: 'bg-green-100 text-green-800 border border-green-300',
        note: 'Paiement et caution validés',
        noteColor: 'text-green-700'
      }
    }

    // Règle 3: active OU (confirmed + deposit paid/card_registered + dates chevauchantes)
    if (booking.status === 'active' || 
        (booking.status === 'confirmed' && depositOk && startDate <= now && endDate >= now)) {
      return {
        badgeLabel: 'En cours',
        badgeColor: 'bg-green-100 text-green-800 border border-green-300',
        note: null,
        noteColor: null
      }
    }

    // Règle 4: completed
    if (booking.status === 'completed') {
      return {
        badgeLabel: 'Terminé',
        badgeColor: 'bg-gray-100 text-gray-700 border border-gray-300',
        note: null,
        noteColor: null
      }
    }

    // Règle 5: cancelled, rejected, declined
    if (booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'declined') {
      return {
        badgeLabel: 'Annulée',
        badgeColor: 'bg-gray-100 text-gray-500 border border-gray-300',
        note: null,
        noteColor: null
      }
    }

    // Par défaut, utiliser le StatusBadge standard pour les autres statuts
    return null
  }

  const handleDownloadPDF = async () => {
    try {
      // Récupérer l'élément à exporter (toute la modal sauf le bouton fermer)
      const modalContent = document.querySelector('[data-modal-content]')
      if (!modalContent) {
        toast({
          title: 'Erreur',
          description: 'Impossible de trouver le contenu à exporter',
          variant: 'destructive',
        })
        return
      }

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
      pdf.save(`reservation-${booking.id.substring(0, 8)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)

      toast({
        title: 'PDF téléchargé',
        description: 'Votre document de réservation a été téléchargé avec succès.',
      })
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
    <Collapsible
        key={booking.id}
      open={isExpanded}
      onOpenChange={() => toggleExpanded(booking.id)}
    >
      <Card className={cn(
        "transition-all duration-300 relative",
        (booking.status === 'cancelled' || booking.status === 'declined')
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Informations principales */}
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  {/* Mini photo véhicule */}
                  <div className="w-16 h-12 sm:w-16 sm:h-12 rounded-lg overflow-hidden flex-shrink-0">
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
                    <div className="mb-1 space-y-0.5 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                        {booking.vehicle
                          ? `${booking.vehicle.brand} ${booking.vehicle.model}`
                          : 'Véhicule supprimé'}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate block min-w-0">
                        {renterDisplayName}
                      </p>
                    </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {formatDate(booking.startDate).split(' ')[0]}{' '}
                          {formatDate(booking.startDate).split(' ')[1]}
                        </span>
                    </div>
                    <span className="hidden sm:inline">→</span>
                    <span className="sm:hidden">→</span>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {formatDate(booking.endDate).split(' ')[0]}{' '}
                          {formatDate(booking.endDate).split(' ')[1]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions et statut - alignement parfait */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-2 sm:h-16">
                  <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-1">
                    <div className="flex flex-col items-end gap-1">
                      {/* Badge statut enrichi */}
                      {(() => {
                        const enrichedBadge = getEnrichedStatusBadge()
                        if (enrichedBadge) {
                          return (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={cn(
                                "rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium",
                                enrichedBadge.badgeColor
                              )}>
                                {enrichedBadge.badgeLabel}
                              </span>
                              {enrichedBadge.note && (
                                <span className={cn(
                                  "text-[10px] sm:text-xs font-medium",
                                  enrichedBadge.noteColor
                                )}>
                                  {enrichedBadge.note}
                                </span>
                              )}
                            </div>
                          )
                        }
                        // Fallback vers StatusBadge pour les autres statuts
                        return <StatusBadge status={booking.status} size="sm" />
                      })()}
                      {isAdminCreatedBooking(booking) && (
                        <AdminBookingBadge className="mt-1" />
                      )}
                      {booking.status === 'pending' && !isAdminCreatedBooking(booking) && (
                        <PaymentCountdown 
                          confirmedAt={new Date((booking as any).updatedAt || (booking as any).createdAt)}
                          deadlineHours={24}
                          className="mt-1"
                        />
                      )}
                      
                      {/* Motif d'annulation + date de mise à jour */}
                      {(booking.status === 'cancelled' || booking.status === 'declined') && (() => {
                        const cancellation = (booking.selectedOptions as any)?.cancellation || {};
                        const cancellationReason = cancellation?.reason;
                        const updatedTs = cancellation?.cancelledAt || (booking as any).updatedAt || (booking as any).updated_at;
                        const updatedText = updatedTs
                          ? new Date(updatedTs).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : undefined;
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground/70 italic text-right">
                              {cancellationReason || (booking.status === 'cancelled' ? 'Annulée' : 'Réservation refusée')}
                            </span>
                            {updatedText && (
                              <span className="text-[10px] text-muted-foreground/60 text-right">Mise à jour le : {updatedText}</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Avatar locataire avec tooltip flottant */}
                    {booking.status !== 'cancelled' && booking.status !== 'declined' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity group relative z-10"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (booking.vehicle) {
                                  navigate(getPublicDiscussionPath(booking.vehicle ?? { id: 'unknown', license: 'unknown' }))
                                }
                              }}
                            >
                              <div className="relative">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20 flex items-center justify-center shadow-sm mb-1 sm:mb-2 group-hover:shadow-md transition-shadow">
                                  {renter?.avatarUrl ? (
                                    <img
                                      src={renter.avatarUrl}
                                      alt={renterDisplayName}
                                      className="w-full h-full object-cover object-center"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-[10px] sm:text-xs">
                                      {renterAvatarInitials(renter)}
                                    </div>
                                  )}
                                </div>
                                {unreadCount > 0 && (
                                  <div className="absolute -top-1 -right-1 bg-destructive rounded-full min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 flex items-center justify-center px-1 sm:px-1.5 border-2 border-white shadow-lg">
                                    {unreadCount > 9 ? (
                                      <span className="text-[9px] sm:text-[10px] font-bold text-white">9+</span>
                                    ) : (
                                      <span className="text-[9px] sm:text-[10px] font-bold text-white">{unreadCount}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                <MessageSquare className="h-3 w-3" />
                                <span className="hidden sm:inline">Message</span>
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
                              Cliquez pour discuter avec{' '}
                              {renterDisplayName === 'Locataire' ? 'le locataire' : renterDisplayName}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                
                {/* Chevron */}
                <div className="flex items-center justify-center w-6 h-6 order-1 sm:order-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
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
                        <span className="font-medium text-foreground">Début:</span>
                        <span className="ml-2 font-semibold text-primary">
                          {(() => {
                            const date = new Date(booking.startDate)
                            const time = (booking as any).startTime || '08:00'
                            const [hour, minute] = time.split(':')
                            date.setHours(parseInt(hour), parseInt(minute), 0, 0)
                            return date.toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                        <span className="font-medium text-foreground">Fin:</span>
                        <span className="ml-2 font-semibold text-primary">
                          {(() => {
                            const date = new Date(booking.endDate)
                            const time = (booking as any).endTime || '10:00'
                            const [hour, minute] = time.split(':')
                            date.setHours(parseInt(hour), parseInt(minute), 0, 0)
                            return date.toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          })()}
                        </span>
                    </div>
                  </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                        <span className="font-medium text-foreground">Durée:</span>
                        <span className="ml-2 font-semibold text-primary">
                          {calculateRealDuration()}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Euro className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                        <span className="font-medium text-foreground">Total:</span>
                        <span className="ml-2">
                          <DualPrice
                            amountMga={cardTotalAmount}
                            variant="admin"
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
                                {(() => (
                                    <>
                                      <div className="flex justify-between">
                                        <span>Sous-total</span>
                                        <span className="font-semibold">{formatAdminInline(cardSubtotal)}</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Frais de service locataire ({cardFeePercentDisplay}%)</span>
                                        <span>+{formatAdminInline(cardServiceFeeRenter)}</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-1">
                                        <span>Total payé par le locataire</span>
                                        <span className="font-semibold text-success">{formatAdminInline(cardTotalAmount)}</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground mt-2">
                                        <span>Commission propriétaire ({cardFeePercentDisplay}%)</span>
                                        <span className="text-destructive">-{formatAdminInline(cardServiceFeeOwner)}</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-1">
                                        <span>Votre revenu ({100 - cardFeePercentDisplay}%)</span>
                                        <span className="font-semibold text-primary">{formatAdminInline(cardOwnerPayout)}</span>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground pt-1">{footnote}</p>
                                    </>
                                  ))()}
                        </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {/* Caution snapshot (read-only) — Phase 3.2.3 */}
                      {(() => {
                        const status = (booking as any).depositStatus ?? null;
                        const snapshotRaw = (booking as any).depositAmountSnapshot ?? (booking as any).depositAmount ?? null;
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center text-sm">
                                <Shield className="h-4 w-4 mr-3 flex-shrink-0 text-primary" />
                                <span className="font-medium text-foreground">{t('bookings.deposit.status.todo', 'Caution : à activer')} — {formatAdminInline(snapshot)}</span>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleForceDeposit(); }}
                                      disabled={isForcingDeposit}
                                      className="text-xs"
                                    >
                                      {isForcingDeposit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                                      {isForcingDeposit ? '…' : 'Forcer caution (état des lieux)'}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Marquer la caution comme déposée pour pouvoir effectuer l&apos;état des lieux</p>
                                    <p className="text-xs text-muted-foreground">Paiement offline, tests, etc.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
                  {booking.selectedOptions && booking.selectedOptions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center">
                        ✨ Services supplémentaires:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {booking.selectedOptions.map((option, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20"
                          >
                            <div className="flex-shrink-0">
                              {getServiceIcon(option.name)}
                </div>
                            <span className="font-medium text-xs">{option.name}</span>
                    </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>

                {/* Actions supplémentaires */}
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    // DEV-only: Diagnostic du bouton "Accepter" au rendu
                    if (import.meta.env.DEV) {
                      const conditionAcceptCurrent = booking.status === 'pending' || booking.status === 'pending_payment'
                      const conditionAcceptCorrect = booking.status === 'pending'
                      const conditionReject = booking.status === 'pending' || booking.status === 'pending_payment'
                      
                      console.info('[owner-accept-button-diag]', {
                        bookingId: booking.id,
                        status: booking.status,
                        location: 'CollapsibleContent (ligne ~1015)',
                        // Condition actuelle (FAUSSE)
                        conditionAcceptCurrent: conditionAcceptCurrent,
                        willShowAcceptCurrent: conditionAcceptCurrent,
                        // Condition correcte attendue
                        conditionAcceptCorrect: conditionAcceptCorrect,
                        willShowAcceptCorrect: conditionAcceptCorrect,
                        // Condition Refuser (correcte)
                        conditionReject: conditionReject,
                        willShowReject: conditionReject,
                        // Diagnostic
                        problem: conditionAcceptCurrent && !conditionAcceptCorrect 
                          ? `Bouton "Accepter" affiché pour status "${booking.status}" alors qu'il devrait être masqué`
                          : 'OK',
                        isExpanded,
                      })
                    }
                    return null
                  })()}
                  {/* Bouton "Accepter" — UNIQUEMENT pour pending */}
                  {booking.status === 'pending' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        console.log('[UI] Bouton "Accepter" cliqué', { bookingId: booking.id, status: booking.status })
                        
                        // DEV-only: Diagnostic enrichi au clic
                        if (import.meta.env.DEV) {
                          console.warn('[owner-accept-button-diag] CLICK', {
                            bookingId: booking.id,
                            status: booking.status,
                            shouldNotBeVisible: booking.status === 'pending_payment',
                            problem: booking.status === 'pending_payment' 
                              ? 'Bouton "Accepter" cliqué alors que status = pending_payment (ne devrait pas être visible)'
                              : 'OK',
                          })
                        }
                        
                        e.stopPropagation()
                        handleAccept()
                      }}
                      disabled={isUpdating}
                      className="bg-success hover:bg-success/90 flex-1 sm:flex-none"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accepter
                    </Button>
                  )}

                  {/* Bouton "Refuser" — pour pending ET pending_payment */}
                  {(booking.status === 'pending' || booking.status === 'pending_payment') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReject()
                      }}
                      disabled={isUpdating}
                      className="flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Refuser
                    </Button>
                  )}

                  {/* Bouton État des lieux de départ :
                      - visible si statut booking = confirmed
                      - caché si un checkin_depart complété existe déjà */}
                  {booking.status === 'confirmed' &&
                    booking.checkinDepart?.status !== 'completed' &&
                    !(booking as any).hasCheckin && (
                    <div className="flex flex-col gap-1 flex-1 sm:flex-none w-full sm:w-auto">
                    <Link
                      to={`/checking/${booking.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full"
                    >
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-sm w-full"
                      >
                        <Car className="h-4 w-4" />
                        Départ : contrat & état des lieux
                      </Button>
                    </Link>
                      <p className="text-[11px] text-muted-foreground px-0.5">
                        Contrat de location signé sur tablette, puis formulaire d&apos;état des lieux.
                      </p>
                    </div>
                  )}
                  {/* Badges et boutons pour les états des lieux : départ et retour */}
                  {booking.checkinDepart?.status === 'completed' && (
                    <>
                      {/* Si le retour est aussi complété, afficher les deux badges côte à côte */}
                      {booking.checkinReturn?.status === 'completed' ? (
                        <div className="flex items-center gap-2 flex-1 sm:flex-none flex-wrap">
                          {/* Badge Départ complété */}
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Départ complété
                          </Badge>
                          {/* Badge Retour complété */}
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Retour complété
                          </Badge>
                          {/* Bouton Ouvrir un litige : visible uniquement si EDL retour complété et nouveaux dégâts signalés */}
                          {(booking.checkinReturn as any)?.has_new_damage === true && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toast({
                                  title: 'Fonctionnalité à venir',
                                  description: "L'ouverture de litige sera disponible prochainement.",
                                })
                              }}
                              className="flex-1 sm:flex-none"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Ouvrir un litige
                            </Button>
                          )}
                        </div>
                      ) : (
                        /* Si le retour n'est pas complété, afficher le badge départ seul ou le bouton retour */
                        <>
                          {/* Badge "Départ complété" : affiché quand checkin_depart est complété mais retour pas encore */}
                          <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Départ complété
                            </Badge>
                          </div>
                          {/* Bouton État des lieux de retour : visible si checkin_depart est complété mais retour pas encore */}
                          {(!booking.checkinReturn || booking.checkinReturn.status === 'draft') && (
                        <Link
                          to={`/checkin-return/${booking.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 sm:flex-none"
                        >
                          <Button
                            variant="default"
                            size="sm"
                            disabled={isUpdating}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-sm w-full"
                          >
                            <RotateCcw className="h-4 w-4" />
                            {booking.checkinReturn?.status === 'draft'
                              ? "Reprendre l'état des lieux de retour"
                              : "État des lieux de retour"}
                          </Button>
                        </Link>
                          )}
                        </>
                      )}
                    </>
                  )}
                  
                  {/* Bouton annuler la réservation : masqué si terminated */}
                  {booking.status !== 'terminated' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenCancelModal()
                      }}
                      disabled={isUpdating}
                      className="flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuler la réservation
                    </Button>
                  )}

                  <BookingMoreActionsMenu
                    checkinDepart={booking.checkinDepart}
                    checkinReturn={booking.checkinReturn}
                    onViewDetails={() => {
                      setShowDetailsModal(true)
                    }}
                    onViewVehicle={() => {
                      if (booking.vehicle) {
                        navigate(getPublicListingPath(booking.vehicle))
                      }
                    }}
                    className="flex-1 sm:flex-none sm:ml-auto w-full sm:w-auto"
                  />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>

      {/* Modal des détails de réservation */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Wrapper pour export PDF */}
          <div data-modal-content>
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <DialogTitle className="text-2xl font-bold text-[#004E4E]">
                  Détails de votre réservation
                </DialogTitle>
              </div>
              <Badge variant="secondary" className="font-semibold">
                Réservation #{booking.id.substring(0, 8)} • Créée le {new Date(booking.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Badge>
            </div>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Colonne gauche */}
            <div className="space-y-6">
              {/* Informations véhicule */}
              <div className="border rounded-lg p-4 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-18 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={booking.primaryPhoto?.url || 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=200&h=150&fit=crop'}
                      alt={booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : 'Véhicule'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      {booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : 'Véhicule supprimé'}
                    </h3>
                    <p className="text-muted-foreground">
                      Année {booking.vehicle?.year || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations client */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-lg">Informations client</h4>
                  {isAdminCreatedBooking(booking) && <AdminBookingBadge />}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Nom</p>
                    <p className="font-semibold">{renter?.lastName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Prénom</p>
                    <p className="font-semibold">{renter?.firstName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Téléphone</p>
                    <p className="font-semibold">{renter?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Email</p>
                    <p className="font-semibold break-all">{renter?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Zone de prise en charge */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPinIcon className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Zone de prise en charge</h4>
                </div>
                <p className="text-lg font-semibold">{(booking as any).pickupLocation || booking.pickupLocation || 'Non spécifiée'}</p>
              </div>

              {(booking as any).hotelName && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Hôtel</h4>
                  </div>
                  <p className="text-lg font-semibold">{(booking as any).hotelName}</p>
                </div>
              )}

              {(booking as any).notes && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Notes</h4>
                  </div>
                  <p className="text-lg font-semibold whitespace-pre-wrap">{(booking as any).notes}</p>
                </div>
              )}

              {/* Dates de location */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Dates de location</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-2">Départ</p>
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {(() => {
                          const date = new Date(booking.startDate)
                          return date.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        })()}
                      </p>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{(booking as any).startTime || '08:00'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2">Retour</p>
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {(() => {
                          const date = new Date(booking.endDate)
                          return date.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        })()}
                      </p>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{(booking as any).endTime || '10:00'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 bg-primary/10 text-primary border-primary hover:bg-primary hover:text-white"
                  disabled
                >
                  Durée: {calculateRealDuration()}
                </Button>
              </div>
            </div>

            {/* Colonne droite - Tarifs */}
            <div>
              <div className="border rounded-lg p-4 sticky top-0">
                <div className="flex items-center gap-2 mb-4">
                  <Euro className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Tarif de base</h4>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-medium">Location véhicule</p>
                      <p className="text-sm text-muted-foreground">
                        {cardDurationText} × {formatAdminInline((booking as any).pricePerDay || booking.vehicle?.dailyPrice || 0)}/jour
                      </p>
                    </div>
                    <DualPrice amountMga={cardBasePrice} variant="admin" className="items-end text-right shrink-0" primaryClassName="font-semibold tabular-nums" secondaryClassName="text-xs" />
                  </div>

                  {/* Services supplémentaires */}
                  {(() => {
                    const normalizedOptions = normalizeBookingOptions((booking as any).selectedOptions);
                    if (!normalizedOptions.length) return null;

                    return (
                      <div className="pt-2 border-t">
                        <p className="font-medium mb-2">Services supplémentaires</p>
                        <div className="space-y-2">
                          {normalizedOptions.map((option, index) => (
                            <div key={index} className="flex justify-between items-start gap-4 text-sm">
                              <span>{option.name}</span>
                              <DualPrice amountMga={option.totalPrice || 0} variant="admin" className="items-end text-right shrink-0" primaryClassName="font-semibold tabular-nums text-sm" secondaryClassName="text-xs" />
                            </div>
                          ))}
                        </div>
                        {cardOptionsTotal > 0 && (
                          <AdminPriceRow label="Sous-total options" amountMga={cardOptionsTotal} className="border-t pt-2 mt-2" bold />
                        )}
                      </div>
                    );
                  })()}

                  <div className="pt-2 border-t space-y-2">
                    <div className="flex justify-between items-start gap-4 text-muted-foreground">
                      <span className="text-sm">Frais de plateforme ({cardFeePercentDisplay}%)</span>
                      <DualPrice
                        amountMga={cardServiceFeeOwner}
                        variant="admin"
                        className="items-end text-right shrink-0"
                        primaryClassName="text-sm tabular-nums"
                        secondaryClassName="text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t-2">
                    <AdminPriceRow label="Montant total" amountMga={cardTotalAmount} bold />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions en bas */}
          <div className="flex gap-3 mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger en PDF
            </Button>
            <Button
              variant="default"
              onClick={() => setShowDetailsModal(false)}
              className="flex-1 bg-[#004E4E] hover:bg-[#004E4E]/90"
            >
              Fermer
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de refus avec motif */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">
              Refuser la réservation
            </DialogTitle>
            <DialogDescription>
              Veuillez indiquer le motif du refus. Le locataire sera informé de votre décision.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={rejectReason} onValueChange={setRejectReason}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="Véhicule indisponible à ces dates" id="reason1" />
                  <Label htmlFor="reason1" className="flex-1 cursor-pointer">
                    Véhicule indisponible à ces dates
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="Dates ne correspondant pas aux attentes" id="reason2" />
                  <Label htmlFor="reason2" className="flex-1 cursor-pointer">
                    Dates ne correspondant pas aux attentes
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="Problème avec le profil du locataire" id="reason3" />
                  <Label htmlFor="reason3" className="flex-1 cursor-pointer">
                    Problème avec le profil du locataire
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="Autre raison (personnalisée)" id="reason4" />
                  <Label htmlFor="reason4" className="flex-1 cursor-pointer">
                    Autre raison (personnalisée)
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {rejectReason === 'Autre raison (personnalisée)' && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Expliquez votre motif</Label>
                <Textarea
                  id="customReason"
                  placeholder="Ex: Le véhicule est en révision..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false)
                setRejectReason('')
                setCustomRejectReason('')
              }}
              className="flex-1"
              disabled={isUpdating}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              className="flex-1"
              disabled={isUpdating || (!rejectReason && !customRejectReason)}
            >
              {isUpdating ? 'Envoi...' : 'Confirmer le refus'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  
      {/* Modal d'annulation */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{`Confirmer l'annulation`}</DialogTitle>
            <DialogDescription>
              {booking.status === 'pending'
                ? "Tu es sur le point d'annuler cette demande avant acceptation."
                : "Tu es sur le point d'annuler une réservation déjà acceptée ou en cours de paiement."}
            </DialogDescription>
          </DialogHeader>

          {/* Alerte rouge visible UNIQUEMENT si ce n'est pas du pending */}
          {booking.status !== 'pending' && (
            <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  Cette réservation est déjà engagée.
                </p>
                <p>
                  Préviens le locataire avant d'annuler pour éviter un litige.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <label className="text-sm font-medium">
              Raison de l'annulation (visible pour le locataire)
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Ex: Véhicule indisponible à ces dates"
            />
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isUpdating}
            >
              Retour
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await handleCancelBooking()
              }}
              disabled={isUpdating || cancellationReason.trim().length === 0}
            >
              {`Confirmer l'annulation`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
