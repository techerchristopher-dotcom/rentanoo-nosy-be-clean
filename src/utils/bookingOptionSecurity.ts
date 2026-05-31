import {
  LEGACY_AIRPORT_OPTION_ID_MAP,
  PLATFORM_TRANSPORT_OPTIONS,
  PLATFORM_AIRPORT_PICKUP_ID,
  PLATFORM_AIRPORT_RETURN_ID,
  PLATFORM_HOTEL_PICKUP_ID,
  PLATFORM_HOTEL_RETURN_ID,
} from "@/constants/platformBookingOptions";
import { calcServiceFeeRenter } from "@/utils/serviceFees";

/** IDs plateforme autorisés à la création d'une réservation web. */
export const ALLOWED_PLATFORM_OPTION_IDS = new Set<string>([
  PLATFORM_AIRPORT_PICKUP_ID,
  PLATFORM_AIRPORT_RETURN_ID,
  PLATFORM_HOTEL_PICKUP_ID,
  PLATFORM_HOTEL_RETURN_ID,
]);

export const MAX_PLATFORM_OPTIONS_TOTAL = PLATFORM_TRANSPORT_OPTIONS.reduce(
  (sum, opt) => sum + opt.totalPrice,
  0
);

export interface RawBookingOptionInput {
  id?: string;
  name: string;
  pricePerDay?: number;
  totalPrice?: number;
}

export interface SanitizedBookingOption {
  id: string;
  name: string;
  pricePerDay: number;
  totalPrice: number;
}

export interface SanitizedBookingPricing {
  selectedOptions: SanitizedBookingOption[];
  optionsTotal: number;
  subtotal: number;
  serviceFee: number;
  /** Valeur persistée dans bookings.total_price (= sous-total HT options). */
  totalPrice: number;
}

const PLATFORM_OPTION_BY_ID = new Map(
  PLATFORM_TRANSPORT_OPTIONS.map((opt) => [opt.id, opt])
);

function resolveOptionId(rawId: string | undefined): string | undefined {
  if (!rawId) return undefined;
  return LEGACY_AIRPORT_OPTION_ID_MAP[rawId] ?? rawId;
}

function isAllowedPlatformOptionId(resolvedId: string): boolean {
  return ALLOWED_PLATFORM_OPTION_IDS.has(resolvedId);
}

function isUnknownPlatformOptionId(resolvedId: string): boolean {
  return resolvedId.startsWith("platform-") && !isAllowedPlatformOptionId(resolvedId);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildPlatformOption(resolvedId: string): SanitizedBookingOption | null {
  const def = PLATFORM_OPTION_BY_ID.get(resolvedId);
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    pricePerDay: 0,
    totalPrice: def.totalPrice,
  };
}

function buildNonPlatformOption(
  raw: RawBookingOptionInput,
  resolvedId: string | undefined
): SanitizedBookingOption | null {
  const name = raw.name?.trim();
  if (!name) return null;

  const totalPrice = roundMoney(Math.max(0, Number(raw.totalPrice ?? 0) || 0));
  const pricePerDay = roundMoney(Math.max(0, Number(raw.pricePerDay ?? 0) || 0));

  return {
    id: resolvedId ?? name,
    name,
    pricePerDay,
    totalPrice,
  };
}

/**
 * Recalcule et sécurise les options avant insertion en base.
 * - Options plateforme : prix et libellés depuis les constantes (ignore le frontend).
 * - Options non plateforme : conservées (compatibilité barge, siège bébé, etc.).
 * - Doublons supprimés (par id plateforme ou id/name non plateforme).
 */
export function sanitizeAndRecalculateBookingOptions(
  rawOptions: RawBookingOptionInput[] | undefined,
  basePrice: number
): SanitizedBookingPricing {
  const safeBasePrice = roundMoney(Math.max(0, Number(basePrice) || 0));
  const sanitized: SanitizedBookingOption[] = [];
  const seenPlatformIds = new Set<string>();
  const seenNonPlatformKeys = new Set<string>();

  for (const raw of rawOptions ?? []) {
    const resolvedId = resolveOptionId(raw.id);

    if (resolvedId && isUnknownPlatformOptionId(resolvedId)) {
      if (import.meta.env.DEV) {
        console.warn("[bookingOptionSecurity] Option plateforme inconnue ignorée:", resolvedId);
      }
      continue;
    }

    if (resolvedId && isAllowedPlatformOptionId(resolvedId)) {
      if (seenPlatformIds.has(resolvedId)) continue;
      seenPlatformIds.add(resolvedId);

      const platformOption = buildPlatformOption(resolvedId);
      if (platformOption) sanitized.push(platformOption);
      continue;
    }

    const nonPlatformKey = resolvedId ?? raw.name?.trim();
    if (!nonPlatformKey || seenNonPlatformKeys.has(nonPlatformKey)) continue;
    seenNonPlatformKeys.add(nonPlatformKey);

    const nonPlatformOption = buildNonPlatformOption(raw, resolvedId);
    if (nonPlatformOption) sanitized.push(nonPlatformOption);
  }

  const platformOptionsTotal = sanitized
    .filter((opt) => ALLOWED_PLATFORM_OPTION_IDS.has(opt.id))
    .reduce((sum, opt) => sum + opt.totalPrice, 0);

  if (platformOptionsTotal > MAX_PLATFORM_OPTIONS_TOTAL) {
    if (import.meta.env.DEV) {
      console.warn(
        "[bookingOptionSecurity] Total options plateforme anormal:",
        platformOptionsTotal,
        "max:",
        MAX_PLATFORM_OPTIONS_TOTAL
      );
    }
  }

  const optionsTotal = roundMoney(
    sanitized.reduce((sum, opt) => sum + opt.totalPrice, 0)
  );
  const subtotal = roundMoney(safeBasePrice + optionsTotal);
  const serviceFee = calcServiceFeeRenter(subtotal);

  return {
    selectedOptions: sanitized,
    optionsTotal,
    subtotal,
    serviceFee,
    totalPrice: subtotal,
  };
}
