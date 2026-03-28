import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  adminCreateBooking,
  adminCreateWalkInClient,
  adminSearchClients,
  adminUpdateRenterPhone,
  type AdminClientRow,
} from "@/services/adminApi";
import { SupabaseVehiclesService, type Vehicle } from "@/services/supabaseVehiclesService";
import { computeBaseRentalPrice } from "@/utils/rentalPriceFromDates";

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
  const navigate = useNavigate();

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

  const [submitLoading, setSubmitLoading] = useState(false);
  const [renterPhoneDraft, setRenterPhoneDraft] = useState("");
  const [phoneSaveLoading, setPhoneSaveLoading] = useState(false);

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
    setRenterPhoneDraft(selectedClient?.phone?.trim() ?? "");
  }, [selectedClient?.id, selectedClient?.phone]);

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId) ?? null, [vehicles, vehicleId]);

  const pricePreview = useMemo(() => {
    if (!selectedVehicle) return null;
    const ppd = agencyPricePerDayFromVehicle(selectedVehicle);
    if (ppd == null) return null;
    const start = combineYmdTime(startDate, startTime);
    const end = combineYmdTime(endDate, endTime);
    if (!start || !end || end.getTime() <= start.getTime()) return null;
    const { basePrice, rentalDays } = computeBaseRentalPrice(ppd, start, end);
    const subtotal = basePrice;
    const total = subtotal;
    return { basePrice, rentalDays, subtotal, total, agencyPpd: ppd };
  }, [selectedVehicle, startDate, endDate, startTime, endTime]);

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
                    {v.brand} {v.model} — agence {ap != null ? `${ap}€/j` : "(tarif agence requis)"}
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
          {pricePreview ? (
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div>
                Tarif agence retenu : <strong>{pricePreview.agencyPpd.toFixed(2)} €</strong> / jour
              </div>
              <div>
                Location (base) : <strong>{pricePreview.basePrice.toFixed(2)} €</strong> ({pricePreview.rentalDays}{" "}
                j. facturés)
              </div>
              <div>
                Frais service locataire (agence) : <strong>0,00 €</strong>
              </div>
              <div>
                Total locataire : <strong>{pricePreview.total.toFixed(2)} €</strong> (= sous-total)
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
