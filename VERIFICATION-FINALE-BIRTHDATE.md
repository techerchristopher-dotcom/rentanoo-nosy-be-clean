# Vérification finale – birthdate / profiles

## 1. Projet Supabase utilisé par rentanoo.com

| Source | Valeur | Project ref |
|--------|-------|-------------|
| `.env.local` | `VITE_SUPABASE_URL=https://tbsgzykqcksmqxpimwry.supabase.co` | **tbsgzykqcksmqxpimwry** |
| `src/integrations/supabase/client.ts` | Lit `import.meta.env.VITE_SUPABASE_URL` | Même que .env au build |
| `supabase/config.toml` | `project_id = "tbsgzykqcksmqxpimwry"` | **tbsgzykqcksmqxpimwry** |
| MCP Supabase `get_project_url` | `https://tbsgzykqcksmqxpimwry.supabase.co` | **tbsgzykqcksmqxpimwry** |
| Migration appliquée | Via MCP → projet `tbsgzykqcksmqxpimwry` | **tbsgzykqcksmqxpimwry** |

**Conclusion** : En local, tout pointe vers `tbsgzykqcksmqxpimwry`. La migration a été appliquée sur ce projet.

**Attention** : En production, les variables viennent de la plateforme de déploiement (Vercel, Netlify, etc.). Si rentanoo.com en prod utilise `VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co` (projet principal), la migration n’est pas sur le bon projet. Vérifier les variables d’environnement de production.

---

## 2. Colonnes de `public.profiles`

Colonnes présentes (vérifiées via `information_schema`) :

| Colonne | Présent |
|---------|---------|
| birthdate | ✅ |
| place_of_birth | ✅ |
| address_line1 | ✅ |
| postal_code | ✅ |
| city | ✅ |
| country | ✅ |
| driver_license_number | ✅ |
| driver_license_issue_date | ✅ |
| driver_license_expiration_date | ✅ |
| driver_license_category | ✅ |
| driver_license_country | ✅ |
| driver_license_file_path | ✅ |

---

## 3. Champs du formulaire vs colonnes SQL

| Champ formulaire (Profile.tsx) | ProfileUpdateData | Colonne SQL | Présent |
|-------------------------------|-------------------|------------|---------|
| firstName | firstName | first_name | ✅ |
| lastName | lastName | last_name | ✅ |
| phone | phone | phone | ✅ |
| birthDate | birthDate | birthdate | ✅ |
| placeOfBirth | placeOfBirth | place_of_birth | ✅ |
| bio | bio | bio | ✅ |
| addressLine1 | addressLine1 | address_line1 | ✅ |
| postalCode | postalCode | postal_code | ✅ |
| city | city | city | ✅ |
| country | country | country | ✅ |
| driverLicenseNumber | driverLicenseNumber | driver_license_number | ✅ |
| driverLicenseIssueDate | driverLicenseIssueDate | driver_license_issue_date | ✅ |
| driverLicenseExpirationDate | driverLicenseExpirationDate | driver_license_expiration_date | ✅ |
| driverLicenseCategory | driverLicenseCategory | driver_license_category | ✅ |
| driverLicenseCountry | driverLicenseCountry | driver_license_country | ✅ |
| driverLicenseFilePath | driverLicenseFilePath | driver_license_file_path | ✅ |
| avatarUrl | avatarUrl | avatar_url | ✅ |

Aucun champ du formulaire n’est absent de la table.

---

## 4. Nommage frontend → payload → service → types → SQL

| Couche | Format | Exemple |
|--------|--------|---------|
| Form state (Profile.tsx) | camelCase | birthDate, placeOfBirth |
| Payload updateProfile | camelCase | birthDate, placeOfBirth |
| ProfileService mapping | camelCase → snake_case | birthDate → birthdate |
| types.ts (Supabase) | snake_case | birthdate, place_of_birth |
| Colonnes SQL | snake_case | birthdate, place_of_birth |

Mapping cohérent, pas de divergence.

---

## 5. RLS, triggers, fonctions

| Élément | Impact sur la sauvegarde |
|--------|---------------------------|
| RLS `profiles_all_access` | `USING true`, `WITH CHECK true` → pas de blocage |
| Trigger `email confirmation` | `AFTER INSERT` → pas d’impact sur UPDATE |
| Trigger `trg_profiles_email_confirmed` | `BEFORE UPDATE OF email_confirmed_at` → ne s’exécute que si `email_confirmed_at` est modifié, pas sur birthdate/adresse/permis |

Aucun blocage identifié.

---

## 6. Verdict final

**OK prêt à tester** (sous réserve que rentanoo.com en production utilise le projet `tbsgzykqcksmqxpimwry`).

Si rentanoo.com en prod pointe vers `zykwfjxurwmputxwlkxs`, il reste un blocage : appliquer la migration sur ce projet (SQL Editor ou `supabase db push`).

---

## 7. Plan de test manuel

1. **Création de compte** : Inscription avec email valide.
2. **Validation email** : Cliquer sur le lien de confirmation.
3. **Complétion profil** : Aller sur /profile, remplir au minimum :
   - Prénom, nom, téléphone
   - Date de naissance
   - (optionnel) Lieu de naissance, adresse, permis
4. **Sauvegarde** : Cliquer sur « Sauvegarder » (section ou bouton global).
5. **Relecture** : Rafraîchir la page et vérifier que les données sont bien affichées.

Si l’erreur « Could not find the birthdate column » réapparaît, vérifier que le projet Supabase utilisé en production est bien celui sur lequel la migration a été appliquée.
