# 🔍 Diagnostic & Plan : Switch automatique Checking selon type véhicule

**Date** : 2025-01-XX  
**Objectif** : Adapter automatiquement l'expérience "état des lieux" selon le type de véhicule (`car` vs `moto`/`scooter`)

---

## 📋 Table des matières

1. [Diagnostic du code existant](#1-diagnostic-du-code-existant)
2. [Recensement état des lieux voiture](#2-recensement-état-des-lieux-voiture)
3. [Proposition version moto/scooter](#3-proposition-version-motoscooter)
4. [Stratégie de switch automatique](#4-stratégie-de-switch-automatique)
5. [Checklist d'implémentation](#5-checklist-dimplémentation)
6. [Code & Patchs](#6-code--patchs)

---

## 1️⃣ Diagnostic du code existant

### 1.1 Routes & Pages

**Route actuelle** :
- **Frontend** : `/checking/:bookingId` (définie dans `src/App.tsx` ligne 151)
- **Composant** : `src/pages/Checking.tsx`
- **Formulaire principal** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`

**Structure de routing** :
```typescript
// src/App.tsx ligne 151
<Route path="/checking/:bookingId" element={
  <Suspense fallback={<PageLoader />}>
    <Checking />
  </Suspense>
} />
```

**Note** : Le prompt mentionne `/checking/<checkingId>`, mais le code utilise `/checking/:bookingId` (ID de réservation, pas ID de checking).

### 1.2 Récupération des données

**Flux actuel** (`EtatDesLieuxDepartForm.tsx` lignes 545-808) :

1. **Booking** : Récupéré via `bookings.id` avec :
   - `user_id` (locataire/conducteur)
   - `vehicle_id` (véhicule loué)
   - `start_date`, `end_date`
   - `reference_number`
   - `pickup_location`

2. **Véhicule** : Récupéré via `vehicles.id` avec :
   - `brand`, `model`, `license_plate`
   - `owner_id` (propriétaire)
   - ⚠️ **PROBLÈME** : `vehicle_type` n'est **PAS** récupéré actuellement (ligne 639)

3. **Profils** : Conducteur (`profiles.id = booking.user_id`) et Propriétaire (`profiles.id = vehicle.owner_id`)

**Code actuel (ligne 637-641)** :
```typescript
const { data: vehicle, error: vehicleError } = await supabase
  .from("vehicles" as any)
  .select("id, brand, model, license_plate, owner_id")  // ⚠️ vehicle_type manquant
  .eq("id", booking.vehicle_id)
  .single();
```

### 1.3 Stockage du type de véhicule

**Base de données** :
- **Table** : `vehicles`
- **Colonne** : `vehicle_type` (type `TEXT`, valeurs possibles : `'car'`, `'moto'`, `'scooter'`, `NULL`)
- **Contrainte** : `CHECK (vehicle_type IS NULL OR vehicle_type IN ('car', 'moto', 'scooter'))`
- **Index** : `idx_vehicles_vehicle_type` (WHERE vehicle_type IS NOT NULL)

**Source de vérité** :
- Défini lors de la création du véhicule (via `VehicleTypeModal` ou `AddMotoPlaceholder.tsx`)
- Stocké en DB : `vehicle_type = 'moto'` pour les motos/scooters
- Fallback : Si `vehicle_type IS NULL` → traité comme `'car'` (voir `src/utils/vehicleType.ts`)

**Fichiers clés** :
- `src/services/supabaseVehiclesService.ts` (ligne 32) : Interface `Vehicle` avec `vehicle_type?: 'car' | 'moto' | 'scooter' | null`
- `src/utils/vehicleType.ts` : Fonction `isMoto()` pour détecter moto/scooter
- `ROADMAP-COMPLETE-VEHICLE-TYPE-SYSTEM.md` : Documentation complète du système

### 1.4 Fichiers clés identifiés

**Frontend** :
- `src/pages/Checking.tsx` - Page wrapper
- `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` - Formulaire principal (2106 lignes)
- `src/modules/etatDesLieuxDepart/sections/Section1Identification.tsx` - Identification conducteur
- `src/modules/etatDesLieuxDepart/sections/Section2Releves.tsx` - Relevés (km, carburant)
- `src/components/ExteriorInspectionAccordionSimple.tsx` - Inspection extérieure (voiture)
- `src/modules/etatDesLieuxDepart/sections/Section4Interieur.tsx` - Inspection intérieure
- `src/modules/etatDesLieuxDepart/sections/Section5Accessoires.tsx` - Accessoires
- `src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx` - Remarques
- `src/modules/etatDesLieuxDepart/sections/Section8Validation.tsx` - Validation & signatures

**Services** :
- `src/services/supabaseCheckinService.ts` - CRUD checkin_depart
- `src/services/checkinDepartService.ts` - Sauvegarde progressive par step
- `src/services/supabaseVehiclesService.ts` - Récupération véhicules

**Types** :
- `src/types/index.ts` - Interfaces TypeScript
- `src/types/step3.ts` - Types pour Step 3 (extérieur)
- `src/types/step4.ts` - Types pour Step 4 (intérieur)

**Base de données** :
- `checkin_depart` table (voir `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` ligne 259)
- `vehicles` table avec colonne `vehicle_type`

---

## 2️⃣ Recensement état des lieux voiture

### 2.1 Structure complète (7 étapes)

#### **Step 1 : Identification** (`Section1Identification.tsx`)
- **Conducteur** :
  - Nom, prénom
  - Numéro de permis, pays d'émission
  - Date délivrance, date expiration
  - Catégorie permis (B par défaut)
  - Photos permis (recto/verso) - **OBLIGATOIRES**
- **Véhicule** (pré-rempli depuis booking) :
  - Marque, modèle, immatriculation
- **Réservation** (pré-rempli depuis booking) :
  - Numéro de réservation
  - Dates/heures départ/retour
  - Lieu de prise en charge

#### **Step 2 : Relevés** (`Section2Releves.tsx`)
- **Kilométrage** : Nombre entier (min 0)
- **Niveau carburant** : Pourcentage 0-100
- **Photos tableau de bord** : Array de photos (compteur, témoins) - **OBLIGATOIRES**

#### **Step 3 : Extérieur & Coffre** (`ExteriorInspectionAccordionSimple.tsx`)
**6 zones d'inspection** :

1. **Avant** :
   - Photo zone (obligatoire)
   - Dégât présent ? (oui/non/null)
   - Description dégât (si oui)
   - Photos dégâts (si oui)

2. **Côté droit** :
   - Photo zone (obligatoire)
   - Dégât présent ? (oui/non/null)
   - Description dégât (si oui)
   - Photos dégâts (si oui)
   - **Jantes** : Avant droite + Arrière droite (photos + dégâts)

3. **Arrière** :
   - Photo zone (obligatoire)
   - Dégât présent ? (oui/non/null)
   - Description dégât (si oui)
   - Photos dégâts (si oui)

4. **Coffre** :
   - Photo coffre ouvert (obligatoire)
   - Équipements obligatoires :
     - Triangle (présent ?)
     - Gilet (présent ?)
     - Roue de secours / kit anti-crevaison (présent ?)
     - Câble recharge (si électrique)
   - Photos accessoires

5. **Côté gauche** :
   - Photo zone (obligatoire)
   - Dégât présent ? (oui/non/null)
   - Description dégât (si oui)
   - Photos dégâts (si oui)
   - **Jantes** : Avant gauche + Arrière gauche (photos + dégâts)

6. **Propreté extérieure** :
   - Niveau : Excellent / Bon / Moyen / Sale
   - Photos générales
   - Notes

**Types de dégâts carrosserie** :
- Rayure
- Bosse / enfoncement
- Frottement peinture
- Fissure / cassure plastique
- Phare / feu fissuré
- Pare-brise ou vitre impactée
- Autre

**Types de dégâts jantes** :
- Rayure jante
- Jante frottée trottoir
- Fêlure / fissure jante
- Pneu abîmé
- Autre

#### **Step 4 : Intérieur** (`Section4Interieur.tsx`)
**3 sections** :

1. **Sièges** :
   - Photos (obligatoires)
   - Dégâts présents ? (oui/non)
   - Types de dégâts (si oui) :
     - Tache / salissure
     - Déchirure / trou
     - Brûlure (cigarette)
     - Couture abîmée
     - Usure importante
     - Siège déformé / affaissé
     - Mécanisme cassé
     - Autre
   - Notes

2. **Propreté intérieure** :
   - Niveau : Excellent / Bon / Moyen / Sale
   - Photos générales
   - Notes

3. **Équipements** :
   - Radio/GPS : OK / Non fonctionnel
   - Climatisation : OK / Non fonctionnelle
   - Verrouillage centralisé : OK / Non fonctionnel
   - Fenêtres : OK / Non fonctionnelles

#### **Step 5 : Accessoires & Équipements** (`Section5Accessoires.tsx`)
**Checklist** :
- Gilet de sécurité (booléen)
- Triangle de signalisation (booléen)
- Roue de secours (booléen)
- Cric (booléen)
- Clé(s) (booléen)
- Câble (recharge si électrique) (booléen)
- Manuel (booléen)
- Carte carburant (booléen)
- Commentaire (texte libre)

#### **Step 6 : Remarques & Observations** (`Section6Remarques.tsx`)
- Observations générales (texte libre)

#### **Step 7 : Validation & Signature** (`Section8Validation.tsx`)
- Signature propriétaire (canvas/base64) - **OBLIGATOIRE**
- Signature locataire (canvas/base64) - **OBLIGATOIRE**
- Validation finale → Génération PDF légal

### 2.2 Contrat de données (JSON)

**Structure complète** (`EtatDesLieuxDepartForm.tsx` lignes 38-214) :

```typescript
{
  bookingId: string,
  conducteur: {
    nom: string,
    prenom: string,
    numeroPermis: string,
    paysEmission: string,
    dateDelivrance: string,
    dateExpiration: string,
    categoriePermis: string, // "B"
    driver_license_photos_recto: string | null, // base64 ou URL
    driver_license_photos_verso: string | null
  },
  vehicule: {
    marque: string,
    modele: string,
    immatriculation: string
  },
  releves: {
    kilometrage: number,
    niveauCarburant: number, // 0-100
    dashboardPhotos: string[] // URLs ou base64
  },
  inspection_exterieure: {
    avant: {
      photo_zone: string[],
      degat_present: "yes" | "no" | null,
      degat_description?: string,
      degat_photos?: string[]
    },
    cote_droit: {
      photo_zone: string[],
      degat_present: "yes" | "no" | null,
      degat_description?: string,
      degat_photos?: string[],
      jante_av_droite?: { photos: string[], degats?: any[] },
      jante_ar_droite?: { photos: string[], degats?: any[] }
    },
    arriere: { /* idem avant */ },
    coffre: {
      photo_coffre_ouvert: string[],
      gilet_triangle_present: boolean | null,
      roue_secours: boolean | null,
      cable_recharge_present: boolean | null,
      photos_accessoires?: string[]
    },
    cote_gauche: { /* idem cote_droit */ }
  },
  interiorInspection: {
    sieges: {
      photos: string[],
      hasDamage: boolean,
      damages: string[],
      notes?: string
    },
    propreteGenerale: {
      photos: string[],
      level: "Excellent" | "Bon" | "Moyen" | "Sale",
      notes?: string
    },
    equipements: {
      radioOk: boolean,
      acOk: boolean,
      centralLockOk: boolean,
      windowsOk: boolean
    }
  },
  accessoires: {
    gilet: boolean,
    triangle: boolean,
    roueSecours: boolean,
    cric: boolean,
    cle: boolean,
    cable: boolean,
    manuel: boolean,
    carteCarburant: boolean,
    commentaire?: string
  },
  remarques: {
    observations?: string
  },
  signatures: {
    signatureProprietaire: string, // base64
    signatureLocataire: string // base64
  }
}
```

**Stockage en DB** (`checkin_depart` table) :
- Colonnes SQL dédiées : `kilometrage_depart`, `niveau_carburant`, `photos_dashboard`, `photos_exterieur`, `photos_jantes`, `photos_coffre`, `degats`, `photo_permis_recto`, `photo_permis_verso`
- Colonne JSONB `data` : Structure complète par step (`step1`, `step2`, `step3`, `step4`, `step5`, `step6`, `step7`)

### 2.3 Règles de validation

**Champs obligatoires** :
- Step 1 : Tous les champs conducteur + photos permis recto/verso
- Step 2 : Kilométrage + niveau carburant + au moins 1 photo dashboard
- Step 3 : Photos de toutes les zones (avant, droit, arrière, coffre, gauche) + propreté extérieure
- Step 4 : Photos sièges + propreté intérieure + équipements
- Step 5 : Au minimum gilet + triangle (obligatoires légaux)
- Step 7 : Signatures propriétaire + locataire

**Photos obligatoires** :
- Permis recto/verso
- Tableau de bord (compteur)
- 5 zones extérieures (avant, droit, arrière, gauche, coffre)
- 4 jantes (si dégâts)
- Sièges
- Propreté générale

---

## 3️⃣ Proposition version moto/scooter

### 3.1 Structure simplifiée (6 étapes)

#### **Step 1 : Identification** (identique)
- Conducteur (identique à voiture)
- Véhicule (marque, modèle, immatriculation)
- Réservation (dates, lieu)

#### **Step 2 : Relevés** (adapté)
- **Kilométrage** : Nombre entier (min 0)
- **Niveau carburant** : Pourcentage 0-100 (ou niveau batterie si électrique)
- **Photos compteur** : 1 photo minimum (compteur + témoins)

#### **Step 3 : Extérieur** (simplifié, zones spécifiques moto)
**5 zones d'inspection** :

1. **Avant** :
   - Photo zone (obligatoire)
   - État phare avant : OK / Cassé / Abîmé
   - État clignotants avant : OK / Cassé
   - Dégâts carrosserie ? (oui/non)
   - Description + photos dégâts (si oui)

2. **Côté droit** :
   - Photo zone (obligatoire)
   - État rétroviseur droit : OK / Cassé / Manquant
   - État clignotant droit : OK / Cassé
   - Dégâts carrosserie ? (oui/non)
   - Description + photos dégâts (si oui)

3. **Arrière** :
   - Photo zone (obligatoire)
   - État feu arrière : OK / Cassé / Abîmé
   - État clignotants arrière : OK / Cassé
   - Dégâts carrosserie ? (oui/non)
   - Description + photos dégâts (si oui)

4. **Côté gauche** :
   - Photo zone (obligatoire)
   - État rétroviseur gauche : OK / Cassé / Manquant
   - État clignotant gauche : OK / Cassé
   - Dégâts carrosserie ? (oui/non)
   - Description + photos dégâts (si oui)

5. **Propreté extérieure** :
   - Niveau : Excellent / Bon / Moyen / Sale
   - Photos générales
   - Notes

**Types de dégâts carrosserie moto** :
- Rayure
- Bosse / enfoncement
- Frottement peinture
- Fissure / cassure plastique
- Phare / feu fissuré
- Autre

#### **Step 4 : Pneus & Freins** (nouveau, spécifique moto)
**Pneus** :
- **Pneu avant** :
  - Photo (obligatoire)
  - État : OK / Usé / Abîmé / Crevé
  - Pression (si jauge disponible)
  - Dégâts visibles ? (oui/non)
  - Description + photos dégâts (si oui)

- **Pneu arrière** :
  - Photo (obligatoire)
  - État : OK / Usé / Abîmé / Crevé
  - Pression (si jauge disponible)
  - Dégâts visibles ? (oui/non)
  - Description + photos dégâts (si oui)

**Freins** :
- **Frein avant** :
  - État : OK / À signaler / Non fonctionnel
  - Notes

- **Frein arrière** :
  - État : OK / À signaler / Non fonctionnel
  - Notes

#### **Step 5 : Équipements & Accessoires** (adapté moto)
**Checklist** :
- **Selle** : OK / Abîmée / Manquante
- **Coffre / Top case** (si présent) :
  - Présent ? (oui/non)
  - État : OK / Abîmé / Non fonctionnel
  - Photos
- **Antivol** : Présent ? (oui/non)
- **Clé(s)** : Présent ? (oui/non)
- **Manuel** : Présent ? (oui/non)
- **Carte grise / Assurance** (si demandé) : Photos
- **Éclairage** :
  - Phare avant : Fonctionnel / Non fonctionnel
  - Feu arrière : Fonctionnel / Non fonctionnel
  - Clignotants : Fonctionnels / Non fonctionnels
- **Rétroviseurs** :
  - Avant : OK / Cassé / Manquant
  - Arrière : OK / Cassé / Manquant
- Commentaire (texte libre)

#### **Step 6 : Remarques & Validation** (fusion Step 6 + 7)
- Observations générales (texte libre)
- Signature propriétaire (obligatoire)
- Signature locataire (obligatoire)
- Validation finale → Génération PDF légal

### 3.2 Structure de données cible (JSON)

```typescript
{
  bookingId: string,
  conducteur: { /* identique voiture */ },
  vehicule: { /* identique voiture */ },
  releves: {
    kilometrage: number,
    niveauCarburant: number, // 0-100 (ou batterie %)
    photosCompteur: string[] // URLs ou base64
  },
  inspection_exterieure_moto: {
    avant: {
      photo_zone: string[],
      phare_avant: "OK" | "Cassé" | "Abîmé",
      clignotants_avant: "OK" | "Cassé",
      degat_present: "yes" | "no" | null,
      degat_description?: string,
      degat_photos?: string[]
    },
    cote_droit: {
      photo_zone: string[],
      retroviseur_droit: "OK" | "Cassé" | "Manquant",
      clignotant_droit: "OK" | "Cassé",
      degat_present: "yes" | "no" | null,
      degat_description?: string,
      degat_photos?: string[]
    },
    arriere: {
      photo_zone: string[],
      feu_arriere: "OK" | "Cassé" | "Abîmé",
      clignotants_arriere: "OK" | "Cassé",
      degat_present: "yes" | "no" | null,
      degat_description?: string,
      degat_photos?: string[]
    },
    cote_gauche: { /* idem cote_droit */ },
    propreteExterieure: {
      level: "Excellent" | "Bon" | "Moyen" | "Sale",
      photos: string[],
      notes?: string
    }
  },
  pneus_freins: {
    pneu_avant: {
      photo: string[],
      etat: "OK" | "Usé" | "Abîmé" | "Crevé",
      pression?: number, // PSI ou bar
      degat_present: boolean,
      degat_description?: string,
      degat_photos?: string[]
    },
    pneu_arriere: { /* idem pneu_avant */ },
    frein_avant: {
      etat: "OK" | "À signaler" | "Non fonctionnel",
      notes?: string
    },
    frein_arriere: { /* idem frein_avant */ }
  },
  equipements_moto: {
    selle: "OK" | "Abîmée" | "Manquante",
    coffre_topcase: {
      present: boolean,
      etat?: "OK" | "Abîmé" | "Non fonctionnel",
      photos?: string[]
    },
    antivol: boolean,
    cles: boolean,
    manuel: boolean,
    documents: {
      carte_grise?: string[], // photos
      assurance?: string[] // photos
    },
    eclairage: {
      phare_avant: "Fonctionnel" | "Non fonctionnel",
      feu_arriere: "Fonctionnel" | "Non fonctionnel",
      clignotants: "Fonctionnels" | "Non fonctionnels"
    },
    retroviseurs: {
      avant: "OK" | "Cassé" | "Manquant",
      arriere: "OK" | "Cassé" | "Manquant"
    },
    commentaire?: string
  },
  remarques: {
    observations?: string
  },
  signatures: {
    signatureProprietaire: string, // base64
    signatureLocataire: string // base64
  }
}
```

### 3.3 Règles "requis" moto

**Champs obligatoires** :
- Step 1 : Identique voiture (conducteur + photos permis)
- Step 2 : Kilométrage + niveau carburant + 1 photo compteur minimum
- Step 3 : Photos de 4 zones (avant, droit, arrière, gauche) + propreté extérieure
- Step 4 : Photos pneus avant/arrière + état freins avant/arrière
- Step 5 : Selle + clés (minimum requis)
- Step 6 : Signatures propriétaire + locataire

**Photos obligatoires** :
- Permis recto/verso
- Compteur (1 minimum)
- 4 zones extérieures (avant, droit, arrière, gauche)
- Pneus avant + arrière
- Propreté générale

**Différences clés vs voiture** :
- ❌ Pas de coffre (remplacé par top case optionnel)
- ❌ Pas de jantes séparées (intégrées dans zones)
- ❌ Pas d'inspection intérieure (sièges, habitacle)
- ❌ Pas de roue de secours, cric, triangle, gilet
- ✅ Pneus avant/arrière séparés (obligatoires)
- ✅ Freins avant/arrière (obligatoires)
- ✅ Éclairage/clignotants (obligatoires)
- ✅ Rétroviseurs (obligatoires)

---

## 4️⃣ Stratégie de switch automatique

### 4.1 Option A : Rendu conditionnel (RECOMMANDÉE)

**Principe** :
- Garder une seule route `/checking/:bookingId`
- Récupérer `vehicle_type` depuis le véhicule de la réservation
- Rendu conditionnel : si `vehicle_type === 'car'` → UI voiture, sinon → UI moto

**Avantages** :
- ✅ Pas de changement d'URL (backward compatible)
- ✅ Pas de redirection (meilleure UX)
- ✅ Code centralisé (une seule page)
- ✅ Facile à maintenir

**Inconvénients** :
- ⚠️ Composants plus complexes (conditions)
- ⚠️ Taille bundle légèrement plus grande (mais lazy-load possible)

**Implémentation** :
```typescript
// src/pages/Checking.tsx
const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'scooter' | null>(null);

useEffect(() => {
  async function loadVehicleType() {
    const { data: booking } = await supabase
      .from("bookings")
      .select("vehicle_id")
      .eq("id", bookingId)
      .single();
    
    if (booking?.vehicle_id) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("vehicle_type")
        .eq("id", booking.vehicle_id)
        .single();
      
      setVehicleType(vehicle?.vehicle_type || 'car'); // Fallback car
    }
  }
  loadVehicleType();
}, [bookingId]);

// Rendu conditionnel
{vehicleType === 'car' ? (
  <EtatDesLieuxDepartFormCar bookingId={bookingId} />
) : (
  <EtatDesLieuxDepartFormMoto bookingId={bookingId} />
)}
```

### 4.2 Option B : Routes dédiées (NON RECOMMANDÉE)

**Principe** :
- Créer `/checking/:bookingId/car` et `/checking/:bookingId/moto`
- Sur `/checking/:bookingId`, redirection automatique selon `vehicle_type`

**Avantages** :
- ✅ Séparation claire du code
- ✅ URLs explicites

**Inconvénients** :
- ❌ Redirection = latence + flash blanc
- ❌ Duplication de code (wrapper)
- ❌ Risque de casser les liens existants
- ❌ Plus complexe à maintenir

**Verdict** : **Option A recommandée** pour simplicité et performance.

### 4.3 Gestion des anciens checkings

**Problème** : Les checkings existants n'ont pas de `vehicle_type` stocké dans `checkin_depart`.

**Solution** :
1. **À la lecture** : Récupérer `vehicle_type` depuis `vehicles` (via `booking.vehicle_id`)
2. **Pas de migration nécessaire** : `vehicle_type` n'est pas stocké dans `checkin_depart`, toujours récupéré dynamiquement
3. **Fallback** : Si `vehicle_type IS NULL` → traiter comme `'car'` (comportement existant)

**Code de fallback** :
```typescript
const vehicleType = vehicle?.vehicle_type || 'car'; // Fallback car si NULL
```

### 4.4 Gestion cas manquant/inattendu

**Scénarios** :
1. `vehicle_type IS NULL` → Fallback `'car'` (comportement existant)
2. `vehicle_type = 'scooter'` → Traiter comme `'moto'` (même UI)
3. `vehicle_type` valeur inattendue → Fallback `'car'` + log warning

**Code robuste** :
```typescript
function getVehicleTypeForChecking(vehicleType: string | null | undefined): 'car' | 'moto' {
  if (!vehicleType || vehicleType === 'car') {
    return 'car';
  }
  if (vehicleType === 'moto' || vehicleType === 'scooter') {
    return 'moto';
  }
  // Valeur inattendue → fallback car
  console.warn(`[Checking] vehicle_type inattendu: ${vehicleType}, fallback car`);
  return 'car';
}
```

---

## 5️⃣ Checklist d'implémentation

### 5.1 Base de données

**Migration** : ❌ **AUCUNE migration nécessaire**

**Justification** :
- `vehicle_type` existe déjà dans `vehicles` table
- `checkin_depart` n'a pas besoin de stocker `vehicle_type` (récupéré dynamiquement depuis `vehicles`)

**Vérification** :
- [ ] Confirmer que `vehicles.vehicle_type` existe et est accessible
- [ ] Vérifier que les policies RLS permettent la lecture de `vehicle_type`

### 5.2 API / Services

**Modifications** :

1. **`src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`** :
   - [ ] Ajouter `vehicle_type` dans le SELECT véhicule (ligne 639)
   - [ ] Stocker `vehicleType` dans le state
   - [ ] Passer `vehicleType` aux composants enfants

2. **`src/services/supabaseCheckinService.ts`** :
   - [ ] Aucune modification nécessaire (pas de stockage `vehicle_type`)

3. **`src/services/checkinDepartService.ts`** :
   - [ ] Aucune modification nécessaire

### 5.3 Frontend - Composants

**Nouveaux composants à créer** :

1. **`src/modules/etatDesLieuxDepart/EtatDesLieuxDepartFormMoto.tsx`** :
   - [ ] Copier `EtatDesLieuxDepartForm.tsx`
   - [ ] Adapter les steps (6 étapes au lieu de 7)
   - [ ] Remplacer Step 3 par `ExteriorInspectionAccordionMoto`
   - [ ] Remplacer Step 4 par `PneusFreinsInspection.tsx` (nouveau)
   - [ ] Supprimer Step 4 (intérieur) ou adapter
   - [ ] Adapter Step 5 (équipements moto)
   - [ ] Fusionner Step 6 + 7 (remarques + validation)

2. **`src/components/ExteriorInspectionAccordionMoto.tsx`** :
   - [ ] Copier `ExteriorInspectionAccordionSimple.tsx`
   - [ ] Adapter les zones (5 zones au lieu de 6)
   - [ ] Supprimer zone "Coffre"
   - [ ] Ajouter champs spécifiques moto (phares, clignotants, rétroviseurs)
   - [ ] Supprimer gestion jantes séparées

3. **`src/modules/etatDesLieuxDepart/sections/PneusFreinsInspection.tsx`** (NOUVEAU) :
   - [ ] Créer composant pour Step 4 moto
   - [ ] Sections : Pneu avant, Pneu arrière, Frein avant, Frein arrière
   - [ ] Photos obligatoires pneus
   - [ ] Validation état freins

4. **`src/modules/etatDesLieuxDepart/sections/Section5EquipementsMoto.tsx`** :
   - [ ] Copier `Section5Accessoires.tsx`
   - [ ] Adapter checklist (selle, top case, antivol, clés, éclairage, rétroviseurs)
   - [ ] Supprimer éléments voiture (roue secours, cric, triangle, gilet)

5. **`src/pages/Checking.tsx`** :
   - [ ] Ajouter state `vehicleType`
   - [ ] Récupérer `vehicle_type` depuis véhicule
   - [ ] Rendu conditionnel : `vehicleType === 'car'` ? `<EtatDesLieuxDepartForm />` : `<EtatDesLieuxDepartFormMoto />`

**Composants existants à modifier** :

1. **`src/modules/etatDesLieuxDepart/sections/Section2Releves.tsx`** :
   - [ ] Adapter labels pour moto ("Compteur" au lieu de "Tableau de bord")
   - [ ] Optionnel : Ajouter champ "Niveau batterie" si véhicule électrique

2. **`src/modules/etatDesLieuxDepart/sections/Section6Remarques.tsx`** :
   - [ ] Aucune modification (identique voiture/moto)

3. **`src/modules/etatDesLieuxDepart/sections/Section8Validation.tsx`** :
   - [ ] Aucune modification (identique voiture/moto)

### 5.4 Types TypeScript

**Nouveaux types** :

1. **`src/types/step3-moto.ts`** (NOUVEAU) :
   - [ ] Définir `InspectionExterieureMoto` (zones avant, droit, arrière, gauche, propreté)
   - [ ] Types dégâts carrosserie moto

2. **`src/types/step4-moto.ts`** (NOUVEAU) :
   - [ ] Définir `PneusFreinsInspection` (pneus avant/arrière, freins avant/arrière)

3. **`src/types/step5-moto.ts`** (NOUVEAU) :
   - [ ] Définir `EquipementsMoto` (selle, top case, antivol, clés, éclairage, rétroviseurs)

4. **`src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`** :
   - [ ] Ajouter prop `vehicleType?: 'car' | 'moto' | 'scooter' | null`

### 5.5 Schémas de validation Zod

**Nouveaux schémas** :

1. **`src/modules/etatDesLieuxDepart/schemas/inspectionExterieureMotoSchema.ts`** (NOUVEAU) :
   - [ ] Schéma Zod pour Step 3 moto

2. **`src/modules/etatDesLieuxDepart/schemas/pneusFreinsSchema.ts`** (NOUVEAU) :
   - [ ] Schéma Zod pour Step 4 moto

3. **`src/modules/etatDesLieuxDepart/schemas/equipementsMotoSchema.ts`** (NOUVEAU) :
   - [ ] Schéma Zod pour Step 5 moto

4. **`src/modules/etatDesLieuxDepart/EtatDesLieuxDepartFormMoto.tsx`** :
   - [ ] Créer `FormSchemaMoto` (6 steps au lieu de 7)

### 5.6 Stockage photos

**Conventions** :

- **Voiture** : `resa_{referenceNumber}/exterieur/{zone}/photo_{timestamp}.jpg`
- **Moto** : `resa_{referenceNumber}/exterieur_moto/{zone}/photo_{timestamp}.jpg`
- **Pneus moto** : `resa_{referenceNumber}/pneus/{avant|arriere}/photo_{timestamp}.jpg`
- **Freins moto** : Pas de photos (juste état)

**Modifications** :

1. **`src/modules/etatDesLieuxDepart/helpers/step3Helpers.ts`** :
   - [ ] Créer `uploadZonePhotoMoto()` (adapté pour zones moto)

2. **`src/modules/etatDesLieuxDepart/helpers/step4MotoHelpers.ts`** (NOUVEAU) :
   - [ ] Créer `uploadPneuPhoto()` (avant/arrière)

### 5.7 Compatibilité

**Gestion anciennes données** :

- [ ] Vérifier que les anciens checkings `vehicle_type = NULL` s'affichent correctement (fallback car)
- [ ] Tester avec un véhicule existant sans `vehicle_type`
- [ ] Tester avec un véhicule `vehicle_type = 'moto'`

**Migration données** (si nécessaire) :
- [ ] Script SQL pour backfill `vehicle_type` si manquant (optionnel, fallback fonctionne)

### 5.8 Tests

**Tests unitaires** :

1. **`src/utils/vehicleType.test.ts`** (NOUVEAU) :
   - [ ] Test `getVehicleTypeForChecking()` avec tous les cas (NULL, 'car', 'moto', 'scooter', valeur inattendue)

2. **`src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.test.tsx`** :
   - [ ] Test rendu conditionnel selon `vehicleType`
   - [ ] Test fallback `NULL` → `'car'`

**Tests e2e** :

1. **Création checking voiture** :
   - [ ] Vérifier que `/checking/:bookingId` affiche UI voiture si `vehicle_type = 'car'`
   - [ ] Vérifier que toutes les étapes s'affichent correctement

2. **Création checking moto** :
   - [ ] Vérifier que `/checking/:bookingId` affiche UI moto si `vehicle_type = 'moto'`
   - [ ] Vérifier que les 6 étapes s'affichent correctement
   - [ ] Vérifier que Step 3 (extérieur moto) s'affiche sans zone "Coffre"
   - [ ] Vérifier que Step 4 (pneus/freins) s'affiche

3. **Compatibilité** :
   - [ ] Vérifier qu'un véhicule `vehicle_type = NULL` affiche UI voiture (fallback)

---

## 6️⃣ Code & Patchs

### 6.1 Modification : Récupération `vehicle_type`

**Fichier** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`

**Ligne 637-641** : Ajouter `vehicle_type` dans le SELECT

```typescript
// AVANT
const { data: vehicle, error: vehicleError } = await supabase
  .from("vehicles" as any)
  .select("id, brand, model, license_plate, owner_id")
  .eq("id", booking.vehicle_id)
  .single();

// APRÈS
const { data: vehicle, error: vehicleError } = await supabase
  .from("vehicles" as any)
  .select("id, brand, model, license_plate, owner_id, vehicle_type")  // ⭐ Ajout vehicle_type
  .eq("id", booking.vehicle_id)
  .single();
```

**Ligne 648-653** : Stocker `vehicle_type` dans le state

```typescript
// Ajouter dans les states (ligne ~295)
const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'scooter' | null>(null);

// Dans le useEffect loadBookingProfileAndVehicle (ligne ~655)
if (vehicle) {
  const vehicleData = vehicle as any;
  vehiculePatch = {
    marque: vehicleData.brand || "",
    modele: vehicleData.model || "",
    immatriculation: vehicleData.license_plate || "",
  };
  
  // ⭐ NOUVEAU : Stocker vehicle_type
  const detectedVehicleType = vehicleData.vehicle_type || 'car'; // Fallback car
  setVehicleType(detectedVehicleType);
  
  owner_id_resolved = vehicleData.owner_id || null;
  setOwnerId(owner_id_resolved);
}
```

### 6.2 Modification : Page Checking avec rendu conditionnel

**Fichier** : `src/pages/Checking.tsx`

**Ajout state et récupération `vehicle_type`** :

```typescript
// Ajouter après ligne 12
const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'scooter' | null>(null);
const [loadingVehicleType, setLoadingVehicleType] = useState(true);

// Nouveau useEffect après ligne 42
useEffect(() => {
  async function loadVehicleType() {
    if (!bookingId) {
      setLoadingVehicleType(false);
      return;
    }

    try {
      // 1. Récupérer vehicle_id depuis booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("vehicle_id")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        console.error("[Checking] Erreur récupération booking:", bookingError);
        setVehicleType('car'); // Fallback car
        setLoadingVehicleType(false);
        return;
      }

      // 2. Récupérer vehicle_type depuis vehicle
      if (booking.vehicle_id) {
        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .select("vehicle_type")
          .eq("id", booking.vehicle_id)
          .single();

        if (vehicleError) {
          console.error("[Checking] Erreur récupération vehicle_type:", vehicleError);
          setVehicleType('car'); // Fallback car
        } else {
          // Fallback car si NULL ou valeur inattendue
          const type = vehicle?.vehicle_type || 'car';
          setVehicleType(type === 'moto' || type === 'scooter' ? 'moto' : 'car');
        }
      } else {
        setVehicleType('car'); // Fallback car
      }
    } catch (error) {
      console.error("[Checking] Erreur:", error);
      setVehicleType('car'); // Fallback car
    } finally {
      setLoadingVehicleType(false);
    }
  }

  loadVehicleType();
}, [bookingId]);
```

**Rendu conditionnel (ligne 80-85)** :

```typescript
// AVANT
<ErrorBoundary>
  <EtatDesLieuxDepartForm 
    bookingId={bookingId} 
    bookingReferenceNumber={referenceNumber}
  />
</ErrorBoundary>

// APRÈS
<ErrorBoundary>
  {loadingVehicleType ? (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground mt-4">
        Chargement du type de véhicule...
      </p>
    </div>
  ) : vehicleType === 'car' ? (
    <EtatDesLieuxDepartForm 
      bookingId={bookingId} 
      bookingReferenceNumber={referenceNumber}
    />
  ) : (
    <EtatDesLieuxDepartFormMoto 
      bookingId={bookingId} 
      bookingReferenceNumber={referenceNumber}
    />
  )}
</ErrorBoundary>
```

### 6.3 Nouveau composant : EtatDesLieuxDepartFormMoto

**Fichier** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartFormMoto.tsx`

**Structure** : Copier `EtatDesLieuxDepartForm.tsx` et adapter :

```typescript
// Steps adaptés (6 au lieu de 7)
const steps = [
  { id: 1, label: "Identification" },
  { id: 2, label: "Relevés" },
  { id: 3, label: "Extérieur" },
  { id: 4, label: "Pneus & Freins" },
  { id: 5, label: "Équipements" },
  { id: 6, label: "Remarques & Validation" },
];

// Imports adaptés
import ExteriorInspectionAccordionMoto from "@/components/ExteriorInspectionAccordionMoto";
import PneusFreinsInspection from "./sections/PneusFreinsInspection";
import Section5EquipementsMoto from "./sections/Section5EquipementsMoto";

// renderStep() adapté
const renderStep = () => {
  switch (currentStep) {
    case 1:
      return <Section1Identification ... />; // Identique
    case 2:
      return <Section2Releves ... />; // Identique (labels adaptés)
    case 3:
      return <ExteriorInspectionAccordionMoto ... />; // ⭐ NOUVEAU
    case 4:
      return <PneusFreinsInspection ... />; // ⭐ NOUVEAU
    case 5:
      return <Section5EquipementsMoto ... />; // ⭐ NOUVEAU
    case 6:
      return <Section6RemarquesEtValidation ... />; // Fusion Step 6 + 7
    default:
      return null;
  }
};
```

### 6.4 Nouveau composant : ExteriorInspectionAccordionMoto

**Fichier** : `src/components/ExteriorInspectionAccordionMoto.tsx`

**Structure** : Copier `ExteriorInspectionAccordionSimple.tsx` et adapter :

```typescript
// Steps adaptés (5 zones au lieu de 6)
const steps: InspectionStep[] = [
  {
    id: 1,
    title: 'Avant du véhicule',
    subtitle: 'Photo avant + état phare/clignotants.',
    details: {
      photoLabel: 'Photo de la zone',
      damageQuestion: 'Dégât visible ?',
      // ⭐ Champs spécifiques moto
      phareAvant: true,
      clignotantsAvant: true,
    },
  },
  {
    id: 2,
    title: 'Côté droit',
    subtitle: 'Photo côté droit + état rétroviseur/clignotant.',
    details: {
      photoLabel: 'Photo de la zone',
      damageQuestion: 'Dégât visible ?',
      retroviseurDroit: true,
      clignotantDroit: true,
    },
  },
  {
    id: 3,
    title: 'Arrière du véhicule',
    subtitle: 'Photo arrière + état feu/clignotants.',
    details: {
      photoLabel: 'Photo de la zone',
      damageQuestion: 'Dégât visible ?',
      feuArriere: true,
      clignotantsArriere: true,
    },
  },
  {
    id: 4,
    title: 'Côté gauche',
    subtitle: 'Photo côté gauche + état rétroviseur/clignotant.',
    details: {
      photoLabel: 'Photo de la zone',
      damageQuestion: 'Dégât visible ?',
      retroviseurGauche: true,
      clignotantGauche: true,
    },
  },
  {
    id: 5,
    title: 'Propreté extérieure',
    subtitle: 'Évaluez l\'état de propreté extérieur global.',
    details: {
      photoLabel: 'Photo de l\'extérieur',
      damageQuestion: '',
    },
  },
];

// ❌ SUPPRIMER : Zone "Coffre" (step 4 dans voiture)
// ❌ SUPPRIMER : Gestion jantes séparées (intégrées dans zones)
```

### 6.5 Nouveau composant : PneusFreinsInspection

**Fichier** : `src/modules/etatDesLieuxDepart/sections/PneusFreinsInspection.tsx`

**Structure** :

```typescript
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface PneusFreinsInspectionProps {
  onComplete?: () => void;
  bookingId: string;
  bookingReferenceNumber?: number | null;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
}

export default function PneusFreinsInspection({
  onComplete,
  bookingId,
  bookingReferenceNumber,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
}: PneusFreinsInspectionProps) {
  const { control, watch, setValue } = useFormContext();
  
  // Sections : Pneu avant, Pneu arrière, Frein avant, Frein arrière
  const [currentSection, setCurrentSection] = useState<'pneu_avant' | 'pneu_arriere' | 'frein_avant' | 'frein_arriere'>('pneu_avant');
  
  const handleComplete = async () => {
    // Validation + sauvegarde
    if (onComplete) onComplete();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Pneu avant */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pneu avant</h3>
          {/* Photo obligatoire */}
          {/* État : OK / Usé / Abîmé / Crevé */}
          {/* Pression (optionnel) */}
          {/* Dégâts (si oui) */}
        </div>

        {/* Pneu arrière */}
        {/* ... idem pneu avant ... */}

        {/* Frein avant */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Frein avant</h3>
          {/* État : OK / À signaler / Non fonctionnel */}
          {/* Notes */}
        </div>

        {/* Frein arrière */}
        {/* ... idem frein avant ... */}

        <Button onClick={handleComplete} className="w-full">
          Valider Pneus & Freins
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 6.6 Nouveau composant : Section5EquipementsMoto

**Fichier** : `src/modules/etatDesLieuxDepart/sections/Section5EquipementsMoto.tsx`

**Structure** : Copier `Section5Accessoires.tsx` et adapter :

```typescript
// Checklist adaptée moto
const equipements = [
  {
    name: "selle",
    label: "Selle",
    options: ["OK", "Abîmée", "Manquante"], // RadioGroup au lieu de Checkbox
  },
  {
    name: "coffre_topcase",
    label: "Coffre / Top case",
    present: boolean, // Checkbox "Présent ?"
    etat: ["OK", "Abîmé", "Non fonctionnel"], // Si présent
    photos: boolean, // Photos si présent
  },
  {
    name: "antivol",
    label: "Antivol",
    type: "checkbox", // Checkbox simple
  },
  {
    name: "cles",
    label: "Clé(s)",
    type: "checkbox",
  },
  {
    name: "manuel",
    label: "Manuel",
    type: "checkbox",
  },
  {
    name: "eclairage",
    label: "Éclairage",
    subItems: [
      { name: "phare_avant", label: "Phare avant", options: ["Fonctionnel", "Non fonctionnel"] },
      { name: "feu_arriere", label: "Feu arrière", options: ["Fonctionnel", "Non fonctionnel"] },
      { name: "clignotants", label: "Clignotants", options: ["Fonctionnels", "Non fonctionnels"] },
    ],
  },
  {
    name: "retroviseurs",
    label: "Rétroviseurs",
    subItems: [
      { name: "retroviseur_avant", label: "Avant", options: ["OK", "Cassé", "Manquant"] },
      { name: "retroviseur_arriere", label: "Arrière", options: ["OK", "Cassé", "Manquant"] },
    ],
  },
];

// ❌ SUPPRIMER : gilet, triangle, roueSecours, cric, cable, carteCarburant (spécifiques voiture)
```

### 6.7 Nouveaux types TypeScript

**Fichier** : `src/types/step3-moto.ts`

```typescript
export interface InspectionExterieureMoto {
  avant: {
    photo_zone: string[];
    phare_avant: "OK" | "Cassé" | "Abîmé";
    clignotants_avant: "OK" | "Cassé";
    degat_present: "yes" | "no" | null;
    degat_description?: string;
    degat_photos?: string[];
  };
  cote_droit: {
    photo_zone: string[];
    retroviseur_droit: "OK" | "Cassé" | "Manquant";
    clignotant_droit: "OK" | "Cassé";
    degat_present: "yes" | "no" | null;
    degat_description?: string;
    degat_photos?: string[];
  };
  arriere: {
    photo_zone: string[];
    feu_arriere: "OK" | "Cassé" | "Abîmé";
    clignotants_arriere: "OK" | "Cassé";
    degat_present: "yes" | "no" | null;
    degat_description?: string;
    degat_photos?: string[];
  };
  cote_gauche: {
    photo_zone: string[];
    retroviseur_gauche: "OK" | "Cassé" | "Manquant";
    clignotant_gauche: "OK" | "Cassé";
    degat_present: "yes" | "no" | null;
    degat_description?: string;
    degat_photos?: string[];
  };
  propreteExterieure: {
    level: "Excellent" | "Bon" | "Moyen" | "Sale";
    photos: string[];
    notes?: string;
  };
}
```

**Fichier** : `src/types/step4-moto.ts`

```typescript
export interface PneusFreinsInspection {
  pneu_avant: {
    photo: string[];
    etat: "OK" | "Usé" | "Abîmé" | "Crevé";
    pression?: number; // PSI ou bar
    degat_present: boolean;
    degat_description?: string;
    degat_photos?: string[];
  };
  pneu_arriere: {
    photo: string[];
    etat: "OK" | "Usé" | "Abîmé" | "Crevé";
    pression?: number;
    degat_present: boolean;
    degat_description?: string;
    degat_photos?: string[];
  };
  frein_avant: {
    etat: "OK" | "À signaler" | "Non fonctionnel";
    notes?: string;
  };
  frein_arriere: {
    etat: "OK" | "À signaler" | "Non fonctionnel";
    notes?: string;
  };
}
```

**Fichier** : `src/types/step5-moto.ts`

```typescript
export interface EquipementsMoto {
  selle: "OK" | "Abîmée" | "Manquante";
  coffre_topcase: {
    present: boolean;
    etat?: "OK" | "Abîmé" | "Non fonctionnel";
    photos?: string[];
  };
  antivol: boolean;
  cles: boolean;
  manuel: boolean;
  documents: {
    carte_grise?: string[];
    assurance?: string[];
  };
  eclairage: {
    phare_avant: "Fonctionnel" | "Non fonctionnel";
    feu_arriere: "Fonctionnel" | "Non fonctionnel";
    clignotants: "Fonctionnels" | "Non fonctionnels";
  };
  retroviseurs: {
    avant: "OK" | "Cassé" | "Manquant";
    arriere: "OK" | "Cassé" | "Manquant";
  };
  commentaire?: string;
}
```

### 6.8 Nouveaux schémas Zod

**Fichier** : `src/modules/etatDesLieuxDepart/schemas/inspectionExterieureMotoSchema.ts`

```typescript
import * as z from "zod";

export const inspectionExterieureMotoSchema = z.object({
  avant: z.object({
    photo_zone: z.array(z.string()).min(1, "Photo avant obligatoire"),
    phare_avant: z.enum(["OK", "Cassé", "Abîmé"]),
    clignotants_avant: z.enum(["OK", "Cassé"]),
    degat_present: z.enum(["yes", "no"]).nullable(),
    degat_description: z.string().optional(),
    degat_photos: z.array(z.string()).optional(),
  }),
  cote_droit: z.object({
    photo_zone: z.array(z.string()).min(1, "Photo côté droit obligatoire"),
    retroviseur_droit: z.enum(["OK", "Cassé", "Manquant"]),
    clignotant_droit: z.enum(["OK", "Cassé"]),
    degat_present: z.enum(["yes", "no"]).nullable(),
    degat_description: z.string().optional(),
    degat_photos: z.array(z.string()).optional(),
  }),
  arriere: z.object({
    photo_zone: z.array(z.string()).min(1, "Photo arrière obligatoire"),
    feu_arriere: z.enum(["OK", "Cassé", "Abîmé"]),
    clignotants_arriere: z.enum(["OK", "Cassé"]),
    degat_present: z.enum(["yes", "no"]).nullable(),
    degat_description: z.string().optional(),
    degat_photos: z.array(z.string()).optional(),
  }),
  cote_gauche: z.object({
    photo_zone: z.array(z.string()).min(1, "Photo côté gauche obligatoire"),
    retroviseur_gauche: z.enum(["OK", "Cassé", "Manquant"]),
    clignotant_gauche: z.enum(["OK", "Cassé"]),
    degat_present: z.enum(["yes", "no"]).nullable(),
    degat_description: z.string().optional(),
    degat_photos: z.array(z.string()).optional(),
  }),
  propreteExterieure: z.object({
    level: z.enum(["Excellent", "Bon", "Moyen", "Sale"]),
    photos: z.array(z.string()).min(1, "Photo propreté obligatoire"),
    notes: z.string().optional(),
  }),
});
```

### 6.9 Exemples de payloads

**Payload Step 3 Moto (extérieur)** :

```json
{
  "step3": {
    "completedAt": "2025-01-15T10:30:00Z",
    "inspection_exterieure_moto": {
      "avant": {
        "photo_zone": ["https://supabase.co/storage/.../avant_123.jpg"],
        "phare_avant": "OK",
        "clignotants_avant": "OK",
        "degat_present": "no",
        "degat_description": null,
        "degat_photos": []
      },
      "cote_droit": {
        "photo_zone": ["https://supabase.co/storage/.../droit_123.jpg"],
        "retroviseur_droit": "OK",
        "clignotant_droit": "OK",
        "degat_present": "yes",
        "degat_description": "Rayure légère sur carénage",
        "degat_photos": ["https://supabase.co/storage/.../degat_123.jpg"]
      },
      "arriere": { /* ... */ },
      "cote_gauche": { /* ... */ },
      "propreteExterieure": {
        "level": "Bon",
        "photos": ["https://supabase.co/storage/.../proprete_123.jpg"],
        "notes": "Légère poussière"
      }
    }
  }
}
```

**Payload Step 4 Moto (pneus/freins)** :

```json
{
  "step4": {
    "completedAt": "2025-01-15T10:45:00Z",
    "pneus_freins": {
      "pneu_avant": {
        "photo": ["https://supabase.co/storage/.../pneu_avant_123.jpg"],
        "etat": "OK",
        "pression": 2.5,
        "degat_present": false,
        "degat_description": null,
        "degat_photos": []
      },
      "pneu_arriere": {
        "photo": ["https://supabase.co/storage/.../pneu_arriere_123.jpg"],
        "etat": "Usé",
        "pression": 2.5,
        "degat_present": false,
        "degat_description": "Usure normale",
        "degat_photos": []
      },
      "frein_avant": {
        "etat": "OK",
        "notes": null
      },
      "frein_arriere": {
        "etat": "OK",
        "notes": null
      }
    }
  }
}
```

---

## 📝 Résumé exécutif

### Ce qui doit être fait

1. **Récupérer `vehicle_type`** dans `EtatDesLieuxDepartForm.tsx` (ligne 639)
2. **Créer `EtatDesLieuxDepartFormMoto.tsx`** (copie adaptée de `EtatDesLieuxDepartForm.tsx`)
3. **Créer `ExteriorInspectionAccordionMoto.tsx`** (5 zones, sans coffre)
4. **Créer `PneusFreinsInspection.tsx`** (nouveau Step 4 moto)
5. **Créer `Section5EquipementsMoto.tsx`** (checklist adaptée moto)
6. **Modifier `Checking.tsx`** pour rendu conditionnel selon `vehicle_type`
7. **Créer types/schémas Zod** pour moto

### Ce qui ne doit PAS être fait

- ❌ Migration DB (pas nécessaire)
- ❌ Routes séparées `/checking/:id/car` et `/checking/:id/moto` (Option B non recommandée)
- ❌ Stocker `vehicle_type` dans `checkin_depart` (récupéré dynamiquement)

### Risques & mitigations

1. **Anciens checkings sans `vehicle_type`** → Fallback `'car'` (comportement existant)
2. **Valeur inattendue `vehicle_type`** → Fallback `'car'` + log warning
3. **Performance** → Lazy-load des composants moto si nécessaire

---

**Fin du document**

