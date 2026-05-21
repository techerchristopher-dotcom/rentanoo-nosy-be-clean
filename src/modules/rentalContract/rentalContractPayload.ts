import { supabase } from "@/integrations/supabase/client";
import { RENTAL_CONTRACT_SINISTER_DECLARATION_HOURS } from "./constants";

export interface RentalContractPayload {
  bookingId: string;
  referenceNumber: number | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  pickupLocation: string | null;
  totalPrice: number;
  basePrice: number;
  optionsTotal: number;
  serviceFee: number;
  subtotal: number;
  pricePerDay: number;
  rentalDays: number | null;
  /** Montant caution figé sur la réservation (snapshot), si présent */
  depositAmountSnapshot: number | null;
  currencyCode: string;
  sinisterDeclarationHours: number;
  vehicle: {
    brand: string;
    model: string;
    year: number;
    licensePlate: string | null;
    color: string | null;
    fuelType: string | null;
    /** N° cadre si renseigné en base ; sinon null → affichage « Non renseigné » dans le PDF V7 */
    vin: string | null;
    /** Kilométrage véhicule en base (approximation « au départ » avant EDL détaillé) */
    mileage: number | null;
    /** Caution plafond véhicule (€) */
    depositAmount: number | null;
  };
  renter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthdate: string | null;
    addressLine1: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    driverLicenseNumber: string | null;
    driverLicenseIssueDate: string | null;
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

/**
 * Assemble les données nécessaires au contrat de location (jointure booking → véhicule → profils).
 * - `renter` = réservation (`bookings.user_id`) — locataire.
 * - `owner` = `vehicles.owner_id` — propriétaire du véhicule en location P2P (signataire côté plateforme).
 * Accès : uniquement si l’utilisateur connecté est l’un ou l’autre.
 */
export async function getRentalContractPayload(
  bookingId: string
): Promise<{ data: RentalContractPayload | null; error: string | null }> {
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return { data: null, error: "Authentification requise." };
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, user_id, vehicle_id, reference_number, start_date, end_date, start_time, end_time, pickup_location, total_price, base_price, options_total, service_fee, subtotal, price_per_day, rental_days, deposit_amount_snapshot"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { data: null, error: bookingError?.message || "Réservation introuvable." };
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("owner_id, brand, model, year, license_plate, color, fuel_type, mileage, deposit_amount, vin")
      .eq("id", booking.vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      return { data: null, error: vehicleError?.message || "Véhicule introuvable." };
    }

    const renterId = booking.user_id;
    const ownerId = vehicle.owner_id;

    if (authUser.id !== renterId && authUser.id !== ownerId) {
      return { data: null, error: "Accès non autorisé à cette réservation." };
    }

    const { data: renterProfile, error: renterErr } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, phone, birthdate, address_line1, postal_code, city, country, driver_license_number, driver_license_issue_date"
      )
      .eq("id", renterId)
      .single();

    const { data: ownerProfile, error: ownerErr } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone")
      .eq("id", ownerId)
      .single();

    if (renterErr || !renterProfile) {
      return { data: null, error: renterErr?.message || "Profil locataire introuvable." };
    }
    if (ownerErr || !ownerProfile) {
      return { data: null, error: ownerErr?.message || "Profil propriétaire introuvable." };
    }

    const depositSnap =
      booking.deposit_amount_snapshot != null ? Number(booking.deposit_amount_snapshot) : null;
    const vehicleDeposit =
      vehicle.deposit_amount != null ? Number(vehicle.deposit_amount) : null;

    const payload: RentalContractPayload = {
      bookingId: booking.id,
      referenceNumber: booking.reference_number,
      startDate: booking.start_date,
      endDate: booking.end_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      pickupLocation: booking.pickup_location,
      totalPrice: Number(booking.total_price),
      basePrice: Number(booking.base_price),
      optionsTotal: Number(booking.options_total),
      serviceFee: Number(booking.service_fee),
      subtotal: Number(booking.subtotal),
      pricePerDay: Number(booking.price_per_day),
      rentalDays: booking.rental_days,
      depositAmountSnapshot: Number.isFinite(depositSnap as number) ? depositSnap : null,
      currencyCode: "EUR",
      sinisterDeclarationHours: RENTAL_CONTRACT_SINISTER_DECLARATION_HOURS,
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.license_plate,
        color: vehicle.color,
        fuelType: vehicle.fuel_type,
        vin: vehicle.vin ?? null,
        mileage: vehicle.mileage != null ? Number(vehicle.mileage) : null,
        depositAmount: Number.isFinite(vehicleDeposit as number) ? vehicleDeposit : null,
      },
      renter: {
        id: renterProfile.id,
        firstName: renterProfile.first_name || "",
        lastName: renterProfile.last_name || "",
        email: renterProfile.email || "",
        phone: renterProfile.phone || "",
        birthdate: renterProfile.birthdate ?? null,
        addressLine1: renterProfile.address_line1 ?? null,
        postalCode: renterProfile.postal_code ?? null,
        city: renterProfile.city ?? null,
        country: renterProfile.country ?? null,
        driverLicenseNumber: renterProfile.driver_license_number ?? null,
        driverLicenseIssueDate: renterProfile.driver_license_issue_date ?? null,
      },
      owner: {
        id: ownerProfile.id,
        firstName: ownerProfile.first_name || "",
        lastName: ownerProfile.last_name || "",
        email: ownerProfile.email || "",
        phone: ownerProfile.phone || "",
      },
    };

    return { data: payload, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inattendue.";
    return { data: null, error: msg };
  }
}
