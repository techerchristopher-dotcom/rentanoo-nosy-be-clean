-- Lot création hébergement : étendre vehicle_type et vehicle_category

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS check_vehicle_type;
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;

ALTER TABLE public.vehicles
  ADD CONSTRAINT check_vehicle_type
  CHECK (
    vehicle_type IS NULL
    OR vehicle_type = ANY (ARRAY['car', 'moto', 'scooter', 'accommodation']::text[])
  );

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS check_vehicle_category;

ALTER TABLE public.vehicles
  ADD CONSTRAINT check_vehicle_category
  CHECK (
    vehicle_category IS NULL
    OR vehicle_category = ANY (ARRAY[
      'Citadine', 'Berline', 'SUV', 'Break', 'Coupé', 'Cabriolet',
      'Utilitaire', 'Camionnette', 'Minibus', 'Pick-up', 'Non spécifié',
      'Villa', 'Bungalow', 'Maison'
    ]::text[])
  );
