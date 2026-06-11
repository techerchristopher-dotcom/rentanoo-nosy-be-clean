import { createRentalCalculation } from "@/lib/utils";
import type { RentalCalculation } from "@/types";

const STORAGE_KEY = "lagon_booking_resume_intent";
const TTL_MS = 30 * 60 * 1000;

export interface BookingResumeIntent {
  path: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pickupLocation?: string;
  savedAt: string;
}

export type VehicleNavState = {
  rentalCalculation?: RentalCalculation;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  pickupLocation?: string;
} | null;

export function saveBookingResumeIntent(params: {
  path: string;
  navState: VehicleNavState | undefined;
}): void {
  try {
    const payload: BookingResumeIntent = {
      path: params.path,
      savedAt: new Date().toISOString(),
    };

    const nav = params.navState;
    if (nav?.rentalCalculation) {
      payload.startDate = nav.rentalCalculation.startDate.toISOString();
      payload.endDate = nav.rentalCalculation.endDate.toISOString();
      payload.startTime = nav.rentalCalculation.startTime;
      payload.endTime = nav.rentalCalculation.endTime;
      payload.pickupLocation = nav.pickupLocation;
    } else if (nav?.startDate && nav?.endDate) {
      payload.startDate = nav.startDate;
      payload.endDate = nav.endDate;
      payload.startTime = nav.startTime;
      payload.endTime = nav.endTime;
      payload.pickupLocation = nav.pickupLocation;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // best effort
  }
}

export function loadBookingResumeIntent(): BookingResumeIntent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const intent = JSON.parse(raw) as BookingResumeIntent;
    if (!intent.path || !intent.savedAt) return null;

    const age = Date.now() - new Date(intent.savedAt).getTime();
    if (age > TTL_MS) {
      clearBookingResumeIntent();
      return null;
    }

    return intent;
  } catch {
    return null;
  }
}

export function clearBookingResumeIntent(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // best effort
  }
}

export function intentMatchesPath(
  intent: BookingResumeIntent,
  currentPath: string
): boolean {
  return intent.path === currentPath;
}

export function buildNavStateFromIntent(
  intent: BookingResumeIntent
): VehicleNavState | null {
  if (!intent.startDate || !intent.endDate) return null;

  const startTime = intent.startTime || "06:30";
  const endTime = intent.endTime || "06:00";
  const startDate = new Date(intent.startDate);
  const endDate = new Date(intent.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const rentalCalculation = createRentalCalculation(
    startDate,
    startTime,
    endDate,
    endTime
  );

  if (!rentalCalculation.isCalculated) return null;

  return {
    rentalCalculation,
    startDate: intent.startDate,
    endDate: intent.endDate,
    startTime,
    endTime,
    pickupLocation: intent.pickupLocation,
  };
}
