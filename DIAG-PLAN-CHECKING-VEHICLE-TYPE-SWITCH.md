# 🔍 Diagnostic & Plan : Switch automatique Checking selon type véhicule

**Date** : 2025-01-XX  
**Projet** : Rentanoo Scoot  
**Objectif** : Mettre en place un switch automatique pour afficher une expérience checking adaptée selon `vehicle_type` (voiture vs moto/scooter)

---

## 📋 Table des matières

1. [Diagnostic précis du flux actuel](#1-diagnostic-précis-du-flux-actuel)
2. [Recommandation architecture (Option A/B)](#2-recommandation-architecture-option-ab)
3. [Règles incontournables](#3-règles-incontournables)
4. [MVP moto (structure simple)](#4-mvp-moto-structure-simple)
5. [Plan d'implémentation détaillé](#5-plan-dimplémentation-détaillé)
6. [Risques & Mitigations](#6-risques--mitigations)
7. [Critères d'acceptation](#7-critères-dacceptation)

---

## 1️⃣ Diagnostic précis du flux actuel

### 1.1 Confirmation de l'ID route

**Route actuelle** : `/checking/:bookingId`

**Preuve que c'est bien un `bookingId` (table `bookings.id`)** :

1. **Dans `src/App.tsx` ligne 170** :
   ```typescript
   <Route path="/checking/:bookingId" element={<Checking />} />
   ```

2. **Dans `src/pages/Checking.tsx` ligne 10** :
   ```typescript
   const { bookingId } = useParams<{ bookingId: string }>();
   ```

3. **Requête Supabase dans `Checking.tsx` lignes 23-27** :
   ```typescript
   const { data, error } = await supabase
     .from("bookings")
     .select("reference_number")
     .eq("id", bookingId)  // ← Preuve : requête sur table bookings avec id
     .single();
   ```

4. **Requête Supabase dans `EtatDesLieuxDepartForm.tsx` lignes 569-573** :
   ```typescript
   const { data: booking, error: bookingError } = await supabase
     .from("bookings")
     .select("id, user_id, vehicle_id, start_date, end_date, reference_number, pickup_location")
     .eq("id", bookingId)  // ← Preuve : requête sur table bookings avec id
     .single();
   ```

**Conclusion** : ✅ **C'est bien un `bookingId`** (UUID de la table `bookings.id`), pas un `checkingId`.

**Détection de risque** : Si un ID invalide est passé, les requêtes Supabase retourneront une erreur (`PGRST116` = "not found") qui est déjà gérée dans le code existant (lignes 575-584 de `EtatDesLieuxDepartForm.tsx`).

### 1.2 Flux "checking voiture" complet

#### **Étape 1 : Chargement initial (`Checking.tsx`)**

1. **Récupération `reference_number`** :
   - Requête : `bookings.select("reference_number").eq("id", bookingId)`
   - Usage : Affichage dans le titre de la page ("Réservation n° X")

#### **Étape 2 : Chargement données réservation (`EtatDesLieuxDepartForm.tsx` lignes 545-808)**

**2.1 Récupération booking** :
- **Requête** : `bookings.select("id, user_id, vehicle_id, start_date, end_date, reference_number, pickup_location").eq("id", bookingId)`
- **Données extraites** :
  - `user_id` → ID du locataire/conducteur
  - `vehicle_id` → ID du véhicule loué
  - `start_date`, `end_date` → Dates de réservation
  - `reference_number` → Numéro lisible de réservation
  - `pickup_location` → Lieu de prise en charge

**2.2 Récupération véhicule** :
- **Requête** : `vehicles.select("id, brand, model, license_plate, owner_id").eq("id", booking.vehicle_id)`
- **⚠️ PROBLÈME IDENTIFIÉ** : `vehicle_type` n'est **PAS** récupéré actuellement (ligne 639)
- **Données extraites** :
  - `brand`, `model`, `license_plate` → Pré-remplissage formulaire
  - `owner_id` → ID du propriétaire

**2.3 Récupération profil conducteur** :
- **Requête** : `profiles.select("first_name, last_name, phone, email, driver_license_*, ...").eq("id", booking.user_id)`
- **Usage** : Pré-remplissage Step 1 (identification)

**2.4 Récupération profil propriétaire** :
- **Requête** : `profiles.select("first_name, last_name, phone, email").eq("id", vehicle.owner_id)`
- **Usage** : Affichage dans Step 7 (validation)

#### **Étape 3 : Vérification draft existant (`EtatDesLieuxDepartForm.tsx` lignes 1061-1124)**

**Requête** : `checkin_depart.select("*").eq("booking_id", bookingId).eq("status", "draft").order("created_at", { ascending: false }).limit(1)`

**Comportement** :
- Si draft existe → Modal de choix (poursuivre / redémarrer)
- Si pas de draft → Nouveau check-in

#### **Étape 4 : Sauvegarde progressive par step**

**Service utilisé** : `src/services/checkinDepartService.ts`

**Fonctions disponibles** :
- `saveStep1Draft()` → Step 1 (Identification)
- `saveStep2Draft()` → Step 2 (Relevés)
- `saveStep3Draft()` → Step 3 (Extérieur & Coffre)
- `saveStep4Draft()` / `saveStep4SectionDraft()` → Step 4 (Intérieur)
- `saveStep5Draft()` → Step 5 (Accessoires)
- `saveStep6Draft()` → Step 6 (Remarques)
- `saveStep7Draft()` → Step 7 (Validation & Signatures)

**Pattern de sauvegarde** :
1. Chaque step appelle `SupabaseCheckinService.saveCheckinDraft()`
2. Si `checkinId` existe → UPDATE (merge avec données existantes)
3. Si `checkinId` n'existe pas → INSERT (création nouveau draft)
4. Retourne `{ checkinId, status, data }` pour propagation dans les composants enfants

**Structure stockée** :
- **Colonne JSONB `data`** : Structure `{ step1: {...}, step2: {...}, step3: {...}, ... }`
- **Colonnes SQL dédiées** : `kilometrage_depart`, `niveau_carburant`, `photos_dashboard`, `photos_exterieur`, `photos_jantes`, `photos_coffre`, `degats`, `photo_permis_recto`, `photo_permis_verso`, `signature_owner`, `signature_renter`, `validated_at`

#### **Étape 5 : Finalisation (`checkinDepartService.ts` lignes 962-1201)**

**Fonction** : `finalizeCheckinDepart()`

**Processus** :
1. **Sauvegarde Step 7** : Signatures + `validatedAt`
2. **Création snapshot légal** : `SupabaseCheckinService.createLegalSnapshot()`
   - Snapshot = copie figée de toutes les données au moment de la validation
   - Stocké dans `checkin_depart.snapshot_legal` (JSONB)
   - Structure : `CheckinLegalSnapshot` (voir `src/types/snapshot-legal.ts`)
3. **Changement statut** : `status = "draft"` → `status = "completed"`
4. **Génération PDF** (non-bloquant) : `generateCheckinDepartPdf()`
   - Lit `snapshot_legal` (source de vérité)
   - Génère PDF HTML → Canvas → Blob
   - Upload dans Supabase Storage (`checkin-photos` bucket)
   - Stocke URL dans `checkin_depart.legal_pdf_url`

#### **Étape 6 : Génération PDF (`checkinDepartPdfService.ts`)**

**Dépendances** :
- ✅ `checkin.status = "completed"` (ou `skipStatusCheck = true`)
- ✅ `checkin.snapshot_legal` existe (obligatoire)
- ✅ DOM disponible (côté client uniquement)

**Processus** :
1. Charger `checkin_depart` avec `snapshot_legal`
2. Vérifier que `snapshot_legal` existe
3. Générer PDF Blob via `generatePdfBlob(snapshot, checkin)`
4. Upload dans Storage : `checkin-photos/resa_{referenceNumber}/documents/etat_des_lieux_depart_{checkinId}.pdf`
5. Retourner URL publique

**⚠️ IMPORTANT** : Le PDF dépend uniquement de `snapshot_legal`, pas des steps individuels. Si `snapshot_legal` est créé correctement, le PDF fonctionnera même si les steps ont une structure différente (voiture vs moto).

### 1.3 Stockage état des lieux

**Table** : `checkin_depart`

**Structure** :
- **Colonne JSONB `data`** : `{ step1: {...}, step2: {...}, step3: {...}, step4: {...}, step5: {...}, step6: {...}, step7: {...} }`
- **Colonnes SQL** : `kilometrage_depart`, `niveau_carburant`, `photos_dashboard`, `photos_exterieur`, `photos_jantes`, `photos_coffre`, `degats`, `photo_permis_recto`, `photo_permis_verso`, `signature_owner`, `signature_renter`, `validated_at`, `snapshot_legal`, `legal_pdf_url`

**Relation** :
- `checkin_depart.booking_id` → `bookings.id` (FK)
- `checkin_depart.owner_id` → `profiles.id` (FK)
- `checkin_depart.renter_id` → `profiles.id` (FK)

**⚠️ NOTE** : `vehicle_type` n'est **PAS** stocké dans `checkin_depart`. Il doit être récupéré dynamiquement depuis `vehicles.vehicle_type` via `bookings.vehicle_id`.

---

## 2️⃣ Recommandation architecture (Option A/B)

### 2.1 Option A : Rendu conditionnel (RECOMMANDÉE)

**Principe** :
- Une seule route `/checking/:bookingId`
- Récupération `vehicle_type` dans `Checking.tsx` (un seul endroit)
- Rendu conditionnel : `vehicle_type === 'car'` → `<EtatDesLieuxDepartForm />`, sinon → `<EtatDesLieuxDepartFormMoto />`

**Avantages** :
- ✅ **Cohérent avec l'architecture** : Pattern déjà utilisé dans le repo (ex: `VehicleDetails.tsx` vs `MotoVehicleDetails.tsx` avec routes séparées, mais ici on veut éviter redirection)
- ✅ **Pas de changement d'URL** : Backward compatible avec liens existants
- ✅ **Pas de redirection** : Meilleure UX (pas de flash blanc)
- ✅ **Code centralisé** : Une seule page wrapper, logique de switch claire
- ✅ **Facile à maintenir** : Un seul endroit pour gérer le switch

**Inconvénients** :
- ⚠️ Composants plus complexes (conditions dans le rendu)
- ⚠️ Taille bundle légèrement plus grande (mais lazy-load possible via `React.lazy()`)

**Cohérence avec le repo** :
- Le repo utilise déjà des routes séparées pour `/vehicle/:license` vs `/moto/:license`
- Mais pour checking, on veut éviter redirection car l'URL est partagée (email, SMS, etc.)
- Option A est donc cohérente : même route, rendu conditionnel

### 2.2 Option B : Routes séparées (NON RECOMMANDÉE)

**Principe** :
- Routes `/checking/:bookingId/car` et `/checking/:bookingId/moto`
- Sur `/checking/:bookingId`, redirection automatique selon `vehicle_type`

**Avantages** :
- ✅ Séparation claire du code
- ✅ URLs explicites

**Inconvénients** :
- ❌ **Redirection = latence** : Requête supplémentaire + flash blanc
- ❌ **Risque de casser les liens existants** : URLs partagées (email, SMS) pointent vers `/checking/:bookingId`
- ❌ **Plus complexe à maintenir** : Deux routes à gérer
- ❌ **Pas cohérent avec l'objectif** : L'utilisateur ne doit pas choisir, donc pas besoin d'URL explicite

**Verdict** : ❌ **Option B non recommandée** pour ce cas d'usage.

### 2.3 Recommandation finale

✅ **Option A (rendu conditionnel)** est la meilleure solution pour ce projet.

**Justification** :
1. Cohérent avec l'architecture (pattern conditionnel déjà utilisé ailleurs)
2. Backward compatible (pas de changement d'URL)
3. Meilleure UX (pas de redirection)
4. Un seul endroit pour décider du type (`Checking.tsx`)

---

## 3️⃣ Règles incontournables

### 3.1 Un seul endroit décide du type

**Règle** : `src/pages/Checking.tsx` est le **seul endroit** qui récupère `vehicle_type` et décide du rendu.

**Implémentation** :
- Ajouter un `useEffect` dans `Checking.tsx` qui :
  1. Récupère `booking.vehicle_id` depuis `bookings`
  2. Récupère `vehicle.vehicle_type` depuis `vehicles`
  3. Stocke `vehicleType` dans un state local
  4. Passe `vehicleType` comme prop à `EtatDesLieuxDepartForm` / `EtatDesLieuxDepartFormMoto`

**Interdiction** :
- ❌ Ne pas récupérer `vehicle_type` dans `EtatDesLieuxDepartForm.tsx`
- ❌ Ne pas récupérer `vehicle_type` dans les composants enfants
- ❌ Ne pas faire de fetch redondant ailleurs

**Justification** : Éviter les requêtes multiples et centraliser la logique de décision.

### 3.2 Fonction utilitaire centralisée de normalisation

**Fichier** : `src/utils/vehicleType.ts` (existe déjà avec `isMoto()`, à étendre)

**Fonction à créer** : `getVehicleTypeForChecking(vehicleType: string | null | undefined): 'car' | 'moto'`

**Règles de normalisation** :
- `null` / `undefined` → `'car'` (fallback)
- `'car'` → `'car'`
- `'moto'` → `'moto'`
- `'scooter'` → `'moto'` (traité comme moto)
- Valeur inconnue (ex: `'truck'`, `'van'`) → `'car'` + `console.warn()`

**Usage** :
- Appelée uniquement dans `Checking.tsx` après récupération `vehicle_type`
- Résultat stocké dans state et utilisé pour le rendu conditionnel

**Exemple de signature** :
```typescript
function getVehicleTypeForChecking(
  vehicleType: string | null | undefined
): 'car' | 'moto' {
  // Implémentation avec règles ci-dessus
}
```

### 3.3 Compatibilité DB/PDF

**Problème** : L'UI moto a moins d'étapes (6 vs 7), mais les services et PDF attendent une structure cohérente.

**Stratégie de mapping** :

1. **Structure JSONB `data`** :
   - **Voiture** : `{ step1, step2, step3, step4, step5, step6, step7 }`
   - **Moto** : `{ step1, step2, step3, step4, step5, step6, step7 }` (même structure)
     - `step1` → Identification (identique)
     - `step2` → Relevés (identique)
     - `step3` → Extérieur moto (structure différente mais même clé)
     - `step4` → Pneus & Freins moto (structure différente mais même clé)
     - `step5` → Équipements moto (structure différente mais même clé)
     - `step6` → Remarques (identique)
     - `step7` → Validation & Signatures (identique, obligatoire pour PDF)

2. **Services de sauvegarde** :
   - Réutiliser les mêmes fonctions `saveStep1Draft()`, `saveStep2Draft()`, etc.
   - Les services ne vérifient pas la structure interne des steps, seulement la présence de `stepX`
   - Compatibilité garantie si on garde les mêmes clés (`step1`, `step2`, ..., `step7`)

3. **Génération PDF** :
   - Le PDF lit `snapshot_legal` (créé lors de `finalizeCheckinDepart()`)
   - `snapshot_legal` est créé à partir de `checkin_depart.data` (tous les steps)
   - **Stratégie** : Adapter `createLegalSnapshot()` pour détecter `vehicle_type` et créer un snapshot adapté (voiture vs moto)
   - **Alternative MVP** : Créer un snapshot "moto" avec structure minimale, PDF s'adaptera ensuite

4. **Colonnes SQL** :
   - Réutiliser les mêmes colonnes (`kilometrage_depart`, `niveau_carburant`, `photos_dashboard`, etc.)
   - Certaines colonnes peuvent être `NULL` pour moto (ex: `photos_coffre` si pas de coffre)
   - Pas de problème de compatibilité si colonnes optionnelles

**Règle d'or** : **Conserver la structure `step1` à `step7`** même pour moto, avec des structures internes adaptées.

---

## 4️⃣ MVP moto (structure simple)

### 4.1 Structure en 6 étapes (affichage utilisateur)

**Note** : L'utilisateur voit 6 étapes, mais la persistance utilise toujours `step1` à `step7` pour compatibilité.

#### **Step 1 : Identification** (réutiliser existant)
- **Composant** : `Section1Identification.tsx` (identique voiture)
- **Données** : Conducteur (nom, prénom, permis, photos), Véhicule (marque, modèle, immatriculation), Réservation (dates, lieu)
- **Persistance** : `data.step1` (identique voiture)

#### **Step 2 : Relevés** (adapté)
- **Composant** : `Section2Releves.tsx` (adapter labels)
- **Données** :
  - Kilométrage (nombre entier, min 0)
  - Niveau carburant / batterie (0-100%)
  - Photos compteur (minimum 1 photo obligatoire)
- **Persistance** : `data.step2` (structure identique voiture, labels adaptés)

#### **Step 3 : Extérieur moto simple** (nouveau composant)
- **Composant** : `ExteriorInspectionAccordionMoto.tsx` (nouveau)
- **Zones** :
  1. **Avant** : Photo zone (obligatoire) + Dégâts (oui/non) + Description/photos si oui
  2. **Côté droit** : Photo zone (obligatoire) + Dégâts (oui/non) + Description/photos si oui
  3. **Arrière** : Photo zone (obligatoire) + Dégâts (oui/non) + Description/photos si oui
  4. **Côté gauche** : Photo zone (obligatoire) + Dégâts (oui/non) + Description/photos si oui
  5. **Propreté extérieure** : Niveau (Excellent/Bon/Moyen/Sale) + Photos (obligatoire) + Notes
- **⚠️ EXCLUS** : Zone "Coffre", Jantes séparées, Équipements coffre
- **Persistance** : `data.step3` (structure adaptée, clé `step3` conservée)

#### **Step 4 : Pneus** (nouveau composant)
- **Composant** : `PneusInspection.tsx` (nouveau)
- **Données** :
  - **Pneu avant** : Photo (obligatoire) + État (OK/Usé/Abîmé/Crevé) + Dégâts (oui/non) + Description/photos si oui
  - **Pneu arrière** : Photo (obligatoire) + État (OK/Usé/Abîmé/Crevé) + Dégâts (oui/non) + Description/photos si oui
- **⚠️ EXCLUS** : Freins détaillés (pour MVP)
- **Persistance** : `data.step4` (structure adaptée, clé `step4` conservée)

#### **Step 5 : Accessoires simples** (nouveau composant)
- **Composant** : `Section5EquipementsMoto.tsx` (nouveau)
- **Checklist** :
  - Clés (obligatoire) : Présent ? (oui/non)
  - Antivol : Présent ? (oui/non)
  - Top case : Présent ? (oui/non) + État (OK/Abîmé/Non fonctionnel) si présent + Photos si présent
- **⚠️ EXCLUS** : Éclairage détaillé, Rétroviseurs détaillés, Documents avancés (pour MVP)
- **Persistance** : `data.step5` (structure adaptée, clé `step5` conservée)

#### **Step 6 : Remarques + Signatures** (fusion Step 6 + 7)
- **Composant** : `Section6RemarquesEtValidation.tsx` (nouveau, fusion)
- **Données** :
  - Remarques : Observations générales (texte libre)
  - Signatures : Propriétaire (obligatoire) + Locataire (obligatoire)
- **Persistance** :
  - `data.step6` : Remarques
  - `data.step7` : Validation & Signatures (obligatoire pour PDF)

### 4.2 Mapping persistance (compatibilité)

**Structure `data` pour moto** :
```json
{
  "step1": { /* Identification (identique voiture) */ },
  "step2": { /* Relevés (identique voiture) */ },
  "step3": { /* Extérieur moto (structure adaptée) */ },
  "step4": { /* Pneus (structure adaptée) */ },
  "step5": { /* Accessoires moto (structure adaptée) */ },
  "step6": { /* Remarques (identique voiture) */ },
  "step7": { /* Validation & Signatures (identique voiture, obligatoire) */ }
}
```

**Règle** : Toujours créer `step7` même si l'UI fusionne Step 6 + 7, pour garantir compatibilité PDF.

### 4.3 Champs requis MVP moto

**Photos obligatoires** :
- Step 1 : Permis recto + verso
- Step 2 : Compteur (minimum 1)
- Step 3 : 4 zones extérieures (avant, droit, arrière, gauche) + propreté extérieure
- Step 4 : Pneus avant + arrière
- Step 6 : Signatures propriétaire + locataire

**Champs obligatoires** :
- Step 1 : Tous les champs conducteur
- Step 2 : Kilométrage + niveau carburant
- Step 3 : Photos zones + propreté extérieure
- Step 4 : Photos pneus + état pneus
- Step 5 : Clés (obligatoire)
- Step 6 : Signatures

---

## 5️⃣ Plan d'implémentation détaillé

### 5.1 Phase 1 : Préparation (récupération `vehicle_type`)

**Fichiers à modifier** :

1. **`src/pages/Checking.tsx`** :
   - Ajouter state `vehicleType: 'car' | 'moto' | null`
   - Ajouter state `loadingVehicleType: boolean`
   - Ajouter `useEffect` pour récupérer `vehicle_type` :
     - Requête 1 : `bookings.select("vehicle_id").eq("id", bookingId)`
     - Requête 2 : `vehicles.select("vehicle_type").eq("id", booking.vehicle_id)`
     - Normaliser via `getVehicleTypeForChecking()`
     - Stocker dans state
   - Passer `vehicleType` comme prop à `EtatDesLieuxDepartForm` / `EtatDesLieuxDepartFormMoto`
   - Rendu conditionnel selon `vehicleType`

2. **`src/utils/vehicleType.ts`** :
   - Ajouter fonction `getVehicleTypeForChecking(vehicleType: string | null | undefined): 'car' | 'moto'`
   - Implémenter règles de normalisation (voir section 3.2)
   - Exporter fonction

**Données à ajouter aux SELECT** :
- `vehicles.select("vehicle_type")` (actuellement manquant ligne 639 de `EtatDesLieuxDepartForm.tsx`)

**Où mettre le "switch"** :
- Dans `Checking.tsx` ligne ~80-85 (rendu conditionnel)

### 5.2 Phase 2 : Création composants moto

**Nouveaux composants à créer** :

1. **`src/modules/etatDesLieuxDepart/EtatDesLieuxDepartFormMoto.tsx`** :
   - Copier structure de `EtatDesLieuxDepartForm.tsx`
   - Adapter steps (6 étapes au lieu de 7)
   - Imports : `ExteriorInspectionAccordionMoto`, `PneusInspection`, `Section5EquipementsMoto`, `Section6RemarquesEtValidation`
   - `renderStep()` adapté pour 6 steps
   - Réutiliser `Section1Identification` et `Section2Releves` (avec props adaptées)

2. **`src/components/ExteriorInspectionAccordionMoto.tsx`** :
   - Copier structure de `ExteriorInspectionAccordionSimple.tsx`
   - Adapter zones (5 zones : avant, droit, arrière, gauche, propreté)
   - Supprimer zone "Coffre"
   - Supprimer gestion jantes séparées
   - Simplifier types de dégâts (carrosserie uniquement)
   - Sauvegarde via `saveStep3Draft()` (compatible)

3. **`src/modules/etatDesLieuxDepart/sections/PneusInspection.tsx`** :
   - Nouveau composant
   - Sections : Pneu avant, Pneu arrière
   - Champs : Photo (obligatoire), État (OK/Usé/Abîmé/Crevé), Dégâts (oui/non), Description/photos si oui
   - Sauvegarde via `saveStep4Draft()` (structure adaptée)

4. **`src/modules/etatDesLieuxDepart/sections/Section5EquipementsMoto.tsx`** :
   - Copier structure de `Section5Accessoires.tsx`
   - Adapter checklist : Clés (obligatoire), Antivol, Top case (présent + état + photos si présent)
   - Supprimer éléments voiture (gilet, triangle, roue secours, cric, cable, manuel, carte carburant)
   - Sauvegarde via `saveStep5Draft()` (structure adaptée)

5. **`src/modules/etatDesLieuxDepart/sections/Section6RemarquesEtValidation.tsx`** :
   - Fusion de `Section6Remarques.tsx` + `Section8Validation.tsx`
   - Sections : Remarques (texte libre) + Signatures (propriétaire + locataire)
   - Sauvegarde : `saveStep6Draft()` pour remarques + `saveStep7Draft()` pour signatures (obligatoire)

**Composants existants à réutiliser** :
- `Section1Identification.tsx` (identique)
- `Section2Releves.tsx` (adapter labels uniquement)

### 5.3 Phase 3 : Types & Schémas

**Nouveaux types à créer** :

1. **`src/types/step3-moto.ts`** :
   - Interface `InspectionExterieureMoto` (zones avant, droit, arrière, gauche, propreté)
   - Types dégâts carrosserie moto

2. **`src/types/step4-moto.ts`** :
   - Interface `PneusInspection` (pneu avant, pneu arrière)

3. **`src/types/step5-moto.ts`** :
   - Interface `EquipementsMoto` (cles, antivol, topCase)

**Nouveaux schémas Zod à créer** :

1. **`src/modules/etatDesLieuxDepart/schemas/inspectionExterieureMotoSchema.ts`** :
   - Schéma Zod pour Step 3 moto

2. **`src/modules/etatDesLieuxDepart/schemas/pneusSchema.ts`** :
   - Schéma Zod pour Step 4 moto

3. **`src/modules/etatDesLieuxDepart/schemas/equipementsMotoSchema.ts`** :
   - Schéma Zod pour Step 5 moto

**Schéma formulaire moto** :
- Créer `FormSchemaMoto` dans `EtatDesLieuxDepartFormMoto.tsx` (6 steps, structure adaptée)

### 5.4 Phase 4 : Services & Sauvegarde

**Services existants à réutiliser** :
- `saveStep1Draft()`, `saveStep2Draft()`, `saveStep6Draft()`, `saveStep7Draft()` (identiques)
- `saveStep3Draft()`, `saveStep4Draft()`, `saveStep5Draft()` (structure adaptée mais compatibles)

**Modifications services** :
- Aucune modification nécessaire si structure `step1` à `step7` conservée
- Les services ne vérifient pas la structure interne, seulement la présence de `stepX`

**Stratégie de validation** :
- Validation côté formulaire (Zod schemas)
- Validation côté services : Vérifier présence `step7` avant `finalizeCheckinDepart()`
- Validation PDF : Adapter `createLegalSnapshot()` pour détecter `vehicle_type` et créer snapshot adapté (MVP : snapshot minimal moto)

### 5.5 Phase 5 : Stockage photos

**Conventions Storage** :

- **Voiture** : `checkin-photos/resa_{referenceNumber}/exterieur/{zone}/photo_{timestamp}.jpg`
- **Moto** : `checkin-photos/resa_{referenceNumber}/exterieur_moto/{zone}/photo_{timestamp}.jpg`
- **Pneus moto** : `checkin-photos/resa_{referenceNumber}/pneus/{avant|arriere}/photo_{timestamp}.jpg`

**Helpers à créer** :

1. **`src/modules/etatDesLieuxDepart/helpers/step3MotoHelpers.ts`** :
   - Fonction `uploadZonePhotoMoto()` (adaptée pour zones moto)

2. **`src/modules/etatDesLieuxDepart/helpers/step4MotoHelpers.ts`** :
   - Fonction `uploadPneuPhoto()` (avant/arrière)

### 5.6 Phase 6 : Compatibilité PDF

**Modifications nécessaires** :

1. **`src/services/supabaseCheckinService.ts`** :
   - Fonction `createLegalSnapshot()` :
     - Détecter `vehicle_type` depuis `vehicles` (via `booking.vehicle_id`)
     - Créer snapshot adapté selon type (voiture vs moto)
     - Structure `CheckinLegalSnapshot` à adapter pour moto (MVP : champs minimaux)

2. **`src/services/checkinDepartPdfService.ts`** :
   - Fonction `generatePdfBlob()` :
     - Détecter type depuis `snapshot.vehicle.type` (si présent)
     - Adapter template HTML selon type (MVP : template minimal moto)

**Stratégie MVP** :
- Créer snapshot moto avec structure minimale (champs essentiels)
- PDF s'affichera avec données disponibles (pas de crash)
- Affinage template PDF dans phase suivante

### 5.7 Ordre d'implémentation recommandé

1. **Phase 1** : Récupération `vehicle_type` + switch dans `Checking.tsx`
2. **Phase 2** : Création `EtatDesLieuxDepartFormMoto.tsx` (structure de base)
3. **Phase 3** : Création composants Step 3, 4, 5, 6 moto
4. **Phase 4** : Types & Schémas Zod
5. **Phase 5** : Helpers upload photos
6. **Phase 6** : Compatibilité PDF (snapshot + template)

---

## 6️⃣ Risques & Mitigations

### 6.1 Risque : RLS (Row Level Security)

**Problème** : Les policies RLS sur `vehicles` peuvent bloquer l'accès à `vehicle_type` si la colonne n'est pas explicitement autorisée.

**Mitigation** :
- Vérifier que les policies RLS sur `vehicles` permettent la lecture de `vehicle_type`
- Tester avec un utilisateur non-propriétaire (locataire) pour vérifier l'accès
- Si nécessaire, mettre à jour les policies pour inclure `vehicle_type` dans les SELECT autorisés

**Test** : Requête `vehicles.select("vehicle_type").eq("id", vehicleId)` avec utilisateur locataire.

### 6.2 Risque : Step manquants

**Problème** : Si `step7` n'est pas créé pour moto, `finalizeCheckinDepart()` peut échouer.

**Mitigation** :
- Toujours créer `step7` même si l'UI fusionne Step 6 + 7
- Validation dans `finalizeCheckinDepart()` : Vérifier présence `step7` avant création snapshot
- Message d'erreur explicite si `step7` manquant

**Test** : Créer checking moto sans `step7`, vérifier que `finalizeCheckinDepart()` retourne erreur claire.

### 6.3 Risque : PDF crash

**Problème** : Le PDF peut crasher si `snapshot_legal` a une structure inattendue (moto vs voiture).

**Mitigation** :
- Adapter `createLegalSnapshot()` pour créer snapshot adapté selon `vehicle_type`
- Adapter `generatePdfBlob()` pour détecter type et utiliser template adapté
- MVP : Template PDF minimal moto (champs essentiels uniquement)
- Gestion d'erreur : Try/catch dans `generatePdfBlob()` avec message explicite

**Test** : Générer PDF pour checking moto, vérifier qu'il ne crash pas et affiche les données disponibles.

### 6.4 Risque : Anciens checkings sans `vehicle_type`

**Problème** : Les véhicules existants peuvent avoir `vehicle_type = NULL`.

**Mitigation** :
- Fallback `NULL` → `'car'` (comportement existant)
- Fonction `getVehicleTypeForChecking()` gère ce cas
- Aucun impact sur les checkings existants (traités comme voiture)

**Test** : Vérifier qu'un véhicule `vehicle_type = NULL` affiche UI voiture.

### 6.5 Risque : Valeur inattendue `vehicle_type`

**Problème** : Si `vehicle_type` a une valeur inattendue (ex: `'truck'`), le switch peut échouer.

**Mitigation** :
- Fonction `getVehicleTypeForChecking()` retourne `'car'` + `console.warn()`
- Fallback sécurisé : Toujours retourner `'car'` ou `'moto'`, jamais `null`
- Log warning pour détecter les valeurs inattendues en production

**Test** : Simuler `vehicle_type = 'truck'`, vérifier fallback `'car'` + warning.

### 6.6 Risque : Performance (requêtes multiples)

**Problème** : Récupérer `vehicle_type` ajoute une requête supplémentaire.

**Mitigation** :
- Requête optimisée : `vehicles.select("vehicle_type").eq("id", vehicleId).single()` (une seule colonne)
- Cache possible : Stocker `vehicleType` dans state pour éviter re-fetch
- Lazy-load composants moto : `React.lazy()` pour réduire bundle initial

**Test** : Mesurer temps de chargement avec/sans récupération `vehicle_type`.

---

## 7️⃣ Critères d'acceptation

### 7.1 Tests manuels minimum

#### **Test 1 : Véhicule `vehicle_type = 'car'` → UI voiture inchangée**

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'car'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier que l'UI voiture s'affiche (7 étapes)
5. Vérifier que toutes les fonctionnalités existantes fonctionnent

**Critères de succès** :
- ✅ UI voiture identique à l'existant
- ✅ 7 étapes affichées
- ✅ Sauvegarde progressive fonctionne
- ✅ Génération PDF fonctionne

#### **Test 2 : Véhicule `vehicle_type = 'moto'` → UI moto MVP**

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'moto'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier que l'UI moto s'affiche (6 étapes)
5. Remplir tous les champs obligatoires
6. Finaliser le checking

**Critères de succès** :
- ✅ UI moto affichée (6 étapes)
- ✅ Step 3 : Extérieur moto (5 zones, pas de coffre)
- ✅ Step 4 : Pneus (avant + arrière)
- ✅ Step 5 : Accessoires moto (clés, antivol, top case)
- ✅ Step 6 : Remarques + Signatures
- ✅ Sauvegarde progressive fonctionne
- ✅ Génération PDF fonctionne (même si template minimal)

#### **Test 3 : Véhicule `vehicle_type = 'scooter'` → UI moto**

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'scooter'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier que l'UI moto s'affiche (pas UI voiture)

**Critères de succès** :
- ✅ UI moto affichée (identique `vehicle_type = 'moto'`)

#### **Test 4 : Véhicule `vehicle_type = NULL` → Fallback car**

**Scénario** :
1. Utiliser un véhicule existant avec `vehicle_type = NULL`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier que l'UI voiture s'affiche (fallback)

**Critères de succès** :
- ✅ UI voiture affichée (fallback `NULL` → `'car'`)
- ✅ Aucune erreur console

#### **Test 5 : Génération PDF ne crash pas**

**Scénario** :
1. Créer un checking moto complet (tous les steps)
2. Finaliser le checking (signatures)
3. Vérifier que le PDF est généré
4. Ouvrir le PDF et vérifier qu'il contient les données

**Critères de succès** :
- ✅ PDF généré sans erreur
- ✅ PDF contient les données moto (même si template minimal)
- ✅ URL PDF stockée dans `checkin_depart.legal_pdf_url`

#### **Test 6 : Sauvegarde ne crash pas**

**Scénario** :
1. Créer un checking moto
2. Remplir Step 1, 2, 3, 4, 5, 6
3. Vérifier que chaque step se sauvegarde correctement
4. Vérifier que les données sont stockées en DB

**Critères de succès** :
- ✅ Chaque step se sauvegarde sans erreur
- ✅ Données stockées dans `checkin_depart.data` (structure `step1` à `step7`)
- ✅ Colonnes SQL remplies correctement (photos, signatures, etc.)

### 7.2 Tests de régression

#### **Test 7 : Checking voiture existant fonctionne toujours**

**Scénario** :
1. Utiliser un checking voiture existant (créé avant l'implémentation)
2. Vérifier qu'il s'affiche correctement
3. Vérifier que le PDF fonctionne toujours

**Critères de succès** :
- ✅ Checking voiture existant affiché correctement
- ✅ PDF voiture existant généré correctement
- ✅ Aucune régression

### 7.3 Checklist finale

- [ ] Test 1 : `vehicle_type = 'car'` → UI voiture ✅
- [ ] Test 2 : `vehicle_type = 'moto'` → UI moto ✅
- [ ] Test 3 : `vehicle_type = 'scooter'` → UI moto ✅
- [ ] Test 4 : `vehicle_type = NULL` → Fallback car ✅
- [ ] Test 5 : Génération PDF moto ✅
- [ ] Test 6 : Sauvegarde moto ✅
- [ ] Test 7 : Régression voiture ✅

---

## 📝 Résumé exécutif

### Ce qui doit être fait

1. **Récupérer `vehicle_type`** dans `Checking.tsx` (un seul endroit)
2. **Créer fonction de normalisation** `getVehicleTypeForChecking()`
3. **Créer `EtatDesLieuxDepartFormMoto.tsx`** (6 étapes)
4. **Créer composants Step 3, 4, 5, 6 moto**
5. **Adapter `createLegalSnapshot()`** pour moto
6. **Adapter `generatePdfBlob()`** pour template moto

### Ce qui ne doit PAS être fait

- ❌ Routes séparées `/checking/:id/car` et `/checking/:id/moto`
- ❌ Stocker `vehicle_type` dans `checkin_depart` (récupéré dynamiquement)
- ❌ Modifier la structure `step1` à `step7` (garder pour compatibilité)

### Risques principaux

1. **RLS** → Vérifier policies `vehicles`
2. **PDF crash** → Adapter snapshot + template
3. **Step manquants** → Toujours créer `step7`

### Critères de succès

- ✅ `vehicle_type = 'car'` → UI voiture inchangée
- ✅ `vehicle_type = 'moto'` / `'scooter'` → UI moto MVP
- ✅ `vehicle_type = NULL` → Fallback car
- ✅ Génération PDF fonctionne
- ✅ Sauvegarde fonctionne
- ✅ Aucune régression voiture

---

**Fin du document**

