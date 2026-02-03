# Diagnostic Git - Changements du 3 février 2026

**Date du diagnostic** : 3 février 2026  
**Branche actuelle** : `main`  
**Dernier commit** : `993745c` (fix: Correction perte heure réservation dans snapshot légal + Workflow n8n EDL)

---

## A) État Git actuel

### `git status`
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  - 39 fichiers modifiés (tracked)
  - 3 fichiers non trackés (untracked)

Untracked files:
  - DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md
  - DIAG-RETOUR-MOTO-VS-VOITURE.md
  - supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql
```

### `git branch --show-current`
```
main
```

### `git log -n 10 --oneline --decorate`
```
993745c (HEAD -> main, origin/main, origin/HEAD) fix: Correction perte heure réservation dans snapshot légal + Workflow n8n EDL
ab16224 feat(moto): dégâts (damageReports) + photos + validation + finalisation UX
baf718d chore: commit all remaining local changes
a8ce2d1 chore: sync local UI fixes and service updates
76d7f54 (backup/moto-module-complete) fix(moto): commit module moto (Step1 sans champs permis) + sections manquantes
cd31c1b feat(moto): P0 prefill vehicule + persistance Step2 avant finalisation
7fe1712 fix: Corriger crash Railway STRIPE_SECRET_KEY manquante
7ed578a Fix: Redirection 301 www → non-www + trust proxy Railway
d053d67 Fix: Express 5 route catch-all - utiliser *splat au lieu de * pour compatibilité path-to-regexp
37bc88d Fix: Crash retour Stripe Checkout + CORS Edge Function + Logs améliorés
```

### `git diff --stat`
```
42 files changed, 655 insertions(+), 190 deletions(-)
```

### Commits aujourd'hui (3 février 2026)
**Aucun commit effectué aujourd'hui.** Tous les changements sont dans le working tree.

---

## B) Liste exhaustive des fichiers modifiés aujourd'hui (groupés)

### 📁 **Frontend - Modules État des Lieux Retour**
- `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` (182 lignes modifiées)
- `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx` (59 lignes)
- `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` (27 lignes)
- `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` (6 lignes)
- `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx` (26 lignes)

### 📁 **Frontend - Modules État des Lieux Départ**
- `src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx` (10 lignes)
- `src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx` (10 lignes)

### 📁 **Frontend - Composants**
- `src/components/OwnerBookingCard.tsx` (150 lignes)
- `src/components/RenterBookingCard.tsx` (7 lignes)
- `src/components/BookingMoreActionsMenu.tsx` (10 lignes)
- `src/components/ui/status-badge.tsx` (5 lignes)

### 📁 **Frontend - Pages**
- `src/pages/Checking.tsx` (3 lignes supprimées)
- `src/pages/admin/Admin.tsx` (3 lignes supprimées)
- `src/pages/booking/BookingDiscussion.tsx` (5 lignes supprimées)
- `src/pages/dictionary/DictionaryEntry.tsx` (2 lignes supprimées)
- `src/pages/dictionary/DictionaryIndex.tsx` (2 lignes supprimées)
- `src/pages/legal/Legal.tsx` (3 lignes supprimées)
- `src/pages/owner/AddMotoPlaceholder.tsx` (2 lignes supprimées)
- `src/pages/owner/AddVehicle.tsx` (3 lignes supprimées)
- `src/pages/owner/Dashboard.tsx` (4 lignes supprimées)
- `src/pages/owner/ManageVehicle.tsx` (4 lignes supprimées)
- `src/pages/owner/OwnerBookingDiscussion.tsx` (5 lignes supprimées)
- `src/pages/owner/OwnerBookingRequests.tsx` (4 lignes supprimées)
- `src/pages/owner/OwnerBookings.tsx` (5 lignes)
- `src/pages/owner/OwnerVehicles.tsx` (4 lignes supprimées)
- `src/pages/owner/RentMyCarLanding.tsx` (3 lignes supprimées)
- `src/pages/owner/RentMyCarRegister.tsx` (3 lignes supprimées)
- `src/pages/renter/PaymentCancel.tsx` (2 lignes supprimées)
- `src/pages/vehicles/MotoVehicleDetails.tsx` (4 lignes supprimées)
- `src/pages/vehicles/VehicleDetails.tsx` (4 lignes supprimées)

### 📁 **Backend/Services**
- `src/services/checkinReturnService.ts` (46 lignes)
- `src/services/checkinReturnSnapshotService.ts` (56 lignes)
- `src/services/checkinReturnPdfService.ts` (65 lignes)
- `src/services/supabaseCheckinService.ts` (93 lignes)
- `src/services/supabaseCheckinReturnService.ts` (10 lignes)
- `src/services/supabase/bookings.ts` (6 lignes)

### 📁 **Types**
- `src/types/index.ts` (6 lignes)

### 📁 **Internationalisation**
- `src/i18n/locales/fr/common.json` (1 ligne)
- `src/i18n/locales/en/common.json` (1 ligne)
- `src/i18n/locales/de/common.json` (1 ligne)
- `src/i18n/locales/it/common.json` (1 ligne)

### 📁 **Base de données**
- `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (1 ligne modifiée)
- `supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql` (nouveau fichier, créé le 3 fév 14:37)

### 📁 **Documentation (non trackés)**
- `DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md` (nouveau fichier)
- `DIAG-RETOUR-MOTO-VS-VOITURE.md` (nouveau fichier)

---

## C) Détails factuels par fichier (mini changelog)

### 🗄️ **Base de données**

#### `supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql` (NOUVEAU)
- **Type** : Migration SQL créée
- **Changements** :
  - Ajout du statut `'terminated'` à la contrainte CHECK `bookings_status_check`
  - Migration DROP + ADD CONSTRAINT pour inclure le nouveau statut

#### `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql`
- **Type** : Modification (1 ligne)
- **Changements** :
  - Ajout de `'terminated'` dans la liste des statuts autorisés de la contrainte CHECK `bookings_status_check`

---

### 🔧 **Services Backend**

#### `src/services/checkinReturnService.ts`
- **Type** : Modification (46 lignes ajoutées)
- **Changements** :
  - Ajout garde-fou strict : vérification que `ownerId` et `renterId` sont définis avant création retour (lignes 57-66)
  - Ajout ÉTAPE 4.5 : mise à jour automatique du statut booking de `'confirmed'` vers `'terminated'` après finalisation retour (lignes 526-560)
  - Logs console pour traçabilité de la mise à jour de statut

#### `src/services/checkinReturnSnapshotService.ts`
- **Type** : Modification (56 lignes)
- **Changements** :
  - Ajout sélection `vehicle_type` lors du chargement véhicule (ligne 230)
  - Configuration conditionnelle des zones extérieures selon type véhicule :
    - `RETURN_CAR_ZONE_KEYS` / `RETURN_CAR_ZONE_LABELS` (voiture, comportement par défaut)
    - `RETURN_MOTO_ZONE_KEYS` / `RETURN_MOTO_ZONE_LABELS` (moto, sans coffre, 2 jantes seulement)
  - Configuration conditionnelle des accessoires selon type véhicule :
    - `RETURN_CAR_ACCESSORY_LABELS` (voiture)
    - `RETURN_MOTO_ACCESSORY_LABELS` (moto, 8 accessoires spécifiques)

#### `src/services/checkinReturnPdfService.ts`
- **Type** : Modification (65 lignes)
- **Changements** :
  - Ajout détection locale du `vehicle_type` depuis `bookings.vehicle_id` (lignes 138-156)
  - Passage `vehicleType` en paramètre à `generatePdfBlob()` et `createPDFTemplateHTML()`
  - Modification `generatePage2()` : sélection conditionnelle des zones selon type véhicule
    - Moto : `["avant", "droit", "arriere", "gauche", "janteAvant", "janteArriere"]`
    - Voiture : liste existante inchangée

#### `src/services/supabaseCheckinService.ts`
- **Type** : Modification (93 lignes)
- **Changements** :
  - Ajout garde-fou OWNER/RENTER : résolution automatique de `owner_id` et `renter_id` depuis `bookings`/`vehicles` si manquants (lignes 96-169)
  - Logique de résolution :
    - `renter_id` = `bookings.user_id`
    - `owner_id` = `vehicles.owner_id` (via `bookings.vehicle_id`)
  - Mise à jour UPDATE : ne met à jour `owner_id`/`renter_id` que si valeurs actuelles sont NULL (lignes 291-297)
  - Sélection enrichie dans `existingCheckinStatus` pour inclure `owner_id` et `renter_id` (ligne 182)

#### `src/services/supabaseCheckinReturnService.ts`
- **Type** : Modification (10 lignes)
- **Changements** :
  - Ajout garde-fou ultime : vérification que `owner_id` et `renter_id` sont non-null avant INSERT/UPDATE (lignes 113-120)
  - Erreur claire si contrainte NOT NULL violée

#### `src/services/supabase/bookings.ts`
- **Type** : Modification (6 lignes)
- **Changements** :
  - Ajout `'terminated'` dans les types de statut acceptés par `updateBookingStatus()` et `updateBookingStatusWithReason()` (lignes 155, 223)
  - Ajout `updated_at` dans la sélection `checkin_return` (ligne 438)

---

### 🎨 **Frontend - Modules**

#### `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`
- **Type** : Modification (182 lignes)
- **Changements** :
  - Ajout état `vehicleType` et détection depuis `bookings.vehicle_id` (lignes 55, 102-113)
  - Ajout modale de progression `FinalizeCheckinProgressModal` pour finalisation retour (lignes 60-63)
  - Enrichissement `departData` : merge des relevés depuis colonnes SQL `kilometrage_depart` et `niveau_carburant` avec fallback JSON (lignes 132-150)
  - Passage `vehicleType` aux steps 3, 4, 5
  - Sélection conditionnelle des zones extérieures selon type véhicule dans `handleNextFromStep3()` (lignes 242-270)
  - Ajout états `isSaving` pour feedback utilisateur lors des sauvegardes

#### `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx`
- **Type** : Modification (59 lignes)
- **Changements** :
  - Enrichissement des `damageReports` : association automatique des photos de zones marquées `kind: "degat"` aux dégâts sans photos (lignes 90-152)
  - Logique de fallback : photos taggées `damageIndex` → photos de zone avec `kind: "degat"` → toutes photos de zone

#### `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`
- **Type** : Modification (27 lignes)
- **Changements** :
  - Ajout prop `vehicleType` dans interface `StepProps` (ligne 15)
  - Définition `RETURN_CAR_ZONES` (voiture, comportement par défaut) et `RETURN_MOTO_ZONES` (moto, sans coffre)
  - Sélection conditionnelle des zones selon `vehicleType` (ligne 99)
  - Utilisation de la liste conditionnelle pour affichage et labels

#### `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx`
- **Type** : Modification (6 lignes)
- **Changements** :
  - Ajout prop `vehicleType` dans interface `StepProps` (ligne 15)
  - Masquage conditionnel de la Card "Intérieur au départ" pour les motos (lignes 151, 207) : évite affichage équipements voiture (radio/clim/etc.)

#### `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx`
- **Type** : Modification (26 lignes)
- **Changements** :
  - Ajout prop `vehicleType` dans interface `StepProps` (ligne 12)
  - Définition `RETURN_CAR_ACCESSORY_KEYS` (voiture) et `RETURN_MOTO_ACCESSORY_KEYS` (moto, 8 accessoires)
  - Sélection conditionnelle des accessoires selon `vehicleType` pour affichage (3 occurrences)

#### `src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx`
- **Type** : Modification (10 lignes)
- **Changements** :
  - Amélioration responsive : bouton "Terminer les accessoires" avec labels adaptatifs mobile/desktop (lignes 191-201)
  - Classes CSS : `w-full sm:w-auto` pour largeur adaptative

#### `src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx`
- **Type** : Modification (10 lignes)
- **Changements** :
  - Amélioration responsive : bouton "Terminer les remarques" avec labels adaptatifs mobile/desktop (lignes 128-138)
  - Classes CSS : `w-full sm:w-auto` pour largeur adaptative

---

### 🧩 **Frontend - Composants**

#### `src/components/OwnerBookingCard.tsx`
- **Type** : Modification (150 lignes)
- **Changements** :
  - Support du statut `'terminated'` : style visuel `bg-green-50/50 border-green-200/50` (lignes 749, 752)
  - Amélioration responsive : layout flex-col/flex-row adaptatif, espacements réduits mobile (lignes 753, 756, 778, 785, etc.)
  - Masquage conditionnel du bouton "État des lieux de départ" si `checkinDepart.status === 'completed'` (ligne 1170)
  - Badge statut enrichi avec support `terminated` (lignes 816-832)
  - Ajustements typographie mobile : `text-sm sm:text-base`, `text-xs sm:text-sm`

#### `src/components/RenterBookingCard.tsx`
- **Type** : Modification (7 lignes)
- **Changements** :
  - Support du statut `'terminated'` : style visuel identique à `OwnerBookingCard` (lignes 758, 761, 784)

#### `src/components/BookingMoreActionsMenu.tsx`
- **Type** : Modification (10 lignes)
- **Changements** :
  - Refonte UI : remplacement icône `MoreVertical` par bouton texte "Mes documents de location" avec icône `FileText` (lignes 1, 56-59)
  - Ajout prop `className` optionnelle (ligne 16)
  - Variant bouton : `ghost` → `outline`, taille `icon` → `sm`

#### `src/components/ui/status-badge.tsx`
- **Type** : Modification (5 lignes)
- **Changements** :
  - Ajout support statut `'terminated'` : couleur `bg-green-50 text-green-700`, label via i18n (lignes 55-58, 137)

---

### 📄 **Frontend - Pages**

#### `src/pages/Checking.tsx`
- **Type** : Modification (3 lignes supprimées)
- **Changements** :
  - Suppression import `Navbar` (ligne 2)
  - Suppression composant `<Navbar />` (2 occurrences)

#### `src/pages/owner/OwnerBookings.tsx`
- **Type** : Modification (5 lignes)
- **Changements** :
  - Suppression import `Navbar` (ligne 2)
  - Suppression composant `<Navbar />` (2 occurrences)
  - Ajout `updatedAt` dans mapping `checkinReturn` (ligne 172)

#### Autres pages (18 fichiers)
- **Type** : Modification (2-5 lignes supprimées chacune)
- **Changements** :
  - Suppression systématique des imports et composants `<Navbar />` dans :
    - `Admin.tsx`, `BookingDiscussion.tsx`, `DictionaryEntry.tsx`, `DictionaryIndex.tsx`, `Legal.tsx`
    - `AddMotoPlaceholder.tsx`, `AddVehicle.tsx`, `Dashboard.tsx`, `ManageVehicle.tsx`
    - `OwnerBookingDiscussion.tsx`, `OwnerBookingRequests.tsx`, `OwnerVehicles.tsx`
    - `RentMyCarLanding.tsx`, `RentMyCarRegister.tsx`, `PaymentCancel.tsx`
    - `MotoVehicleDetails.tsx`, `VehicleDetails.tsx`

---

### 📦 **Types**

#### `src/types/index.ts`
- **Type** : Modification (6 lignes)
- **Changements** :
  - Ajout statuts `'confirmed'`, `'completed'`, `'terminated'` dans type `BookingStatus` (lignes 12-14)
  - Ajout champ `updatedAt?: string | null` dans interface `CheckinReturnSummary` (ligne 382)

---

### 🌐 **Internationalisation**

#### `src/i18n/locales/fr/common.json`
- **Type** : Modification (1 ligne)
- **Changements** :
  - Ajout traduction `"terminated": "Terminée"` dans `bookings.status` (ligne 741)

#### `src/i18n/locales/en/common.json`, `de/common.json`, `it/common.json`
- **Type** : Modification (1 ligne chacun)
- **Changements** :
  - Ajout traduction `"terminated"` dans `bookings.status` (même structure que FR)

---

## D) Checklist "risques avant commit"

### ✅ **Migrations SQL**
- [x] Migration `20260203143617_add_terminated_status_to_bookings.sql` créée et testée localement ?
- [x] Script `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` synchronisé avec la migration ?
- [ ] **À vérifier** : Migration appliquée en dev/staging avant merge ?

### ⚠️ **Changements de schéma / contraintes**
- [x] Nouveau statut `'terminated'` ajouté partout (DB, types TS, i18n, composants)
- [x] Contrainte CHECK `bookings_status_check` mise à jour
- [ ] **À vérifier** : Aucune réservation existante avec statut `'terminated'` avant migration ?

### 🔄 **Services partagés**
- [x] `supabaseCheckinService` : garde-fou owner/renter ajouté (non-breaking)
- [x] `supabaseCheckinReturnService` : garde-fou owner/renter ajouté (non-breaking)
- [x] `checkinReturnService` : mise à jour statut `terminated` ajoutée (non-breaking, logs uniquement)
- [x] `checkinReturnSnapshotService` : support moto ajouté (rétrocompatible, fallback voiture)
- [x] `checkinReturnPdfService` : support moto ajouté (rétrocompatible)
- [ ] **À vérifier** : Tests manuels sur workflow complet départ → retour pour voiture ET moto

### 🚗 **Comportement "voiture" impacté ?**
- [x] Comportement voiture préservé : toutes les modifications moto sont conditionnelles (`vehicleType === 'moto'`)
- [x] Zones/extérieures voiture : liste inchangée, ordre identique
- [x] Accessoires voiture : liste inchangée
- [x] PDF retour voiture : zones identiques
- [ ] **À vérifier** : Test régression sur workflow retour voiture complet

### 🧹 **Logs temporaires / instrumentation**
- [x] Logs console ajoutés dans `checkinReturnService` (étape 4.5) : **GARDER** (traçabilité importante)
- [x] Logs console dans `checkinReturnPdfService` : **GARDER** (détection type véhicule)
- [x] Logs console dans `supabaseCheckinService` : **GARDER** (garde-fou owner/renter)
- [ ] **À vérifier** : Aucun `console.log` de debug temporaire oublié ?

### 📱 **UI/UX**
- [x] Suppression `Navbar` dans 20 pages : **INTENTIONNEL** (refactoring layout)
- [x] Responsive amélioré (boutons, cards) : **INTENTIONNEL**
- [ ] **À vérifier** : Navigation fonctionne toujours sans Navbar sur ces pages ?

### 📄 **Fichiers non trackés**
- [ ] **Décision requise** : Inclure `DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md` et `DIAG-RETOUR-MOTO-VS-VOITURE.md` dans le commit ?
  - **Recommandation** : **NON** (documentation temporaire de diagnostic, peut rester non trackée ou être déplacée dans `/docs`)

---

## E) Proposition de message de commit + plan de staging

### 📝 **Message de commit proposé**

```
feat(checkin): Support moto retour + statut terminated + garde-fous owner/renter

- Ajout support complet moto dans workflow état des lieux retour
  * Zones extérieures moto (sans coffre, 2 jantes au lieu de 4)
  * Accessoires moto (8 accessoires spécifiques)
  * Masquage équipements intérieurs voiture pour moto
  * PDF retour adaptatif selon type véhicule

- Nouveau statut booking 'terminated' après finalisation retour
  * Migration SQL : ajout statut dans contrainte CHECK bookings
  * Mise à jour automatique booking.confirmed → terminated
  * Support UI : badges, cards, i18n (FR/EN/DE/IT)

- Garde-fous owner_id/renter_id dans services checkin
  * Résolution automatique depuis bookings/vehicles si manquant
  * Validation stricte avant INSERT/UPDATE (contrainte NOT NULL)
  * Logs de traçabilité pour debugging

- Améliorations UX
  * Enrichissement damageReports avec photos zones (Step1 retour)
  * Merge relevés départ depuis colonnes SQL (kilométrage/carburant)
  * Responsive amélioré (boutons, cards booking)
  * Refactoring Navbar (suppression dans 20 pages)

- Types et services
  * Ajout statuts confirmed/completed/terminated dans BookingStatus
  * Ajout updatedAt dans CheckinReturnSummary
  * Support terminated dans SupabaseBookingsService

Fichiers modifiés: 42 fichiers (+655/-190)
Migration: 20260203143617_add_terminated_status_to_bookings.sql
```

### 📦 **Plan de staging (ordre recommandé)**

#### **Lot 1 : Migration SQL + Schéma**
```bash
git add supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql
git add SCRIPT-RECREATE-SCHEMA-RENTANOO.sql
```

#### **Lot 2 : Types + Services Backend**
```bash
git add src/types/index.ts
git add src/services/supabase/bookings.ts
git add src/services/supabaseCheckinService.ts
git add src/services/supabaseCheckinReturnService.ts
git add src/services/checkinReturnService.ts
git add src/services/checkinReturnSnapshotService.ts
git add src/services/checkinReturnPdfService.ts
```

#### **Lot 3 : Modules Frontend (État des Lieux)**
```bash
git add src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx
git add src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx
git add src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx
git add src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx
git add src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx
git add src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx
git add src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx
```

#### **Lot 4 : Composants + Pages + i18n**
```bash
git add src/components/OwnerBookingCard.tsx
git add src/components/RenterBookingCard.tsx
git add src/components/BookingMoreActionsMenu.tsx
git add src/components/ui/status-badge.tsx
git add src/pages/Checking.tsx
git add src/pages/admin/Admin.tsx
git add src/pages/booking/BookingDiscussion.tsx
git add src/pages/dictionary/DictionaryEntry.tsx
git add src/pages/dictionary/DictionaryIndex.tsx
git add src/pages/legal/Legal.tsx
git add src/pages/owner/AddMotoPlaceholder.tsx
git add src/pages/owner/AddVehicle.tsx
git add src/pages/owner/Dashboard.tsx
git add src/pages/owner/ManageVehicle.tsx
git add src/pages/owner/OwnerBookingDiscussion.tsx
git add src/pages/owner/OwnerBookingRequests.tsx
git add src/pages/owner/OwnerBookings.tsx
git add src/pages/owner/OwnerVehicles.tsx
git add src/pages/owner/RentMyCarLanding.tsx
git add src/pages/owner/RentMyCarRegister.tsx
git add src/pages/renter/PaymentCancel.tsx
git add src/pages/vehicles/MotoVehicleDetails.tsx
git add src/pages/vehicles/VehicleDetails.tsx
git add src/i18n/locales/fr/common.json
git add src/i18n/locales/en/common.json
git add src/i18n/locales/de/common.json
git add src/i18n/locales/it/common.json
```

**Alternative : Staging en une seule commande**
```bash
git add supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql SCRIPT-RECREATE-SCHEMA-RENTANOO.sql src/types/index.ts src/services/ src/modules/etatDesLieuxRetour/ src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx src/components/OwnerBookingCard.tsx src/components/RenterBookingCard.tsx src/components/BookingMoreActionsMenu.tsx src/components/ui/status-badge.tsx src/pages/ src/i18n/
```

### ✅ **Commandes de vérification avant commit**

```bash
# 1. Vérifier les fichiers staged
git diff --cached --stat

# 2. Relire les changements critiques (migration, services)
git diff --cached supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql
git diff --cached src/services/checkinReturnService.ts | head -100
git diff --cached src/services/supabaseCheckinService.ts | head -150

# 3. Vérifier qu'aucun fichier temporaire n'est inclus
git diff --cached --name-only | grep -E "(DIAG|TEMP|TODO)"

# 4. Build/Type-check (selon votre setup)
npm run build
# ou
pnpm build
# ou
npm run type-check

# 5. Linter (optionnel mais recommandé)
npm run lint
# ou
pnpm lint
```

### 🚫 **Fichiers à NE PAS inclure dans le commit**

- `DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md` (documentation temporaire)
- `DIAG-RETOUR-MOTO-VS-VOITURE.md` (documentation temporaire)

**Recommandation** : Les laisser non trackés ou les déplacer dans un dossier `/docs` séparé.

---

## 📊 **Résumé statistique**

- **Total fichiers modifiés** : 42
- **Lignes ajoutées** : +655
- **Lignes supprimées** : -190
- **Fichiers non trackés** : 3 (2 docs markdown + 1 migration SQL)
- **Migration SQL** : 1 nouvelle migration
- **Types modifiés** : `BookingStatus`, `CheckinReturnSummary`
- **Services modifiés** : 6 services backend
- **Composants modifiés** : 4 composants
- **Pages modifiées** : 20 pages (suppression Navbar)
- **Traductions ajoutées** : 4 langues (FR/EN/DE/IT)

---

**Fin du diagnostic**

