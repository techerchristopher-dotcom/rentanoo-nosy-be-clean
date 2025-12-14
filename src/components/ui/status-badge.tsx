import { cn } from "@/lib/utils";
import { BookingStatus, PaymentStatus, VehicleStatus, KycStatus } from "@/types";
import { Clock } from "lucide-react";

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus | VehicleStatus | KycStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusConfig = {
  // Booking statuses
  pending: { 
    color: "bg-[#fef2e1] text-[#d97706]", 
    label: "En attente",
    icon: Clock
  },
  pending_payment: {
    color: "bg-blue-50 text-blue-700",
    label: "En attente de paiement",
    icon: Clock
  },
  accepted: { 
    color: "bg-success text-success-foreground", 
    label: "Acceptée" 
  },
  declined: { 
    color: "bg-destructive text-destructive-foreground", 
    label: "Refusée" 
  },
  cancelled: { 
    color: "bg-muted text-muted-foreground", 
    label: "Annulée" 
  },
  active: { 
    color: "bg-primary text-primary-foreground", 
    label: "En cours" 
  },
  closed: { 
    color: "bg-muted text-muted-foreground", 
    label: "Terminée" 
  },
  
  // Payment statuses
  requires_action: { 
    color: "bg-warning text-warning-foreground", 
    label: "Action requise" 
  },
  processing: { 
    color: "bg-warning text-warning-foreground", 
    label: "Traitement" 
  },
  succeeded: { 
    color: "bg-success text-success-foreground", 
    label: "Réussi" 
  },
  failed: { 
    color: "bg-destructive text-destructive-foreground", 
    label: "Échoué" 
  },
  refunded: { 
    color: "bg-muted text-muted-foreground", 
    label: "Remboursé" 
  },
  
  // Vehicle statuses
  draft: { 
    color: "bg-muted text-muted-foreground", 
    label: "Brouillon" 
  },
  published: { 
    color: "bg-success text-success-foreground", 
    label: "Publié" 
  },
  suspended: { 
    color: "bg-destructive text-destructive-foreground", 
    label: "Suspendu" 
  },
  vehicle_active: { 
    color: "bg-green-500 text-white", 
    label: "Actif" 
  },
  inactive: { 
    color: "bg-red-500 text-white", 
    label: "Inactif" 
  },
  
  // KYC statuses
  verified: { 
    color: "bg-success text-success-foreground", 
    label: "Vérifié" 
  },
  rejected: { 
    color: "bg-destructive text-destructive-foreground", 
    label: "Rejeté" 
  }
};

const sizeConfig = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm", 
  lg: "px-4 py-2 text-base"
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  if (!config) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full font-medium",
        "bg-muted text-muted-foreground",
        sizeConfig[size],
        className
      )}>
        {status}
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium transition-colors",
      config.color,
      sizeConfig[size],
      className
    )}>
      {config.icon && <config.icon className="h-3 w-3 mr-1" />}
      {config.label}
    </span>
  );
}