import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationAreasService } from "@/services/supabase/locationAreas";
import type { LocationArea } from "@/types/locationArea";
import { useToast } from "@/hooks/use-toast";

interface LocationAreaSelectProps {
  value: string;
  onChange: (locationAreaId: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export function LocationAreaSelect({
  value,
  onChange,
  required = false,
  disabled = false,
}: LocationAreaSelectProps) {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const [areas, setAreas] = useState<LocationArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadAreas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await LocationAreasService.listActive();
    if (error) {
      toast({
        title: t("locationArea.errors.loadTitle", "Erreur"),
        description: error,
        variant: "destructive",
      });
    } else {
      setAreas(data);
    }
    setLoading(false);
  }, [t, toast]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setCreating(true);
    const { data, error } = await LocationAreasService.createByName(trimmed);
    setCreating(false);

    if (error || !data) {
      toast({
        title: t("locationArea.errors.createTitle", "Impossible d'ajouter le quartier"),
        description: error || t("locationArea.errors.createUnknown", "Erreur inconnue"),
        variant: "destructive",
      });
      return;
    }

    setAreas((prev) => {
      const exists = prev.some((a) => a.id === data.id);
      if (exists) return prev;
      return [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    });
    onChange(data.id);
    setNewName("");
    setShowCreate(false);
    toast({
      title: t("locationArea.createdTitle", "Quartier ajouté"),
      description: t("locationArea.createdDescription", "{{name}} est maintenant sélectionné.", {
        name: data.name,
      }),
    });
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        {t("locationArea.label", "Quartier")}
        {required ? " *" : null}
      </Label>

      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled || loading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              loading
                ? t("locationArea.loading", "Chargement…")
                : t("locationArea.placeholder", "Sélectionner un quartier")
            }
          />
        </SelectTrigger>
        <SelectContent>
          {areas.map((area) => (
            <SelectItem key={area.id} value={area.id}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!showCreate ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setShowCreate(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          {t("locationArea.addNew", "Ajouter une nouvelle localisation")}
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("locationArea.newNamePlaceholder", "Ex. Ambatoloaka")}
            disabled={creating}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button type="button" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating
              ? t("locationArea.creating", "Ajout…")
              : t("locationArea.create", "Ajouter")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowCreate(false);
              setNewName("");
            }}
            disabled={creating}
          >
            {t("common.cancel", "Annuler")}
          </Button>
        </div>
      )}
    </div>
  );
}
