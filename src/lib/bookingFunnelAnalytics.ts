import { ANALYTICS_BOOKING_CURRENCY, trackGa4Event } from "@/lib/analytics";
import { trackMetaViewContent, trackMetaInitiateCheckout } from "@/lib/metaPixel";

export type BookingBlockedReason =
  | "auth_required"
  | "missing_dates"
  | "missing_vehicle";

const sentViewItems = new Set<string>();

export function trackViewItem(params: {
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemVariant?: string;
  price: number;
  hasDates: boolean;
  rentalDays?: number;
}): void {
  if (sentViewItems.has(params.itemId)) return;
  sentViewItems.add(params.itemId);

  try {
    const dedupKey = `ga4_view_item_${params.itemId}`;
    if (sessionStorage.getItem(dedupKey)) return;
    sessionStorage.setItem(dedupKey, "1");
  } catch {
    // best effort
  }

  trackGa4Event("view_item", {
    item_id: params.itemId,
    item_name: params.itemName,
    item_category: params.itemCategory,
    item_variant: params.itemVariant ?? "",
    price: params.price,
    currency: ANALYTICS_BOOKING_CURRENCY,
    has_dates: params.hasDates,
    rental_days: params.rentalDays ?? 0,
  });

  trackMetaViewContent({
    contentId: params.itemId,
    contentName: params.itemName,
    value: params.price,
    currency: "EUR",
  });
}

export function trackBeginCheckout(params: {
  itemId: string;
  itemName: string;
  value: number;
  rentalDays: number;
  source: "vehicle_detail" | "moto_detail";
}): void {
  trackGa4Event("begin_checkout", {
    item_id: params.itemId,
    item_name: params.itemName,
    value: params.value,
    currency: ANALYTICS_BOOKING_CURRENCY,
    rental_days: params.rentalDays,
    source: params.source,
  });

  trackMetaInitiateCheckout({
    dedupId: `${params.itemId}_${params.rentalDays}`,
    value: params.value,
    currency: "EUR",
  });
}

export function trackBookingBlocked(params: {
  reason: BookingBlockedReason;
  itemId?: string;
  itemVariant?: string;
}): void {
  trackGa4Event("booking_blocked", {
    reason: params.reason,
    item_id: params.itemId ?? "",
    item_variant: params.itemVariant ?? "",
  });
}
