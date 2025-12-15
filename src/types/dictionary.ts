import type { Json } from "@/integrations/supabase/types";

export type LangCode = "fr" | "en" | "it" | "de";

export interface DictionaryDefinition {
  text: string;
  source?: string | null;
  examples?: string[] | null;
}

export interface DictionarySource {
  name: string;
  page?: string | null;
  year?: number | null;
}

export interface DictionaryEtymology {
  origin?: string | null;
  derivation?: string | null;
  related_words?: string[] | null;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  word_normalized: string;
  language_code: LangCode;
  part_of_speech?: string | null;
  definitions: DictionaryDefinition[];
  etymology?: DictionaryEtymology | null;
  pronunciation?: string | null;
  tags: string[];
  related_entry_ids: string[];
  sources: DictionarySource[];
  status: "draft" | "published" | "archived";
  verified: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Raw JSONB fields (for advanced use if needed)
  definitions_raw?: Json;
  etymology_raw?: Json;
  sources_raw?: Json;
}


