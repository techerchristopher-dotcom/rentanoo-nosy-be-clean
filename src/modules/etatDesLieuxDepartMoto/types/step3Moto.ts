// Types Step3 adaptés pour moto
// Micro-step 4 : zones + photos + types

export type MotoExteriorZone =
  | "avant"
  | "cote_droit"
  | "arriere"
  | "cote_gauche"
  | "jantes";

export interface MotoPhoto {
  url: string;
  storagePath: string;
}

export type ZonePhotosMap = Partial<Record<MotoExteriorZone, MotoPhoto[]>>;

export interface Step3MotoData {
  completedAt?: string;
  zonesPhotos: ZonePhotosMap;
  degats?: Array<{
    zone?: MotoExteriorZone;
    description: string;
    photos?: MotoPhoto[];
  }>;
}

export interface Step3MotoPayload {
  zonesPhotos: ZonePhotosMap;
  degats?: Array<{
    zone?: MotoExteriorZone;
    description: string;
    photos?: MotoPhoto[];
  }>;
}
