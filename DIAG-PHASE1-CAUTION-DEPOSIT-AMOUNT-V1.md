# Phase 1 — Diagnostic : Montant caution par véhicule (DIAG ONLY)

**Date** : 14 février 2026  
**Objectif** : DB `vehicles.deposit_amount` + UI ManageVehicle (onglet pricing) + sauvegarde & reload  
**Mode** : Aucun code, pseudo-code ou patch — preuves uniquement

---

## A) DB (preuves)

### A1. Gestion des migrations Supabase

| Question | Réponse | Preuve |
|----------|---------|--------|
| **Où se trouvent-elles ?** | `supabase/migrations/` | Contenu : `001_dictionary_entries.sql`, `002_add_service_fee_columns.sql`, `20260203143617_add_terminated_status_to_bookings.sql`, `20260206143000_add_checkin_return_damage_flags.sql`, `20260211000000_add_welcome_email_sent_at.sql`, `YYYYMMDDHHMMSS_add_edl_email_tracking.sql` |
| **Nommage** | Deux formats : `YYYYMMDDHHMMSS_description.sql` ou `00X_description.sql` | `README-DICTIONNAIRE.md` L.52-54 : format attendu `YYYYMMDDHHMMSS_description.sql` ; ex. `001_dictionary_entries.sql` à renommer si usage CLI |
| **Application** | **CLI** : `supabase db push` | `FEES-B2-MIGRATION-COLUMNS.md` L.174-178 ; `IMPLEMENTATION-WELCOME-EMAIL.md` L.332-336 |
| | **Dashboard** : SQL Editor → copier/coller le contenu → Run | `README-DICTIONNAIRE.md` L.15-28 ; `FEES-B2-MIGRATION-COLUMNS.md` L.182-187 |
| | **MCP Supabase** (Cursor) | `README-DICTIONNAIRE.md` L.61-64 ; `FEES-B2-MIGRATION-COLUMNS.md` L.189 |

**Vérification post-migration** : requête SQL dans `FEES-B2-MIGRATION-COLUMNS.md` L.198-217 (`information_schema.columns` sur la table concernée).

---

### A2. Colonne similaire (deposit, caution, guarantee) dans `vehicles`

| Source | Résultat |
|--------|----------|
| **Migrations** | Aucune migration dans `supabase/migrations/` ne crée de colonne `deposit`, `caution`, `guarantee` ou `deposit_amount` sur `vehicles` |
| **SCRIPT-RECREATE-SCHEMA-RENTANOO.sql** | L.169-196 : `CREATE TABLE public.vehicles` — colonnes `id`, `owner_id`, `brand`, `model`, `year`, `color`, `license_plate`, `mileage`, `fuel_type`, `transmission`, `seats`, `price_per_day`, `available`, `vehicle_category`, `pickup_zones`, `description`, `rental_count`, `created_at`, `updated_at`. **Pas de `deposit_amount`** |
| **supabaseVehiclesService.ts** | Interface `Vehicle` L.3-88 : pas de propriété `deposit_amount` ni équivalent |
| **vehicle-form.types.ts** | `VehicleFormData` L.8-104 : pas de `depositAmount` |
| **types.ts** (integrations/supabase) | Déclare `bookings`, `conversations`, etc. ; pas de table `vehicles` détaillée (focus sur `bookings`) |

**Conclusion** : Aucune colonne caution/deposit sur `vehicles` à ce jour. La migration devra être créée.

---

### A3. Lieux où `vehicles` est SELECT/UPDATE pour ManageVehicle

#### Service(s)

| Fichier | Méthode | Usage |
|---------|---------|-------|
| `src/services/supabaseVehiclesService.ts` | `getVehicleById(vehicleId)` L.312-334 | `supabase.from('vehicles').select('*').eq('id', vehicleId).single()` — charge le véhicule pour le formulaire |
| `src/services/supabaseVehiclesService.ts` | `updateVehicle(vehicleId, updateData)` L.339-407 | `supabase.from('vehicles').update(safeUpdateData).eq('id', vehicleId)` — met à jour les champs envoyés dans `updateData` |

#### Hook `useManageVehicle` — mapping snake_case ↔ camelCase

| Direction | Fichier | Section |
|-----------|---------|---------|
| **DB → formData** | `src/features/vehicle-management/hooks/useManageVehicle.ts` | L.91-177 : `setFormData({ ... pricePerDay: vehicleData.price_per_day.toString(), lowSeasonDiscount: (vehicleData.low_season_discount \|\| 10).toString(), ... })` — mapping explicite `vehicleData.snake_case` → `formData.camelCase` |
| **formData → DB** | Non dans le hook | Le hook ne sauvegarde pas ; c’est `handleSave` dans ManageVehicle qui prépare les objets d’update |

#### Blocs `updateData` dans `handleSave`

| Bloc | Fichier | Lignes | Objets envoyés |
|------|---------|--------|----------------|
| **baseUpdateData** | `ManageVehicle.tsx` | L.1261-1282 | `brand`, `model`, `color`, `year`, `mileage`, `fuel_type`, `transmission`, `seats`, `price_per_day` (+ `doors`, etc.) |
| **optionalUpdateData** | L.1272-1280 | Équipements, `vehicle_category`, etc. |
| **pricingUpdateData** | L.1283-1288 | `low_season_discount`, `high_season_surcharge`, `long_duration_discount_14`, `long_duration_discount_60` — valeurs `parseFloat(formData.xxx) \|\| undefined` |
| **equipmentUpdateData** | L.1341-1355 | `has_ac`, `has_gps`, etc. |
| **bookingUpdateData** | L.1370-1377 | `pickup_zones`, `min_advance_hours`, `min_rental_days`, `max_rental_days` |
| **airportUpdateData** | L.1389-1398 | `airport_pickup_service`, `airport_pickup_retrieval`, etc. |
| **bargePetiteTerreUpdateData** | L.1411-1419 | Services Barge Petite Terre |
| **bargeGrandeTerreUpdateData** | L.1433-1441 | Services Barge Grande Terre |
| **homeDeliveryUpdateData** | L.1455-1462 | Services livraison |
| **additionalServicesUpdateData** | L.1477-1484 | `baby_seat_service`, `baby_seat_free`, `baby_seat_price`, `additional_driver_*` |

**Pattern** : chaque bloc est passé à `SupabaseVehiclesService.updateVehicle(vehicle.id, xxxUpdateData)`.

**Remarque** : `updateVehicle` a un paramètre typé (L.339-365) qui liste les clés autorisées. Une nouvelle clé `deposit_amount` devra être ajoutée à ce type (ou le type élargi) pour éviter une erreur TypeScript.

---

## B) UI (preuves)

### B1. Emplacement exact pour l’input caution (onglet pricing)

| Référence | Fichier | Section |
|-----------|---------|---------|
| **Onglet pricing** | `ManageVehicle.tsx` | L.2033 : `<TabsContent value="pricing">` |
| **Structure** | L.2094-2116 | Bloc "Prix journalier de base" : `Label` + `Input` (pricePerDay) + message d’erreur |
| **Bloc suivant** | L.2118 | "Remises et suppléments" : `h3` + grille 2 colonnes (lowSeasonDiscount, highSeasonSurcharge, longDurationDiscount14, longDurationDiscount60) |

**Emplacement recommandé** : entre la fin du bloc "Prix journalier de base" (L.2116, après le `</div>` du pricePerDay) et le début de "Remises et suppléments" (L.2118). Même structure que pricePerDay : `div.space-y-2` contenant `Label`, `Input`, texte d’aide optionnel.

**Alternative** : dans la première colonne de "Réductions et suppléments" (L.2121-2140), avant lowSeasonDiscount — cohérent avec les autres champs numériques de tarification.

---

### B2. Pattern de validation pour les champs prix

| Élément | Fichier | Section |
|---------|---------|---------|
| **Input** | `ManageVehicle.tsx` | L.2104-2115 : `type="number"`, `min="1"`, `step="0.01"`, `value={formData.pricePerDay}`, `onChange={(e) => handleInputChange("pricePerDay", e.target.value)}` |
| **Validation** | L.891-895 | `validateField("pricePerDay", value)` : `parseFloat(value)`, `isNaN(price)`, `price <= 0` → erreur "Le prix doit être un nombre positif" |
| **Remises** | L.896-903 | Pour lowSeasonDiscount, etc. : `parseFloat(value)`, `discount < 0 \|\| discount > 100` |
| **Affichage erreur** | L.2097-2115 | `validationErrors.pricePerDay` → `AlertCircle`, `className` avec `border-red-500`, `<p className="text-xs text-red-500">` |

**Différence pour la caution** : le montant peut être 0 (pas de caution). La validation doit accepter `>= 0` au lieu de `> 0`. Pattern proche de `min="0"` (comme pour lowSeasonDiscount L.2134).

---

### B3. Gestion des erreurs de save et feedback UI

| Situation | Fichier | Section |
|-----------|---------|---------|
| **Succès global** | `ManageVehicle.tsx` | L.1500-1503 : `toast({ title: "Succès", description: "Véhicule mis à jour avec succès" })` |
| **Erreur globale** | L.1512-1516 | `toast({ title: "Erreur", description: \`...\`, variant: "destructive" })` dans le `catch` |
| **Loading** | L.1252, 1518 | `setSaving(true)` en début de try, `setSaving(false)` dans finally |
| **Bouton** | L.3916-3929 | `onClick={handleSave}`, `disabled={saving \|\| !hasChanges}` |
| **Échec partiel** | L.1314-1325 (pricingUpdateData) | Si erreur : `console.warn` + `toast({ title: "Attention", description: "...n'ont pas pu être mises à jour", variant: "destructive" })` ; la sauvegarde continue pour les autres blocs |

---

## C) Types / mapping (preuves)

### C1. `src/integrations/supabase/types.ts` : généré ou manuel ?

| Indice | Preuve |
|--------|--------|
| **package.json** | Aucun script `supabase gen types` ou équivalent |
| **Contenu** | Structure manuelle `export type Database = { public: { Tables: { bookings: {...}, conversations: {...}, ... } } }` |
| **Retard sur migrations** | `DIAG-CAUTION-STRIPE-PHASES-V1.md` L.39 : "le schéma TypeScript est en retard sur les migrations" (colonnes Stripe dans bookings non déclarées) |
| **Constat** | Fichier maintenu manuellement, non généré par la CLI Supabase |

**Pour confirmer** : `rg "supabase gen|generate types"` dans le projet → aucun script trouvé.

---

### C2. Impacts si `types.ts` n’est pas mis à jour

| Impact | Détail |
|--------|--------|
| **Faible pour Phase 1** | `types.ts` ne décrit pas la table `vehicles` en détail ; les types métier viennent de `supabaseVehiclesService.ts` (interface `Vehicle`) et `vehicle-form.types.ts` (`VehicleFormData`) |
| **Point de friction** | `SupabaseVehiclesService.updateVehicle` : son paramètre est typé (L.339-365). Si `deposit_amount` n’est pas ajouté, TypeScript signalera une erreur sur l’appel `updateVehicle(id, { deposit_amount: 1000 })` |
| **Interface Vehicle** | Si `deposit_amount` n’est pas ajouté à `Vehicle`, `vehicleData.deposit_amount` sera considéré comme inexistant — à corriger via l’interface ou un cast |

---

### C3. Mapping `deposit_amount` ↔ `depositAmount`

| Direction | Emplacement actuel | À prévoir |
|-----------|--------------------|-----------|
| **vehicleData → formData** | `useManageVehicle.ts` L.91-177, ex. `pricePerDay: vehicleData.price_per_day.toString()` | Ligne dans le même bloc `setFormData` : `depositAmount: (vehicleData.deposit_amount ?? 0).toString()` (ou valeur par défaut choisie) |
| **formData → update** | `handleSave` construit des objets avec clés snake_case, ex. `long_duration_discount_60: parseFloat(formData.longDurationDiscount60) \|\| undefined` | Nouveau bloc ou champ dans un bloc existant : `deposit_amount: parseFloat(formData.depositAmount) \|\| 0` |

**Convention** : formulaire en camelCase (`depositAmount`), base en snake_case (`deposit_amount`), comme pour les autres champs.

---

## D) Critères de validation Phase 1 (checklist testable)

- [ ] **Migration** : La migration `vehicles.deposit_amount` s’applique sans erreur (`supabase db push` ou SQL Editor).
- [ ] **Colonne en DB** : La colonne `deposit_amount` existe sur `vehicles` (ex. `SELECT column_name FROM information_schema.columns WHERE table_name='vehicles' AND column_name='deposit_amount'`).
- [ ] **Input visible** : L’onglet Tarifs affiche un champ "Montant caution" (ou équivalent) entre le prix journalier et les remises.
- [ ] **Sauvegarde** : Modification du montant caution + clic "Sauvegarder" → toast "Succès" → pas d’erreur dans la console.
- [ ] **Persistance** : Après sauvegarde, rechargement de la page (F5 ou navigation puis retour) → la valeur saisie est toujours affichée.
- [ ] **Valeur par défaut (null)** : Véhicule sans valeur → affichage cohérent (ex. champ vide ou 0 selon choix UX).
- [ ] **Valeur 0** : Saisie de 0 → sauvegarde OK → valeur 0 persistée (pas de caution).
- [ ] **Chargement** : Bouton "Sauvegarder" désactivé pendant la sauvegarde ; indicateur de chargement visible.

---

## E) Vérifications manuelles si preuve manquante

| Point | Comment vérifier |
|-------|------------------|
| **Colonnes actuelles de `vehicles`** | SQL : `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicles' ORDER BY ordinal_position` |
| **Projet Supabase actif** | `.cursorrules` : projet principal `zykwfjxurwmputxwlkxs`, alternatif `tbsgzykqcksmqxpimwry` ; vérifier le `project-ref` utilisé pour les migrations |
| **Contrainte sur deposit_amount** | Selon le choix (NUMERIC, CHECK >= 0, DEFAULT, etc.) — à définir dans la migration |
