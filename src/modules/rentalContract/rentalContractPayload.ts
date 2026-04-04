import { supabase } from "@/integrations/supabase/client";

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
  vehicle: {
    brand: string;
    model: string;
    year: number;
    licensePlate: string | null;
    color: string | null;
    fuelType: string | null;
  };
  renter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
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
 * - `owner` = `vehicles.owner_id` — propriétaire du véhicule en location P2P (pas la plateforme).
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
        "id, user_id, vehicle_id, reference_number, start_date, end_date, start_time, end_time, pickup_location, total_price, base_price, options_total, service_fee, subtotal, price_per_day, rental_days"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { data: null, error: bookingError?.message || "Réservation introuvable." };
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("owner_id, brand, model, year, license_plate, color, fuel_type")
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
      .select("id, first_name, last_name, email, phone")
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
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.license_plate,
        color: vehicle.color,
        fuelType: vehicle.fuel_type,
      },
      renter: {
        id: renterProfile.id,
        firstName: renterProfile.first_name || "",
        lastName: renterProfile.last_name || "",
        email: renterProfile.email || "",
        phone: renterProfile.phone || "",
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
