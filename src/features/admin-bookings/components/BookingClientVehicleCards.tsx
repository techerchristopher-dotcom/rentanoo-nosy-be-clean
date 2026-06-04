import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, User, Bike } from "lucide-react";

type BookingClientVehicleCardsProps = {
  renter: Record<string, unknown> | null;
  vehicle: Record<string, unknown> | null;
  createdByAdmin: boolean;
  adminNotes?: string | null;
};

export function BookingClientVehicleCards({
  renter,
  vehicle,
  createdByAdmin,
  adminNotes,
}: BookingClientVehicleCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Locataire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {renter ? (
            <>
              <div className="font-medium text-base">
                {String(renter.first_name ?? "")} {String(renter.last_name ?? "")}
              </div>
              {renter.email ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{String(renter.email)}</span>
                </div>
              ) : null}
              {renter.phone ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{String(renter.phone)}</span>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">Locataire non renseigné</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bike className="h-4 w-4 text-primary" />
            Véhicule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {vehicle ? (
            <>
              <div className="font-medium text-base">
                {String(vehicle.brand ?? "")} {String(vehicle.model ?? "")}
              </div>
              {vehicle.price_per_day != null ? (
                <div className="text-muted-foreground">{String(vehicle.price_per_day)} € / jour</div>
              ) : null}
              {createdByAdmin ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Créée par l'admin
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">Véhicule non renseigné</p>
          )}
        </CardContent>
      </Card>

      {adminNotes ? (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Remarque admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{adminNotes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
