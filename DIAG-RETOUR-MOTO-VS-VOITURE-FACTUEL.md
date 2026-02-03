# Diagnostic Comparatif FACTUEL : État des lieux de RETOUR — VOITURE vs MOTO

**Date** : 2025-01-XX  
**Type** : Diagnostic factuel traçable dans le code  
**Contrainte** : Aucune implémentation, aucune supposition, aucune recommandation

---

## 1. Flux RETOUR VOITURE — Inventaire factuel

### 1.1 Backend — Services métier

#### Service : `checkinReturnService.ts`
**Path** : `src/services/checkinReturnService.ts`

**Fonctions identifiées** :

1. **`createOrGetCheckinReturn()`**
   - Lignes : 38-76
   - Rôle : Crée ou récupère un draft `checkin_return` pour un `booking_id`
   - Appels : `SupabaseCheckinService.getCheckinById()` (ligne 47), `SupabaseCheckinReturnService.getReturnByBookingId()` (ligne 58), `SupabaseCheckinReturnService.saveCheckinReturnDraft()` (ligne 66)

2. **`saveReturnStep2Releves()`**
   - Lignes : 81-127
   - Rôle : Sauvegarde Step 2 (relevés : km, carburant, photos dashboard)
   - Appels : `this.createOrGetCheckinReturn()` (ligne 101), `SupabaseCheckinReturnService.saveCheckinReturnDraft()` (ligne 119)

3. **`saveReturnStep3Section()`**
   - Lignes : 132-201
   - Rôle : Sauvegarde Step 3 (extérieur par zone : avant, droit, arrière, gauche, coffre, jantes)
   - Appels : `this.createOrGetCheckinReturn()` (ligne 156), `SupabaseCheckinReturnService.getReturnById()` (ligne 170), `SupabaseCheckinReturnService.saveCheckinReturnDraft()` (ligne 193)

4. **`saveReturnStep4Interior()`**
   - Lignes : 206-264
   - Rôle : Sauvegarde Step 4 (intérieur)
   - Appels : `this.createOrGetCheckinReturn()` (ligne 227), `SupabaseCheckinReturnService.getReturnById()` (ligne 241), `SupabaseCheckinReturnService.saveCheckinReturnDraft()` (ligne 256)

5. **`saveReturnStep5Accessoires()`** (2 définitions)
   - Première définition : Lignes 269-314, signature `accessoiresPayload: any`
   - Deuxième définition : Lignes 369-422, signature typée `accessoiresPayload: { isSameAsDepart: boolean; accessoires: Record<string, boolean>; commentaire?: string; }`
   - Rôle : Sauvegarde Step 5 (accessoires retour)
   - Appel depuis form : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` ligne 292 avec payload typé correspondant à la deuxième définition
   - Constat : La deuxième définition (lignes 369-422) écrase la première en JavaScript/TypeScript, donc utilisée. La première (lignes 269-314) est non utilisée (duplicate).
   - Appels : `this.createOrGetCheckinReturn()`, `SupabaseCheckinReturnService.saveCheckinReturnDraft()`

6. **`saveReturnStep6Remarques()`**
   - Lignes : 319-364
   - Rôle : Sauvegarde Step 6 (remarques)
   - Appels : `this.createOrGetCheckinReturn()` (ligne 338), `SupabaseCheckinReturnService.saveCheckinReturnDraft()` (ligne 356)

7. **`finalizeCheckinReturn()`**
   - Lignes : 427-613
   - Rôle : Finalise le retour (snapshot + statut `completed` + PDF)
   - Appels : `SupabaseCheckinReturnService.getReturnById()` (ligne 446), `SupabaseCheckinReturnService.saveCheckinReturnDraft()` (ligne 459), `SupabaseCheckinReturnService.createReturnSnapshot()` (ligne 477), `SupabaseCheckinReturnService.updateReturnStatus()` (ligne 502), `generateCheckinReturnPdf()` (import dynamique ligne 528, appel ligne 532)

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/services/checkinReturnService.ts`
- Preuve : `grep -i "vehicle_type\|moto" src/services/checkinReturnService.ts` → aucun résultat

#### Service : `supabaseCheckinReturnService.ts`
**Path** : `src/services/supabaseCheckinReturnService.ts`

**Fonctions identifiées** :

1. **`getReturnById()`**
   - Lignes : 27-47
   - Rôle : Récupère un `checkin_return` par ID
   - Table : `checkin_return` (ligne 32)

2. **`getReturnByBookingId()`**
   - Lignes : 53-93
   - Rôle : Récupère un `checkin_return` par `booking_id` (priorité draft)
   - Table : `checkin_return` (lignes 59, 76)

3. **`saveCheckinReturnDraft()`**
   - Lignes : 101-203
   - Rôle : Sauvegarde/met à jour un draft (merge JSONB `data`)
   - Table : `checkin_return` (lignes 153, 178)
   - Protection : Empêche modification si `status = 'completed'` ou `'cancelled'` (ligne 140)

4. **`updateReturnStatus()`**
   - Lignes : 208-241
   - Rôle : Met à jour le statut d'un `checkin_return`
   - Table : `checkin_return` (ligne 222)
   - Protection : Empêche retour en arrière `completed` → `draft` (ligne 217)

5. **`updateReturnPDFUrl()`**
   - Lignes : 246-271
   - Rôle : Met à jour `legal_pdf_url` dans `checkin_return`
   - Table : `checkin_return` (ligne 252)

6. **`createReturnSnapshot()`**
   - Lignes : 277-284
   - Rôle : Délègue la création du snapshot à `checkinReturnSnapshotService`
   - Appel : Import dynamique `checkinReturnSnapshotService.createReturnSnapshot()` (ligne 282)

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/services/supabaseCheckinReturnService.ts`
- Preuve : `grep -i "vehicle_type\|moto" src/services/supabaseCheckinReturnService.ts` → aucun résultat

#### Service : `checkinReturnSnapshotService.ts`
**Path** : `src/services/checkinReturnSnapshotService.ts`

**Fonction identifiée** :

1. **`createReturnSnapshot()`**
   - Lignes : 146-541
   - Rôle : Crée un snapshot légal complet pour le retour
   - Tables utilisées :
     - `checkin_return` (ligne 162 via `SupabaseCheckinReturnService.getReturnById()`)
     - `checkin_depart` (ligne 203 via `SupabaseCheckinService.getCheckinById()`)
     - `bookings` (ligne 214)
     - `vehicles` (ligne 234, sélection : `id, brand, model, license_plate, owner_id`)
     - `profiles` (lignes 255, 278)

**Structure snapshot construite** (lignes 476-495) :
- Zones extérieures Step 3 (lignes 361-393) :
  - `zoneKeys` hardcodés : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]` (ligne 377)
  - `zoneLabels` hardcodés (lignes 363-373) : `avant: "Avant"`, `droit: "Côté droit"`, `arriere: "Arrière"`, `gauche: "Côté gauche"`, `coffre: "Coffre"`, `janteAvDroit: "Jante avant droite"`, `janteArDroit: "Jante arrière droite"`, `janteAvGauche: "Jante avant gauche"`, `janteArGauche: "Jante arrière gauche"`
- Intérieur Step 4 (lignes 395-408) : Construit avec `area`, `description`, `photos`
- Accessoires Step 5 (lignes 410-457) :
  - `accessoryLabels` hardcodés (lignes 412-421) : `gilet: "Gilet"`, `triangle: "Triangle"`, `roueSecours: "Roue de secours"`, `cric: "Cric"`, `cle: "Clé"`, `cable: "Câble"`, `manuel: "Manuel"`, `carteCarburant: "Carte carburant"`

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/services/checkinReturnSnapshotService.ts`
- Preuve : `grep -i "vehicle_type\|moto" src/services/checkinReturnSnapshotService.ts` → aucun résultat
- Constat : Le service charge `vehicles` (ligne 234) mais ne sélectionne PAS `vehicle_type` (ligne 235 : `select("id, brand, model, license_plate, owner_id")`)

#### Service : `checkinReturnPdfService.ts`
**Path** : `src/services/checkinReturnPdfService.ts`

**Fonction identifiée** :

1. **`generateCheckinReturnPdf()`**
   - Lignes : 62-288
   - Rôle : Génère le PDF retour et l'upload dans Storage
   - Appels : `SupabaseCheckinReturnService.getReturnById()` (ligne 90), `generatePdfBlob()` (ligne 146), `buildStoragePath()` (ligne 169), `supabase.storage.from('checkin-photos').upload()` (ligne 176), `SupabaseCheckinReturnService.updateReturnPDFUrl()` (ligne 237)

2. **`generatePdfBlob()`** (helper)
   - Lignes : 305-446
   - Rôle : Génère le Blob PDF depuis le snapshot
   - Appels : `createPDFTemplateHTML()` (ligne 351), `html2canvas` (import dynamique ligne 324), `jsPDF` (import dynamique ligne 335)

3. **`createPDFTemplateHTML()`** (helper)
   - Lignes : 502-688
   - Rôle : Crée le template HTML du PDF
   - Appels : `generatePage1()` (ligne 679), `generatePage2()` (ligne 680), `generatePage3()` (ligne 681), `generatePage4()` (ligne 682), `generatePage5()` (ligne 683), `generatePage6()` (ligne 684)

4. **`generatePage2()`** (helper)
   - Lignes : 849-909
   - Rôle : Génère la page 2 PDF (extérieur retour)
   - Zones hardcodées : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]` (ligne 851)

5. **`generatePage3()`** (helper)
   - Lignes : 914-963
   - Rôle : Génère la page 3 PDF (intérieur retour)

6. **`generatePage4()`** (helper)
   - Lignes : 968-1040
   - Rôle : Génère la page 4 PDF (accessoires retour)
   - Accessoires affichés : Liste depuis `snapshot.return.step5.accessoiresList` (ligne 970)

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/services/checkinReturnPdfService.ts`
- Preuve : `grep -i "vehicle_type\|moto" src/services/checkinReturnPdfService.ts` → aucun résultat

### 1.2 Base de données

#### Table : `checkin_return`
**Path SQL** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 302-319)

**Colonnes** :
- `id` : `uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY`
- `booking_id` : `uuid NOT NULL`
- `checkin_depart_id` : `uuid NOT NULL`
- `owner_id` : `uuid NOT NULL`
- `renter_id` : `uuid NOT NULL`
- `status` : `text NOT NULL DEFAULT 'draft'::text`
- `data` : `jsonb NOT NULL DEFAULT '{}'::jsonb`
- `snapshot_legal` : `jsonb` (nullable)
- `legal_pdf_url` : `text` (nullable)
- `created_at` : `timestamp with time zone NOT NULL DEFAULT now()`
- `updated_at` : `timestamp with time zone NOT NULL DEFAULT now()`

**Clés étrangères** :
- `checkin_return_booking_id_fkey` : `booking_id` → `bookings(id)` ON DELETE RESTRICT (ligne 315)
- `checkin_return_checkin_depart_id_fkey` : `checkin_depart_id` → `checkin_depart(id)` ON DELETE RESTRICT (ligne 316)
- `checkin_return_owner_id_fkey` : `owner_id` → `profiles(id)` ON DELETE RESTRICT (ligne 317)
- `checkin_return_renter_id_fkey` : `renter_id` → `profiles(id)` ON DELETE RESTRICT (ligne 318)

**Indexes** (d'après `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 408-411) :
- `idx_checkin_return_booking_id` : INDEX sur `booking_id`
- `idx_checkin_return_checkin_depart_id` : INDEX sur `checkin_depart_id`
- `idx_checkin_return_booking_draft` : UNIQUE INDEX sur `booking_id` WHERE `status = 'draft'`

**Statuts utilisés** :
- `draft` : Brouillon (default, ligne 309)
- `completed` : Finalisé (utilisé dans `checkinReturnService.finalizeCheckinReturn()` ligne 502)
- `cancelled` : Annulé (vérifié dans `supabaseCheckinReturnService.saveCheckinReturnDraft()` ligne 140)

**Recherche colonne `vehicle_type`** :
- Résultat : 0 occurrence dans la table `checkin_return`
- Preuve : Colonnes listées lignes 303-314, aucune colonne `vehicle_type`

### 1.3 Frontend — Pages et routes

#### Route : `/checkin-return/[bookingId]`
**Path** : `src/pages/checkin-return/[bookingId].tsx`

**Composant** :
- `CheckinReturnPage` (lignes 5-10)
- Import : `EtatDesLieuxRetourForm` depuis `@/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm` (ligne 3)
- Props : `bookingId` depuis `useParams()` (ligne 7)

**Enregistrement route** :
- Path : `src/App.tsx` ligne 44 : `const CheckinReturnPage = lazy(() => import("./pages/checkin-return/[bookingId]"));`
- Route : `src/App.tsx` ligne 177 : `<Route path="/checkin-return/:bookingId" element={<CheckinReturnPage />} />`

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/pages/checkin-return/[bookingId].tsx`
- Preuve : Fichier complet (10 lignes), aucune mention `vehicle_type` ou `moto`

#### Form principal : `EtatDesLieuxRetourForm.tsx`
**Path** : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`

**Composant** :
- `EtatDesLieuxRetourForm` (lignes 36-532)
- Props : `bookingId?: string` (ligne 33)

**Steps définis** (lignes 22-30) :
1. Step 1 : `Step1DepartRecap` (ligne 23)
2. Step 2 : `Step2RelevesRetour` (ligne 24)
3. Step 3 : `Step3ExterieurRetour` (ligne 25)
4. Step 4 : `Step4InterieurRetour` (ligne 26)
5. Step 5 : `Step5AccessoiresRetour` (ligne 27)
6. Step 6 : `Step6RemarquesRetour` (ligne 28)
7. Step 7 : `Step7ValidationRetour` (ligne 29)

**Handlers identifiés** :
- `handleNextFromStep2()` (lignes 137-174) : Appelle `checkinReturnService.saveReturnStep2Releves()`
- `handleNextFromStep3()` (lignes 176-231) : Appelle `checkinReturnService.saveReturnStep3Section()` pour chaque zone
- `handleNextFromStep4()` (lignes 233-271) : Appelle `checkinReturnService.saveReturnStep4Interior()`
- `handleNextFromStep5()` (lignes 273-308) : Appelle `checkinReturnService.saveReturnStep5Accessoires()`
- `handleNextFromStep6()` (lignes 310-345) : Appelle `checkinReturnService.saveReturnStep6Remarques()`
- `handleFinalizeReturn()` (lignes 347-421) : Appelle `checkinReturnService.finalizeCheckinReturn()`

**Zones Step 3 hardcodées** (lignes 189-199) :
- `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]`

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`
- Preuve : `grep -i "vehicle_type\|moto" src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` → aucun résultat

#### Step 3 : `Step3ExterieurRetour.tsx`
**Path** : `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`

**Zones hardcodées** (lignes 17-27) :
- `zoneKeys` : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]`

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`
- Preuve : `grep -i "vehicle_type\|moto" src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` → aucun résultat

#### Step 4 : `Step4InterieurRetour.tsx`
**Path** : `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx`

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx`
- Preuve : `grep -i "vehicle_type\|moto" src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` → aucun résultat

#### Step 5 : `Step5AccessoiresRetour.tsx`
**Path** : `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx`

**Accessoires hardcodés** (lignes 14-23) :
- `accessoryKeys` : `["gilet", "triangle", "roueSecours", "cric", "cle", "cable", "manuel", "carteCarburant"]`

**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence dans `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx`
- Preuve : `grep -i "vehicle_type\|moto" src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx` → aucun résultat

### 1.4 Snapshot légal retour voiture

**Service** : `checkinReturnSnapshotService.ts`  
**Fonction** : `createReturnSnapshot()` (lignes 146-541)

**Structure snapshot** (interface `CheckinReturnLegalSnapshot`, lignes 24-125) :
- `metadata.version` : `"return-1.0"` (ligne 301)
- `return.step3.sections` : Zones extérieures (lignes 361-393)
  - Zones : `avant`, `droit`, `arriere`, `gauche`, `coffre`, `janteAvDroit`, `janteArDroit`, `janteAvGauche`, `janteArGauche` (ligne 377)
- `return.step4` : Intérieur (lignes 395-408)
- `return.step5.accessoiresList` : Accessoires (lignes 410-457)
  - Accessoires : `gilet`, `triangle`, `roueSecours`, `cric`, `cle`, `cable`, `manuel`, `carteCarburant` (lignes 412-421)

**Sauvegarde** : Ligne 503-511, UPDATE `checkin_return.snapshot_legal`

### 1.5 Génération PDF retour voiture

**Service** : `checkinReturnPdfService.ts`  
**Fonction** : `generateCheckinReturnPdf()` (lignes 62-288)

**Appel déclencheur** :
- Path : `src/services/checkinReturnService.ts` ligne 528 (import dynamique)
- Ligne 532 : `await generateCheckinReturnPdf(checkinReturnId, { skipStatusCheck: true })`
- Contexte : Dans `finalizeCheckinReturn()` après création snapshot et changement statut

**Pages PDF générées** :
- Page 1 : `generatePage1()` (lignes 693-844) — Infos générales + relevés
- Page 2 : `generatePage2()` (lignes 849-909) — Extérieur (zones hardcodées ligne 851)
- Page 3 : `generatePage3()` (lignes 914-963) — Intérieur
- Page 4 : `generatePage4()` (lignes 968-1040) — Accessoires (tableau)
- Page 5 : `generatePage5()` (lignes 1045-1085) — Remarques
- Page 6 : `generatePage6()` (lignes 1090-1134) — Validation + signatures

**Storage path** : `buildStoragePath()` (lignes 297-300)
- Format : `resa_{referenceNumber}/retour/documents/etat_des_lieux_retour_{checkinReturnId}.pdf`

### 1.6 Emails / n8n retour voiture

**Recherche effectuée** :

**Dossiers/fichiers inspectés** :
- `server/index.ts` : Routes Express, webhooks n8n
- `WORKFLOW-N8N-EDL-AUTO-EMAIL.md` : Documentation workflows n8n
- `supabase/migrations/` : Migrations SQL pour tracking emails
- Recherche sémantique dans codebase : "n8n workflow checkin return email notification"

**Keywords recherchés** :
- `n8n`, `webhook`, `email`, `sendgrid`, `resend`, `postmark`, `nodemailer`, `checkin_return`, `checkinReturn`, `etat_des_lieux_retour`

**Résultats greps** :

1. **`server/index.ts`** :
   - `grep -i "n8n\|webhook\|email\|checkin_return\|checkinReturn" server/index.ts`
   - Résultat : Webhook n8n identifié uniquement pour route `/api/contact` (lignes 310-428), pas pour `checkin_return`
   - Preuve : Lignes 312-428, webhook n8n pour contact form uniquement

2. **`WORKFLOW-N8N-EDL-AUTO-EMAIL.md`** :
   - `grep -i "checkin_return\|checkinReturn" WORKFLOW-N8N-EDL-AUTO-EMAIL.md`
   - Résultat : 0 occurrence de `checkin_return` ou `checkinReturn`
   - Preuve : Document décrit uniquement workflow pour `checkin_depart` (départ), pas pour `checkin_return` (retour)

3. **`supabase/migrations/YYYYMMDDHHMMSS_add_edl_email_tracking.sql`** :
   - `grep -i "checkin_return\|checkinReturn" supabase/migrations/YYYYMMDDHHMMSS_add_edl_email_tracking.sql`
   - Résultat : 0 occurrence de `checkin_return`
   - Preuve : Migration ajoute colonnes `edl_email_sent_at`, `edl_email_sent_status`, `edl_email_retry_count`, `edl_email_last_error` uniquement à `checkin_depart` (lignes 12, 16, 22, 25), pas à `checkin_return`

4. **Recherche providers email** :
   - `grep -i "sendgrid\|resend\|postmark\|nodemailer"` dans codebase
   - Résultat : Providers identifiés uniquement pour contact form (`server/index.ts`, `server/email/postmark.ts`), pas pour `checkin_return`

**Conclusion** :
- Aucun fichier / appel identifié pour envoi email retour (ni voiture ni moto)
- Aucun workflow n8n identifié pour `checkin_return`
- Aucune migration SQL pour tracking emails retour
- Preuve : Greps effectués, aucun résultat pour `checkin_return` dans les fichiers emails/n8n

---

## 2. Flux RETOUR MOTO — État réel du code

### 2.1 Backend — Services métier

#### Service : `checkinReturnService.ts`
**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence
- Preuve : `grep -i "vehicle_type\|moto" src/services/checkinReturnService.ts` → aucun résultat
- Constat : Le service est générique, aucune logique spécifique moto

#### Service : `supabaseCheckinReturnService.ts`
**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence
- Preuve : `grep -i "vehicle_type\|moto" src/services/supabaseCheckinReturnService.ts` → aucun résultat
- Constat : Le service est générique, aucune logique spécifique moto

#### Service : `checkinReturnSnapshotService.ts`
**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence
- Preuve : `grep -i "vehicle_type\|moto" src/services/checkinReturnSnapshotService.ts` → aucun résultat
- Constat factuel :
  - Le service charge `vehicles` (ligne 234) mais ne sélectionne PAS `vehicle_type` (ligne 235 : `select("id, brand, model, license_plate, owner_id")`)
  - Zones extérieures hardcodées (ligne 377) : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]` (aucune condition `vehicle_type`)
  - Accessoires hardcodés (lignes 412-421) : `gilet`, `triangle`, `roueSecours`, `cric`, `cle`, `cable`, `manuel`, `carteCarburant` (aucune condition `vehicle_type`)
  - Section intérieur incluse dans snapshot (lignes 395-408) : Construite systématiquement, aucune condition `vehicle_type`

#### Service : `checkinReturnPdfService.ts`
**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence
- Preuve : `grep -i "vehicle_type\|moto" src/services/checkinReturnPdfService.ts` → aucun résultat
- Constat factuel :
  - Zones PDF hardcodées (ligne 851) : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]` (aucune condition `vehicle_type`)
  - Page intérieur générée systématiquement (lignes 914-963) : `generatePage3()` appelée sans condition `vehicle_type`
  - Accessoires affichés (lignes 968-1040) : Liste depuis `snapshot.return.step5.accessoiresList` sans condition `vehicle_type`

### 2.2 Base de données

#### Table : `checkin_return`
**Recherche colonne `vehicle_type`** :
- Résultat : Colonne `vehicle_type` n'existe pas dans `checkin_return`
- Preuve : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 303-314, colonnes listées sans `vehicle_type`
- Constat : La table est générique, pas de distinction voiture/moto au niveau DB

### 2.3 Frontend — Pages et routes

#### Route : `/checkin-return/[bookingId]`
**Recherche route spécifique moto** :
- Résultat : Aucune route spécifique moto retour identifiée
- Preuve : `src/App.tsx` ligne 177, route unique `/checkin-return/:bookingId` (générique)
- Constat : Route générique utilisée pour tous types de véhicules

#### Form : `EtatDesLieuxRetourForm.tsx`
**Recherche `vehicle_type` / `moto`** :
- Résultat : 0 occurrence
- Preuve : `grep -i "vehicle_type\|moto" src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` → aucun résultat
- Constat factuel :
  - Aucune détection `vehicle_type` dans le form (pas de chargement depuis `vehicles` ou `bookings`)
  - Step 3 zones hardcodées (lignes 189-199) : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]` (aucune condition `vehicle_type`)
  - Step 4 intérieur inclus (ligne 26) : `Step4InterieurRetour` toujours affiché, aucune condition `vehicle_type`
  - Step 5 accessoires hardcodés : Appel `checkinReturnService.saveReturnStep5Accessoires()` ligne 292, aucune condition `vehicle_type`

#### Steps retour moto
**Recherche steps spécifiques moto** :
- Résultat : Aucun step spécifique moto retour identifié
- Preuve : `list_dir src/modules/etatDesLieuxRetour/steps/` → 7 fichiers steps génériques, aucun avec suffixe `Moto`
- Constat factuel :
  - `Step3ExterieurRetour.tsx` : Zones hardcodées (lignes 17-27) : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"]` (aucune condition `vehicle_type`)
  - `Step4InterieurRetour.tsx` : Step intérieur présent, aucune condition `vehicle_type` pour masquer/afficher
  - `Step5AccessoiresRetour.tsx` : Accessoires hardcodés (lignes 14-23) : `["gilet", "triangle", "roueSecours", "cric", "cle", "cable", "manuel", "carteCarburant"]` (aucune condition `vehicle_type`)

### 2.4 Snapshot légal retour moto

**Recherche logique moto dans snapshot** :
- Résultat : Aucune logique moto identifiée
- Preuve : `checkinReturnSnapshotService.ts` ne charge pas `vehicle_type` (ligne 235 : `select("id, brand, model, license_plate, owner_id")`), zones/accessoires hardcodés
- Constat factuel :
  - Zones extérieures hardcodées (ligne 377) : `coffre`, `janteAvDroit`, `janteArDroit`, `janteAvGauche`, `janteArGauche` incluses systématiquement, aucune condition `vehicle_type`
  - Accessoires hardcodés (lignes 412-421) : `roueSecours`, `cric` inclus, aucune condition `vehicle_type`
  - Section intérieur incluse (lignes 395-408) : Construite systématiquement, aucune condition `vehicle_type`

### 2.5 Génération PDF retour moto

**Recherche logique moto dans PDF** :
- Résultat : Aucune logique moto identifiée
- Preuve : `checkinReturnPdfService.ts` ne détecte pas `vehicle_type` (0 occurrence `vehicle_type` ou `moto`), pages hardcodées
- Constat factuel :
  - Zones PDF hardcodées (ligne 851) : `coffre`, `janteAvDroit`, `janteArDroit`, `janteAvGauche`, `janteArGauche` incluses systématiquement, aucune condition `vehicle_type`
  - Page intérieur générée systématiquement (lignes 914-963) : `generatePage3()` appelée sans condition `vehicle_type`
  - Accessoires affichés (lignes 968-1040) : Liste depuis snapshot sans condition `vehicle_type`

### 2.6 Workflow n8n retour moto

**Recherche workflow n8n retour** :
- Résultat : Aucun workflow n8n identifié pour le retour (ni voiture ni moto)
- Preuve : Voir section 1.6 (recherche exhaustive effectuée)
- Constat factuel : Aucun fichier / appel identifié pour workflow n8n retour

---

## 3. Comparaison structurée

| Élément | Voiture (Retour) | Moto (Retour) | Écart FACTUEL constaté |
|---------|------------------|--------------|------------------------|
| **Table DB `checkin_return`** | `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 302-319 | `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 302-319 | ✅ **Même table** (générique, pas de colonne `vehicle_type`) |
| **Service `checkinReturnService.createOrGetCheckinReturn()`** | `src/services/checkinReturnService.ts` lignes 38-76 | `src/services/checkinReturnService.ts` lignes 38-76 | ✅ **Même fonction** (générique) |
| **Service `checkinReturnService.saveReturnStep2Releves()`** | `src/services/checkinReturnService.ts` lignes 81-127 | `src/services/checkinReturnService.ts` lignes 81-127 | ✅ **Même fonction** (générique) |
| **Service `checkinReturnService.saveReturnStep3Section()`** | `src/services/checkinReturnService.ts` lignes 132-201 | `src/services/checkinReturnService.ts` lignes 132-201 | ✅ **Même fonction** (générique, mais zones hardcodées voiture) |
| **Service `checkinReturnService.saveReturnStep4Interior()`** | `src/services/checkinReturnService.ts` lignes 206-264 | `src/services/checkinReturnService.ts` lignes 206-264 | ✅ **Même fonction** (générique, aucune condition `vehicle_type`) |
| **Service `checkinReturnService.saveReturnStep5Accessoires()`** | `src/services/checkinReturnService.ts` lignes 369-422 (utilisée) + 269-314 (non utilisée, duplicate) | `src/services/checkinReturnService.ts` lignes 369-422 | ✅ **Même fonction** (générique, accessoires hardcodés voiture, aucune condition `vehicle_type`. Note : définition lignes 269-314 non utilisée, duplicate) |
| **Service `checkinReturnService.finalizeCheckinReturn()`** | `src/services/checkinReturnService.ts` lignes 427-613 | `src/services/checkinReturnService.ts` lignes 427-613 | ✅ **Même fonction** (générique) |
| **Service `supabaseCheckinReturnService.getReturnById()`** | `src/services/supabaseCheckinReturnService.ts` lignes 27-47 | `src/services/supabaseCheckinReturnService.ts` lignes 27-47 | ✅ **Même fonction** (générique) |
| **Service `supabaseCheckinReturnService.saveCheckinReturnDraft()`** | `src/services/supabaseCheckinReturnService.ts` lignes 101-203 | `src/services/supabaseCheckinReturnService.ts` lignes 101-203 | ✅ **Même fonction** (générique) |
| **Service `checkinReturnSnapshotService.createReturnSnapshot()`** | `src/services/checkinReturnSnapshotService.ts` lignes 146-541 | `src/services/checkinReturnSnapshotService.ts` lignes 146-541 | ⚠️ **Existe partiellement** (hardcodé voiture) : Zones hardcodées (ligne 377 : `coffre`, `janteAvDroit`, etc.), accessoires hardcodés (lignes 412-421 : `roueSecours`, `cric`), section intérieur incluse (lignes 395-408), `vehicle_type` non chargé (ligne 235 : `select("id, brand, model, license_plate, owner_id")`) |
| **Service `checkinReturnPdfService.generateCheckinReturnPdf()`** | `src/services/checkinReturnPdfService.ts` lignes 62-288 | `src/services/checkinReturnPdfService.ts` lignes 62-288 | ⚠️ **Existe partiellement** (hardcodé voiture) : Zones PDF hardcodées (ligne 851), page intérieur générée systématiquement (lignes 914-963), accessoires affichés (lignes 968-1040), `vehicle_type` non détecté (0 occurrence) |
| **Route `/checkin-return/[bookingId]`** | `src/pages/checkin-return/[bookingId].tsx` | `src/pages/checkin-return/[bookingId].tsx` | ✅ **Même route** (générique) |
| **Form `EtatDesLieuxRetourForm`** | `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` lignes 36-532 | `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` lignes 36-532 | ⚠️ **Même form** mais zones hardcodées voiture (lignes 189-199), `vehicle_type` non détecté |
| **Step 1 `Step1DepartRecap`** | `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx` | `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx` | ✅ **Même step** (générique) |
| **Step 2 `Step2RelevesRetour`** | `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx` | `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx` | ✅ **Même step** (générique) |
| **Step 3 `Step3ExterieurRetour`** | `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` lignes 17-27 zones hardcodées | `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` lignes 17-27 | ⚠️ **Existe partiellement** (hardcodé voiture) : Zones hardcodées (lignes 17-27 : `coffre`, `janteAvDroit`, etc.), aucune condition `vehicle_type`, pas de zones moto |
| **Step 4 `Step4InterieurRetour`** | `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` | `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` | ⚠️ **Existe partiellement** (hardcodé voiture) : Step intérieur présent, aucune condition `vehicle_type` pour masquer/afficher |
| **Step 5 `Step5AccessoiresRetour`** | `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx` lignes 14-23 accessoires hardcodés | `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx` lignes 14-23 | ⚠️ **Existe partiellement** (hardcodé voiture) : Accessoires hardcodés (lignes 14-23 : `roueSecours`, `cric`), aucune condition `vehicle_type`, pas d'accessoires moto |
| **Step 6 `Step6RemarquesRetour`** | `src/modules/etatDesLieuxRetour/steps/Step6RemarquesRetour.tsx` | `src/modules/etatDesLieuxRetour/steps/Step6RemarquesRetour.tsx` | ✅ **Même step** (générique) |
| **Step 7 `Step7ValidationRetour`** | `src/modules/etatDesLieuxRetour/steps/Step7ValidationRetour.tsx` | `src/modules/etatDesLieuxRetour/steps/Step7ValidationRetour.tsx` | ✅ **Même step** (générique) |
| **Snapshot légal retour** | `checkinReturnSnapshotService.createReturnSnapshot()` zones hardcodées (ligne 377), accessoires hardcodés (lignes 412-421) | `checkinReturnSnapshotService.createReturnSnapshot()` lignes 146-541 | ⚠️ **Existe partiellement** (hardcodé voiture) : Structure snapshot hardcodée voiture, `vehicle_type` non chargé (ligne 235), aucune condition `vehicle_type` |
| **PDF retour** | `checkinReturnPdfService.generateCheckinReturnPdf()` pages hardcodées (lignes 849-1040) | `checkinReturnPdfService.generateCheckinReturnPdf()` lignes 62-288 | ⚠️ **Existe partiellement** (hardcodé voiture) : Pages PDF hardcodées voiture, `vehicle_type` non détecté (0 occurrence), aucune condition `vehicle_type` |
| **Workflow n8n retour** | ❌ | ❌ | ❌ **N'existe pas** (ni voiture ni moto) : Greps effectués (`server/index.ts`, `WORKFLOW-N8N-EDL-AUTO-EMAIL.md`, `supabase/migrations/`) → aucun fichier / appel identifié pour `checkin_return` |

---

## 4. Conclusion de diagnostic (factuelle)

### 4.1 Éléments réutilisables tel quel

**Infrastructure DB** :
- Table `checkin_return` : Générique, pas de colonne `vehicle_type`, réutilisable pour moto
- Preuve : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 302-319

**Services de base** :
- `checkinReturnService.createOrGetCheckinReturn()` : Générique, réutilisable
- `checkinReturnService.saveReturnStep2Releves()` : Générique, réutilisable
- `checkinReturnService.finalizeCheckinReturn()` : Générique, réutilisable
- `supabaseCheckinReturnService` (toutes fonctions) : Génériques, réutilisables
- Preuve : Aucune mention `vehicle_type` ou `moto` dans ces services

**Steps génériques** :
- Step 1 (Récap départ) : Générique, réutilisable
- Step 2 (Relevés) : Générique, réutilisable
- Step 6 (Remarques) : Générique, réutilisable
- Step 7 (Validation) : Générique, réutilisable
- Preuve : Steps identifiés dans `src/modules/etatDesLieuxRetour/steps/`, pas de logique spécifique voiture

**Route** :
- `/checkin-return/[bookingId]` : Générique, réutilisable
- Preuve : `src/pages/checkin-return/[bookingId].tsx`, route unique

### 4.2 Éléments existants mais hardcodés voiture

**Snapshot légal retour** :
- Zones extérieures hardcodées : `coffre`, `janteAvDroit`, `janteArDroit`, `janteAvGauche`, `janteArGauche` (ligne 377, aucune condition `vehicle_type`)
- Accessoires hardcodés : `roueSecours`, `cric` (lignes 412-421, aucune condition `vehicle_type`)
- Section intérieur incluse systématiquement (lignes 395-408, aucune condition `vehicle_type`)
- `vehicle_type` non chargé depuis `vehicles` (ligne 235 : `select("id, brand, model, license_plate, owner_id")`)
- Preuve : `src/services/checkinReturnSnapshotService.ts` lignes 377, 412-421, 395-408, 235

**PDF retour** :
- Zones PDF hardcodées : `coffre`, jantes (ligne 851, aucune condition `vehicle_type`)
- Page intérieur générée systématiquement (lignes 914-963, `generatePage3()` appelée sans condition)
- Accessoires affichés (lignes 968-1040, liste depuis snapshot sans condition `vehicle_type`)
- `vehicle_type` non détecté (0 occurrence dans fichier)
- Preuve : `src/services/checkinReturnPdfService.ts` lignes 851, 914-963, 968-1040

**Form retour** :
- Step 3 zones hardcodées : `coffre`, jantes (lignes 189-199 dans `EtatDesLieuxRetourForm.tsx`, lignes 17-27 dans `Step3ExterieurRetour.tsx`, aucune condition `vehicle_type`)
- Step 4 intérieur inclus systématiquement (ligne 26 dans `EtatDesLieuxRetourForm.tsx`, aucune condition `vehicle_type` pour masquer)
- Step 5 accessoires hardcodés : `roueSecours`, `cric` (lignes 14-23 dans `Step5AccessoiresRetour.tsx`, aucune condition `vehicle_type`)
- `vehicle_type` non détecté dans le form (0 occurrence dans fichier)
- Preuve : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`, `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`, `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx`

### 4.3 Éléments absents (voiture et moto)

**Workflow n8n retour** :
- Aucun workflow n8n identifié pour le retour (ni voiture ni moto)
- Preuve : Greps effectués :
  - `grep -i "checkin_return\|checkinReturn" server/index.ts` → webhook n8n uniquement pour `/api/contact` (lignes 310-428)
  - `grep -i "checkin_return\|checkinReturn" WORKFLOW-N8N-EDL-AUTO-EMAIL.md` → 0 occurrence
  - `grep -i "checkin_return\|checkinReturn" supabase/migrations/YYYYMMDDHHMMSS_add_edl_email_tracking.sql` → 0 occurrence (migration uniquement pour `checkin_depart`)
  - Aucun fichier / appel identifié pour workflow n8n retour

### 4.4 Synthèse factuelle

**Éléments réutilisables tel quel** : 11 éléments identifiés (table DB, services de base, steps 1/2/6/7, route)

**Éléments existants mais hardcodés voiture** : 3 éléments identifiés (snapshot retour, PDF retour, form steps 3/4/5)
- Constat : Code présent mais zones/accessoires/intérieur hardcodés, aucune condition `vehicle_type`

**Éléments absents** : 1 élément identifié (workflow n8n retour)
- Constat : Aucun fichier / appel identifié pour envoi email retour (ni voiture ni moto)

**Détection `vehicle_type`** : Absente dans tous les services retour (snapshot, PDF, form)
- Preuve : 0 occurrence `vehicle_type` ou `moto` dans `checkinReturnSnapshotService.ts`, `checkinReturnPdfService.ts`, `EtatDesLieuxRetourForm.tsx`

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Type** : Diagnostic factuel traçable (références de fichiers, lignes, fonctions)

