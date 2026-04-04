import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CheckinDepartSummary, CheckinReturnSummary } from "@/types";

interface BookingMoreActionsMenuProps {
  checkinDepart?: CheckinDepartSummary;
  checkinReturn?: CheckinReturnSummary;
  onViewDetails?: () => void;
  onViewVehicle?: () => void;
  className?: string;
}

function countOpenStatesInRadixPortal(): number {
  const root = document.getElementById("radix-portal-root");
  if (!root) return -1;
  return root.querySelectorAll('[data-state="open"]').length;
}

/** Laisse le DropdownMenu Radix terminer fermeture / DismissableLayer avant l’action (évite conflit avec un Dialog dans le même portail). */
function runAfterDropdownCloses(action: () => void, label: string) {
  const log =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debugDialogs") === "1";
  if (log) {
    // eslint-disable-next-line no-console
    console.info("[BookingMoreActionsMenu:debug]", "defer start", label, {
      openStateNodes: countOpenStatesInRadixPortal(),
    });
  }
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (log) {
          // eslint-disable-next-line no-console
          console.info("[BookingMoreActionsMenu:debug]", "defer run", label, {
            openStateNodes: countOpenStatesInRadixPortal(),
          });
        }
        action();
      });
    });
  });
}

/**
 * Menu d'actions additionnelles pour une réservation.
 * Affiche le téléchargement du PDF d'état des lieux seulement si
 * un check-in de départ complété avec URL PDF est disponible.
 * Affiche également le PDF de retour si disponible.
 */
export function BookingMoreActionsMenu({ checkinDepart, checkinReturn, onViewDetails, onViewVehicle, className }: BookingMoreActionsMenuProps) {
  const hasDepartPdf =
    !!checkinDepart &&
    checkinDepart.status === "completed" &&
    !!checkinDepart.legalPdfUrl;

  const hasReturnPdf =
    !!checkinReturn &&
    checkinReturn.status === "completed" &&
    !!checkinReturn.legalPdfUrl;

  const hasOtherActions = !!onViewDetails || !!onViewVehicle;

  // N'afficher le menu que s'il y a au moins une action à montrer
  if (!hasDepartPdf && !hasReturnPdf && !hasOtherActions) {
    return null;
  }

  const handleDownloadDepart = () => {
    if (!checkinDepart?.legalPdfUrl) return;
    window.open(checkinDepart.legalPdfUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadReturn = () => {
    if (!checkinReturn?.legalPdfUrl) return;
    window.open(checkinReturn.legalPdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`flex items-center gap-2 w-full sm:w-auto ${className || ''}`}>
          <FileText className="h-4 w-4" />
          Mes documents de location
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasDepartPdf && (
          <DropdownMenuItem onClick={handleDownloadDepart}>
            <FileText className="h-4 w-4 mr-2" />
            Télécharger l'état des lieux de départ (PDF)
          </DropdownMenuItem>
        )}
        {hasReturnPdf && (
          <DropdownMenuItem onClick={handleDownloadReturn}>
            <FileText className="h-4 w-4 mr-2" />
            Télécharger l'état des lieux de retour (PDF)
          </DropdownMenuItem>
        )}
        {onViewDetails && (
          <DropdownMenuItem
            onSelect={() => {
              runAfterDropdownCloses(onViewDetails, "onViewDetails");
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Voir les détails
          </DropdownMenuItem>
        )}
        {onViewVehicle && (
          <DropdownMenuItem
            onSelect={() => {
              runAfterDropdownCloses(onViewVehicle, "onViewVehicle");
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Voir le véhicule
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * ⚠️ Sécurité : l'URL est actuellement publique (bucket checkin-photos).
 * Pour renforcer plus tard : passer sur bucket privé + signed URL
 * ou proxy via une route API qui vérifie les droits (owner/renter du booking).
 */
