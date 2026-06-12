-- Étendre vehicle_category : Chambre, Appartement

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS check_vehicle_category;

ALTER TABLE public.vehicles
  ADD CONSTRAINT check_vehicle_category
  CHECK (
    vehicle_category IS NULL
    OR vehicle_category = ANY (ARRAY[
      'Citadine', 'Berline', 'SUV', 'Break', 'Coupé', 'Cabriolet',
      'Utilitaire', 'Camionnette', 'Minibus', 'Pick-up', 'Non spécifié',
      'Villa', 'Bungalow', 'Maison', 'Chambre', 'Appartement'
    ]::text[])
  );
