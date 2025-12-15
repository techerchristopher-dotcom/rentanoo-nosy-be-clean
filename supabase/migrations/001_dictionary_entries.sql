-- ============================================================================
-- MIGRATION: Création table dictionary_entries
-- Description: Table pour gérer un dictionnaire multilingue avec étymologie
-- Langues supportées: fr, en, it, de
-- Date: 2025-01-27
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Vérification/Création fonction update_updated_at_column()
-- ============================================================================

-- Créer la fonction si elle n'existe pas déjà (réutilise le pattern du projet)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- ÉTAPE 2: Création de la table dictionary_entries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dictionary_entries (
    -- Identifiant unique
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Mot/terme principal
    word TEXT NOT NULL,
    
    -- Version normalisée (lowercase + sans accents côté app, DB stocke juste le champ)
    word_normalized TEXT NOT NULL,
    
    -- Langue du mot (4 langues uniquement)
    language_code TEXT NOT NULL CHECK (language_code IN ('fr', 'en', 'it', 'de')),
    
    -- Nature grammaticale (part of speech)
    part_of_speech TEXT NULL,
    
    -- Définitions (JSONB pour flexibilité)
    -- Structure attendue: [{ "text": "...", "source": "...", "examples": [...] }]
    definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Étymologie (JSONB pour flexibilité)
    -- Structure attendue: { "origin": "...", "derivation": "...", "related_words": [...] }
    etymology JSONB NULL,
    
    -- Prononciation (phonétique IPA ou transcription)
    pronunciation TEXT NULL,
    
    -- Tags (array de text)
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    
    -- Relations avec d'autres entrées
    related_entry_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    
    -- Sources/Références bibliographiques (JSONB)
    -- Structure attendue: [{ "name": "...", "page": "...", "year": ... }]
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Statut de publication
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    -- Vérification par expert
    verified BOOLEAN NOT NULL DEFAULT false,
    
    -- Références aux utilisateurs (créateur et dernier éditeur)
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÉTAPE 3: Création des index
-- ============================================================================

-- Index btree sur word_normalized (pour recherche rapide par mot normalisé)
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_word_normalized 
    ON public.dictionary_entries(word_normalized);

-- Index btree sur language_code (pour filtrage par langue)
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_language_code 
    ON public.dictionary_entries(language_code);

-- Index GIN sur tags (pour recherche par tags)
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_tags 
    ON public.dictionary_entries USING gin(tags);

-- Index GIN full-text search (pour recherche textuelle dans word, definitions, etymology)
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_fts 
    ON public.dictionary_entries 
    USING gin(
        to_tsvector(
            'simple', 
            word || ' ' || 
            COALESCE(definitions::text, '') || ' ' || 
            COALESCE(etymology::text, '')
        )
    );

-- Index composite pour recherche par langue + mot normalisé (optimisation requêtes fréquentes)
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_lang_word 
    ON public.dictionary_entries(language_code, word_normalized);

-- Index sur status (pour filtrage rapide des entrées publiées)
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_status 
    ON public.dictionary_entries(status) 
    WHERE status = 'published';

-- ============================================================================
-- ÉTAPE 4: Activation RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.dictionary_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 5: Création des policies RLS
-- ============================================================================

-- Policy SELECT: Lecture publique uniquement sur les entrées publiées
CREATE POLICY "dictionary_entries_select_public"
    ON public.dictionary_entries
    FOR SELECT
    USING (status = 'published');

-- Policy INSERT: Autoriser uniquement les utilisateurs authentifiés
-- Contrainte: created_by doit être égal à auth.uid()
CREATE POLICY "dictionary_entries_insert_authenticated"
    ON public.dictionary_entries
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' 
        AND created_by = auth.uid()
    );

-- Policy UPDATE: Autoriser uniquement le créateur de l'entrée
-- Mise à jour automatique de updated_by et updated_at via trigger
CREATE POLICY "dictionary_entries_update_creator"
    ON public.dictionary_entries
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Policy DELETE: Autoriser uniquement le créateur de l'entrée (optionnel mais cohérent)
CREATE POLICY "dictionary_entries_delete_creator"
    ON public.dictionary_entries
    FOR DELETE
    USING (created_by = auth.uid());

-- ============================================================================
-- ÉTAPE 6: Création du trigger pour updated_at
-- ============================================================================

-- Trigger pour mettre à jour automatiquement updated_at et updated_by
CREATE TRIGGER trg_dictionary_entries_updated_at
    BEFORE UPDATE ON public.dictionary_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour mettre à jour updated_by avec l'utilisateur actuel lors d'un UPDATE
CREATE OR REPLACE FUNCTION public.set_dictionary_entries_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Mettre à jour updated_by avec l'utilisateur actuel si authentifié
    IF auth.uid() IS NOT NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_dictionary_entries_updated_by
    BEFORE UPDATE ON public.dictionary_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_dictionary_entries_updated_by();

-- ============================================================================
-- ÉTAPE 7: Commentaires sur la table et colonnes (documentation)
-- ============================================================================

COMMENT ON TABLE public.dictionary_entries IS 
    'Table pour gérer un dictionnaire multilingue avec étymologie. Supporte 4 langues: fr, en, it, de.';

COMMENT ON COLUMN public.dictionary_entries.word IS 
    'Mot ou terme principal dans sa forme originale';

COMMENT ON COLUMN public.dictionary_entries.word_normalized IS 
    'Version normalisée du mot (lowercase, sans accents) pour recherche. À générer côté application.';

COMMENT ON COLUMN public.dictionary_entries.language_code IS 
    'Code langue ISO 639-1: fr (français), en (anglais), it (italien), de (allemand)';

COMMENT ON COLUMN public.dictionary_entries.part_of_speech IS 
    'Nature grammaticale: nom, verbe, adjectif, adverbe, etc.';

COMMENT ON COLUMN public.dictionary_entries.definitions IS 
    'Array JSONB de définitions. Structure: [{ "text": "...", "source": "...", "examples": [...] }]';

COMMENT ON COLUMN public.dictionary_entries.etymology IS 
    'Étymologie du mot. Structure: { "origin": "...", "derivation": "...", "related_words": [...] }';

COMMENT ON COLUMN public.dictionary_entries.pronunciation IS 
    'Prononciation en phonétique IPA ou transcription';

COMMENT ON COLUMN public.dictionary_entries.tags IS 
    'Tags libres pour catégorisation: ["verbe", "nom", "expression", "argot", etc.]';

COMMENT ON COLUMN public.dictionary_entries.related_entry_ids IS 
    'Array d''UUIDs pointant vers d''autres entrées du dictionnaire liées';

COMMENT ON COLUMN public.dictionary_entries.sources IS 
    'Sources bibliographiques. Structure: [{ "name": "...", "page": "...", "year": ... }]';

COMMENT ON COLUMN public.dictionary_entries.status IS 
    'Statut de publication: draft (brouillon), published (publié), archived (archivé)';

COMMENT ON COLUMN public.dictionary_entries.verified IS 
    'Indique si l''entrée a été vérifiée par un expert';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

