import { supabase } from "@/integrations/supabase/client";
import type { LocationArea } from "@/types/locationArea";
import { slugifyLocationAreaName } from "@/utils/locationAreaSlug";

function mapRow(row: Record<string, unknown>): LocationArea {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    active: Boolean(row.active),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export const LocationAreasService = {
  async listActive(): Promise<{ data: LocationArea[]; error: string | null }> {
    const { data, error } = await supabase
      .from("location_areas")
      .select("id, name, slug, active, created_at, updated_at")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data || []).map(mapRow), error: null };
  },

  async createByName(name: string): Promise<{ data: LocationArea | null; error: string | null }> {
    const trimmed = name.trim();
    if (!trimmed) {
      return { data: null, error: "Le nom du quartier est requis." };
    }

    const slug = slugifyLocationAreaName(trimmed);
    if (!slug) {
      return { data: null, error: "Nom de quartier invalide." };
    }

    const { data, error } = await supabase
      .from("location_areas")
      .insert({ name: trimmed, slug, active: true })
      .select("id, name, slug, active, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("location_areas")
          .select("id, name, slug, active, created_at, updated_at")
          .eq("slug", slug)
          .maybeSingle();
        if (existing) {
          return { data: mapRow(existing as Record<string, unknown>), error: null };
        }
      }
      return { data: null, error: error.message };
    }

    return { data: mapRow(data as Record<string, unknown>), error: null };
  },
};
