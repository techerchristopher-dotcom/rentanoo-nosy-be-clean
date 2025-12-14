// src/components/RenterBookingCard.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { fr } from 'date-fns/locale'
import { Separator } from '@/components/ui/separator'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Download } from 'lucide-react'
import { BookingMoreActionsMenu } from '@/components/BookingMoreActionsMenu'

type BookingWithDetails = Booking & {
  vehicle?: Vehicle
  primaryPhoto?: Photo
  depositStatus?: 'pending' | 'paid' | 'refunded' | null
  depositAmount?: number | null
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
}: RenterBookingCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [owner, setOwner] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState<string>('')
  const [customCancelReason, setCustomCancelReason] = useState<string>('')
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Afficher la durée calculée depuis les heures réelles
  const calculateRealDuration = () => {
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    
    // Récupérer les heures depuis booking
    const startTime = (booking as any).startTime || '06:30'
    const endTime = (booking as any).endTime || '14:00'
    
    const [startHour, startMinute] = startTime.split(':')
    const [endHour, endMinute] = endTime.split(':')
    
    startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
    endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
    
    const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    const completeDays = Math.floor(rentalHours / 24)
    const extraHours = Math.floor(rentalHours % 24)
    
    console.log('⏱️ [RenterBookingCard] Calcul:', { rentalHours, completeDays, extraHours, startTime, endTime })
    
    if (rentalHours < 24) {
      return '1 jour'
    } else if (extraHours === 0) {
      return `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}`
    } else {
      // Toujours afficher les heures supplémentaires
      // Peu importe si heure retour < heure départ
      return `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}`
    }
  }

  // Fonction pour générer le badge de statut enrichi et le CTA selon les règles métier (locataire)
  const getUserBookingStatusUI = () => {
    const now = new Date()
    const startDate = new Date(booking.startDate)
    const endDate = new Date(booking.endDate)
    const depositStatus = (booking as any).depositStatus || null
    const depositAmount = (booking as any).depositAmount || null

    // Cas A: confirmed + deposit_status pending
    if (booking.status === 'confirmed' && depositStatus === 'pending') {
      return {
        badgeLabel: 'Paiement confirmé',
        badgeNote: 'En attente de la caution',
        badgeColorClass: 'bg-orange-100 text-orange-800 border border-orange-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: 'text-orange-700 text-xs font-medium',
        showDepositCTA: true,
        depositCTALabel: 'Finaliser ma réservation'
      }
    }

    // Cas B: confirmed + deposit_status paid + start_date > now
    if (booking.status === 'confirmed' && depositStatus === 'paid' && startDate > now) {
      return {
        badgeLabel: 'Prêt à partir',
        badgeNote: 'Paiement et caution validés',
        badgeColorClass: 'bg-green-100 text-green-800 border border-green-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: 'text-green-700 text-xs font-medium',
        showDepositCTA: false
      }
    }

    // Cas C: active OU (confirmed + deposit paid + dates chevauchantes)
    if (booking.status === 'active' || 
        (booking.status === 'confirmed' && depositStatus === 'paid' && startDate <= now && endDate >= now)) {
      return {
        badgeLabel: 'En cours',
        badgeNote: null,
        badgeColorClass: 'bg-green-100 text-green-800 border border-green-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: null,
        showDepositCTA: false
      }
    }

    // Cas D: completed
    if (booking.status === 'completed') {
      return {
        badgeLabel: 'Terminé',
        badgeNote: null,
        badgeColorClass: 'bg-gray-100 text-gray-700 border border-gray-300 rounded-full px-3 py-1 text-sm font-medium',
        noteColorClass: null,
        showDepositCTA: false
      }
    }

    // Cas E: cancelled, rejected, declined
    if (booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'declined') {
      return {
        badgeLabel: 'Annulée',
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
              : "hover:shadow-lagoon hover:scale-[1.01] bg-gradient-to-br from-card to-card/50"
          )}>
        <CollapsibleTrigger asChild>
          <CardContent className={cn(
            "p-4",
            (booking.status === 'cancelled' || booking.status === 'declined') ? "cursor-default" : "cursor-pointer"
          )}>
            <div className="flex items-center justify-between">
              {/* Informations principales */}
              <div className="flex items-center space-x-4 flex-1">
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
                      (booking.status === 'cancelled' || booking.status === 'declined') && "opacity-40"
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

              {/* Actions et statut - alignement parfait */}
              <div className="flex flex-col items-end gap-2 h-16">
                <div className="flex items-center gap-3">
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
                      
                      if (booking.status === 'cancelled' && cancellationReason) {
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground/70 italic">
                              {cancellationReason}
                            </span>
                            {updatedText && (
                              <span className="text-[10px] text-muted-foreground/60">Mise à jour le : {updatedText}</span>
                            )}
                          </div>
                        );
                      } else if (booking.status === 'declined') {
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-muted-foreground/70 italic">
                              {cancellationReason || 'Réservation refusée'}
                            </span>
                            {updatedText && (
                              <span className="text-[10px] text-muted-foreground/60">Mise à jour le : {updatedText}</span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Compte à rebours si en attente de paiement */}
                  {booking.status === 'pending_payment' && booking.updatedAt && (
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
                              `/vehicle/${booking.vehicle?.license || 'unknown'}/booking/discussion`
                            )
                          }}
                        >
                          {/* Avatar avec contraintes strictes et badge messages non lus */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 border-2 border-primary/20 flex items-center justify-center shadow-sm mb-2 group-hover:shadow-md transition-shadow">
                              {owner?.avatarUrl ? (
                                <img
                                  src={owner.avatarUrl}
                                  alt={owner.firstName || 'Propriétaire'}
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
                          Bonjour {owner?.firstName || 'Propriétaire'}, cliquez ici pour discuter avec moi
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
                      <span className="font-medium text-foreground">Début:</span>
                      <span className="ml-2 font-semibold text-primary">
                        {(() => {
                          console.log('🔍 [RenterBookingCard] Début - booking:', booking)
                          console.log('🔍 [RenterBookingCard] Début - startTime:', (booking as any).startTime)
                          const date = new Date(booking.startDate)
                          const time = (booking as any).startTime || '08:00'
                          const [hour, minute] = time.split(':')
                          date.setHours(parseInt(hour), parseInt(minute), 0, 0)
                          const formatted = date.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                          console.log('🔍 [RenterBookingCard] Début - formatted:', formatted)
                          return formatted
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
                      <span className="ml-2 font-bold text-primary text-lg">
                        {(() => {
                          // Recalculer le prix avec la nouvelle logique si véhicule disponible
                          if (booking.vehicle?.dailyPrice) {
                            const startDate = new Date(booking.startDate)
                            const endDate = new Date(booking.endDate)
                            const startTime = (booking as any).startTime || '06:30'
                            const endTime = (booking as any).endTime || '14:00'
                            const [startHour, startMinute] = startTime.split(':')
                            const [endHour, endMinute] = endTime.split(':')
                            startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
                            endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
                            const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                            const completeDays = Math.floor(rentalHours / 24)
                            const extraHours = Math.floor(rentalHours % 24)
                            
                            let basePrice: number;
                            if (rentalHours < 24) {
                              basePrice = booking.vehicle.dailyPrice
                            } else if (extraHours === 0) {
                              basePrice = completeDays * booking.vehicle.dailyPrice
                            } else {
                              // Toujours facturer les heures supplémentaires au prorata
                              // Peu importe si heure retour < heure départ
                              const hourPrice = booking.vehicle.dailyPrice / 24
                              const extraHoursPrice = extraHours * hourPrice
                              basePrice = Math.ceil((completeDays * booking.vehicle.dailyPrice) + extraHoursPrice)
                            }
                            
                            // Ajouter le coût des options sélectionnées
                            const optionsTotal = getServicesFromOptions(booking.selectedOptions).reduce((sum, option) => sum + option.totalPrice, 0)
                            
                            // Calculer le sous-total (base + options)
                            const subtotal = basePrice + optionsTotal
                            
                            // Ajouter les frais de service (15%)
                            const serviceFee = Math.round(subtotal * 0.15 * 100) / 100
                            
                            // Calculer le total final
                            const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100
                            
                            return totalAmount
                          }
                          return booking.totalAmount
                        })()}€
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
                              {(() => {
                                // Recalculer les détails pour le tooltip
                                if (booking.vehicle?.dailyPrice) {
                                  const startDate = new Date(booking.startDate)
                                  const endDate = new Date(booking.endDate)
                                  const startTime = (booking as any).startTime || '06:30'
                                  const endTime = (booking as any).endTime || '14:00'
                                  const [startHour, startMinute] = startTime.split(':')
                                  const [endHour, endMinute] = endTime.split(':')
                                  startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
                                  endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
                                  const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                                  const completeDays = Math.floor(rentalHours / 24)
                                  const extraHours = Math.floor(rentalHours % 24)
                                  
                                  let basePrice: number;
                                  let durationText: string;
                                  if (rentalHours < 24) {
                                    basePrice = booking.vehicle.dailyPrice
                                    durationText = '1 jour'
                                  } else if (extraHours === 0) {
                                    basePrice = completeDays * booking.vehicle.dailyPrice
                                    durationText = `${completeDays} jours`
                                  } else {
                                    // Toujours facturer les heures supplémentaires au prorata
                                    const hourPrice = booking.vehicle.dailyPrice / 24
                                    basePrice = Math.ceil((completeDays * booking.vehicle.dailyPrice) + (extraHours * hourPrice))
                                    durationText = `${completeDays} jours + ${Math.floor(extraHours)}h`
                                  }
                                  
                                  const optionsTotal = getServicesFromOptions(booking.selectedOptions).reduce((sum, option) => sum + option.totalPrice, 0)
                                  const subtotal = basePrice + optionsTotal
                                  const serviceFee = Math.round(subtotal * 0.15 * 100) / 100
                                  const totalAmount = Math.round((subtotal + serviceFee) * 100) / 100
                                  
                                  return (
                                    <>
                                      <div className="flex justify-between">
                                        <span>Location ({durationText})</span>
                                        <span className="font-semibold">{basePrice}€</span>
                                      </div>
                                      {optionsTotal > 0 && (
                                        <div className="flex justify-between">
                                          <span>Options supplémentaires</span>
                                          <span className="font-semibold">+{optionsTotal}€</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between border-t pt-1">
                                        <span>Sous-total</span>
                                        <span className="font-semibold">{subtotal}€</span>
                                      </div>
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Frais de service (15%)</span>
                                        <span>+{serviceFee}€</span>
                                      </div>
                                      <div className="flex justify-between font-bold border-t pt-1">
                                        <span>TOTAL</span>
                                        <span>{totalAmount}€</span>
                                      </div>
                                    </>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                {/* Bouton "Finaliser ma réservation" si nécessaire */}
                {(() => {
                  const statusUI = getUserBookingStatusUI()
                  if (statusUI && statusUI.showDepositCTA) {
                    return (
                      <Button
                        size="lg"
                        className="relative bg-gradient-lagoon hover:opacity-90 text-white shadow-lg hover:shadow-2xl transition-all flex-1 min-w-[200px] overflow-hidden group border-2 border-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Ouvrir la modal de finalisation (étape 1: paiement, étape 2: caution)
                          const start = new Date(booking.startDate)
                          const end = new Date(booking.endDate)
                          const startTime = (booking as any).startTime || '06:30'
                          const endTime = (booking as any).endTime || '14:00'
                          const [sh, sm] = startTime.split(':')
                          const [eh, em] = endTime.split(':')
                          start.setHours(parseInt(sh), parseInt(sm), 0, 0)
                          end.setHours(parseInt(eh), parseInt(em), 0, 0)
                          const hours = (end.getTime() - start.getTime()) / (1000*60*60)
                          const days = Math.max(1, Math.ceil(hours / 24))
                          const base = booking.vehicle?.dailyPrice ? Math.ceil(days * booking.vehicle.dailyPrice) : (booking.totalAmount || 0)
                          // Extras issus des options sélectionnées s'ils existent
                          const selectedExtras: Array<{ label: string; price: number }> = Array.isArray((booking as any).selectedOptions)
                            ? ((booking as any).selectedOptions || []).map((opt: any) => ({ label: opt.name, price: opt.totalPrice }))
                            : []
                          const optionsTotal = selectedExtras.reduce((s, x) => s + (x.price || 0), 0)
                          const subtotal = base + optionsTotal
                          const fee = Math.round(subtotal * 0.15 * 100) / 100
                          const total = Math.round((subtotal + fee) * 100) / 100
                          onRequestPay?.({
                            id: booking.id,
                            voiture: booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : 'Véhicule',
                            dateDebut: formatDate(booking.startDate),
                            dateFin: formatDate(booking.endDate),
                            duree: days === 1 ? '1 jour' : `${days} jours`,
                            montantDeBase: base,
                            fraisService: fee,
                            totalTTC: total,
                            extras: selectedExtras,
                          })
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
                
                {/* Bouton paiement si en attente */}
                {booking.status === 'pending_payment' && (
                  <Button
                    size="lg"
                    className="relative bg-gradient-lagoon hover:opacity-90 text-white shadow-lg hover:shadow-2xl transition-all flex-1 min-w-[200px] overflow-hidden group border-2 border-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Préparer les données de réservation pour la modale de paiement
                      const start = new Date(booking.startDate)
                      const end = new Date(booking.endDate)
                      const startTime = (booking as any).startTime || '06:30'
                      const endTime = (booking as any).endTime || '14:00'
                      const [sh, sm] = startTime.split(':')
                      const [eh, em] = endTime.split(':')
                      start.setHours(parseInt(sh), parseInt(sm), 0, 0)
                      end.setHours(parseInt(eh), parseInt(em), 0, 0)
                      const hours = (end.getTime() - start.getTime()) / (1000*60*60)
                      const days = Math.max(1, Math.ceil(hours / 24))
                      const base = booking.vehicle?.dailyPrice ? Math.ceil(days * booking.vehicle.dailyPrice) : (booking.totalAmount || 0)
                      // Extras issus des options sélectionnées s'ils existent
                      const selectedExtras: Array<{ label: string; price: number }> = Array.isArray((booking as any).selectedOptions)
                        ? ((booking as any).selectedOptions || []).map((opt: any) => ({ label: opt.name, price: opt.totalPrice }))
                        : []
                      const optionsTotal = selectedExtras.reduce((s, x) => s + (x.price || 0), 0)
                      const subtotal = base + optionsTotal
                      const fee = Math.round(subtotal * 0.15 * 100) / 100
                      const total = Math.round((subtotal + fee) * 100) / 100
                      onRequestPay?.({
                        id: booking.id,
                        voiture: booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : 'Véhicule',
                        dateDebut: formatDate(booking.startDate),
                        dateFin: formatDate(booking.endDate),
                        duree: days === 1 ? '1 jour' : `${days} jours`,
                        montantDeBase: base,
                        fraisService: fee,
                        totalTTC: total,
                        extras: selectedExtras,
                      })
                    }}
                  >
                    {/* Effet shimmer au hover */}
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
                      navigate(`/vehicle/${booking.vehicle.license}`)
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
                      Annuler
                    </Button>
                    <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold text-destructive">Annuler la réservation</DialogTitle>
                          <DialogDescription>Sélectionnez un motif ou rédigez votre message.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
                            <div className="space-y-3">
                              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value="Changement de dates" id="cancel1" />
                                <Label htmlFor="cancel1" className="flex-1 cursor-pointer">Changement de dates</Label>
                              </div>
                              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value="Trouvé une autre option" id="cancel2" />
                                <Label htmlFor="cancel2" className="flex-1 cursor-pointer">Trouvé une autre option</Label>
                              </div>
                              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value="Imprévu personnel" id="cancel3" />
                                <Label htmlFor="cancel3" className="flex-1 cursor-pointer">Imprévu personnel</Label>
                              </div>
                              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value="Erreur de réservation" id="cancel4" />
                                <Label htmlFor="cancel4" className="flex-1 cursor-pointer">Erreur de réservation</Label>
                              </div>
                              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value="Autre raison (personnalisée)" id="cancel5" />
                                <Label htmlFor="cancel5" className="flex-1 cursor-pointer">Autre raison (personnalisée)</Label>
                              </div>
                            </div>
                          </RadioGroup>
                          {cancelReason === 'Autre raison (personnalisée)' && (
                            <div className="space-y-2">
                              <Label htmlFor="customCancelReason">Expliquez votre motif</Label>
                              <Textarea id="customCancelReason" value={customCancelReason} onChange={(e) => setCustomCancelReason(e.target.value)} placeholder="Ex: Mon planning a changé..." />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)} disabled={isDeleting}>Retour</Button>
                          <Button variant="destructive" className="flex-1" onClick={handleConfirmCancel} disabled={isDeleting || (!cancelReason && !customCancelReason)}>
                            {isDeleting ? 'Annulation...' : 'Confirmer'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
                MayCar
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
              Détails de votre réservation
            </DialogTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <p className="text-sm text-muted-foreground">
                Réservation #{(booking as any).referenceNumber || booking.id.substring(0, 8)}
              </p>
              <span className="text-sm text-muted-foreground">•</span>
              <p className="text-sm text-muted-foreground">
                Créée le {format(new Date(booking.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
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
                    Année {booking.vehicle.year}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Section Informations client */}
            {currentUser && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="p-2 bg-primary-soft rounded-lg">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">Informations client</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Nom</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{currentUser.lastName || 'Non renseigné'}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Prénom</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{currentUser.firstName || 'Non renseigné'}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Téléphone</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{currentUser.phone || 'Non renseigné'}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Email</p>
                      <p className="text-sm font-bold text-foreground break-all leading-tight">{currentUser.email || 'Non renseigné'}</p>
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
                <p className="text-xs text-muted-foreground mb-1">Zone de prise en charge</p>
                <p className="text-base font-semibold text-foreground">
                  {(booking as any).pickupLocation || 'Non spécifiée'}
                </p>
              </div>
            </div>

            <Separator />

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
                  <p className="text-sm font-bold text-foreground">
                    {format(new Date(booking.startDate), "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{(booking as any).startTime || '08:00'}</span>
                  </div>
                </div>

                <div className="p-3 bg-card rounded-lg border border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Retour</p>
                  <p className="text-sm font-bold text-foreground">
                    {format(new Date(booking.endDate), "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{(booking as any).endTime || '10:00'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-center">
                <Badge variant="default" className="text-sm px-4 py-1.5 bg-primary text-white font-semibold">
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
                  <span className="text-sm font-semibold text-foreground">Tarif de base</span>
                </div>

                <div className="bg-card rounded-lg border border-border/50 p-3 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground font-medium">
                      Location véhicule
                    </span>
                    <span className="text-base font-bold text-primary">
                      {(() => {
                        if (booking.vehicle?.dailyPrice) {
                          const startDate = new Date(booking.startDate)
                          const endDate = new Date(booking.endDate)
                          const startTime = (booking as any).startTime || '06:30'
                          const endTime = (booking as any).endTime || '14:00'
                          const [startHour, startMinute] = startTime.split(':')
                          const [endHour, endMinute] = endTime.split(':')
                          startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
                          endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
                          const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                          const completeDays = Math.floor(rentalHours / 24)
                          const extraHours = Math.floor(rentalHours % 24)
                          
                          let basePrice: number;
                          let durationText: string;
                          if (rentalHours < 24) {
                            basePrice = booking.vehicle.dailyPrice
                            durationText = '1 jour'
                          } else if (extraHours === 0) {
                            basePrice = completeDays * booking.vehicle.dailyPrice
                            durationText = `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}`
                          } else {
                            const hourPrice = booking.vehicle.dailyPrice / 24
                            const extraHoursPrice = extraHours * hourPrice
                            basePrice = Math.ceil((completeDays * booking.vehicle.dailyPrice) + extraHoursPrice)
                            durationText = `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}`
                          }
                          return { price: basePrice, duration: durationText }
                        }
                        return { price: 0, duration: '' }
                      })().price}€
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {booking.vehicle?.dailyPrice}€/jour × {(() => {
                      if (booking.vehicle?.dailyPrice) {
                        const startDate = new Date(booking.startDate)
                        const endDate = new Date(booking.endDate)
                        const startTime = (booking as any).startTime || '06:30'
                        const endTime = (booking as any).endTime || '14:00'
                        const [startHour, startMinute] = startTime.split(':')
                        const [endHour, endMinute] = endTime.split(':')
                        startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
                        endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
                        const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                        const completeDays = Math.floor(rentalHours / 24)
                        const extraHours = Math.floor(rentalHours % 24)
                        
                        let durationText: string;
                        if (rentalHours < 24) {
                          durationText = '1 jour'
                        } else if (extraHours === 0) {
                          durationText = `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}`
                        } else {
                          durationText = `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}`
                        }
                        return durationText
                      }
                      return ''
                    })()}
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
                      <span className="text-sm font-semibold text-foreground">Options sélectionnées</span>
                    </div>

                    <div className="bg-card rounded-lg border border-border/50 p-3 space-y-3">
                      {getServicesFromOptions(booking.selectedOptions).map((option, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-foreground font-medium">
                            {option.name}
                          </span>
                          <span className="text-base font-bold text-primary min-w-[60px] text-right">
                            + {option.totalPrice}€
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border/50 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground font-medium">Sous-total options</span>
                          <span className="text-base font-bold text-foreground">{getServicesFromOptions(booking.selectedOptions).reduce((sum, opt) => sum + opt.totalPrice, 0)}€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Section Total - avec alignement parfait */}
              <div className="space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 p-4 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Sous-total</span>
                  <span className="text-base font-bold text-foreground min-w-[100px] text-right">{(() => {
                    if (booking.vehicle?.dailyPrice) {
                      const startDate = new Date(booking.startDate)
                      const endDate = new Date(booking.endDate)
                      const startTime = (booking as any).startTime || '06:30'
                      const endTime = (booking as any).endTime || '14:00'
                      const [startHour, startMinute] = startTime.split(':')
                      const [endHour, endMinute] = endTime.split(':')
                      startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
                      endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
                      const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                      const completeDays = Math.floor(rentalHours / 24)
                      const extraHours = Math.floor(rentalHours % 24)
                      
                      let basePrice: number;
                      if (rentalHours < 24) {
                        basePrice = booking.vehicle.dailyPrice
                      } else if (extraHours === 0) {
                        basePrice = completeDays * booking.vehicle.dailyPrice
                      } else {
                        const hourPrice = booking.vehicle.dailyPrice / 24
                        const extraHoursPrice = extraHours * hourPrice
                        basePrice = Math.ceil((completeDays * booking.vehicle.dailyPrice) + extraHoursPrice)
                      }
                      
                      const optionsTotal = getServicesFromOptions(booking.selectedOptions).reduce((sum, opt) => sum + opt.totalPrice, 0)
                      return basePrice + optionsTotal
                    }
                    return 0
                  })()}€</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">
                    Frais de service (15%)
                  </span>
                  <span className="text-base font-bold text-muted-foreground min-w-[100px] text-right">
                    + {(() => {
                      if (booking.vehicle?.dailyPrice) {
                        const startDate = new Date(booking.startDate)
                        const endDate = new Date(booking.endDate)
                        const startTime = (booking as any).startTime || '06:30'
                        const endTime = (booking as any).endTime || '14:00'
                        const [startHour, startMinute] = startTime.split(':')
                        const [endHour, endMinute] = endTime.split(':')
                        startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
                        endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
                        const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                        const completeDays = Math.floor(rentalHours / 24)
                        const extraHours = Math.floor(rentalHours % 24)
                        
                        let basePrice: number;
                        if (rentalHours < 24) {
                          basePrice = booking.vehicle.dailyPrice
                        } else if (extraHours === 0) {
                          basePrice = completeDays * booking.vehicle.dailyPrice
                        } else {
                          const hourPrice = booking.vehicle.dailyPrice / 24
                          const extraHoursPrice = extraHours * hourPrice
                          basePrice = Math.ceil((completeDays * booking.vehicle.dailyPrice) + extraHoursPrice)
                        }
                        
                        const optionsTotal = getServicesFromOptions(booking.selectedOptions).reduce((sum, opt) => sum + opt.totalPrice, 0)
                        const subtotal = basePrice + optionsTotal
                        return Math.round(subtotal * 0.15 * 100) / 100
                      }
                      return 0
                    })()}€
                  </span>
                </div>

                <Separator className="border-primary/30" />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-foreground">TOTAL À PAYER</span>
                  <span className="text-3xl font-bold text-primary min-w-[100px] text-right">
                    {(() => {
                      if (booking.vehicle?.dailyPrice) {
                        const startDate = new Date(booking.startDate)
                        const endDate = new Date(booking.endDate)
                        const startTime = (booking as any).startTime || '06:30'
                        const endTime = (booking as any).endTime || '14:00'
                        const [startHour, startMinute] = startTime.split(':')
                        const [endHour, endMinute] = endTime.split(':')
                        startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
                        endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
                        const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                        const completeDays = Math.floor(rentalHours / 24)
                        const extraHours = Math.floor(rentalHours % 24)
                        
                        let basePrice: number;
                        if (rentalHours < 24) {
                          basePrice = booking.vehicle.dailyPrice
                        } else if (extraHours === 0) {
                          basePrice = completeDays * booking.vehicle.dailyPrice
                        } else {
                          const hourPrice = booking.vehicle.dailyPrice / 24
                          const extraHoursPrice = extraHours * hourPrice
                          basePrice = Math.ceil((completeDays * booking.vehicle.dailyPrice) + extraHoursPrice)
                        }
                        
                        const optionsTotal = getServicesFromOptions(booking.selectedOptions).reduce((sum, opt) => sum + opt.totalPrice, 0)
                        const subtotal = basePrice + optionsTotal
                        const serviceFee = Math.round(subtotal * 0.15 * 100) / 100
                        return Math.round((subtotal + serviceFee) * 100) / 100
                      }
                      return 0
                    })()}€
                  </span>
                </div>
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
            Télécharger en PDF
          </Button>
          <Button
            variant="default"
            onClick={() => setShowDetailsModal(false)}
            className="flex-1"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}
