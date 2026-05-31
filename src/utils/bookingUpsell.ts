import { getBookingDraft } from "@/services/localStorage/bookingStorage";
import { isPlatformTransportOption } from "@/constants/platformBookingOptions";

export function draftHasPlatformTransportOption(): boolean {
  const draft = getBookingDraft();
  return (draft?.selectedOptions ?? []).some(
    (o) => o.selected && isPlatformTransportOption(o.id)
  );
}

export function shouldShowComplementaryServicesModal(): boolean {
  const draft = getBookingDraft();
  if (draft?.declinedComplementaryServices) return false;
  return !draftHasPlatformTransportOption();
}
