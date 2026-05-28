# Supabase Storage Buckets — Back-office Nosy Be

## Existing buckets (reuse)

| Bucket | Access | Usage |
|--------|--------|-------|
| `vehicle-photos` | Public | Listing photos via `vehicle_photos` table |
| `checkin-photos` | Public | EDL départ/retour photos and PDFs |
| `avatars` | Public | Profile avatars |
| `driver-licenses` | Private | KYC license uploads |

## New buckets (create in Supabase Dashboard or CLI)

```bash
# Private buckets for back-office
supabase storage create-bucket scooter-docs --public false
supabase storage create-bucket repair-photos --public false
```

| Bucket | Access | Usage |
|--------|--------|-------|
| `scooter-docs` | Private (signed URLs) | Carte grise, assurance, contrôle technique per scooter |
| `repair-photos` | Private (signed URLs) | Before/after repair photos |

### Path conventions

- `scooter-docs`: `vehicle_<vehicleId>/<docType>_<timestamp>_<uuid>.<ext>`
- `repair-photos`: `repair_<repairId>/<timestamp>_<uuid>.<ext>`

### RLS policies (apply in Dashboard)

Allow authenticated admin users to upload/read their agency documents:

```sql
-- Example policy for scooter-docs (adjust to your auth model)
CREATE POLICY "Admin upload scooter docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scooter-docs' AND is_admin_user());

CREATE POLICY "Admin read scooter docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'scooter-docs' AND is_admin_user());
```
