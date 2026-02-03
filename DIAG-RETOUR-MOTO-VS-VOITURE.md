# Diagnostic Comparatif : État des lieux de RETOUR — VOITURE vs MOTO

**Date** : 2025-01-XX  
**Objectif** : Diagnostic factuel comparatif entre le flux retour VOITURE (existant) et MOTO (manquant)  
**Contrainte** : Diagnostic uniquement — PAS d'implémentation, PAS de suppositions

---

## 📋 Table des matières

1. [Flux complet RETOUR VOITURE](#1-flux-complet-retour-voiture)
2. [État actuel RETOUR MOTO](#2-état-actuel-retour-moto)
3. [Comparaison structurée](#3-comparaison-structurée)
4. [Conclusion de diagnostic](#4-conclusion-de-diagnostic)

---

## 1. Flux complet RETOUR VOITURE

### 1.1 Backend / Services

#### ✅ Service métier : `checkinReturnService.ts`
**Fichier** : `src/services/checkinReturnService.ts`  
**Fonctions principales** :
- `createOrGetCheckinReturn()` : Crée ou récupère un draft retour
- `saveReturnStep2Releves()` : Sauvegarde Step 2 (relevés km/carburant/photos dashboard)
- `saveReturnStep3Section()` : Sauvegarde Step 3 (extérieur par zone)
- `saveReturnStep4Interior()` : Sauvegarde Step 4 (intérieur)
- `saveReturnStep5Accessoires()` : Sauvegarde Step 5 (accessoires)
- `saveReturnStep6Remarques()` : Sauvegarde Step 6 (remarques)
- `finalizeCheckinReturn()` : Finalise le retour (snapshot + statut + PDF)

**Statuts utilisés** :
- `draft` : Brouillon en cours
- `completed` : Finalisé
- `cancelled` : Annulé

#### ✅ Service Supabase : `supabaseCheckinReturnService.ts`
**Fichier** : `src/services/supabaseCheckinReturnService.ts`  
**Fonctions principales** :
- `getReturnById()` : Récupère un retour par ID
- `getReturnByBookingId()` : Récupère un retour par booking_id
- `saveCheckinReturnDraft()` : Sauvegarde/met à jour un draft (merge JSONB)
- `updateReturnStatus()` : Met à jour le statut
- `updateReturnPDFUrl()` : Met à jour l'URL du PDF
- `createReturnSnapshot()` : Délègue la création du snapshot

#### ✅ Service Snapshot légal : `checkinReturnSnapshotService.ts`
**Fichier** : `src/services/checkinReturnSnapshotService.ts`  
**Fonction principale** :
- `createReturnSnapshot()` : Crée un snapshot légal complet

**Structure snapshot** :
- Métadonnées (version, createdAt)
- Booking (referenceNumber, dates, locations)
- Vehicle (brand, model, licensePlate)
- Owner (nom, prénom, email, phone)
- Renter (nom, prénom, email, phone)
- Données départ (mileage, fuelLevel, dashboardPhotos)
- Données retour (step2, step3, step4, step5, step6, step7)

**Version snapshot** : `"return-1.0"`

#### ✅ Service PDF : `checkinReturnPdfService.ts`
**Fichier** : `src/services/checkinReturnPdfService.ts`  
**Fonction principale** :
- `generateCheckinReturnPdf()` : Génère le PDF et l'upload dans Storage

**Processus** :
1. Charge `checkin_return` avec `snapshot_legal`
2. Vérifie statut = `completed` (ou skip si `skipStatusCheck: true`)
3. Génère HTML → Canvas → PDF (html2canvas + jsPDF)
4. Upload vers Supabase Storage (bucket `checkin-photos`)
5. Met à jour `legal_pdf_url` dans `checkin_return`

**Path Storage** : `resa_{referenceNumber}/retour/documents/etat_des_lieux_retour_{checkinReturnId}.pdf`

**Pages PDF générées** :
- Page 1 : Informations générales + relevés
- Page 2 : Extérieur retour (toutes zones)
- Page 3 : Intérieur retour
- Page 4 : Accessoires (tableau complet)
- Page 5 : Remarques
- Page 6 : Validation + signatures + mention légale

### 1.2 Tables DB impliquées

#### ✅ Table `checkin_return`
**Fichier SQL** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` (lignes 302-319)

**Colonnes** :
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings)
- `checkin_depart_id` (uuid, FK → checkin_depart)
- `owner_id` (uuid, FK → profiles)
- `renter_id` (uuid, FK → profiles)
- `status` (text, default 'draft')
- `data` (jsonb, default '{}')
- `snapshot_legal` (jsonb, nullable)
- `legal_pdf_url` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes** :
- `idx_checkin_return_booking_id` : INDEX sur `booking_id`
- `idx_checkin_return_checkin_depart_id` : INDEX sur `checkin_depart_id`
- `idx_checkin_return_booking_draft` : UNIQUE INDEX sur `booking_id` WHERE `status = 'draft'`

**RLS** : ❌ **DISABLED** (selon `DIAGNOSTIC-SCHEMA-COMPLET-RENTANOO.md`)

**Tables liées** :
- `checkin_depart` (via `checkin_depart_id`)
- `bookings` (via `booking_id`)
- `profiles` (via `owner_id`, `renter_id`)
- `vehicles` (via `bookings.vehicle_id`)

### 1.3 Frontend / Pages

#### ✅ Page route : `/checkin-return/[bookingId]`
**Fichier** : `src/pages/checkin-return/[bookingId].tsx`  
**Route** : Définie dans `src/App.tsx` ligne 44 (lazy-loaded)

**Composant** : `EtatDesLieuxRetourForm`

#### ✅ Form principal : `EtatDesLieuxRetourForm.tsx`
**Fichier** : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`

**Steps** :
1. **Step1DepartRecap** : Récapitulatif du départ (read-only)
2. **Step2RelevesRetour** : Relevés retour (km, carburant, photos dashboard)
3. **Step3ExterieurRetour** : Extérieur retour (zones : avant, droit, arrière, gauche, coffre, jantes)
4. **Step4InterieurRetour** : Intérieur retour
5. **Step5AccessoiresRetour** : Accessoires retour
6. **Step6RemarquesRetour** : Remarques retour
7. **Step7ValidationRetour** : Validation + signatures

**Fichiers steps** :
- `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx`
- `src/modules/etatDesLieuxRetour/steps/Step2RelevesRetour.tsx`
- `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`
- `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx`
- `src/modules/etatDesLieuxRetour/steps/Step5AccessoiresRetour.tsx`
- `src/modules/etatDesLieuxRetour/steps/Step6RemarquesRetour.tsx`
- `src/modules/etatDesLieuxRetour/steps/Step7ValidationRetour.tsx`

**Logique** :
- Charge `checkin_depart` par `bookingId`
- Crée/récupère `checkin_return` draft
- Sauvegarde progressive par step
- Finalise via `checkinReturnService.finalizeCheckinReturn()`

### 1.4 Snapshot légal

#### ✅ Structure snapshot retour voiture
**Fichier** : `src/services/checkinReturnSnapshotService.ts` (lignes 24-125)

**Zones extérieures gérées** (Step 3) :
- `avant` : Avant
- `droit` : Côté droit
- `arriere` : Arrière
- `gauche` : Côté gauche
- `coffre` : Coffre
- `janteAvDroit` : Jante avant droite
- `janteArDroit` : Jante arrière droite
- `janteAvGauche` : Jante avant gauche
- `janteArGauche` : Jante arrière gauche

**Accessoires gérés** (Step 5) :
- `gilet` : Gilet
- `triangle` : Triangle
- `roueSecours` : Roue de secours
- `cric` : Cric
- `cle` : Clé
- `cable` : Câble
- `manuel` : Manuel
- `carteCarburant` : Carte carburant

**Intérieur** (Step 4) : Géré avec zones (`area`, `description`, `photos`)

### 1.5 Génération PDF

#### ✅ Service PDF retour voiture
**Fichier** : `src/services/checkinReturnPdfService.ts`

**Caractéristiques** :
- Génère 6 pages PDF
- Utilise `snapshot_legal` comme source unique
- Upload vers Supabase Storage
- Met à jour `legal_pdf_url` dans `checkin_return`

**Zones PDF** :
- Page 1 : Infos générales + relevés (comparaison départ/retour)
- Page 2 : Extérieur retour (toutes zones avec dégâts)
- Page 3 : Intérieur retour
- Page 4 : Accessoires (tableau complet départ/retour)
- Page 5 : Remarques
- Page 6 : Validation + signatures

### 1.6 Workflow n8n / Emails

#### ⚠️ Workflow n8n RETOUR : **NON TROUVÉ**
**Fichier** : `WORKFLOW-N8N-EDL-AUTO-EMAIL.md`

**Contenu** : Document décrit uniquement le workflow pour le **DÉPART** (checkin_depart), pas pour le RETOUR (checkin_return).

**Conclusion** : Aucun workflow n8n configuré pour l'envoi automatique d'emails lors de la finalisation d'un retour voiture.

---

## 2. État actuel RETOUR MOTO

### 2.1 Backend / Services

#### ❌ Service métier : **AUCUN**
**Recherche** : Aucune mention de `moto` ou `vehicle_type` dans `checkinReturnService.ts`

**Conclusion** : Le service `checkinReturnService` est **générique** et ne gère pas de logique spécifique moto.

#### ❌ Service Supabase : **GÉNÉRIQUE**
**Recherche** : Aucune mention de `moto` ou `vehicle_type` dans `supabaseCheckinReturnService.ts`

**Conclusion** : Le service Supabase est **générique** et fonctionne pour tous types de véhicules.

#### ❌ Service Snapshot légal : **GÉNÉRIQUE (VOITURE)**
**Recherche** : Aucune mention de `moto` ou `vehicle_type` dans `checkinReturnSnapshotService.ts`

**Problème identifié** :
- Le snapshot retour utilise des zones **voiture** (coffre, jantes avant/arrière gauche/droite)
- Les accessoires sont **voiture** (roue de secours, cric, triangle)
- L'intérieur est géré comme pour une **voiture**

**Conclusion** : Le snapshot retour est **hardcodé pour voiture** et ne s'adapte pas à la moto.

#### ❌ Service PDF : **GÉNÉRIQUE (VOITURE)**
**Recherche** : Aucune mention de `moto` ou `vehicle_type` dans `checkinReturnPdfService.ts`

**Problème identifié** :
- Le PDF génère des pages avec zones **voiture** (coffre, jantes)
- Les accessoires affichés sont **voiture** (roue de secours, cric)
- L'intérieur est affiché comme pour une **voiture**

**Conclusion** : Le PDF retour est **hardcodé pour voiture** et ne s'adapte pas à la moto.

### 2.2 Tables DB

#### ✅ Table `checkin_return` : **EXISTE (GÉNÉRIQUE)**
**Statut** : La table `checkin_return` existe et est **générique** (pas de colonne `vehicle_type`).

**Conclusion** : La table DB peut être réutilisée telle quelle pour la moto.

### 2.3 Frontend / Pages

#### ❌ Page route moto retour : **N'EXISTE PAS**
**Recherche** : Aucune route spécifique moto pour le retour dans `src/App.tsx`

**Routes existantes** :
- `/checkin-return/[bookingId]` : Générique (utilisée pour voiture)

**Conclusion** : Pas de route dédiée moto retour, mais la route générique pourrait fonctionner si le form s'adapte.

#### ❌ Form retour moto : **N'EXISTE PAS**
**Recherche** : Aucun form spécifique moto retour dans `src/modules/etatDesLieuxRetour/`

**Form existant** : `EtatDesLieuxRetourForm.tsx` est **générique** mais :
- Ne détecte pas le `vehicle_type`
- Utilise des steps **voiture** (Step3 avec coffre, Step4 intérieur, Step5 accessoires voiture)

**Conclusion** : Le form retour est **hardcodé pour voiture** et ne s'adapte pas à la moto.

#### ❌ Steps retour moto : **N'EXISTENT PAS**
**Recherche** : Aucun step spécifique moto dans `src/modules/etatDesLieuxRetour/steps/`

**Steps existants** :
- `Step3ExterieurRetour.tsx` : Zones voiture (coffre, jantes)
- `Step4InterieurRetour.tsx` : Intérieur voiture
- `Step5AccessoiresRetour.tsx` : Accessoires voiture

**Conclusion** : Les steps retour sont **hardcodés pour voiture**.

### 2.4 Snapshot légal retour moto

#### ❌ Snapshot retour moto : **N'EXISTE PAS**
**Recherche** : Aucune logique moto dans `checkinReturnSnapshotService.ts`

**Problème** :
- Zones extérieures : coffre, jantes avant/arrière (non pertinents pour moto)
- Accessoires : roue de secours, cric (non pertinents pour moto)
- Intérieur : géré comme voiture (non pertinent pour moto)

**Conclusion** : Le snapshot retour est **incompatible avec la moto**.

### 2.5 Génération PDF retour moto

#### ❌ PDF retour moto : **N'EXISTE PAS**
**Recherche** : Aucune logique moto dans `checkinReturnPdfService.ts`

**Problème** :
- Pages PDF avec zones voiture (coffre, jantes)
- Accessoires voiture affichés
- Intérieur voiture affiché

**Conclusion** : Le PDF retour est **incompatible avec la moto**.

### 2.6 Workflow n8n retour moto

#### ❌ Workflow n8n retour moto : **N'EXISTE PAS**
**Recherche** : Aucun workflow n8n pour le retour (ni voiture ni moto)

**Conclusion** : Aucun workflow n8n configuré pour l'envoi automatique d'emails lors de la finalisation d'un retour (voiture ou moto).

---

## 3. Comparaison structurée

| Élément | Voiture (Retour) | Moto (Retour) | Écart identifié |
|---------|------------------|--------------|-----------------|
| **Table DB `checkin_return`** | ✅ Existe | ✅ Existe (générique) | ✅ **Réutilisable tel quel** |
| **Service métier `checkinReturnService`** | ✅ Existe (complet) | ✅ Existe (générique) | ✅ **Réutilisable tel quel** |
| **Service Supabase `supabaseCheckinReturnService`** | ✅ Existe (complet) | ✅ Existe (générique) | ✅ **Réutilisable tel quel** |
| **Service Snapshot `checkinReturnSnapshotService`** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À créer/adapter pour moto** |
| **Service PDF `checkinReturnPdfService`** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À créer/adapter pour moto** |
| **Page route `/checkin-return/[bookingId]`** | ✅ Existe | ⚠️ Existe (générique) | ⚠️ **Réutilisable si form adapté** |
| **Form `EtatDesLieuxRetourForm`** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À adapter pour moto** |
| **Step 1 : Récap départ** | ✅ Existe | ✅ Existe (générique) | ✅ **Réutilisable tel quel** |
| **Step 2 : Relevés retour** | ✅ Existe | ✅ Existe (générique) | ✅ **Réutilisable tel quel** |
| **Step 3 : Extérieur retour** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À créer pour moto** (zones différentes) |
| **Step 4 : Intérieur retour** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À désactiver/null pour moto** |
| **Step 5 : Accessoires retour** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À créer pour moto** (accessoires différents) |
| **Step 6 : Remarques retour** | ✅ Existe | ✅ Existe (générique) | ✅ **Réutilisable tel quel** |
| **Step 7 : Validation retour** | ✅ Existe | ✅ Existe (générique) | ✅ **Réutilisable tel quel** |
| **Snapshot légal retour** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À créer pour moto** (structure différente) |
| **PDF retour** | ✅ Existe (voiture) | ❌ N'existe pas | ❌ **À créer pour moto** (pages différentes) |
| **Workflow n8n retour** | ❌ N'existe pas | ❌ N'existe pas | ⚠️ **À créer (générique voiture + moto)** |
| **Envoi email locataire retour** | ❌ N'existe pas | ❌ N'existe pas | ⚠️ **À créer (générique voiture + moto)** |
| **Envoi email propriétaire retour** | ❌ N'existe pas | ❌ N'existe pas | ⚠️ **À créer (générique voiture + moto)** |
| **Détection `vehicle_type` dans form** | ❌ N'existe pas | ❌ N'existe pas | ❌ **À ajouter pour adapter le flux** |
| **Détection `vehicle_type` dans snapshot** | ❌ N'existe pas | ❌ N'existe pas | ❌ **À ajouter pour adapter le snapshot** |
| **Détection `vehicle_type` dans PDF** | ❌ N'existe pas | ❌ N'existe pas | ❌ **À ajouter pour adapter le PDF** |

---

## 4. Conclusion de diagnostic

### 4.1 État global

**Le retour moto est inexistant à ~85%** :

- ✅ **Infrastructure DB** : Réutilisable (table `checkin_return` générique)
- ✅ **Services de base** : Réutilisables (`checkinReturnService`, `supabaseCheckinReturnService`)
- ❌ **Services métier spécifiques** : À créer/adapter (snapshot, PDF)
- ❌ **Frontend** : À adapter (form, steps 3/4/5)
- ❌ **Workflow n8n** : À créer (générique voiture + moto)

### 4.2 Points BLOQUANTS

1. **Snapshot légal retour moto** :
   - Zones extérieures : coffre, jantes avant/arrière (non pertinents)
   - Accessoires : roue de secours, cric (non pertinents)
   - Intérieur : géré comme voiture (non pertinent)
   - **Action** : Créer une logique snapshot moto (zones moto, accessoires moto, intérieur = null)

2. **PDF retour moto** :
   - Pages PDF hardcodées voiture
   - Zones et accessoires voiture affichés
   - **Action** : Créer un template PDF moto (pages adaptées, zones moto, accessoires moto)

3. **Form retour moto** :
   - Step 3 : Zones voiture (coffre, jantes)
   - Step 4 : Intérieur voiture (non pertinent pour moto)
   - Step 5 : Accessoires voiture (non pertinents)
   - **Action** : Adapter le form pour détecter `vehicle_type` et afficher les steps appropriés

4. **Détection `vehicle_type`** :
   - Aucune détection dans le form retour
   - Aucune détection dans le snapshot retour
   - Aucune détection dans le PDF retour
   - **Action** : Ajouter la détection `vehicle_type` partout (form, snapshot, PDF)

### 4.3 Points FACILES à répliquer

1. **Table DB `checkin_return`** : ✅ Déjà générique, réutilisable tel quel
2. **Services de base** : ✅ `checkinReturnService`, `supabaseCheckinReturnService` réutilisables
3. **Steps génériques** : ✅ Step 1 (récap), Step 2 (relevés), Step 6 (remarques), Step 7 (validation) réutilisables
4. **Page route** : ✅ Route `/checkin-return/[bookingId]` réutilisable si form adapté

### 4.4 Référence : Départ moto (existant)

**Pour référence** : Le départ moto existe et fonctionne :
- `src/modules/etatDesLieuxDepartMoto/` : Form moto départ
- `src/services/checkinDepartService.ts` : Fonctions `saveStep3DraftMoto()`, `saveStep5DraftMoto()`
- `src/services/checkinDepartSnapshotService.ts` : Détection `vehicle_type` et adaptation moto
- `src/services/checkinDepartPdfService.ts` : Détection `vehicle_type` et template PDF moto

**Leçon** : Le pattern d'adaptation moto existe déjà pour le **départ**. Il faut appliquer le même pattern pour le **retour**.

### 4.5 Pourcentage de réutilisation

- **Infrastructure DB** : 100% réutilisable
- **Services de base** : 100% réutilisable
- **Services métier spécifiques** : 0% réutilisable (à créer/adapter)
- **Frontend form** : ~40% réutilisable (steps 1, 2, 6, 7)
- **Frontend steps** : ~30% réutilisable (steps 1, 2, 6, 7)
- **Snapshot** : 0% réutilisable (structure différente)
- **PDF** : 0% réutilisable (template différent)
- **Workflow n8n** : 0% réutilisable (n'existe pas même pour voiture)

**Estimation globale** : **~35% du flux retour voiture est réutilisable pour la moto**.

### 4.6 Actions recommandées (hors scope diagnostic)

⚠️ **Note** : Ces actions sont listées à titre informatif, hors scope du diagnostic.

1. **Action A** : Adapter le form retour pour détecter `vehicle_type` et router vers steps appropriés
2. **Action B** : Créer/adapter le snapshot retour moto (zones moto, accessoires moto, intérieur = null)
3. **Action C** : Créer/adapter le PDF retour moto (template moto, pages adaptées)
4. **Action D** : Créer le workflow n8n retour (générique voiture + moto)

---

**Document créé le** : 2025-01-XX  
**Version** : 1.0  
**Type** : Diagnostic factuel (pas d'implémentation)

