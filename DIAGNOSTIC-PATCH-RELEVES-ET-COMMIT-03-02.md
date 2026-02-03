# Diagnostic Factuel - Patch Relevés Départ + Commit 03/02/2026

**Date** : 3 février 2026  
**Objectif** : Diagnostic patch "relevés départ = 0/0" + Récap commit unique

---

## PARTIE 1 — Patch "relevés départ = 0/0" (prouver où ça casse)

### A) Prouver que le patch existe réellement dans le working tree

#### 1) Diff exact dans `EtatDesLieuxRetourForm.tsx`

**Fichier** : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`  
**Lignes** : 131-159

```132:159:src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx
        // 3) Hydrater le formulaire (departData read-only, returnData brouillon)
        //    ⚠️ Pour les relevés de départ (kilométrage, niveau de carburant),
        //    on fait confiance en priorité aux colonnes SQL `kilometrage_depart` et `niveau_carburant`
        //    qui sont déjà alimentées côté checkin_depart, avec fallback sur le JSON step2.releves.
        const baseDepartData = (depart as any)?.data || {};
        const step2FromData = baseDepartData.step2 || {};
        const relevesFromData = step2FromData.releves || {};

        const kilometrageFromSql = (depart as any)?.kilometrage_depart;
        const carburantFromSql = (depart as any)?.niveau_carburant;

        const mergedReleves = {
          ...relevesFromData,
          ...(kilometrageFromSql != null ? { kilometrage: kilometrageFromSql } : {}),
          ...(carburantFromSql != null ? { niveauCarburant: carburantFromSql } : {}),
        };

        const enhancedDepartData = {
          ...baseDepartData,
          step2: {
            ...step2FromData,
            releves: mergedReleves,
          },
        };

        methods.reset({
          departData: enhancedDepartData,
          returnData: retour?.data || {},
        });
```

**Preuve** : Patch présent aux lignes 139-145 (merge colonnes SQL) et 142-146 (construction mergedReleves).

#### 2) Lignes exactes où `enhancedDepartData` et `mergedReleves` sont construits

- **`mergedReleves`** : lignes 142-146
- **`enhancedDepartData`** : lignes 148-154
- **`methods.reset()`** : ligne 156

#### 3) Autres `reset()` qui écraseraient `departData`

**Commande** : `grep -n "methods\.reset\|setValue.*departData\|departData.*step2" src/modules/etatDesLieuxRetour/`

**Résultat** :
- `EtatDesLieuxRetourForm.tsx:156` : `methods.reset({ departData: enhancedDepartData, returnData: retour?.data || {} });`
- **Aucun autre `reset()` trouvé** dans le module retour.

**Conclusion** : Un seul `reset()` dans le module, pas d'écrasement ultérieur.

---

### B) Prouver la source réelle affichée par l'UI "Relevés de départ"

#### 1) Composant exact qui affiche le bloc "Relevés de départ"

**Fichier** : `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx`  
**Lignes d'affichage** :
- **Label "Relevés de départ"** : ligne 146
- **Kilométrage** : lignes 152-157
- **Niveau carburant** : lignes 160-169

```146:169:src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx
            <span>Relevés de départ (lecture seule)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Kilométrage</p>
              <p className="text-sm sm:text-base font-semibold">
                {kilometrageDepart !== undefined && kilometrageDepart !== null
                  ? `${kilometrageDepart.toLocaleString("fr-FR")} km`
                  : "—"}
              </p>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Niveau de carburant</p>
              {niveauCarburantDepart !== undefined && niveauCarburantDepart !== null ? (
                <FuelLevelSlider
                  label="Niveau de carburant départ"
                  value={Number(niveauCarburantDepart)}
                  onChange={() => {}} // Lecture seule, pas de changement
                />
              ) : (
                <p className="text-sm sm:text-base font-semibold">—</p>
              )}
            </div>
```

#### 2) Chemin de données lu

**Fichier** : `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx`  
**Lignes** : 66-67

```66:67:src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx
  const kilometrageDepart = departData?.step2?.releves?.kilometrage;
  const niveauCarburantDepart = departData?.step2?.releves?.niveauCarburant;
```

**Chemin exact** :
- `departData.step2.releves.kilometrage`
- `departData.step2.releves.niveauCarburant`

**Source** : `departData` est passé en prop depuis `EtatDesLieuxRetourForm` (ligne 171-174, rendu du composant step).

#### 3) Keys utilisées pour km / carburant

- **Kilométrage** : `departData.step2.releves.kilometrage` (ligne 66)
- **Carburant** : `departData.step2.releves.niveauCarburant` (ligne 67)

**Mapping attendu** :
- SQL `kilometrage_depart` → `mergedReleves.kilometrage` (ligne 144)
- SQL `niveau_carburant` → `mergedReleves.niveauCarburant` (ligne 145)

---

### C) Prouver si `depart` contient les colonnes SQL

#### 1) Dans `SupabaseCheckinService.getCheckinByBookingId`

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Lignes** : 445-450

```445:450:src/services/supabaseCheckinService.ts
  async getCheckinByBookingId(bookingId: string): Promise<{ data: CheckinDepart | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("checkin_depart" as any)
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle(); // Peut ne pas exister
```

**Preuve** :
- `.from("checkin_depart")` : table correcte
- `.select("*")` : **TOUTES les colonnes** sont sélectionnées, donc `kilometrage_depart` et `niveau_carburant` sont incluses

#### 2) Interface TS `CheckinDepart`

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Lignes** : 26-67

```33:34:src/services/supabaseCheckinService.ts
  kilometrage_depart: number | null;
  niveau_carburant: number | null;
```

**Conclusion factuelle** : 
- ✅ **Champs présents au typage** dans l'interface `CheckinDepart`
- ✅ Le code utilise `(depart as any)?.kilometrage_depart` (ligne 139) pour contourner le typage strict si nécessaire

---

### D) Déterminer si la valeur est écrasée ou convertie en 0

#### 1) Grep dans le repo

**Commandes exécutées** :
```bash
grep -r "kilometrage_depart" src/
grep -r "niveau_carburant" src/
grep -r "departData.step2.releves" src/modules/etatDesLieuxRetour/
grep -r "niveauCarburant" src/modules/etatDesLieuxRetour/
grep -r "kilometrage" src/modules/etatDesLieuxRetour/ | grep -v "kilometrageRetour"
```

**Résultats** :

**`kilometrage_depart`** (17 occurrences) :
- `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx:139` : lecture depuis `depart`
- `src/services/supabaseCheckinService.ts:33,272,273,380,381` : définition interface + écriture
- `src/types/snapshot-legal.ts:254` : type snapshot
- `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx:325,888,1561,1562` : écriture départ

**`niveau_carburant`** (17 occurrences) :
- `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx:140` : lecture depuis `depart`
- `src/services/supabaseCheckinService.ts:34,272,273,380,381` : définition interface + écriture
- `src/types/snapshot-legal.ts:255` : type snapshot
- `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx:326,895,1561,1562` : écriture départ

**`departData.step2.releves`** :
- `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx:84-85` : lecture
- `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx:66-67` : lecture

#### 2) Formatters qui convertissent en 0

**Fichier** : `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx`

**Lignes** :
- **Ligne 164** : `value={Number(niveauCarburantDepart)}` → **Conversion explicite en Number**
- **Ligne 208** : `value={Number(niveauCarburantRetour || 0)}` → **Fallback `|| 0` pour retour uniquement**

**Aucun formatter `|| 0` ou `?? 0` trouvé** pour `kilometrageDepart` ou `niveauCarburantDepart` dans les composants d'affichage.

**Conclusion** : Pas de conversion forcée en 0 pour les relevés départ dans l'affichage.

#### 3) Vérification condition `!= null`

**Fichier** : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`  
**Lignes** : 144-145

```144:145:src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx
          ...(kilometrageFromSql != null ? { kilometrage: kilometrageFromSql } : {}),
          ...(carburantFromSql != null ? { niveauCarburant: carburantFromSql } : {}),
```

**Analyse** :
- `!= null` accepte `0` (zéro numérique) ✅
- Si `kilometrage_depart = 0` ou `niveau_carburant = 0`, le merge fonctionne
- **Problème potentiel** : Si les colonnes SQL sont `NULL` ou `undefined`, le merge ne se fait pas et on utilise `relevesFromData` (JSON)

---

### E) 2 points d'observation (console logs) pour trancher en 30s (NE PAS COMMIT)

#### 1) Dans `EtatDesLieuxRetourForm.tsx` juste après `methods.reset(...)`

**Fichier** : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`  
**Ligne à modifier** : **Après la ligne 159** (après `methods.reset(...)`)

**Code à ajouter** :
```typescript
        methods.reset({
          departData: enhancedDepartData,
          returnData: retour?.data || {},
        });
        
        // 🔍 DEBUG (NE PAS COMMIT) - Vérifier merge relevés départ
        console.log("[EtatDesLieuxRetourForm] 🔍 DEBUG relevés départ:", {
          depart_kilometrage_depart: (depart as any)?.kilometrage_depart,
          depart_niveau_carburant: (depart as any)?.niveau_carburant,
          kilometrageFromSql,
          carburantFromSql,
          relevesFromData,
          mergedReleves,
          enhancedDepartData_step2_releves: enhancedDepartData.step2?.releves,
        });
```

#### 2) Dans le composant qui affiche les relevés

**Fichier** : `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx`  
**Ligne à modifier** : **Après la ligne 68** (après les déclarations `kilometrageDepart` et `niveauCarburantDepart`)

**Code à ajouter** :
```typescript
  const kilometrageDepart = departData?.step2?.releves?.kilometrage;
  const niveauCarburantDepart = departData?.step2?.releves?.niveauCarburant;
  const dashboardPhotosDepart = departData?.step2?.releves?.dashboardPhotos || [];
  
  // 🔍 DEBUG (NE PAS COMMIT) - Vérifier valeurs affichées
  console.log("[Step2RelevesRetour] 🔍 DEBUG relevés départ affichés:", {
    departData_step2_releves: departData?.step2?.releves,
    kilometrageDepart,
    niveauCarburantDepart,
    typeof_kilometrage: typeof kilometrageDepart,
    typeof_carburant: typeof niveauCarburantDepart,
  });
```

---

### F) Conclusion factuelle en 1 phrase

**Le patch existe et merge correctement les colonnes SQL dans `mergedReleves`, mais si `kilometrage_depart` ou `niveau_carburant` sont `NULL` en base, le fallback sur `relevesFromData` (JSON) peut retourner `undefined`/`null` si le JSON step2.releves est vide ou absent, ce qui affiche "—" dans l'UI.**

---

## PARTIE 2 — "Gros commit du 03/02" (récap + staging propre)

### A) État git

#### 1) `git status` (inclure untracked)

```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  - 39 fichiers modifiés (tracked)
  - 3 fichiers non trackés (untracked)

Untracked files:
  - DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md
  - DIAG-RETOUR-MOTO-VS-VOITURE.md
  - DIAGNOSTIC-COMMIT-2026-02-03.md
  - supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql
```

#### 2) `git diff --name-only`

```
SCRIPT-RECREATE-SCHEMA-RENTANOO.sql
src/components/BookingMoreActionsMenu.tsx
src/components/OwnerBookingCard.tsx
src/components/RenterBookingCard.tsx
src/components/ui/status-badge.tsx
src/i18n/locales/de/common.json
src/i18n/locales/en/common.json
src/i18n/locales/fr/common.json
src/i18n/locales/it/common.json
src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx
src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx
src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx
src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx
src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx
src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx
src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx
src/pages/Checking.tsx
src/pages/admin/Admin.tsx
src/pages/booking/BookingDiscussion.tsx
src/pages/dictionary/DictionaryEntry.tsx
src/pages/dictionary/DictionaryIndex.tsx
src/pages/legal/Legal.tsx
src/pages/owner/AddMotoPlaceholder.tsx
src/pages/owner/AddVehicle.tsx
src/pages/owner/Dashboard.tsx
src/pages/owner/ManageVehicle.tsx
src/pages/owner/OwnerBookingDiscussion.tsx
src/pages/owner/OwnerBookingRequests.tsx
src/pages/owner/OwnerBookings.tsx
src/pages/owner/OwnerVehicles.tsx
src/pages/owner/RentMyCarLanding.tsx
src/pages/owner/RentMyCarRegister.tsx
src/pages/renter/PaymentCancel.tsx
src/pages/vehicles/MotoVehicleDetails.tsx
src/pages/vehicles/VehicleDetails.tsx
src/services/checkinReturnPdfService.ts
src/services/checkinReturnService.ts
src/services/checkinReturnSnapshotService.ts
src/services/supabase/bookings.ts
src/services/supabaseCheckinReturnService.ts
src/services/supabaseCheckinService.ts
src/types/index.ts
```

#### 3) `git diff --stat`

```
42 files changed, 655 insertions(+), 190 deletions(-)
```

#### 4) `git diff -- src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`

**Résumé** : +182 lignes (ajout support moto, merge relevés SQL, modale progression)

---

### B) Grouper les changements par thème (factuel)

#### **Thème 1 : Retour moto (frontend + services snapshot/pdf)**

**Fichiers** :
- `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` (+182)
- `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx` (+59)
- `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` (+27)
- `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` (+6)
- `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx` (+26)
- `src/services/checkinReturnSnapshotService.ts` (+56)
- `src/services/checkinReturnPdfService.ts` (+65)

**Ce que ça change** : Ajout support conditionnel moto dans workflow retour (zones/extérieur sans coffre, accessoires moto, PDF adaptatif, masquage équipements intérieurs voiture).

#### **Thème 2 : Garde-fous owner/renter (checkin_depart + checkin_return)**

**Fichiers** :
- `src/services/supabaseCheckinService.ts` (+93)
- `src/services/supabaseCheckinReturnService.ts` (+10)
- `src/services/checkinReturnService.ts` (+46)

**Ce que ça change** : Résolution automatique `owner_id`/`renter_id` depuis `bookings`/`vehicles` si manquant, validation stricte avant INSERT/UPDATE pour éviter violation contrainte NOT NULL.

#### **Thème 3 : Status booking terminated (types + services + migration + UI badges/i18n)**

**Fichiers** :
- `supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql` (nouveau)
- `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (+1)
- `src/types/index.ts` (+6)
- `src/services/supabase/bookings.ts` (+6)
- `src/services/checkinReturnService.ts` (inclu dans +46)
- `src/components/OwnerBookingCard.tsx` (+150)
- `src/components/RenterBookingCard.tsx` (+7)
- `src/components/ui/status-badge.tsx` (+5)
- `src/i18n/locales/fr/common.json` (+1)
- `src/i18n/locales/en/common.json` (+1)
- `src/i18n/locales/de/common.json` (+1)
- `src/i18n/locales/it/common.json` (+1)

**Ce que ça change** : Nouveau statut `terminated` après finalisation retour, migration SQL, mise à jour automatique booking, support UI complet (badges, cards, i18n 4 langues).

#### **Thème 4 : UI/navbar removal / responsive**

**Fichiers** :
- `src/pages/Checking.tsx` (-3)
- `src/pages/admin/Admin.tsx` (-3)
- `src/pages/booking/BookingDiscussion.tsx` (-5)
- `src/pages/dictionary/DictionaryEntry.tsx` (-2)
- `src/pages/dictionary/DictionaryIndex.tsx` (-2)
- `src/pages/legal/Legal.tsx` (-3)
- `src/pages/owner/AddMotoPlaceholder.tsx` (-2)
- `src/pages/owner/AddVehicle.tsx` (-3)
- `src/pages/owner/Dashboard.tsx` (-4)
- `src/pages/owner/ManageVehicle.tsx` (-4)
- `src/pages/owner/OwnerBookingDiscussion.tsx` (-5)
- `src/pages/owner/OwnerBookingRequests.tsx` (-4)
- `src/pages/owner/OwnerBookings.tsx` (+5, -2 Navbar)
- `src/pages/owner/OwnerVehicles.tsx` (-4)
- `src/pages/owner/RentMyCarLanding.tsx` (-3)
- `src/pages/owner/RentMyCarRegister.tsx` (-3)
- `src/pages/renter/PaymentCancel.tsx` (-2)
- `src/pages/vehicles/MotoVehicleDetails.tsx` (-4)
- `src/pages/vehicles/VehicleDetails.tsx` (-4)
- `src/components/OwnerBookingCard.tsx` (responsive inclus dans +150)
- `src/components/BookingMoreActionsMenu.tsx` (+10)
- `src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx` (+10)
- `src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx` (+10)

**Ce que ça change** : Suppression `<Navbar />` dans 20 pages, amélioration responsive (boutons, cards booking), refonte `BookingMoreActionsMenu` (bouton texte au lieu d'icône).

---

### C) Décision sur fichiers untracked

**Fichiers untracked** :
1. `DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md` (documentation diagnostic)
2. `DIAG-RETOUR-MOTO-VS-VOITURE.md` (documentation diagnostic)
3. `DIAGNOSTIC-COMMIT-2026-02-03.md` (documentation diagnostic)
4. `supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql` (migration SQL)

**Recommandation** :
- ✅ **INCLURE** : `supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql` (migration nécessaire)
- ❌ **IGNORER** : `DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md`, `DIAG-RETOUR-MOTO-VS-VOITURE.md`, `DIAGNOSTIC-COMMIT-2026-02-03.md` (documentation temporaire, peut rester non trackée ou être déplacée dans `/docs`)

---

### D) Plan de staging pour 1 seul commit

#### Séquence de `git add ...` (ordre logique)

```bash
# Lot 1 : Migration SQL + Schéma
git add supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql
git add SCRIPT-RECREATE-SCHEMA-RENTANOO.sql

# Lot 2 : Types + Services Backend
git add src/types/index.ts
git add src/services/supabase/bookings.ts
git add src/services/supabaseCheckinService.ts
git add src/services/supabaseCheckinReturnService.ts
git add src/services/checkinReturnService.ts
git add src/services/checkinReturnSnapshotService.ts
git add src/services/checkinReturnPdfService.ts

# Lot 3 : Modules Frontend (État des Lieux)
git add src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx
git add src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx
git add src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx
git add src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx
git add src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx
git add src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx
git add src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx

# Lot 4 : Composants + Pages + i18n
git add src/components/OwnerBookingCard.tsx
git add src/components/RenterBookingCard.tsx
git add src/components/BookingMoreActionsMenu.tsx
git add src/components/ui/status-badge.tsx
git add src/pages/
git add src/i18n/
```

**Alternative : Staging en une seule commande**
```bash
git add supabase/migrations/20260203143617_add_terminated_status_to_bookings.sql SCRIPT-RECREATE-SCHEMA-RENTANOO.sql src/types/index.ts src/services/ src/modules/etatDesLieuxRetour/ src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx src/components/OwnerBookingCard.tsx src/components/RenterBookingCard.tsx src/components/BookingMoreActionsMenu.tsx src/components/ui/status-badge.tsx src/pages/ src/i18n/
```

#### `git commit -m "..."`

```bash
git commit -m "feat(checkin): Support moto retour + statut terminated + garde-fous owner/renter

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
Migration: 20260203143617_add_terminated_status_to_bookings.sql"
```

---

### E) Check avant push

#### 1) `git diff --cached --stat`

```bash
git diff --cached --stat
```

**Vérifier** : 42 fichiers staged (excluant les fichiers DIAG*.md).

#### 2) `grep console.log debug` (si on doit éviter)

```bash
git diff --cached | grep -E "console\.log.*DEBUG|console\.log.*🔍"
```

**Vérifier** : Aucun console.log de debug temporaire dans les fichiers staged.

#### 3) `npm/pnpm lint & build` (si scripts existent)

```bash
# Vérifier scripts disponibles
cat package.json | grep -A 5 '"scripts"'

# Exécuter si disponibles
npm run lint
npm run build
# ou
pnpm lint
pnpm build
```

**Vérifier** : Build et lint passent sans erreur.

---

## Résumé exécutif

### Partie 1 — Patch relevés départ
- ✅ **Patch présent** : lignes 131-159 `EtatDesLieuxRetourForm.tsx`
- ✅ **Composant affichage** : `Step2RelevesRetour.tsx` lignes 66-67, 152-169
- ✅ **Fetch SQL** : `getCheckinByBookingId` utilise `.select("*")` → colonnes incluses
- ✅ **Typage** : Interface `CheckinDepart` inclut `kilometrage_depart` et `niveau_carburant`
- ⚠️ **Problème potentiel** : Si colonnes SQL = `NULL`, fallback sur JSON peut être vide → affiche "—"

### Partie 2 — Commit 03/02
- **42 fichiers modifiés** (+655/-190)
- **4 thèmes** : retour moto, garde-fous owner/renter, statut terminated, UI/responsive
- **1 migration SQL** à inclure, **3 fichiers DIAG*.md** à ignorer
- **Plan staging** : 4 lots logiques ou 1 commande globale
- **Message commit** : format conventionnel avec détails par thème

---

**Fin du diagnostic**

