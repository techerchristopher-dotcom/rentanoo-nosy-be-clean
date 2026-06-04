import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  adminCreateBooking,
  adminCreateWalkInClient,
  adminSearchClients,
  adminUpdateRenterPhone,
  type AdminClientRow,
} from "@/services/adminApi";
import {
  adminDraftConvert,
  adminDraftCreate,
  adminDraftGet,
  adminDraftUpdate,
} from "@/services/adminDraftsApi";
import { SupabaseVehiclesService, type Vehicle } from "@/services/supabaseVehiclesService";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { computeBaseRentalPrice } from "@/utils/rentalPriceFromDates";
import {
  buildPlatformOptionPayload,
  PLATFORM_AIRPORT_PICKUP_ID,
  PLATFORM_AIRPORT_RETURN_ID,
  PLATFORM_HOTEL_PICKUP_ID,
  PLATFORM_HOTEL_RETURN_ID,
  PLATFORM_TRANSPORT_OPTIONS,
  type PlatformBookingOptionPayload,
} from "@/constants/platformBookingOptions";
import { requiresHotelName } from "@/utils/bookingLocations";
import { Checkbox } from "@/components/ui/checkbox";

function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [ys, ms, ds] = s.split("-").map((x) => Number(x));
  if (!ys || !ms || !ds) return false;
  const dt = new Date(Date.UTC(ys, ms - 1, ds));
  return dt.getUTCFullYear() === ys && dt.getUTCMonth() === ms - 1 && dt.getUTCDate() === ds;
}

function agencyPricePerDayFromVehicle(v: Vehicle): number | null {
  const raw = v.price_per_day_agency;
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function combineYmdTime(ymd: string, hm: string): Date | null {
  if (!ymd || ymd.length < 8) return null;
  const day = ymd.split("T")[0];
  const [ys, ms, ds] = day.split("-").map((x) => Number(x));
  if (!ys || !ms || !ds) return null;
  const t = (hm || "10:00").trim();
  const [hs, mins] = t.split(":");
  const hh = Number(hs);
  const mm = Number(mins);
  return new Date(ys, ms - 1, ds, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
}

function defaultDateYmd(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminBookingNew() {
  const { toast } = useToast();
  const { formatAdminInline } = useExchangeRate();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftIdFromUrl = searchParams.get("draftId")?.trim() || "";
  const vehicleIdFromUrl = searchParams.get("vehicleId")?.trim() || "";
  const startFromUrl = searchParams.get("start")?.trim() || "";
  const endFromUrl = searchParams.get("end")?.trim() || "";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");

  const [searchQ, setSearchQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AdminClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<AdminClientRow | null>(null);

  const [wiEmail, setWiEmail] = useState("");
  const [wiFirst, setWiFirst] = useState("");
  const [wiLast, setWiLast] = useState("");
  const [wiPhone, setWiPhone] = useState("");
  const [wiPassword, setWiPassword] = useState("");
  const [wiLoading, setWiLoading] = useState(false);

  const [startDate, setStartDate] = useState(() => defaultDateYmd(0));
  const [endDate, setEndDate] = useState(() => defaultDateYmd(2));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:00");
  const [pickupLocation, setPickupLocation] = useState("Agence");
  const [adminNotes, setAdminNotes] = useState("");
  const [offlinePaymentMethod, setOfflinePaymentMethod] = useState<"cash" | "card_terminal" | "">("");

  const [airportPickup, setAirportPickup] = useState(false);
  const [airportReturn, setAirportReturn] = useState(false);
  const [hotelPickup, setHotelPickup] = useState(false);
  const [hotelReturn, setHotelReturn] = useState(false);
  const [hotelName, setHotelName] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [renterPhoneDraft, setRenterPhoneDraft] = useState("");
  const [phoneSaveLoading, setPhoneSaveLoading] = useState(false);
  const [draftId, setDraftId] = useState<string>("");
  const [draftSaveLoading, setDraftSaveLoading] = useState(false);
  const [draftConvertLoading, setDraftConvertLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await SupabaseVehiclesService.getAvailableVehicles();
      if (!cancelled) setVehicles(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Prefill from planning only when not resuming a draft.
    if (draftIdFromUrl) return;
    if (!vehicleIdFromUrl && !startFromUrl && !endFromUrl) return;
    if (vehicles.length === 0) return;

    if (vehicleIdFromUrl) {
      const exists = vehicles.some((v) => v.id === vehicleIdFromUrl);
      if (exists) setVehicleId(vehicleIdFromUrl);
    }

    const startOk = startFromUrl && isValidYmd(startFromUrl) ? startFromUrl : "";
    const endOk = endFromUrl && isValidYmd(endFromUrl) ? endFromUrl : "";

    if (startOk) setStartDate(startOk);
    if (endOk) setEndDate(endOk);
    if (startOk && !endOk) setEndDate(startOk);

    // Same calendar day is valid (bookings_check: end_date >= start_date); intraday range uses start_time/end_time.

    // If same-day prefill, ensure end time is after start time for V1 validation.
    if (startOk && endTime === startTime) {
      setEndTime("18:00");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftIdFromUrl, vehicleIdFromUrl, startFromUrl, endFromUrl, vehicles.length]);

  useEffect(() => {
    setDraftId(draftIdFromUrl);
  }, [draftIdFromUrl]);

  useEffect(() => {
    if (!draftIdFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await adminDraftGet(draftIdFromUrl);
        if (cancelled) return;

        setVehicleId(d.vehicle_id ?? "");
        setStartDate(d.start_date ?? defaultDateYmd(0));
        setEndDate(d.end_date ?? defaultDateYmd(2));
        setStartTime(d.start_time ?? "10:00");
        setEndTime(d.end_time ?? "10:00");
        setPickupLocation(d.pickup_location ?? "Agence");

        const wRaw = d.walk_in_payload;
        const w = wRaw && typeof wRaw === "object" ? (wRaw as Record<string, unknown>) : {};
        const wEmail = typeof w.email === "string" ? w.email : "";
        const wFirst = typeof w.firstName === "string" ? w.firstName : "";
        const wLast = typeof w.lastName === "string" ? w.lastName : "";
        const wPhone = typeof w.phone === "string" ? w.phone : "";

        if (d.renter_user_id) {
          setSelectedClient({
            id: d.renter_user_id,
            email: wEmail || null,
            first_name: wFirst || null,
            last_name: wLast || null,
            phone: wPhone || null,
            role: "renter",
          });
        } else if (wEmail || wFirst || wLast || wPhone) {
          setWiEmail(wEmail);
          setWiFirst(wFirst);
          setWiLast(wLast);
          setWiPhone(wPhone);
        }

        toast({ title: "Brouillon chargé", description: `Brouillon ${d.id.slice(0, 8)}…` });

        const ps =
          d.pricing_snapshot && typeof d.pricing_snapshot === "object"
            ? (d.pricing_snapshot as Record<string, unknown>)
            : null;
        const snapOptions = ps?.selectedOptions;
        if (Array.isArray(snapOptions)) {
          setAirportPickup(
            snapOptions.some(
              (o) =>
                o &&
                typeof o === "object" &&
                (o as { id?: string }).id === PLATFORM_AIRPORT_PICKUP_ID
            )
          );
          setAirportReturn(
            snapOptions.some(
              (o) =>
                o &&
                typeof o === "object" &&
                (o as { id?: string }).id === PLATFORM_AIRPORT_RETURN_ID
            )
          );
          setHotelPickup(
            snapOptions.some(
              (o) =>
                o &&
                typeof o === "object" &&
                (o as { id?: string }).id === PLATFORM_HOTEL_PICKUP_ID
            )
          );
          setHotelReturn(
            snapOptions.some(
              (o) =>
                o &&
                typeof o === "object" &&
                (o as { id?: string }).id === PLATFORM_HOTEL_RETURN_ID
            )
          );
        }
        const snapHotel =
          ps && typeof ps.hotelName === "string" ? ps.hotelName : "";
        if (snapHotel) setHotelName(snapHotel);
      } catch (e: unknown) {
        toast({
          title: "Chargement du brouillon impossible",
          description: e instanceof Error ? e.message : "Erreur",
          variant: "destructive",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftIdFromUrl]);

  useEffect(() => {
    setRenterPhoneDraft(selectedClient?.phone?.trim() ?? "");
  }, [selectedClient?.id, selectedClient?.phone]);

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId) ?? null, [vehicles, vehicleId]);

  const selectedOptions = useMemo((): PlatformBookingOptionPayload[] => {
    const ids: string[] = [];
    if (airportPickup) ids.push(PLATFORM_AIRPORT_PICKUP_ID);
    if (airportReturn) ids.push(PLATFORM_AIRPORT_RETURN_ID);
    if (hotelPickup) ids.push(PLATFORM_HOTEL_PICKUP_ID);
    if (hotelReturn) ids.push(PLATFORM_HOTEL_RETURN_ID);
    return buildPlatformOptionPayload(ids);
  }, [airportPickup, airportReturn, hotelPickup, hotelReturn]);

  const showHotelField = hotelPickup || hotelReturn;

  const pricePreview = useMemo(() => {
    if (!selectedVehicle) return null;
    const ppd = agencyPricePerDayFromVehicle(selectedVehicle);
    if (ppd == null) return null;
    const start = combineYmdTime(startDate, startTime);
    const end = combineYmdTime(endDate, endTime);
    if (!start || !end || end.getTime() <= start.getTime()) return null;
    const { basePrice, rentalDays } = computeBaseRentalPrice(ppd, start, end);
    const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.totalPrice, 0);
    const subtotal = basePrice + optionsTotal;
    const total = subtotal;
    return { basePrice, rentalDays, optionsTotal, selectedOptions, subtotal, total, agencyPpd: ppd };
  }, [selectedVehicle, startDate, endDate, startTime, endTime, selectedOptions]);

  const runSearch = async () => {
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const rows = await adminSearchClients(searchQ.trim(), 20);
      setSearchResults(rows);
      if (rows.length === 0) {
        toast({ title: "Aucun résultat", description: "Essayez un autre email, téléphone ou nom." });
      }
    } catch (e: unknown) {
      toast({
        title: "Recherche impossible",
        description: e instanceof Error ? e.message : "Erreur réseau ou API.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const runWalkIn = async () => {
    setWiLoading(true);
    try {
      const client = await adminCreateWalkInClient({
        email: wiEmail.trim(),
        firstName: wiFirst.trim(),
        lastName: wiLast.trim(),
        phone: wiPhone.trim(),
        password: wiPassword,
      });
      setSelectedClient(client);
      setWiPassword("");
      toast({
        title: "Client créé",
        description: `${client.first_name ?? ""} ${client.last_name ?? ""} — pensez à transmettre le mot de passe au client.`,
      });
    } catch (e: unknown) {
      toast({
        title: "Création impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setWiLoading(false);
    }
  };

  const runCreateBooking = async () => {
    if (!selectedClient?.id) {
      toast({ title: "Client requis", description: "Recherchez ou créez un locataire.", variant: "destructive" });
      return;
    }
    if (!vehicleId) {
      toast({ title: "Véhicule requis", variant: "destructive" });
      return;
    }
    const start = combineYmdTime(startDate, startTime);
    const end = combineYmdTime(endDate, endTime);
    if (!start || !end || end.getTime() <= start.getTime()) {
      toast({ title: "Dates invalides", description: "Vérifiez début / fin.", variant: "destructive" });
      return;
    }
    if (requiresHotelName(selectedOptions.map((o) => o.id)) && !hotelName.trim()) {
      toast({
        title: "Nom d'hôtel requis",
        description: "Indiquez le nom de l'hôtel pour les options hôtel.",
        variant: "destructive",
      });
      return;
    }

    setSubmitLoading(true);
    try {
      const booking = await adminCreateBooking({
        renterUserId: selectedClient.id,
        vehicleId,
        startDate,
        endDate,
        startTime,
        endTime,
        pickupLocation: pickupLocation.trim() || "Agence",
        hotelName: showHotelField ? hotelName.trim() : undefined,
        adminNotes: adminNotes.trim() || undefined,
        offlinePaymentMethod: offlinePaymentMethod || null,
        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
      });
      toast({ title: "Réservation créée", description: `Réf. ${booking.id.slice(0, 8)}…` });
      navigate(`/admin/bookings/${booking.id}`);
    } catch (e: unknown) {
      toast({
        title: "Création impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const runSaveRenterPhone = async () => {
    if (!selectedClient?.id) return;
    const trimmed = renterPhoneDraft.trim();
    if (!trimmed) {
      toast({ title: "Téléphone requis", description: "Saisissez un numéro pour ce locataire.", variant: "destructive" });
      return;
    }
    setPhoneSaveLoading(true);
    try {
      const client = await adminUpdateRenterPhone(selectedClient.id, trimmed);
      setSelectedClient(client);
      toast({ title: "Téléphone enregistré", description: "Le profil locataire a été mis à jour." });
    } catch (e: unknown) {
      toast({
        title: "Enregistrement impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setPhoneSaveLoading(false);
    }
  };

  const buildDraftPayload = () => {
    const clientSnapshot =
      selectedClient
        ? {
            email: selectedClient.email ?? "",
            firstName: selectedClient.first_name ?? "",
            lastName: selectedClient.last_name ?? "",
            phone: renterPhoneDraft.trim() || selectedClient.phone || "",
          }
        : {
            email: wiEmail.trim(),
            firstName: wiFirst.trim(),
            lastName: wiLast.trim(),
            phone: wiPhone.trim(),
          };

    const pricingSnapshot = pricePreview
      ? {
          vehicleId: selectedVehicle?.id ?? null,
          agencyPpd: pricePreview.agencyPpd,
          basePrice: pricePreview.basePrice,
          rentalDays: pricePreview.rentalDays,
          optionsTotal: pricePreview.optionsTotal,
          selectedOptions: pricePreview.selectedOptions,
          subtotal: pricePreview.subtotal,
          total: pricePreview.total,
          hotelName: showHotelField ? hotelName.trim() : null,
        }
      : null;

    return {
      status: "draft",
      progressStep: "booking",
      renterUserId: selectedClient?.id ?? null,
      walkInPayload: clientSnapshot,
      vehicleId: vehicleId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      startTime: startTime || null,
      endTime: endTime || null,
      pickupLocation: pickupLocation.trim() || "Agence",
      notesAdmin: null,
      pricingSnapshot,
    };
  };

  const saveDraftOrThrow = async (): Promise<string> => {
    const payload = buildDraftPayload();
    const d = draftId ? await adminDraftUpdate(draftId, payload) : await adminDraftCreate(payload);

    if (!draftId) {
      setDraftId(d.id);
      navigate(`/admin/bookings/new?draftId=${encodeURIComponent(d.id)}`, { replace: true });
    }

    return d.id;
  };

  const runSaveDraft = async () => {
    setDraftSaveLoading(true);
    try {
      const id = await saveDraftOrThrow();
      toast({ title: "Brouillon enregistré", description: `Brouillon ${id.slice(0, 8)}…` });
    } catch (e: unknown) {
      toast({
        title: "Enregistrement impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setDraftSaveLoading(false);
    }
  };

  const runConvertDraft = async () => {
    if (!draftId) {
      toast({ title: "Brouillon requis", description: "Enregistrez d’abord le brouillon.", variant: "destructive" });
      return;
    }
    setDraftConvertLoading(true);
    try {
      await saveDraftOrThrow();
      const out = await adminDraftConvert(draftId);
      if (out.createdClientPassword) {
        toast({
          title: "Client créé à la conversion",
          description: `Mot de passe généré (à transmettre) : ${out.createdClientPassword}`,
        });
      } else {
        toast({ title: "Conversion OK", description: `Réservation ${out.bookingId.slice(0, 8)}…` });
      }
      navigate(`/admin/bookings/${out.bookingId}`);
    } catch (e: unknown) {
      toast({
        title: "Conversion impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setDraftConvertLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Nouvelle réservation (agence)</h1>
        <p className="text-muted-foreground text-sm">
          Recherche ou création d’un locataire, puis réservation en son nom. Tarification :{" "}
          <strong>tarif journalier agence</strong> du véhicule (aucun frais service locataire 15 %), total = sous-total.
          Le véhicule doit avoir un tarif agence renseigné dans « Tarifs & conditions ».
        </p>
        <p className="mt-2 text-sm">
          <Link to="/admin" className="text-primary font-medium hover:underline">
            ← Tableau de bord
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Locataire</CardTitle>
          <CardDescription>Recherche parmi les comptes au rôle « locataire », ou création walk-in (compte + profil).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedClient ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-4">
              <div>
                <div className="font-medium text-foreground">Sélectionné</div>
                <div className="mt-1">
                  {(selectedClient.first_name || "") + " " + (selectedClient.last_name || "")}
                </div>
                <div className="text-muted-foreground">{selectedClient.email}</div>
              </div>
              <div className="space-y-2 pt-1 border-t border-border">
                <Label htmlFor="admin-renter-phone">Téléphone (obligatoire pour créer la réservation)</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Input
                    id="admin-renter-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+33 6 12 34 56 78"
                    value={renterPhoneDraft}
                    onChange={(e) => setRenterPhoneDraft(e.target.value)}
                    className="sm:max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={phoneSaveLoading || renterPhoneDraft.trim() === (selectedClient.phone?.trim() ?? "")}
                    onClick={runSaveRenterPhone}
                  >
                    {phoneSaveLoading ? "…" : "Enregistrer"}
                  </Button>
                </div>
                {!selectedClient.phone?.trim() ? (
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    Aucun numéro en base : complétez-le avant de créer la réservation.
                  </p>
                ) : null}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedClient(null)}>
                Changer de client
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="admin-search-q">Recherche client</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="admin-search-q"
                    placeholder="Email, téléphone, prénom ou nom"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                  <Button type="button" onClick={runSearch} disabled={searchLoading || searchQ.trim().length < 1}>
                    {searchLoading ? "…" : "Rechercher"}
                  </Button>
                </div>
              </div>
              {searchResults.length > 0 && (
                <ul className="space-y-2 border border-border rounded-lg p-3 max-h-56 overflow-y-auto">
                  {searchResults.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <span className="font-medium">
                          {(c.first_name || "") + " " + (c.last_name || "")}
                        </span>
                        <span className="text-muted-foreground ml-2">{c.email}</span>
                        {c.phone ? <span className="text-muted-foreground ml-2">{c.phone}</span> : null}
                      </div>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedClient(c)}>
                        Choisir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-border pt-6 space-y-3">
                <div className="font-medium text-sm">Nouveau client (walk-in)</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="wi-email">Email</Label>
                    <Input id="wi-email" type="email" autoComplete="off" value={wiEmail} onChange={(e) => setWiEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wi-phone">Téléphone</Label>
                    <Input id="wi-phone" value={wiPhone} onChange={(e) => setWiPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wi-first">Prénom</Label>
                    <Input id="wi-first" value={wiFirst} onChange={(e) => setWiFirst(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wi-last">Nom</Label>
                    <Input id="wi-last" value={wiLast} onChange={(e) => setWiLast(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="wi-pass">Mot de passe (compte locataire, min. 8 car.)</Label>
                    <Input
                      id="wi-pass"
                      type="password"
                      autoComplete="new-password"
                      value={wiPassword}
                      onChange={(e) => setWiPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="button" onClick={runWalkIn} disabled={wiLoading}>
                  {wiLoading ? "Création…" : "Créer le client"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Véhicule & dates</CardTitle>
          <CardDescription>Liste des véhicules marqués disponibles (même source que la recherche publique).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="veh">Véhicule</Label>
            <select
              id="veh"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {vehicles.map((v) => {
                const ap = agencyPricePerDayFromVehicle(v);
                return (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} — agence {ap != null ? `${formatAdminInline(ap)}/j` : "(tarif agence requis)"}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sd">Début</Label>
              <Input id="sd" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="st">Heure début</Label>
              <Input id="st" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed">Fin</Label>
              <Input id="ed" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="et">Heure fin</Label>
              <Input id="et" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pickup">Prise en charge</Label>
            <Input id="pickup" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-notes">Remarque (admin)</Label>
            <Textarea
              id="admin-notes"
              placeholder="Note interne visible uniquement par l'admin…"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="offline-payment">Mode de paiement (hors Stripe)</Label>
            <select
              id="offline-payment"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={offlinePaymentMethod}
              onChange={(e) => setOfflinePaymentMethod(e.target.value as "cash" | "card_terminal" | "")}
            >
              <option value="">— Non précisé —</option>
              <option value="cash">Espèces</option>
              <option value="card_terminal">CB (terminal)</option>
            </select>
          </div>
          <div className="space-y-3 rounded-md border border-border p-4">
            <div className="font-medium text-sm">Services supplémentaires</div>
            <p className="text-xs text-muted-foreground">
              Options plateforme à tarif fixe (identiques à la réservation web).
            </p>
            {PLATFORM_TRANSPORT_OPTIONS.map((opt) => {
              const checked =
                opt.id === PLATFORM_AIRPORT_PICKUP_ID
                  ? airportPickup
                  : opt.id === PLATFORM_AIRPORT_RETURN_ID
                    ? airportReturn
                    : opt.id === PLATFORM_HOTEL_PICKUP_ID
                      ? hotelPickup
                      : hotelReturn;
              const setChecked = (value: boolean) => {
                if (opt.id === PLATFORM_AIRPORT_PICKUP_ID) {
                  setAirportPickup(value);
                  if (value) setHotelPickup(false);
                } else if (opt.id === PLATFORM_AIRPORT_RETURN_ID) {
                  setAirportReturn(value);
                  if (value) setHotelReturn(false);
                } else if (opt.id === PLATFORM_HOTEL_PICKUP_ID) {
                  setHotelPickup(value);
                  if (value) setAirportPickup(false);
                } else {
                  setHotelReturn(value);
                  if (value) setAirportReturn(false);
                }
              };
              return (
                <div key={opt.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`admin-opt-${opt.id}`}
                    checked={checked}
                    onCheckedChange={(v) => setChecked(v === true)}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor={`admin-opt-${opt.id}`} className="cursor-pointer font-normal">
                      {opt.name} — {opt.totalPrice.toFixed(2)} €
                    </Label>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </div>
              );
            })}
            {showHotelField && (
              <div className="space-y-1 pt-1">
                <Label htmlFor="admin-hotel-name">Nom de l'hôtel</Label>
                <Input
                  id="admin-hotel-name"
                  placeholder="Ex. Royal Beach Hotel"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                />
              </div>
            )}
          </div>
          {pricePreview ? (
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div>
                Tarif agence retenu : <strong>{pricePreview.agencyPpd.toFixed(2)} €</strong> / jour
              </div>
              <div>
                Location (base) : <strong>{pricePreview.basePrice.toFixed(2)} €</strong> ({pricePreview.rentalDays}{" "}
                j. facturés)
              </div>
              {pricePreview.selectedOptions.length > 0 ? (
                <>
                  {pricePreview.selectedOptions.map((opt) => (
                    <div key={opt.id} className="text-muted-foreground">
                      + {opt.name} : <strong>{opt.totalPrice.toFixed(2)} €</strong>
                    </div>
                  ))}
                  <div>
                    Total options : <strong>{pricePreview.optionsTotal.toFixed(2)} €</strong>
                  </div>
                </>
              ) : (
                <div>Options : <strong>0,00 €</strong></div>
              )}
              <div>
                Frais service locataire (agence) : <strong>0,00 €</strong>
              </div>
              <div>
                Total réservation : <strong>{pricePreview.total.toFixed(2)} €</strong> (= sous-total)
              </div>
            </div>
          ) : selectedVehicle && agencyPricePerDayFromVehicle(selectedVehicle) == null ? (
            <p className="text-sm text-amber-700 dark:text-amber-500">
              Ce véhicule n’a pas de tarif agence : complétez-le côté propriétaire avant de créer une réservation
              admin.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Saisissez véhicule et plage valide pour voir l’estimation.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" variant="secondary" onClick={runSaveDraft} disabled={draftSaveLoading}>
          {draftSaveLoading ? "Enregistrement…" : "Enregistrer comme brouillon"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={runConvertDraft}
          disabled={draftConvertLoading || !draftId}
        >
          {draftConvertLoading ? "Conversion…" : "Convertir le brouillon"}
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={runCreateBooking}
          disabled={
            submitLoading ||
            !selectedClient ||
            !vehicleId ||
            !selectedVehicle ||
            agencyPricePerDayFromVehicle(selectedVehicle) == null
          }
        >
          {submitLoading ? "Création…" : "Créer la réservation"}
        </Button>
      </div>
    </div>
  );
}
