import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetWhatsAppContact,
  adminRemoveWhatsAppPhoto,
  adminUpdateWhatsAppPhone,
  adminUploadWhatsAppPhoto,
  type WhatsAppContactAdmin,
} from "@/services/adminApi";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import { cn } from "@/lib/utils";

export default function AdminWhatsAppSettings() {
  const { toast } = useToast();
  const { refresh: refreshPublicContact } = useWhatsAppContact();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  const applySettings = (data: WhatsAppContactAdmin) => {
    setPhone(data.phoneDisplay);
    setProfilePhotoUrl(data.profilePhotoUrl);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetWhatsAppContact();
        if (!cancelled) applySettings(data);
      } catch (e: unknown) {
        if (!cancelled) {
          toast({
            title: "Chargement impossible",
            description: e instanceof Error ? e.message : "Erreur",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const runSavePhone = async () => {
    setSavingPhone(true);
    try {
      const data = await adminUpdateWhatsAppPhone(phone);
      applySettings(data);
      await refreshPublicContact();
      toast({ title: "Numéro WhatsApp enregistré" });
    } catch (e: unknown) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setSavingPhone(false);
    }
  };

  const runUploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const data = await adminUploadWhatsAppPhoto(file);
      applySettings(data);
      await refreshPublicContact();
      toast({ title: "Photo de profil enregistrée" });
    } catch (e: unknown) {
      toast({
        title: "Upload impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runRemovePhoto = async () => {
    setRemovingPhoto(true);
    try {
      const data = await adminRemoveWhatsAppPhoto();
      applySettings(data);
      await refreshPublicContact();
      toast({ title: "Photo supprimée", description: "L’icône WhatsApp par défaut est rétablie." });
    } catch (e: unknown) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setRemovingPhoto(false);
    }
  };

  const busy = loading || savingPhone || uploadingPhoto || removingPhoto;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Numéro WhatsApp Business et photo affichée sur le bouton flottant mobile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Numéro WhatsApp</CardTitle>
          <CardDescription>
            Utilisé dans le bandeau desktop et le bouton flottant mobile. Format international recommandé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">Numéro</Label>
            <Input
              id="whatsapp-phone"
              type="tel"
              placeholder="+33 6 33 70 75 69"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
            />
          </div>
          <Button type="button" onClick={() => void runSavePhone()} disabled={busy}>
            {savingPhone ? "Enregistrement…" : "Enregistrer le numéro"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo de profil (bouton mobile)</CardTitle>
          <CardDescription>
            Remplace l’icône WhatsApp sur le bouton flottant. Sans photo, l’icône verte par défaut s’affiche.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md ring-1 ring-black/5",
                profilePhotoUrl ? "bg-muted" : "bg-[#25D366] text-white"
              )}
            >
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <WhatsAppIcon className="h-8 w-8" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void runUploadPhoto(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                {uploadingPhoto ? "Envoi…" : profilePhotoUrl ? "Changer la photo" : "Ajouter une photo"}
              </Button>
              {profilePhotoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void runRemovePhoto()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {removingPhoto ? "Suppression…" : "Supprimer"}
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — max 2 Mo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
