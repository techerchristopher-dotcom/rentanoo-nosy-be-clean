/** Quartier géographique Nosy Be (table location_areas). */
export interface LocationArea {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type LocationAreaRef = Pick<LocationArea, "id" | "name" | "slug">;
