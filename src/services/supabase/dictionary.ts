import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  DictionaryEntry,
  DictionaryDefinition,
  DictionarySource,
  DictionaryEtymology,
  LangCode,
} from "@/types/dictionary";
import { getCurrentLang } from "@/i18n/language";
import { normalizeWord } from "@/utils/normalizeWord";

type DictionaryRow = Database["public"]["Tables"]["dictionary_entries"]["Row"];
type DictionaryInsert = Database["public"]["Tables"]["dictionary_entries"]["Insert"];
type DictionaryUpdate = Database["public"]["Tables"]["dictionary_entries"]["Update"];

function mapRowToEntry(row: DictionaryRow): DictionaryEntry {
  const definitions = (row.definitions as unknown as DictionaryDefinition[]) ?? [];
  const etymology = (row.etymology as unknown as DictionaryEtymology | null) ?? null;
  const sources = (row.sources as unknown as DictionarySource[]) ?? [];

  return {
    id: row.id,
    word: row.word,
    word_normalized: row.word_normalized,
    language_code: row.language_code as LangCode,
    part_of_speech: row.part_of_speech,
    definitions,
    etymology,
    pronunciation: row.pronunciation,
    tags: row.tags ?? [],
    related_entry_ids: row.related_entry_ids?.map(String) ?? [],
    sources,
    status: row.status as DictionaryEntry["status"],
    verified: row.verified,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    definitions_raw: row.definitions,
    etymology_raw: row.etymology,
    sources_raw: row.sources,
  };
}

interface SearchEntriesParams {
  q: string;
  lang?: LangCode;
  limit?: number;
  offset?: number;
}

export class DictionaryService {
  /**
   * Recherche d'entrées publiées par mot et langue.
   * MVP: ilike sur word + filtre language_code + status='published'
   */
  static async searchEntries(params: SearchEntriesParams): Promise<DictionaryEntry[]> {
    const lang = params.lang ?? getCurrentLang();
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const q = params.q?.trim();

    let query = supabase
      .from("dictionary_entries")
      .select("*")
      .eq("status", "published")
      .eq("language_code", lang)
      .order("word_normalized", { ascending: true })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike("word", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[DictionaryService] searchEntries error:", error);
      throw error;
    }

    return (data ?? []).map(mapRowToEntry);
  }

  /**
   * Récupérer une entrée par son ID
   */
  static async getEntryById(id: string): Promise<DictionaryEntry | null> {
    const { data, error } = await supabase
      .from("dictionary_entries")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[DictionaryService] getEntryById error:", error);
      return null;
    }

    if (!data) return null;
    return mapRowToEntry(data);
  }

  /**
   * Créer une nouvelle entrée de dictionnaire.
   * - force created_by = auth user id
   * - calcule word_normalized à partir de word
   */
  static async createEntry(
    entry: Omit<DictionaryInsert, "id" | "created_by" | "word_normalized" | "created_at" | "updated_at">,
  ): Promise<DictionaryEntry> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[DictionaryService] createEntry auth error:", userError);
      throw userError;
    }

    if (!user) {
      throw new Error("[DictionaryService] createEntry requires authenticated user");
    }

    const lang = (entry.language_code as LangCode | undefined) ?? getCurrentLang();
    const wordNormalized = normalizeWord(entry.word);

    const payload: DictionaryInsert = {
      ...entry,
      language_code: lang,
      word_normalized: wordNormalized,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("dictionary_entries")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[DictionaryService] createEntry error:", error);
      throw error;
    }

    return mapRowToEntry(data);
  }

  /**
   * Mettre à jour une entrée de dictionnaire.
   * - recalcule word_normalized si word est modifié
   */
  static async updateEntry(
    id: string,
    patch: Partial<Omit<DictionaryUpdate, "id">>,
  ): Promise<DictionaryEntry> {
    const updates: DictionaryUpdate = { ...patch };

    if (patch.word) {
      (updates as DictionaryUpdate).word_normalized = normalizeWord(patch.word);
    }

    const { data, error } = await supabase
      .from("dictionary_entries")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[DictionaryService] updateEntry error:", error);
      throw error;
    }

    return mapRowToEntry(data);
  }
}


