# 🔍 Phase 2 : Diagnostic & Plan (Version Finale)

**Objectif Phase 2** : Remplacer le placeholder moto par un vrai **État des lieux Départ Moto/Scooter**, avec persistance + uploads + submit final, sans régression voiture.

**Principe** : Phase 1 reste le "router" : `Checking.tsx` décide car/moto. Phase 2 ajoute un module moto complet.

**Statut** : Diagnostic final — Prêt pour validation avant implémentation step-by-step

---

## 1) Diagnostic factuel (preuves repo)

### 1.1 Routing Phase 1 (car/moto) — ✅ IMPLÉMENTÉ

**Preuve** : `src/pages/Checking.tsx` (lignes 195-202)

```typescript
{vehicleType === "moto" ? (
  <CheckingMotoPlaceholder bookingId={bookingId} />
) : (
  <EtatDesLieuxDepartForm 
    bookingId={bookingId} 
    bookingReferenceNumber={referenceNumber}
  />
)}
```

**Comportement actuel** :
- `vehicleType` déterminé depuis `vehicles.vehicle_type` via `getVehicleTypeForChecking()` (normalise `scooter` → `moto`)
- Placeholder moto affiché si `vehicleType === "moto"` (ligne 129-143)
- Form voiture affiché sinon (fallback car)

**Point de remplacement** : Ligne 196 — `CheckingMotoPlaceholder` doit être remplacé par `EtatDesLieuxDepartFormMoto`

---

### 1.2 Voiture : flow draft → completed → read-only

#### Table de base de données : `checkin_depart`

**Preuve** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 258-300)

**Structure** :
- Colonnes SQL : `id`, `booking_id`, `owner_id`, `renter_id`, `status`, `data` (JSONB), `kilometrage_depart`, `niveau_carburant`, `photos_dashboard`, `photos_exterieur`, `photos_jantes`, `photos_coffre`, `degats`, `remarques_owner`, `remarques_renter`, `signature_owner`, `signature_renter`, `validated_at`, `photo_permis_recto`, `photo_permis_verso`, `snapshot_legal` (JSONB), colonnes snapshot (driver_email, owner_email, etc.), `legal_pdf_url`
- Status : `'draft'` (brouillon) ou `'completed'` (finalisé)

#### Format payload : Hybride JSONB + colonnes SQL

**Preuve** : `src/services/supabaseCheckinService.ts` (lignes 78-319)

**Structure JSONB `data`** :
- `data.step1.identification` : Infos conducteur + photos permis
- `data.step2.releves` : Kilométrage, carburant, photos dashboard
- `data.step3` : Extérieur, coffre, dégâts (zonesPhotos, damageReports)
- `data.step4` : Intérieur (sieges, propreteGenerale, equipements)
- `data.step5` : Accessoires
- `data.step6` : Remarques
- `data.step7.validation` : Signatures + validatedAt

**Colonnes SQL dédiées** : Extraction depuis JSONB pour performance + snapshot légal

#### Draft : Chargement et reprise

**Preuve** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` (lignes 1061-1124)

**Flow** :
1. Au mount : Recherche `checkin_depart` avec `status = 'draft'` et `booking_id = bookingId` (ligne 1077-1084)
2. Si draft trouvé : Modal de choix "Poursuivre" ou "Redémarrer à zéro" (ligne 1100-1110)
3. Poursuivre : Hydratation du formulaire depuis `data.stepX` + redirection vers step suivant (ligne 1388-1434)
4. Redémarrer : Suppression draft BDD + fichiers Storage + reset formulaire (ligne 1439-1488)

**Suppression Storage** : `deleteCheckinDraftAndFiles()` collecte tous les `storagePath` depuis colonnes SQL + JSONB et supprime via `supabase.storage.from('checkin-photos').remove(paths[])` (lignes 1213-1271)

#### Final Submit : Verrouillage + snapshot légal

**Preuve** : `src/services/checkinDepartService.ts` (lignes 962-1201)

**Flow** :
1. `finalizeCheckinDepart()` appelé depuis `Section8Validation` (ligne 11)
2. Création `snapshot_legal` via `SupabaseCheckinService.createLegalSnapshot()` (ligne 1034-1037)
3. Changement status `'draft'` → `'completed'` via `updateCheckinStatus()` (ligne 1059-1062)
4. Génération PDF (non-bloquant) via `generateCheckinDepartPdf()` (ligne 1080+)

**Verrouillage UI** : `checkinStatus === "completed"` → formulaire read-only (ligne 1827)

**Snapshot légal** : `src/services/supabaseCheckinService.ts` (lignes 384-769)
- Charge checkin, booking, profiles, vehicle
- Construit `CheckinLegalSnapshot` complet
- Sauvegarde dans `checkin_depart.snapshot_legal` (JSONB)
- Remplit colonnes SQL snapshot (driver_email, owner_email, etc.)

---

### 1.3 Persist/Services

#### Service principal : `SupabaseCheckinService`

**Preuve** : `src/services/supabaseCheckinService.ts` (lignes 68-853)

**Méthodes clés** :
- `saveCheckinDraft(payload)` : INSERT ou UPDATE selon `checkin_id` (lignes 78-319)
  - Merge JSONB : `data` fusionné (pas écrasé) pour préserver steps non modifiés (lignes 130-134)
  - Extraction colonnes SQL depuis JSONB (lignes 136-179)
  - Verrouillage backend : Empêche modification si `status = 'completed'` (lignes 114-124)
- `createLegalSnapshot(checkinId, options)` : Crée snapshot immuable (lignes 384-769)
- `updateCheckinStatus(checkinId, newStatus)` : Change status (ligne 771+)
- `getCheckinById(checkinId)` : Récupère checkin complet

#### Service de sauvegarde progressive : `checkinDepartService`

**Preuve** : `src/services/checkinDepartService.ts`

**Méthodes** :
- `saveStep1Draft()` : Sauvegarde Step1 uniquement
- `saveStep2Draft()` : Sauvegarde Step2 uniquement
- `saveStep3Draft()` : Sauvegarde Step3 uniquement
- `finalizeCheckinDepart()` : Finalise (snapshot + status + PDF)

**Pattern** : Chaque step sauvegarde son payload dans `data.stepX` via `saveCheckinDraft()`

---

### 1.4 Upload photos

#### Bucket et conventions

**Preuve** : `src/services/supabase/checkinPhotos.ts` (lignes 32-147)

**Bucket** : `checkin-photos` (ligne 32)

**Structure de chemin** :
```
resa_<referenceNumber>/<subfolder>/<bddColumnName>_<referenceNumber>_<timestamp>_<uuid>.<ext>
```

**Exemples** :
- Permis recto : `resa_8/documents/photo_permis_recto_8_1730846234567_a3f8k2.jpg`
- Dashboard : `resa_8/depart/photos_dashboard_8_1730846300000_c4d5e6.jpg`
- Extérieur avant : `resa_8/depart/photos_exterieur_avant_8_1730846400000_d7e8f9.jpg`

**Subfolders** :
- `documents/` : Photos de permis, documents
- `depart/` : Photos de l'état des lieux de départ
- `depart/interior/<section>/` : Photos intérieures par section (ex: `sieges/`)

**Naming intelligent** :
- Utilise `bookingReferenceNumber` si disponible (ex: `resa_8/...`)
- Fallback sur `bookingId` si `referenceNumber` absent (ex: `booking_abc123/...`)
- Suffixe contextuel optionnel (ex: `_avant`, `_degat_0`)

#### Contraintes et suppression

**Preuve** : `src/services/supabase/checkinPhotos.ts` (lignes 33, 69-75)

**Limites** :
- Taille max : `10 * 1024 * 1024` (10 MB) — **enforced côté client**
- Type : Validation `file.type.startsWith('image/')` — **enforced côté client**

**Suppression** :
- Pas de cleanup automatique des anciens fichiers
- Suppression uniquement lors de la suppression complète du draft (via `deleteCheckinDraftAndFiles()`)

---

### 1.5 Génération PDF

**Preuve** : `src/services/checkinDepartPdfService.ts` (lignes 73-309)

**Service** : `generateCheckinDepartPdf(checkinId, options)`

**Flow** :
1. Charge checkin avec `snapshot_legal` (ligne 101)
2. Vérifie `status === 'completed'` (sauf si `skipStatusCheck`) (ligne 124)
3. Vérifie présence `snapshot_legal` (ligne 137)
4. Génère PDF depuis `snapshot_legal` uniquement (ligne 146)
5. Upload PDF vers Storage `checkin-photos` (ligne 192-197)
6. Met à jour `legal_pdf_url` dans `checkin_depart` (ligne 254-257)

**Point clé** : PDF utilise **uniquement `snapshot_legal`** (pas de jointure avec bookings/profiles/vehicles)

**Verrouillage** : PDF généré uniquement si `status === 'completed'` (sauf bypass)

---

### 1.6 Validation voiture

**Preuve** : `src/modules/etatDesLieuxDepart/sections/Section8Validation.tsx` (lignes 344-450)

#### Calcul `invalidSteps` et `missingFields`

**Fonction** : `checkValidationData(showToast)` (ligne 344+)

**Logique** :
- Vérifie champs requis par section : conducteur, propriétaire, véhicule, relevés, signatures (lignes 400-425)
- Retourne `{ isValid, missingFields: string[] }` (ligne 449)
- Calcule `invalidSteps` via `computeInvalidStepsFromMissingFields(missing)` (ligne 435)
- Met à jour `validationStatus` state (ligne 429)

**Propagation** :
- `onMissingFieldsChange(missing)` → met à jour `missingFieldsSet` et `missingFieldsList` dans `EtatDesLieuxDepartForm` (ligne 431)
- `onInvalidStepsChange(computeInvalidStepsFromMissingFields(missing))` → met à jour `invalidSteps` dans `EtatDesLieuxDepartForm` (ligne 435)

#### Navigation anchor

**Preuve** : `src/modules/etatDesLieuxDepart/sections/Section8Validation.tsx` (lignes 458-470)

**Fonction** : `navigateToFirstMissing(missingFields)` (ligne 469)

**Comportement** :
- Navigation automatique vers le premier champ manquant (ligne 466-469)
- Scroll + focus sur le champ (via `pendingAnchor` dans `EtatDesLieuxDepartForm`)
- Navigation en chaîne : dès qu'un champ est résolu, passe au suivant (ligne 459-470)

---

## 2) Décisions validées (à intégrer explicitement)

### Décision 1 : PDF identique pour moto et voiture

**✅ Validé** : Moto/Scooter doit produire le **même PDF** que voiture (même template). Les sections non pertinentes peuvent être vides/N-A.

**Impact** :
- `checkinDepartPdfService.generateCheckinDepartPdf()` reste inchangé
- `snapshot_legal` doit avoir la même structure pour moto et voiture
- Sections moto non pertinentes (ex: coffre, intérieur détaillé) → valeurs `null` ou `"N/A"` dans snapshot

---

### Décision 2 : Routing UI Phase 1 inchangé

**✅ Validé** : Le routing UI reste basé sur Phase 1 : `Checking.tsx` lit `vehicles.vehicle_type` et décide car/moto (scooter normalisé moto).

**Impact** :
- Aucun changement dans `Checking.tsx` (sauf remplacement placeholder)
- `getVehicleTypeForChecking()` reste la source de vérité pour le rendu

---

### Décision 3 : Payload auto-suffisant

**✅ Validé** : Le payload `snapshot_legal` (et/ou `data`) doit être **auto-suffisant** pour :
- générer le PDF
- rendre l'UI read-only en `completed`

**Impact** :
- `snapshot_legal` doit contenir toutes les données nécessaires (pas de jointure au moment du PDF)
- `data` doit permettre l'hydratation complète du formulaire (moto ou voiture)

---

### Décision 4 : Pas de colonne `vehicle_type` dans `checkin_depart`

**✅ Validé** : On ne crée PAS de colonne `vehicle_type` dans `checkin_depart`. Mais on ajoute dans `snapshot_legal` un champ **informatif** (pas source de vérité), ex: `snapshot_legal.vehicle.type_raw` (valeur brute depuis `vehicles.vehicle_type` au moment du submit final).

**Impact** :
- Pas de migration DB nécessaire
- `snapshot_legal.vehicle.type_raw` ajouté lors de `createLegalSnapshot()` (ex: `"car"`, `"moto"`, `"scooter"`)
- Source de vérité reste `vehicles.vehicle_type` (récupéré via `booking.vehicle_id`)

---

### Décision 5 : ValidationMoto dédiée

**✅ Validé** : On crée une **ValidationMoto dédiée** (plus clean, moins de risque de casser voiture).

**Impact** :
- Nouveau composant `Section8ValidationMoto` (copie adaptée de `Section8Validation`)
- Champs requis différents pour moto (ex: pas de coffre, pas d'intérieur détaillé)
- Logique de validation isolée (pas de modification de `Section8Validation` voiture)

---

### Décision 6 : Steps 7 identiques (structure)

**✅ Validé** : Les steps moto doivent **réutiliser la structure 7 steps** (comme voiture). On garde les index 1..7. Certaines sections peuvent être N/A/vides ou adaptées moto, mais le stepper reste 7.

**Impact** :
- Structure `data.step1` à `data.step7` identique pour moto et voiture
- Steps moto adaptés :
  - Step 1 : Identification (identique)
  - Step 2 : Relevés (identique)
  - Step 3 : Extérieur moto (adapté : pas de coffre, zones différentes)
  - Step 4 : Intérieur (simplifié ou N/A pour moto)
  - Step 5 : Accessoires (adapté : liste différente)
  - Step 6 : Remarques (identique)
  - Step 7 : Validation & Signature (identique)

---

## 3) Incohérences / risques (au moins 6)

### Risque 1 : `type_raw` vs normalized dans snapshot

**Problème** :
- Phase 1 normalise `scooter` → `moto` pour le rendu
- Snapshot doit stocker `type_raw` (valeur brute : `"scooter"`)
- Risque : Confusion entre valeur normalisée (UI) et valeur brute (snapshot)

**Règle de cohérence** :
- `snapshot_legal.vehicle.type_raw` = valeur brute depuis `vehicles.vehicle_type` (ex: `"scooter"`)
- `snapshot_legal.vehicle.type_normalized` = valeur normalisée pour affichage (ex: `"moto"`)
- PDF affiche `type_normalized` (cohérence avec UI)

---

### Risque 2 : PDF identique vs champs moto spécifiques

**Problème** :
- PDF template identique pour moto et voiture
- Moto a des champs spécifiques (ex: pneus moto, pas de coffre)
- Risque : Sections PDF vides ou incohérentes pour moto

**Règle de cohérence** :
- Sections non pertinentes moto → valeurs `null` ou `"N/A"` dans snapshot
- PDF template gère les valeurs `null`/`"N/A"` avec affichage "Non applicable"
- Sections moto spécifiques (ex: pneus) → mapping vers sections PDF existantes (ex: "Roues & Pneus")

---

### Risque 3 : Steps 7 identiques vs UX moto

**Problème** :
- Structure 7 steps imposée (décision 6)
- UX moto pourrait nécessiter moins de steps (ex: 6 steps)
- Risque : Steps vides ou redondants pour moto

**Règle de cohérence** :
- Steps 1-7 toujours présents dans `data`
- Steps non pertinents moto → `data.stepX = null` ou structure minimale
- UI moto peut masquer/afficher steps selon pertinence (stepper visuel reste 7)

---

### Risque 4 : Colonnes photos existantes vs moto-specific

**Problème** :
- Colonnes SQL existantes : `photos_exterieur`, `photos_jantes`, `photos_coffre`
- Moto a des photos spécifiques (ex: pneus moto, pas de coffre)
- Risque : Confusion dans le mapping photos

**Règle de cohérence** :
- Réutiliser colonnes existantes si possible (ex: `photos_exterieur` pour extérieur moto)
- Colonnes non pertinentes moto → `null` ou `[]` (ex: `photos_coffre = null`)
- Si photos moto spécifiques non couvertes → utiliser colonnes génériques (ex: `photos_accessoires` pour accessoires moto)

---

### Risque 5 : Reprise de draft et delete files

**Problème** :
- Système de reprise de draft existant (modal "Poursuivre"/"Redémarrer")
- Moto doit utiliser le même système
- Risque : Draft moto/voiture mélangés ou suppression incorrecte

**Règle de cohérence** :
- Même table `checkin_depart` pour moto et voiture
- Recherche draft : `status = 'draft'` et `booking_id = bookingId` (pas de filtre `vehicle_type`)
- Suppression Storage : Même logique `collectAllStoragePathsFromCheckin()` (fonctionne pour moto et voiture)

---

### Risque 6 : Permissions/RLS

**Problème** :
- Phase 1 prévoit des fallbacks pour `PGRST301` (permission denied)
- Pas de preuve explicite de RLS activé/désactivé sur `checkin_depart`
- Risque : Moto pourrait échouer silencieusement sur permissions

**Règle de cohérence** :
- Fallback + UI message clair (comme Phase 1)
- Logs cohérents : `[Checking] Erreur permission vehicle:` (déjà implémenté Phase 1)
- Tester RLS en production et documenter le comportement attendu

---

## 4) Proposition d'architecture Phase 2

### 4.1 Nouveau module moto (où, naming)

**Structure proposée** :
```
src/modules/etatDesLieuxDepartMoto/
├── EtatDesLieuxDepartFormMoto.tsx          # Composant principal (copie adaptée de EtatDesLieuxDepartForm)
├── sections/
│   ├── Section1IdentificationMoto.tsx      # Step 1 (identique ou réutilisé)
│   ├── Section2RelevesMoto.tsx             # Step 2 (identique ou réutilisé)
│   ├── Section3ExterieurMoto.tsx           # Step 3 (adapté : extérieur moto)
│   ├── Section4InterieurMoto.tsx           # Step 4 (simplifié ou N/A)
│   ├── Section5AccessoiresMoto.tsx         # Step 5 (adapté : accessoires moto)
│   ├── Section6RemarquesMoto.tsx           # Step 6 (identique ou réutilisé)
│   └── Section8ValidationMoto.tsx          # Step 7 (dédié, décision 5)
├── schemas/
│   └── formSchemaMoto.ts                   # Zod schema adapté pour moto
└── types/
    └── step3Moto.ts                        # Types Step3 adaptés moto
```

**Réutilisation** :
- `Section1Identification` : Réutilisable tel quel (identification conducteur identique)
- `Section2Releves` : Réutilisable tel quel (relevés identiques)
- `Section6Remarques` : Réutilisable tel quel (remarques identiques)
- Services : `SupabaseCheckinService`, `checkinDepartService`, `CheckinPhotoService` → réutilisés

---

### 4.2 Stratégie data/snapshot : où stocker quoi

#### Structure `data` (JSONB)

**Pattern** : Même structure `data.step1` à `data.step7` pour moto et voiture

**Adaptations moto** :
- `data.step3` : Structure adaptée (pas de coffre, zones différentes)
  ```typescript
  {
    zonesPhotos: {
      avant: [...],
      cote_droit: [...],
      arriere: [...],
      cote_gauche: [...],
      pneus: [...],  // ⭐ NOUVEAU pour moto
      // coffre: null  // ⭐ Non applicable
    },
    damageReports: [...],
    zonesHasDamage: {...},
    propreteExterieure: {...}
  }
  ```
- `data.step4` : Structure simplifiée ou `null`
- `data.step5` : Accessoires adaptés (ex: casque, gants, pas de roue de secours)

#### Structure `snapshot_legal`

**Pattern** : Même structure `CheckinLegalSnapshot` pour moto et voiture

**Adaptations moto** :
- `snapshot_legal.vehicle.type_raw` : Valeur brute (`"moto"` ou `"scooter"`) — **décision 4**
- `snapshot_legal.vehicle.type_normalized` : Valeur normalisée (`"moto"`) — **décision 4**
- `snapshot_legal.exterior` : Sections non pertinentes → `null` ou `"N/A"`
- `snapshot_legal.interior` : Simplifié ou `null` pour moto

**Création** : `SupabaseCheckinService.createLegalSnapshot()` adapté pour inclure `type_raw` et `type_normalized`

---

### 4.3 Stratégie mapping photos (réutiliser colonnes existantes si possible)

**Colonnes SQL existantes** :
- `photo_permis_recto`, `photo_permis_verso` : Réutilisées (Step 1)
- `photos_dashboard` : Réutilisée (Step 2)
- `photos_exterieur` : Réutilisée (Step 3 extérieur moto)
- `photos_jantes` : Réutilisée (Step 3 pneus moto)
- `photos_coffre` : `null` pour moto (non applicable)
- `photos_accessoires` : Réutilisée (Step 5 accessoires moto)
- `degats` : Réutilisée (Step 3 dégâts)

**Conventions Storage** :
- Même bucket `checkin-photos`
- Même structure de chemins (`resa_<N>/depart/...`)
- Suffixes contextuels adaptés (ex: `_pneus` au lieu de `_coffre`)

---

### 4.4 ValidationMoto dédiée

**Composant** : `Section8ValidationMoto.tsx` (copie adaptée de `Section8Validation.tsx`)

**Champs requis moto** :
- Step 1 : Identification (identique)
- Step 2 : Relevés (identique)
- Step 3 : Extérieur moto (adapté : pas de coffre, pneus requis)
- Step 4 : Intérieur (optionnel ou simplifié)
- Step 5 : Accessoires moto (adapté)
- Step 6 : Remarques (identique)
- Step 7 : Signatures (identique)

**Logique** : `checkValidationDataMoto()` adaptée avec champs requis moto

---

## 5) Plan Phase 2 en 8-12 micro-steps

### Micro-step 1 : Créer structure module moto

**Objectif** : Créer la structure de dossiers et fichiers de base

**Actions** :
- Créer `src/modules/etatDesLieuxDepartMoto/`
- Créer `EtatDesLieuxDepartFormMoto.tsx` (copie de `EtatDesLieuxDepartForm.tsx` avec adaptations)
- Créer dossiers `sections/`, `schemas/`, `types/`

**Critères de validation** :
- Structure créée
- Fichiers compilent (même si non fonctionnels)

---

### Micro-step 2 : Adapter Step 1-2-6 (réutiliser composants existants)

**Objectif** : Réutiliser les composants identiques pour moto

**Actions** :
- `Section1IdentificationMoto` : Import et réutiliser `Section1Identification` tel quel
- `Section2RelevesMoto` : Import et réutiliser `Section2Releves` tel quel
- `Section6RemarquesMoto` : Import et réutiliser `Section6Remarques` tel quel

**Critères de validation** :
- Steps 1, 2, 6 fonctionnent pour moto (identique à voiture)

---

### Micro-step 3 : Créer Step 3 Extérieur Moto

**Objectif** : Créer le composant Step 3 adapté pour moto

**Actions** :
- Créer `Section3ExterieurMoto.tsx` (inspiré de `ExteriorInspectionAccordionSimple`)
- Adapter zones : avant, cote_droit, arriere, cote_gauche, pneus (pas de coffre)
- Adapter types `step3Moto.ts` (zonesPhotos, damageReports)
- Réutiliser `CheckinPhotoService` pour uploads

**Critères de validation** :
- Step 3 moto fonctionne (zones adaptées, pas de coffre)
- Photos uploadées correctement (colonnes `photos_exterieur`, `photos_jantes`)

---

### Micro-step 4 : Créer Step 4 Intérieur Moto (simplifié)

**Objectif** : Créer Step 4 simplifié ou N/A pour moto

**Actions** :
- Créer `Section4InterieurMoto.tsx` (simplifié ou placeholder "Non applicable")
- Adapter `data.step4` : Structure minimale ou `null`

**Critères de validation** :
- Step 4 moto fonctionne (simplifié ou N/A)
- Pas d'erreur si step4 vide

---

### Micro-step 5 : Créer Step 5 Accessoires Moto

**Objectif** : Créer Step 5 adapté pour accessoires moto

**Actions** :
- Créer `Section5AccessoiresMoto.tsx` (inspiré de `Section5Accessoires`)
- Adapter liste accessoires : casque, gants, cadenas, etc. (pas de roue de secours)
- Réutiliser colonne `photos_accessoires` pour photos

**Critères de validation** :
- Step 5 moto fonctionne (accessoires adaptés)
- Photos accessoires uploadées correctement

---

### Micro-step 6 : Créer Step 7 ValidationMoto dédiée

**Objectif** : Créer `Section8ValidationMoto` avec validation adaptée

**Actions** :
- Créer `Section8ValidationMoto.tsx` (copie de `Section8Validation.tsx`)
- Adapter `checkValidationDataMoto()` : Champs requis moto
- Adapter navigation anchor : Champs moto spécifiques
- Réutiliser logique signatures (identique)

**Critères de validation** :
- Validation moto fonctionne (champs requis adaptés)
- Navigation anchor fonctionne
- Signatures fonctionnent

---

### Micro-step 7 : Adapter Zod schema moto

**Objectif** : Créer `formSchemaMoto.ts` adapté

**Actions** :
- Créer `formSchemaMoto.ts` (inspiré de `FormSchema` voiture)
- Adapter validation Step 3 (zones moto)
- Adapter validation Step 4 (optionnel ou simplifié)
- Adapter validation Step 5 (accessoires moto)

**Critères de validation** :
- Schema moto compile
- Validation fonctionne pour tous les steps

---

### Micro-step 8 : Adapter persistance (saveStepX pour moto)

**Objectif** : Adapter les fonctions de sauvegarde pour moto

**Actions** :
- Réutiliser `saveStep1Draft()`, `saveStep2Draft()` (identiques)
- Adapter `saveStep3Draft()` : Payload Step3 moto
- Adapter `saveStep4Draft()` : Payload Step4 moto simplifié
- Adapter `saveStep5Draft()` : Payload Step5 moto
- Réutiliser `saveStep6Draft()` (identique)

**Critères de validation** :
- Sauvegarde progressive fonctionne pour moto
- `data.stepX` correctement structuré en BDD

---

### Micro-step 9 : Adapter snapshot légal (inclure type_raw)

**Objectif** : Adapter `createLegalSnapshot()` pour inclure `type_raw` et `type_normalized`

**Actions** :
- Modifier `SupabaseCheckinService.createLegalSnapshot()` :
  - Charger `vehicles.vehicle_type` depuis `booking.vehicle_id`
  - Ajouter `snapshot_legal.vehicle.type_raw` (valeur brute)
  - Ajouter `snapshot_legal.vehicle.type_normalized` (valeur normalisée via `getVehicleTypeForChecking()`)
- Adapter mapping snapshot moto : Sections non pertinentes → `null` ou `"N/A"`

**Critères de validation** :
- Snapshot moto créé avec `type_raw` et `type_normalized`
- Sections non pertinentes → `null` ou `"N/A"`

---

### Micro-step 10 : Adapter finalizeCheckinDepart pour moto

**Objectif** : Adapter la finalisation pour moto

**Actions** :
- Réutiliser `finalizeCheckinDepart()` (identique)
- Vérifier que snapshot moto fonctionne
- Vérifier que PDF génération fonctionne (même template)

**Critères de validation** :
- Finalisation moto fonctionne (snapshot + status + PDF)
- PDF généré correctement (sections non pertinentes → "N/A")

---

### Micro-step 11 : Remplacer placeholder dans Checking.tsx

**Objectif** : Remplacer `CheckingMotoPlaceholder` par `EtatDesLieuxDepartFormMoto`

**Actions** :
- Importer `EtatDesLieuxDepartFormMoto` dans `Checking.tsx`
- Remplacer `<CheckingMotoPlaceholder bookingId={bookingId} />` par `<EtatDesLieuxDepartFormMoto bookingId={bookingId} bookingReferenceNumber={referenceNumber} />`
- Supprimer composant `CheckingMotoPlaceholder` (lignes 129-143)

**Critères de validation** :
- Moto affiche le formulaire complet (pas le placeholder)
- Scooter affiche le formulaire moto (normalisé)

---

### Micro-step 12 : Tests end-to-end et non-régression

**Objectif** : Valider le flow complet moto et vérifier non-régression voiture

**Actions** :
- Tests manuels moto (voir section 7)
- Tests manuels voiture (vérifier que rien n'est cassé)
- Tests edge cases (scooter, vehicle_type null, etc.)

**Critères de validation** :
- Tous les tests passent
- Non-régression voiture confirmée

---

## 6) Table cas d'erreurs & fallback

| Cas d'erreur | Détection | Fallback | Log |
|--------------|-----------|----------|-----|
| `vehicle_type` null/undefined | Phase 1 (`getVehicleTypeForChecking`) | `'car'` + warning | `[Checking] vehicle_id NULL, fallback car` |
| `vehicle_type` inconnu | Phase 1 (`getVehicleTypeForChecking`) | `'car'` + warning | `[Checking] Valeur inattendue vehicle_type: <value>` |
| Booking introuvable (`PGRST116`) | Phase 1 (`Checking.tsx`) | `BookingNotFoundUI` | `[Checking] Réservation introuvable: <bookingId>` |
| Vehicle introuvable (`PGRST116`) | Phase 1 (`Checking.tsx`) | `'car'` + form voiture | `[Checking] Vehicle introuvable: <error>` |
| Permission denied (`PGRST301`) | Phase 1 (`Checking.tsx`) | `'car'` + form voiture | `[Checking] Erreur permission vehicle: <error>` |
| Draft introuvable | `loadExistingCheckinDraft()` | Nouveau check-in | `[CHECKIN_DRAFT] ℹ️ Aucun draft existant` |
| Snapshot déjà existant | `createLegalSnapshot()` | Skip (si `force=false`) | `[SupabaseCheckinService] ℹ️ Snapshot déjà existant` |
| PDF génération échoue | `generateCheckinDepartPdf()` | Non-bloquant (status reste `completed`) | `[CheckinDepartPdfService] ❌ Erreur génération PDF` |
| Upload photo échoue | `CheckinPhotoService.uploadCheckinPhoto()` | Erreur retournée, pas de fallback | `[CheckinPhotoService] ❌ Erreur upload: <error>` |
| Validation incomplète | `Section8ValidationMoto.checkValidationDataMoto()` | Bloque submit, affiche champs manquants | Toast + navigation anchor |

---

## 7) Tests manuels + critères de validation

### Tests fonctionnels moto

- [ ] **Moto: create draft → refresh → restore**
  - Créer un draft moto Step 1
  - Refresh la page
  - Vérifier que le draft est restauré (modal de choix "Poursuivre"/"Redémarrer")

- [ ] **Moto: upload photo required → preview → delete → reupload**
  - Upload photo permis recto
  - Vérifier preview
  - Supprimer la photo
  - Reupload une nouvelle photo

- [ ] **Moto: submit final → verrouillage**
  - Compléter tous les steps (1-7)
  - Submit final
  - Vérifier que le formulaire devient read-only
  - Vérifier que `status = 'completed'`

- [ ] **Moto: PDF génération**
  - Après submit final
  - Vérifier que PDF est généré
  - Vérifier que PDF contient les données moto (sections non pertinentes → "N/A")

- [ ] **Scooter: traité comme moto → OK**
  - Créer un booking avec `vehicle_type = 'scooter'`
  - Vérifier que l'UI moto s'affiche (pas placeholder)
  - Compléter le check-in
  - Vérifier que les données sont sauvegardées
  - Vérifier que `snapshot_legal.vehicle.type_raw = 'scooter'` et `type_normalized = 'moto'`

### Tests de non-régression voiture

- [ ] **Voiture: aucun changement → form voiture inchangé**
  - Créer un booking avec `vehicle_type = 'car'`
  - Vérifier que le form voiture s'affiche (7 steps complets)
  - Compléter le check-in
  - Vérifier que tout fonctionne comme avant

- [ ] **Voiture: draft → restore**
  - Créer un draft voiture
  - Refresh la page
  - Vérifier que le draft est restauré

- [ ] **Voiture: PDF génération**
  - Après submit final voiture
  - Vérifier que PDF est généré correctement

### Tests edge cases

- [ ] **Booking introuvable → UI introuvable (Phase 1) inchangée**
  - Accéder à `/checking/invalid-booking-id`
  - Vérifier que `BookingNotFoundUI` s'affiche

- [ ] **Vehicle introuvable → fallback car**
  - Créer un booking avec `vehicle_id` invalide
  - Vérifier que form voiture s'affiche (fallback)

- [ ] **Vehicle_type null → fallback car**
  - Créer un booking avec `vehicle_type = null`
  - Vérifier que form voiture s'affiche (fallback)

---

## 8) Règles de cohérence (à écrire noir sur blanc)

### Règle 1 : Même table `checkin_depart`

- Moto utilise `checkin_depart` (même table que voiture)
- Même colonne `status` (`'draft'` / `'completed'`)
- Pas de colonne `vehicle_type` dans `checkin_depart` (décision 4)

---

### Règle 2 : `snapshot_legal` avec `type_raw`

- `snapshot_legal.vehicle.type_raw` = valeur brute depuis `vehicles.vehicle_type` (ex: `"scooter"`)
- `snapshot_legal.vehicle.type_normalized` = valeur normalisée pour affichage (ex: `"moto"`)
- Ajouté lors de `createLegalSnapshot()` (micro-step 9)

---

### Règle 3 : PDF identique

- PDF reste identique pour moto et voiture (même template)
- Sections non pertinentes moto → valeurs `null` ou `"N/A"` dans snapshot
- PDF template gère les valeurs `null`/`"N/A"` avec affichage "Non applicable"

---

### Règle 4 : ValidationMoto isolée

- `Section8ValidationMoto` ne doit pas impacter le code voiture
- Pas de modification de `Section8Validation` voiture
- Validation moto avec champs requis adaptés

---

### Règle 5 : Steps 1-7 toujours présents

- Structure `data.step1` à `data.step7` toujours présente pour moto
- Steps non pertinents moto → `data.stepX = null` ou structure minimale
- Stepper visuel reste 7 steps (pas 6)

---

### Règle 6 : Conventions Storage identiques

- Même bucket `checkin-photos`
- Même structure de chemins (`resa_<N>/depart/...`)
- Même subfolders (`documents/`, `depart/`)
- Suffixes contextuels adaptés (ex: `_pneus` au lieu de `_coffre`)

---

## 9) Checklist "Prêt pour implémentation"

### Conditions de validation remplies

- [x] **Diagnostic factuel complet** : Toutes les preuves repo identifiées (routing, DB, services, photos, PDF, validation)
- [x] **Décisions validées intégrées** : 6 décisions explicitement intégrées dans le plan
- [x] **Incohérences identifiées** : 6 risques identifiés avec règles de cohérence
- [x] **Architecture proposée** : Structure module moto, stratégie data/snapshot, mapping photos, ValidationMoto
- [x] **Plan micro-steps détaillé** : 12 micro-steps avec objectifs, actions, critères de validation
- [x] **Cas d'erreurs documentés** : Table complète avec détection, fallback, logs
- [x] **Tests manuels définis** : Matrice complète (moto, voiture, edge cases)
- [x] **Règles de cohérence écrites** : 6 règles noires sur blanches

### Points à valider avant implémentation

- [ ] **Validation décisions** : Les 6 décisions sont-elles définitives ?
- [ ] **Validation architecture** : La structure module moto est-elle approuvée ?
- [ ] **Validation plan** : Les 12 micro-steps sont-ils dans le bon ordre ?
- [ ] **Validation tests** : La matrice de tests est-elle complète ?

---

**Document créé le** : 2025-01-XX  
**Version** : Finale  
**Statut** : ✅ Prêt pour validation avant implémentation

