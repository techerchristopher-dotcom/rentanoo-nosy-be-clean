-- Contrat de location (V1) : métadonnées et PDF sur bookings
-- EDL départ / retour inchangés (checkin_depart / checkin_return)

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rental_contract_pdf_url text,
  ADD COLUMN IF NOT EXISTS rental_contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rental_contract_template_version text;

COMMENT ON COLUMN public.bookings.rental_contract_pdf_url IS 'URL publique du PDF du contrat de location signé (Storage)';
COMMENT ON COLUMN public.bookings.rental_contract_signed_at IS 'Horodatage de la signature électronique (génération PDF)';
COMMENT ON COLUMN public.bookings.rental_contract_template_version IS 'Version du modèle de contrat (ex. 1.0.0)';
