# Diagnostic : Erreur birthdate sur profiles

## 1. Résumé (5 lignes max)

**Cause racine** : La table `profiles` en base ne contient pas la colonne `birthdate` (ni `place_of_birth`, `address_line1`, etc.), alors que le code (ProfileService, types TS, formulaire Profile) envoie ces champs lors de la sauvegarde. PostgREST renvoie "Could not find the 'birthdate' column of 'profiles' in the schema cache" car la colonne n'existe pas.

**Solution** : Migration SQL pour ajouter les colonnes manquantes (birthdate, place_of_birth, adresse, permis). Toutes en nullable → backward-compatible.

**Fichiers impactés** : 1 migration SQL à créer et appliquer.

**Niveau de risque** : Faible (colonnes nullable, pas de données existantes à migrer).

---

## 2. Diagnostic détaillé

### Flux d'inscription et sauvegarde

1. **Inscription** : Auth Supabase → création compte
2. **Onboarding** (`ClientOnboarding.tsx`) : Vérification email → "Compléter mon profil" → `navigate("/profile")`
3. **Profil** (`Profile.tsx`) : L'utilisateur remplit les sections (basic, address, license) et clique sur "Sauvegarder"
4. **Sauvegarde** : `ProfileService.updateProfile(updateData)` est appelé avec `birthDate`, `placeOfBirth`, etc.
5. **Erreur** : Supabase/PostgREST rejette car `birthdate` n'existe pas dans la table.

### Où `birthdate` est utilisé

| Emplacement | Fichier | Usage |
|------------|---------|-------|
| Types TS | `src/integrations/supabase/types.ts` | Row/Insert/Update `birthdate: string \| null` |
| Service profil | `src/services/supabase/profile.ts` | `supabaseUpdate.birthdate = updateData.birthDate` (l.197), lecture `profile.birthdate` |
| Formulaire profil | `src/pages/Profile.tsx` | `birthDate` dans `saveSection('basic')` et `handleSubmit` |
| État des lieux | `EtatDesLieuxDepartForm.tsx` | Lecture `birthdate` depuis profiles pour préremplir |

### État réel de la table `profiles`

**Colonnes existantes** (vérifiées via `information_schema`) :
- id, email, first_name, last_name, phone, avatar_url, bio, role, kyc_status
- is_admin, admin_role, created_at, updated_at
- confirmation_email_sent_at, kyc_confirmed_at, email_confirmed_at, stripe_customer_id

**Colonnes manquantes** (attendues par le code) :
- `birthdate`
- `place_of_birth`
- `address_line1`, `postal_code`, `city`, `country`
- `driver_license_number`, `driver_license_issue_date`, `driver_license_expiration_date`
- `driver_license_category`, `driver_license_country`, `driver_license_file_path`

### Vérifications effectuées

- [x] La colonne `birthdate` n'existe pas dans la table `profiles`
- [x] Pas de renommage (date_of_birth, birthday, etc.) : le code utilise bien `birthdate`
- [x] Le cache schema PostgREST reflète la base réelle : la colonne est absente
- [x] Aucune migration existante n'ajoute ces colonnes (ETAPE-3 est un plan, pas une migration appliquée)
- [x] Le frontend envoie `birthDate` via `ProfileService.updateProfile`
- [x] Les types générés (`types.ts`) incluent `birthdate` mais sont désynchronisés de la base

---

## 3. Correctif minimal recommandé

**Option 1 (recommandée)** : Migration SQL pour ajouter toutes les colonnes manquantes. Simple, sûr, backward-compatible.

**Option 2** : Filtrer côté code les champs inexistants avant l'update. Perte de fonctionnalité (données non sauvegardées) → non recommandé.

---

## 4. Patch exact

### Migration SQL créée et appliquée

Fichier : `supabase/migrations/20260312174744_add_profiles_kyc_columns.sql`

**Important** : La migration a été appliquée sur le projet Supabase connecté au MCP (nosy_be_clean). Si rentanoo.com utilise le projet principal `zykwfjxurwmputxwlkxs`, exécuter manuellement :

```bash
supabase db push
# ou via le Dashboard Supabase : SQL Editor → coller le contenu de la migration
```

---

## 5. Étapes de test

1. Appliquer la migration sur le projet Supabase (principal ou alternatif selon config)
2. Tester l'inscription complète : créer un compte → confirmer email → compléter profil avec date de naissance
3. Vérifier que la sauvegarde réussit sans erreur
4. Vérifier qu'un utilisateur existant peut toujours se connecter et modifier son profil

---

## 6. Risques éventuels

- **Aucun** si les colonnes sont ajoutées en `NULL` : les profils existants restent valides
- Si le projet Supabase MCP pointe vers un projet différent de rentanoo.com, appliquer la migration sur le bon projet (zykwfjxurwmputxwlkxs selon .cursorrules)
