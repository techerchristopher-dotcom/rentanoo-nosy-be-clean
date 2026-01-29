# 🔍 Phase 2 — Diagnostic & Plan (Draft v0)

**Objectif Phase 2** : Remplacer le placeholder moto par un vrai **État des lieux Départ Moto/Scooter**, avec persistance + uploads + submit final, sans régression voiture.

**Principe** : On garde Phase 1 comme "router" : `Checking.tsx` décide car/moto. Phase 2 ajoute un module moto complet.

---

## 1) Diagnostic factuel (preuves repo)

### 1.1 Où est stocké l'état des lieux "voiture" aujourd'hui ?

#### ✅ Table de base de données : `checkin_depart`

**Preuve** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 258-300)

```sql
CREATE TABLE public.checkin_depart (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid,
    owner_id uuid,
    renter_id uuid,
    data jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    kilometrage_depart numeric,
    niveau_carburant numeric,
    photos_dashboard jsonb DEFAULT '[]'::jsonb,
    photos_exterieur jsonb DEFAULT '[]'::jsonb,
    photos_jantes jsonb DEFAULT '[]'::jsonb,
    photos_coffre jsonb DEFAULT '[]'::jsonb,
    photos_accessoires jsonb DEFAULT '[]'::jsonb,
    degats jsonb DEFAULT '[]'::jsonb,
    remarques_owner text,
    remarques_renter text,
    signature_owner text,
    signature_renter text,
    validated_at timestamp with time zone,
    photo_permis_recto text,
    photo_permis_verso text,
    snapshot_legal jsonb,
    driver_email text,
    driver_phone text,
    owner_last_name text,
    owner_first_name text,
    owner_email text,
    owner_phone text,
    booking_reference_number integer,
    booking_departure_datetime timestamp with time zone,
    booking_return_datetime timestamp with time zone,
    snapshot_version text,
    booking_departure_location text,
    booking_return_location text,
    legal_pdf_url text,
    CONSTRAINT checkin_depart_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT checkin_depart_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE NO ACTION,
    CONSTRAINT checkin_depart_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES profiles(id) ON DELETE NO ACTION
);
```

#### ✅ Format payload : Hybride JSONB + colonnes SQL

**Preuve** : `src/services/supabaseCheckinService.ts` (lignes 78-319)

**Structure** :
- **JSONB `data`** : Structure hiérarchique par steps (`step1`, `step2`, `step3`, etc.)
  - `data.step1.identification` : Infos conducteur
  - `data.step2.releves` : Kilométrage, carburant, photos dashboard
  - `data.step3` : Extérieur, coffre, dégâts
  - `data.step4` : Intérieur
  - `data.step5` : Accessoires
  - `data.step6` : Remarques
  - `data.step7` : Validation & signatures

- **Colonnes SQL dédiées** (pour performance + snapshot légal) :
  - `photo_permis_recto`, `photo_permis_verso` (text = URL publique)
  - `kilometrage_depart`, `niveau_carburant` (numeric)
  - `photos_dashboard`, `photos_exterieur`, `photos_jantes`, `photos_coffre` (JSONB arrays)
  - `degats` (JSONB array)
  - `signature_owner`, `signature_renter` (text = base64)
  - `validated_at` (timestamp)
  - `snapshot_legal` (JSONB) : Snapshot immuable pour PDF

#### ✅ Services Supabase utilisés

**Preuve** : `src/services/supabaseCheckinService.ts`

**Service principal** : `SupabaseCheckinService.saveCheckinDraft()`
- Pattern : Appel direct à Supabase (pas de route Express)
- INSERT ou UPDATE selon présence de `checkin_id`
- Merge JSONB : `data` est fusionné (pas écrasé) pour préserver les steps non modifiés

**Service de sauvegarde progressive** : `src/services/checkinDepartService.ts`
- `saveStep1Draft()` : Sauvegarde Step1 uniquement
- `saveStep2Draft()` : Sauvegarde Step2 uniquement
- `saveStep3Draft()` : Sauvegarde Step3 uniquement
- Pattern : Chaque step sauvegarde son propre payload dans `data.stepX`

#### ✅ Gestion Draft & Final Submit

**Preuve** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` (lignes 1061-1124)

**Draft** :
- Status `"draft"` : État des lieux en cours
- Chargement automatique au mount : Recherche `checkin_depart` avec `status = 'draft'` et `booking_id = bookingId`
- Modal de choix : Si draft existant → "Poursuivre" ou "Redémarrer à zéro"
- Hydratation progressive : Chaque step hydrate le formulaire depuis `data.stepX`

**Final Submit** :
- Status `"completed"` : État des lieux finalisé
- Verrouillage UI : Si `status === "completed"`, le formulaire devient read-only
- Snapshot légal : Au submit final, création de `snapshot_legal` (immuable) pour PDF
- PDF génération : `checkinDepartPdfService.generateCheckinDepartPdf()` utilise uniquement `snapshot_legal`

---

### 1.2 Upload photos : où et comment ?

#### ✅ Bucket Supabase Storage : `checkin-photos`

**Preuve** : `src/services/supabase/checkinPhotos.ts` (ligne 32)

```typescript
private static readonly BUCKET_NAME = 'checkin-photos'
```

#### ✅ Conventions de chemin

**Preuve** : `src/services/supabase/checkinPhotos.ts` (lignes 46-147)

**Structure** :
```
booking_<bookingId>/<subfolder>/<bddColumnName>_<bookingId>_<timestamp>_<uuid>.<ext>
```

**Exemples** :
- Permis recto : `booking_abc123/documents/photo_permis_recto_abc123_1730846234567_a3f8k2.jpg`
- Dashboard : `booking_abc123/depart/photos_dashboard_abc123_1730846300000_c4d5e6.jpg`
- Extérieur avant : `booking_abc123/depart/photos_exterieur_abc123_1730846400000_d7e8f9_avant.jpg`

**Subfolders** :
- `documents/` : Photos de permis, documents
- `depart/` : Photos de l'état des lieux de départ
- `retour/` : Photos de l'état des lieux de retour (pour `checkin_return`)

**Naming intelligent** :
- Utilise `bookingReferenceNumber` si disponible (ex: `resa_8/...`)
- Fallback sur `bookingId` si `referenceNumber` absent
- Suffixe contextuel optionnel (ex: `_avant`, `_degat_0`)

#### ✅ Gestion suppression / overwrite

**Preuve** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` (lignes 1213-1271)

**Suppression** :
- Fonction `deleteCheckinDraftAndFiles()` : Supprime draft BDD + fichiers Storage
- Collecte tous les `storagePath` depuis le checkin (colonnes SQL + JSONB)
- Suppression batch : `supabase.storage.from('checkin-photos').remove(paths[])`
- Sécurité : Suppression uniquement si `status = 'draft'`

**Overwrite** :
- Upload avec `upsert: false` : Pas d'écrasement automatique
- Nouveau fichier créé à chaque upload (timestamp + UUID garantissent l'unicité)
- Anciens fichiers restent en Storage (pas de cleanup automatique)

#### ✅ Limites (taille, type) et où elles sont enforced

**Preuve** : `src/services/supabase/checkinPhotos.ts` (lignes 33, 60-80)

**Limites** :
- Taille max : `10 * 1024 * 1024` (10 MB) — **enforced côté client**
- Type : Validation `file.type.startsWith('image/')` — **enforced côté client**

**Où** :
- Validation dans `CheckinPhotoService.uploadCheckinPhoto()` avant upload
- Pas de validation backend explicite (dépend des policies Supabase Storage)

---

### 1.3 Le flow voiture est "Départ" uniquement ou aussi "Retour" ?

#### ✅ Départ ET Retour (2 tables séparées)

**Preuve** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 302+)

**Tables** :
- `checkin_depart` : État des lieux de départ
- `checkin_return` : État des lieux de retour

**Relation** :
- `checkin_return.checkin_depart_id` → `checkin_depart.id` (FK)
- Le retour référence le départ pour comparaison

**Services** :
- `SupabaseCheckinService` : Gestion départ
- `SupabaseCheckinReturnService` : Gestion retour (`src/services/supabaseCheckinReturnService.ts`)

**Cycle complet** :
1. Départ : Création `checkin_depart` avec `status = 'draft'` → `'completed'`
2. Retour : Création `checkin_return` lié au `checkin_depart_id`
3. PDF : Génération séparée pour départ et retour (services dédiés)

---

### 1.4 Comment est gérée la validation + stepper côté voiture ?

#### ✅ Stepper interne (7 steps)

**Preuve** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` (lignes 218-226)

```typescript
const steps = [
  { id: 1, label: "Identification" },
  { id: 2, label: "Relevés" },
  { id: 3, label: "Extérieur & Coffre" },
  { id: 4, label: "Intérieur" },
  { id: 5, label: "Accessoires & Équipements" },
  { id: 6, label: "Remarques & Observations" },
  { id: 7, label: "Validation & Signature" },
];
```

**Navigation** :
- `currentStep` state : Étape actuelle (1-7)
- `nextStep()` / `prevStep()` : Navigation simple
- Barre de progression visuelle avec `Progress` component

#### ✅ Zod schemas existants

**Preuve** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` (lignes 38-214)

**Schema global** : `FormSchema` (Zod)
- Validation complète du formulaire
- Nested objects : `conducteur`, `vehicule`, `releves`, `exterieur`, `interieur`, `accessoires`, `remarques`, `signatures`
- Mode : `"onChange"` (validation en temps réel)

**Schemas par section** :
- `inspectionExterieureSchema` : Import depuis `./schemas/inspectionExterieureSchema`
- Validation par step dans chaque composant section

#### ✅ Pattern d'affichage erreurs

**Preuve** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` (lignes 306-310, 1780-1828)

**Mécanisme** :
- `invalidSteps` : Set des steps invalides (mis à jour par `Section8Validation`)
- `missingFieldsSet` / `missingFieldsList` : Champs manquants détectés
- `pendingAnchor` : Navigation automatique vers le champ manquant
- Visual feedback : Steps invalides affichés en rouge dans la barre de progression

**Section8Validation** :
- Analyse complète du formulaire
- Détecte les champs manquants par step
- Navigation automatique vers le premier champ manquant

#### ✅ Autosave

**Preuve** : `src/modules/etatDesLieuxDepart/sections/Section1Identification.tsx`, `Section2Releves.tsx`, etc.

**Pattern** :
- Chaque section sauvegarde automatiquement à la complétion (`onComplete`)
- Appel à `saveStepXDraft()` qui fait INSERT ou UPDATE selon `checkinId`
- Pas de sauvegarde automatique pendant la saisie (seulement au "Suivant")

**Exemple Step1** :
```typescript
const handleComplete = async () => {
  // ... validation ...
  const result = await saveStep1Draft({
    bookingId,
    ownerId,
    renterId,
    checkinId,
    step1: { completedAt: new Date().toISOString(), identification: {...} }
  });
  if (result.checkinId) {
    onCheckinIdChange(result.checkinId);
  }
  onComplete();
};
```

---

## 2) Incohérences probables à surveiller (confirmées par le diag)

### Incohérence A — "Moto" vs "Scooter" : type vs UI vs DB

**✅ Confirmé** :
- Phase 1 normalise `scooter` → `moto` pour le rendu (`getVehicleTypeForChecking()`)
- En DB, `vehicles.vehicle_type` reste `'scooter'` (pas normalisé)

**➡️ Risque** :
- Côté persistance moto, on pourrait enregistrer `"moto"` alors que le véhicule est `"scooter"` (mauvais analytics/filtrage)

**✅ Règle à décider** :
- **Option A** : Stocker `rawVehicleType` dans `checkin_depart` (nouvelle colonne `vehicle_type` ?)
- **Option B** : Stocker `normalizedVehicleType` dans `checkin_depart` (perte d'info)
- **Option C** : Ne pas stocker, récupérer depuis `vehicles.vehicle_type` via `booking.vehicle_id` (recommandé)

**Recommandation** : Option C (pas de stockage redondant, source de vérité = `vehicles`)

---

### Incohérence B — Draft & Final : où vit l'état "draft" ?

**✅ Confirmé** :
- Voiture utilise `checkin_depart` avec `status = 'draft'` pour les brouillons
- Système de reprise de draft avec modal de choix

**➡️ Risque** :
- Moto pourrait partir sur un autre format (localStorage ou table différente) → maintenance double

**✅ Règle** :
- **Moto doit utiliser la même table `checkin_depart`**
- **Même colonne `status`** (`'draft'` / `'completed'`)
- **Même structure JSONB `data`** (avec steps adaptés : `data.step1`, `data.step2`, etc.)
- **Même système de reprise de draft**

**Recommandation** : Réutiliser `checkin_depart` avec un champ discriminant (ex: `data.vehicle_type` ou colonne SQL `vehicle_type`)

---

### Incohérence C — Uploads : file naming / privacy / cleanup

**✅ Confirmé** :
- Structure : `booking_<bookingId>/<subfolder>/<bddColumnName>_<bookingId>_<timestamp>_<uuid>.<ext>`
- Pas de cleanup automatique des anciens fichiers
- Suppression uniquement lors de la suppression complète du draft

**➡️ Risque** :
- Si moto utilise des noms de colonnes différents, confusion dans le Storage
- Pas de cleanup → accumulation de fichiers orphelins

**✅ Règle** :
- **Moto doit utiliser les mêmes conventions de naming**
- **Même bucket `checkin-photos`**
- **Même structure de subfolders** (`depart/`, `documents/`)
- **Noms de colonnes cohérents** : Si moto a des photos spécifiques, utiliser des colonnes dédiées (ex: `photos_moto_exterieur` vs `photos_exterieur`)

**Recommandation** : Réutiliser les colonnes existantes si possible, sinon créer des colonnes dédiées avec préfixe `moto_` (ex: `photos_moto_pneus`)

---

### Incohérence D — Permissions / RLS

**✅ Confirmé** :
- Phase 1 prévoit des fallbacks pour `PGRST301` (permission denied)
- Pas de preuve explicite de RLS activé/désactivé sur `checkin_depart` dans le repo

**➡️ Pour moto** :
- Si on ne peut pas lire/écrire draft/submit, quel comportement ?

**✅ Règle** :
- **Fallback + UI message clair** (comme Phase 1)
- **Pas de "bloquage silencieux"**
- **Logs cohérents** : `[Checking] Erreur permission vehicle:` (déjà implémenté Phase 1)

**Recommandation** : Tester RLS en production et documenter le comportement attendu

---

### Incohérence E — "Submit final" : qu'est-ce que ça verrouille ?

**✅ Confirmé** :
- Status `"completed"` : Verrouille l'édition (UI devient read-only)
- Snapshot légal : Créé au submit final (immuable)
- PDF génération : Utilise uniquement `snapshot_legal`

**➡️ Moto doit avoir le même concept** :
- Soit on bloque l'édition, soit on versionne

**✅ Règle** :
- **Même sémantique que voiture** : `status = 'completed'` → verrouillage UI
- **Même snapshot légal** : Structure adaptée pour moto mais même principe
- **Même PDF génération** : Service adapté pour moto mais même pattern

**Recommandation** : Réutiliser le même système de status et snapshot, avec adaptation du contenu pour moto

---

## 3) Options de design Phase 2 (à trancher après diag)

### Option 2A — Réutiliser au maximum le modèle voiture (✅ RECOMMANDÉ)

**Stratégie** :
- **Même table** : `checkin_depart` (avec discriminant `vehicle_type` dans `data` ou colonne SQL)
- **Même structure JSONB** : `data.step1`, `data.step2`, etc. (steps adaptés pour moto)
- **Mêmes colonnes SQL** : Réutiliser si possible, sinon créer colonnes dédiées `moto_*`
- **Même service** : `SupabaseCheckinService` avec adaptation du payload
- **Même bucket Storage** : `checkin-photos` avec mêmes conventions
- **Moto = variation de champs + photos requises + UI**

**✅ Avantages** :
- Cohérence + maintenance
- Réutilisation du code existant (services, PDF, etc.)
- Pas de duplication de logique

**⚠️ Inconvénient** :
- Faut comprendre le modèle voiture (fait ✅)

---

### Option 2B — Module moto totalement séparé (❌ NON RECOMMANDÉ)

**Stratégie** :
- Table dédiée `checkin_depart_moto`
- Service dédié `SupabaseCheckinMotoService`
- UI dédiée complète

**✅ Avantage** :
- Avance vite (isolation)

**❌ Inconvénients** :
- Dette technique + double logique
- Maintenance double (services, PDF, etc.)
- Risque de divergence

---

## 4) Plan Phase 2 (micro-steps) — version provisoire (à affiner)

### Phase 2.1 — Cartographie DB/services voiture (✅ FAIT)

- [x] Table `checkin_depart` identifiée
- [x] Structure JSONB `data.stepX` identifiée
- [x] Colonnes SQL identifiées
- [x] Services identifiés (`SupabaseCheckinService`, `checkinDepartService`)

### Phase 2.2 — Cartographie Storage (✅ FAIT)

- [x] Bucket `checkin-photos` identifié
- [x] Conventions de chemin identifiées
- [x] Service `CheckinPhotoService` identifié

### Phase 2.3 — Définir modèle moto (draft + final + statuses)

**À faire** :
- Décider : Colonne SQL `vehicle_type` ou `data.vehicle_type` ?
- Définir structure `data.stepX` pour moto (6 steps vs 7 pour voiture)
- Adapter colonnes SQL si nécessaire (ex: `photos_moto_pneus`)

### Phase 2.4 — Définir requirements photos moto

**À faire** :
- Lister photos requises par step (ex: Step 3 = Extérieur moto, Pneus)
- Définir colonnes SQL dédiées si nécessaire
- Adapter conventions de naming Storage

### Phase 2.5 — Définir UI steps moto

**À faire** :
- 6 steps MVP : Identification, Relevés, Extérieur moto, Pneus, Accessoires simples, Remarques + Signatures
- Créer composants `Section1IdentificationMoto`, `Section2RelevesMoto`, etc.
- Réutiliser composants communs si possible (ex: `Section1Identification` pour Identification)

### Phase 2.6 — Définir validation Zod

**À faire** :
- Créer `FormSchemaMoto` (Zod) adapté aux 6 steps
- Réutiliser schemas communs si possible
- Adapter validation par step

### Phase 2.7 — Définir persistance (save/load)

**À faire** :
- Adapter `saveStepXDraft()` pour moto (même service ou fonctions dédiées ?)
- Adapter `hydrateFormFromCheckin()` pour moto
- Tester reprise de draft moto

### Phase 2.8 — Définir submit final (verrouillage + navigation)

**À faire** :
- Adapter `Section8Validation` pour moto (même logique, champs différents)
- Adapter création `snapshot_legal` pour moto
- Adapter génération PDF pour moto (`checkinDepartPdfService` avec condition `vehicle_type`)

### Phase 2.9 — Tests manuels (matrice)

**À faire** :
- Moto: create draft → refresh → restore
- Moto: upload photo required → preview → delete → reupload
- Moto: submit final → verrouillage
- Scooter: traité comme moto → OK
- Car: aucun changement → form voiture inchangé
- Booking introuvable → UI introuvable (Phase 1) inchangée

### Phase 2.10 — Critères de validation Phase 2

**À faire** :
- Moto fonctionne end-to-end (draft → submit → PDF)
- Scooter fonctionne comme moto
- Voiture inchangée (non-régression)
- Performance acceptable (pas de dégradation)

---

## 5) Tests manuels Phase 2 (brouillon)

### Tests fonctionnels

- [ ] **Moto: create draft → refresh → restore**
  - Créer un draft moto Step 1
  - Refresh la page
  - Vérifier que le draft est restauré (modal de choix)

- [ ] **Moto: upload photo required → preview → delete → reupload**
  - Upload photo permis recto
  - Vérifier preview
  - Supprimer la photo
  - Reupload une nouvelle photo

- [ ] **Moto: submit final → verrouillage**
  - Compléter tous les steps
  - Submit final
  - Vérifier que le formulaire devient read-only
  - Vérifier que `status = 'completed'`

- [ ] **Scooter: traité comme moto → OK**
  - Créer un booking avec `vehicle_type = 'scooter'`
  - Vérifier que l'UI moto s'affiche (pas placeholder)
  - Compléter le check-in
  - Vérifier que les données sont sauvegardées

- [ ] **Car: aucun changement → form voiture inchangé**
  - Créer un booking avec `vehicle_type = 'car'`
  - Vérifier que le form voiture s'affiche (7 steps)
  - Compléter le check-in
  - Vérifier que tout fonctionne comme avant

- [ ] **Booking introuvable → UI introuvable (Phase 1) inchangée**
  - Accéder à `/checking/invalid-booking-id`
  - Vérifier que `BookingNotFoundUI` s'affiche

### Tests de non-régression

- [ ] Voiture : Tous les steps fonctionnent
- [ ] Voiture : Upload photos fonctionne
- [ ] Voiture : PDF génération fonctionne
- [ ] Voiture : Reprise de draft fonctionne

---

## 6) Décisions à prendre avant implémentation

### Décision 1 : Stockage `vehicle_type` dans `checkin_depart`

**Options** :
- **A** : Colonne SQL `vehicle_type` (nouvelle colonne)
- **B** : `data.vehicle_type` (JSONB)
- **C** : Pas de stockage, récupérer depuis `vehicles` via `booking.vehicle_id`

**Recommandation** : Option C (pas de redondance, source de vérité = `vehicles`)

### Décision 2 : Structure `data.stepX` pour moto

**Options** :
- **A** : Même structure que voiture (steps 1-7, certains vides pour moto)
- **B** : Structure adaptée (steps 1-6 seulement)

**Recommandation** : Option B (structure adaptée, plus claire)

### Décision 3 : Colonnes SQL pour photos moto

**Options** :
- **A** : Réutiliser colonnes existantes (`photos_exterieur`, etc.)
- **B** : Créer colonnes dédiées (`photos_moto_pneus`, etc.)

**Recommandation** : Option A si possible, Option B si nécessaire (ex: photos spécifiques moto)

### Décision 4 : Service de sauvegarde

**Options** :
- **A** : Réutiliser `SupabaseCheckinService.saveCheckinDraft()` avec adaptation payload
- **B** : Créer `SupabaseCheckinMotoService` dédié

**Recommandation** : Option A (réutilisation, moins de duplication)

---

## 7) Prochaines étapes

1. **Valider ce diagnostic** avec l'équipe
2. **Trancher les décisions** (section 6)
3. **Affiner le plan** Phase 2 (section 4) selon les décisions
4. **Créer les micro-steps détaillés** pour l'implémentation
5. **Démarrer l'implémentation** Phase 2.3 (modèle moto)

---

**Document créé le** : 2025-01-XX  
**Version** : Draft v0  
**Statut** : En attente de validation

