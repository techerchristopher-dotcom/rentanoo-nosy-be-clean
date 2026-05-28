import { supabase } from "@/integrations/supabase/client";

const SCOOTER_DOCS_BUCKET = "scooter-docs";
const REPAIR_PHOTOS_BUCKET = "repair-photos";

function buildPath(prefix: string, ext: string) {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
}

export async function uploadScooterDoc(vehicleId: string, docType: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `vehicle_${vehicleId}/${docType}/${buildPath(docType, ext)}`;

  const { error } = await supabase.storage.from(SCOOTER_DOCS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(SCOOTER_DOCS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadRepairPhoto(repairId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `repair_${repairId}/${buildPath("photo", ext)}`;

  const { error } = await supabase.storage.from(REPAIR_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(REPAIR_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadVehiclePhoto(vehicleId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${vehicleId}/${buildPath("photo", ext)}`;

  const { error } = await supabase.storage.from("vehicle-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from("vehicle-photos").getPublicUrl(path);

  await supabase.from("vehicle_photos").insert({
    vehicle_id: vehicleId,
    photo_url: urlData.publicUrl,
    storage_path: path,
    is_primary: false,
  });

  return urlData.publicUrl;
}
