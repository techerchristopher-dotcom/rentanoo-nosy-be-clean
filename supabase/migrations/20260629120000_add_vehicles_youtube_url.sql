-- Ajout de la colonne youtube_url sur la table vehicles
-- Stocke l'URL canonique YouTube au format https://www.youtube.com/watch?v={ID}
-- Nullable : la plupart des véhicules n'ont pas de vidéo.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS youtube_url text;

-- TODO SÉCURITÉ (ticket séparé) : la RLS est actuellement désactivée sur la table
-- vehicles (DISABLE ROW LEVEL SECURITY). N'importe quel utilisateur authentifié peut
-- modifier n'importe quel véhicule. Activer la RLS avec une policy
-- "UPDATE WHERE owner_id = auth.uid()" avant toute mise en production sensible.
