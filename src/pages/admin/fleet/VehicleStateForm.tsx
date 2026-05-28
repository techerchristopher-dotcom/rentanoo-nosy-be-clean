import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PhotoUploader } from "@/features/back-office/components/PhotoUploader";
import { useCreateVehicleState } from "@/features/back-office/hooks/useVehicleStates";
import { uploadVehiclePhoto } from "@/features/back-office/services/photosService";
import { VEHICLE_STATE_LABELS, type VehicleStateType } from "@/features/back-office/types";

export default function VehicleStateForm() {
  const { id: vehicleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const createState = useCreateVehicleState();

  const [form, setForm] = useState({
    state_type: "inspection" as VehicleStateType,
    mileage: "",
    fuel_level: "",
    general_condition: "",
    damageZone: "",
    damageDesc: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [damages, setDamages] = useState<{ zone: string; severity: string; description: string }[]>([]);

  const addDamage = () => {
    if (!form.damageZone) return;
    setDamages((d) => [
      ...d,
      { zone: form.damageZone, severity: "medium", description: form.damageDesc },
    ]);
    setForm((f) => ({ ...f, damageZone: "", damageDesc: "" }));
  };

  const handlePhotoUpload = async (file: File) => {
    if (!vehicleId) return;
    try {
      const url = await uploadVehiclePhoto(vehicleId, file);
      setPhotos((p) => [...p, url]);
    } catch (err) {
      toast({
        title: "Erreur upload",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;

    try {
      await createState.mutateAsync({
        vehicle_id: vehicleId,
        state_type: form.state_type,
        mileage: form.mileage ? parseInt(form.mileage) : null,
        fuel_level: form.fuel_level ? parseFloat(form.fuel_level) : null,
        general_condition: form.general_condition || null,
        damages,
        photos,
      });
      toast({ title: "État enregistré" });
      navigate(`/admin/fleet/${vehicleId}`);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/admin/fleet/${vehicleId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">Nouvel état scooter</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspection</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>Type d'état</Label>
              <Select value={form.state_type} onValueChange={(v) => setForm((f) => ({ ...f, state_type: v as VehicleStateType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(VEHICLE_STATE_LABELS) as VehicleStateType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {VEHICLE_STATE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Kilométrage</Label>
                <Input type="number" value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} />
              </div>
              <div>
                <Label>Carburant (%)</Label>
                <Input type="number" min={0} max={100} value={form.fuel_level} onChange={(e) => setForm((f) => ({ ...f, fuel_level: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>État général</Label>
              <Textarea value={form.general_condition} onChange={(e) => setForm((f) => ({ ...f, general_condition: e.target.value }))} rows={3} />
            </div>

            <div className="border rounded-md p-3 space-y-3">
              <Label>Dommages</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Zone (ex: rétroviseur gauche)" value={form.damageZone} onChange={(e) => setForm((f) => ({ ...f, damageZone: e.target.value }))} />
                <Input placeholder="Description" value={form.damageDesc} onChange={(e) => setForm((f) => ({ ...f, damageDesc: e.target.value }))} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDamage}>
                Ajouter dommage
              </Button>
              {damages.length > 0 && (
                <ul className="text-sm space-y-1">
                  {damages.map((d, i) => (
                    <li key={i} className="text-muted-foreground">
                      {d.zone}: {d.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Photos</Label>
              <PhotoUploader onUpload={handlePhotoUpload} />
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="h-16 w-16 object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={createState.isPending}>
            Enregistrer
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={`/admin/fleet/${vehicleId}`}>Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
