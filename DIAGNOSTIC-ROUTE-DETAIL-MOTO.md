# 🔍 DIAGNOSTIC #2 : ROUTE DÉTAIL MOTO SANS CASSER VOITURE

**Date** : Diagnostic complet  
**Objectif** : Déterminer si `vehicle_type === 'moto'` est pris en compte dans la page détail, et lister les modifications exactes nécessaires pour créer une route moto dédiée.

---

## 1️⃣ VÉRIFICATION : `vehicle_type` est-il déjà géré dans le détail ?

### Recherche dans `VehicleDetails.tsx`

**Résultat** : **NON**, la page détail ne prend **PAS** en compte `vehicle_type === 'moto'`.

**Preuves** :

1. **Aucune occurrence de `vehicle_type` dans `VehicleDetails.tsx`** :
   - Aucune vérification `if (vehicle.vehicle_type === 'moto')`
   - Aucun import de `isMoto` depuis `@/utils/vehicleType`
   - Aucun import de `mapToMotoVehicle` depuis `@/mappers/vehicleMappers`

2. **Mapping inline toujours orienté voiture** (lignes 181-253) :
   ```typescript
   const mappedVehicle: Vehicle = {
     // ...
     hasAC: true, // ⚠️ Hard-codé pour voiture
     doors: vehicle.seats || 5, // ⚠️ Utilise seats pour doors (logique voiture)
     // ...
   };
   ```
   - Ce mapping ne correspond **pas** à `mapToMotoVehicle` qui fait :
     - `hasAC: false`
     - `doors: 0`
     - `seats: vehicle.seats ?? undefined` (pour affichage places moto)
     - `engineCapacity: vehicle.engine_capacity || undefined`

3. **Aucune condition de rendu différenciée** :
   - Tous les blocs UI sont affichés de la même manière, que ce soit une voiture ou une moto
   - Les sections "Portes", "5 places", "Description de la voiture" sont toujours présentes

### Recherche dans le routing (`App.tsx`)

**Résultat** : **NON**, aucune route moto dédiée n'existe.

**Preuve** :
- Ligne 69 : `<Route path="/vehicle/:license" element={<VehicleDetails />} />`
- Une seule route pour tous les véhicules, sans distinction de type

### Conclusion section 1

**Réponse explicite** : **NON**, la page détail ne prend **PAS** en compte la moto.

**Où cela devrait être géré** :
- Dans `VehicleDetails.tsx`, lors du mapping du véhicule (lignes 179-253)
- Potentiellement dans le routing pour rediriger ou router différemment

**Rendu actuel** : Si une moto accède à `/vehicle/:license`, elle sera affichée avec :
- `hasAC: true` (incorrect pour moto)
- `doors: 5` (incorrect, devrait être 0)
- Sections "Portes", "5 places" affichées (inadaptées)
- Titre "Description de la voiture" (inadapté)

---

## 2️⃣ DIAGNOSTIC "MOTO = CAR PAGE" : Blocs car-only dans `VehicleDetails`

### Catégorie A : Titres/Labels car-only

#### 🔹 Élément : "Description de la voiture"
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : 981
- **Texte** : `"Description de la voiture"`
- **Dépendances** : Aucune (texte statique)
- **Action moto** : Remplacer par "Description de la moto" ou "Description"

#### 🔹 Élément : "5 places" (hard-codé)
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : 900
- **Texte** : `"5 places"` (hard-codé)
- **Dépendances** : Aucune (valeur statique)
- **Action moto** : Utiliser `vehicle.seats` si défini, sinon "Non spécifié" ou masquer

#### 🔹 Élément : Badge "Parking réservé"
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : 904-907
- **Texte** : `"Parking réservé"`
- **Dépendances** : Aucune (badge statique)
- **Action moto** : Peut rester (parking peut s'appliquer à moto), ou adapter le texte

### Catégorie B : Caractéristiques techniques car-only

#### 🔹 Élément : Tuile "Portes"
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : 1020-1022
- **Valeur** : `{vehicle.doors}`
- **Dépendances DB** : `vehicles.seats` (mappé sur `doors` dans le mapping inline)
- **Problème** : Pour moto, `doors` devrait être `0` (via `mapToMotoVehicle`)
- **Action moto** : Masquer cette tuile si `doors === 0` ou si `vehicle_type === 'moto'`

#### 🔹 Élément : Tuile "Places" (hard-codé "5")
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : 1024-1026
- **Valeur** : `"5"` (hard-codé)
- **Dépendances DB** : Aucune (valeur statique)
- **Action moto** : Utiliser `vehicle.seats` si défini, sinon masquer ou afficher "Non spécifié"

#### 🔹 Élément : Mapping `hasAC: true` (hard-codé)
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : 190
- **Valeur** : `hasAC: true` (hard-codé dans le mapping inline)
- **Dépendances DB** : `vehicles.has_ac` existe mais n'est pas utilisé
- **Action moto** : Utiliser `mapToMotoVehicle` qui fait `hasAC: false`, ou utiliser `vehicle.has_ac` depuis la DB

#### 🔹 Élément : Mapping `doors: vehicle.seats || 5`
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : 191
- **Valeur** : `doors: vehicle.seats || 5`
- **Dépendances DB** : `vehicles.seats`
- **Problème** : Pour moto, `doors` devrait être `0` (via `mapToMotoVehicle`)
- **Action moto** : Utiliser `mapToMotoVehicle` qui fait `doors: 0`

### Catégorie C : Options et accessoires car-only

#### 🔹 Élément : Section "Options et accessoires"
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Lignes** : 1038-1080
- **Contenu** : Liste statique d'options (Climatisation, GPS, Régulateur, Audio/iPod, Bluetooth, CarPlay)
- **Dépendances DB** : Aucune (tout est hard-codé, même si `has_ac`, `has_gps`, etc. existent en DB)
- **Problème** : Ces options sont affichées pour tous les véhicules, sans vérifier si elles sont disponibles
- **Action moto** : 
  - Soit masquer complètement cette section pour moto
  - Soit adapter les options (moto n'a pas de climatisation, pas de CarPlay, etc.)
  - Soit utiliser les champs DB `has_ac`, `has_gps`, etc. pour afficher conditionnellement

### Catégorie D : Pricing/Booking (compatible moto)

#### 🔹 Élément : `PricingCard` et calculs de prix
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Lignes** : 711-796 (composant `PricingCard`)
- **Dépendances** :
  - `vehicle.dailyPrice` (DB : `vehicles.price_per_day`) ✅ Compatible moto
  - `vehicleRentalInfo` (calculé via `createVehicleRentalInfo`) ✅ Compatible moto
  - `VehicleServiceOptions` (composant) ✅ Compatible moto (voir section E)
- **Action moto** : **Aucune modification nécessaire**, le pricing fonctionne pour moto

#### 🔹 Élément : Bouton "Réserver" et flux de réservation
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Lignes** : 317-602 (`handleBooking`, `handleConfirmBooking`)
- **Dépendances** :
  - `vehicle.id`, `vehicle.dailyPrice` ✅ Compatible moto
  - `SupabaseBookingsService.createBooking` ✅ Compatible moto (pas de distinction de type)
  - `bookingStorage` (localStorage) ✅ Compatible moto
- **Action moto** : **Aucune modification nécessaire**, le flux de réservation fonctionne pour moto

### Catégorie E : Services supplémentaires (`VehicleServiceOptions`)

#### 🔹 Élément : Composant `VehicleServiceOptions`
- **Fichier** : `src/components/vehicles/VehicleServiceOptions.tsx`
- **Lignes** : 1-424
- **Champs DB utilisés** :
  - `vehicle.airport_pickup_retrieval`, `airport_pickup_retrieval_free`, `airport_pickup_retrieval_price`
  - `vehicle.airport_pickup_return`, `airport_pickup_return_free`, `airport_pickup_return_price`
  - `vehicle.barge_grande_terre_retrieval`, `barge_grande_terre_retrieval_free`, `barge_grande_terre_retrieval_price`
  - `vehicle.barge_grande_terre_return`, `barge_grande_terre_return_free`, `barge_grande_terre_return_price`
  - `vehicle.barge_petite_terre_retrieval`, `barge_petite_terre_retrieval_free`, `barge_petite_terre_retrieval_price`
  - `vehicle.barge_petite_terre_return`, `barge_petite_terre_return_free`, `barge_petite_terre_return_price`
  - `vehicle.home_delivery_pickup`, `home_delivery_pickup_free`, `home_delivery_pickup_price`
  - `vehicle.home_delivery_return`, `home_delivery_return_free`, `home_delivery_return_price`
  - `vehicle.baby_seat_service`, `baby_seat_free`, `baby_seat_price`
  - `vehicle.additional_driver_service`, `additional_driver_free`, `additional_driver_price`
- **Compatibilité moto** : ✅ **TOUS ces services sont compatibles moto** (aéroport, barge, livraison, siège bébé, conducteur additionnel peuvent s'appliquer à moto)
- **Action moto** : **Aucune modification nécessaire**, le composant fonctionne pour moto

### Catégorie F : Localisation/Map (compatible moto)

#### 🔹 Élément : Section "Récupération du véhicule"
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Lignes** : 915-960
- **Dépendances DB** : `vehicles.pickup_zones` ✅ Compatible moto
- **Action moto** : **Aucune modification nécessaire**, la localisation fonctionne pour moto

### Catégorie G : Autres sections (statiques, compatibles)

#### 🔹 Éléments : Sections statiques
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Sections** :
  - "Évaluations" (lignes 1082-1166) : Statique, pas de dépendance DB ✅ Compatible moto
  - "Assurance incluse" (lignes 1168-1220) : Statique, pas de dépendance DB ✅ Compatible moto
  - "Avantages à chaque location" (lignes 1222-1252) : Statique, pas de dépendance DB ✅ Compatible moto
  - "Informations précontractuelles" (lignes 1254-1286) : Statique, pas de dépendance DB ✅ Compatible moto
- **Action moto** : **Aucune modification nécessaire**, ces sections sont génériques

### Résumé section 2

**Blocs à modifier pour moto** :

1. **Mapping du véhicule** (lignes 181-253) : Utiliser `mapToMotoVehicle` au lieu du mapping inline
2. **Titre "Description de la voiture"** (ligne 981) : Adapter le texte
3. **"5 places" hard-codé** (ligne 900) : Utiliser `vehicle.seats` ou masquer
4. **Tuile "Portes"** (lignes 1020-1022) : Masquer si `doors === 0` ou si moto
5. **Tuile "Places" hard-codé "5"** (lignes 1024-1026) : Utiliser `vehicle.seats` ou masquer
6. **Section "Options et accessoires"** (lignes 1038-1080) : Adapter ou masquer pour moto

**Blocs compatibles moto (aucune modification)** :

- Pricing/Booking (tout le flux)
- Services supplémentaires (`VehicleServiceOptions`)
- Localisation/Map
- Sections statiques (évaluations, assurance, avantages, légal)

---

## 3️⃣ ROUTE MOTO DÉDIÉE : Où brancher sans casser la voiture

### A) Fichiers à modifier pour le routing

#### 🔹 Fichier : `src/App.tsx`
- **Ligne actuelle** : 69
- **Route actuelle** : `<Route path="/vehicle/:license" element={<VehicleDetails />} />`
- **Action** : Ajouter une nouvelle route moto :
  ```typescript
  <Route path="/moto/:license" element={<MotoVehicleDetails />} />
  ```
- **Position** : Juste après la route voiture (ligne 70)
- **Impact voiture** : Aucun (route séparée)

#### 🔹 Fichier : `src/pages/vehicles/VehicleDetails.tsx`
- **Action** : **AUCUNE modification** (garder inchangé pour voiture)
- **Justification** : La route `/vehicle/:license` continue de pointer vers `VehicleDetails` pour les voitures

### B) Fichiers à modifier pour les liens "Voir la fiche"

#### 🔹 Fichier : `src/pages/Index.tsx`
- **Fonction** : `handleVehicleClick` (lignes 523-539)
- **Code actuel** :
  ```typescript
  const handleVehicleClick = (vehicle: SupabaseVehicle) => {
    const license = vehicle.id.substring(0, 8).toUpperCase();
    navigate(`/vehicle/${license}`, { state: { ... } });
  };
  ```
- **Action** : Vérifier `vehicle_type` et router différemment :
  ```typescript
  const handleVehicleClick = (vehicle: SupabaseVehicle) => {
    const license = vehicle.id.substring(0, 8).toUpperCase();
    const isMotoVehicle = isMoto(vehicle);
    navigate(
      isMotoVehicle ? `/moto/${license}` : `/vehicle/${license}`,
      { state: { ... } }
    );
  };
  ```
- **Ligne à modifier** : 528
- **Impact voiture** : Aucun (condition `isMotoVehicle ? ... : ...` préserve le comportement voiture)

#### 🔹 Fichier : `src/components/vehicles/moto-vehicle-card.tsx`
- **Ligne** : 243
- **Code actuel** : Le bouton "Voir la fiche" appelle `onClick()` qui est passé en prop
- **Action** : **AUCUNE modification nécessaire** (le `onClick` vient de `Index.tsx` qui sera modifié ci-dessus)
- **Justification** : `MotoVehicleCard` est déjà utilisé dans `Index.tsx` avec `onClick={() => handleVehicleClick(vehicle)}`, donc la modification dans `handleVehicleClick` suffit

#### 🔹 Fichier : `src/components/RenterBookingCard.tsx`
- **Ligne** : 1051
- **Code actuel** : `navigate(`/vehicle/${booking.vehicle.license}`)`
- **Action** : Vérifier `vehicle_type` du véhicule de la réservation :
  ```typescript
  const vehicleType = booking.vehicle?.vehicle_type;
  const route = vehicleType === 'moto' 
    ? `/moto/${booking.vehicle.license}` 
    : `/vehicle/${booking.vehicle.license}`;
  navigate(route);
  ```
- **Impact voiture** : Aucun (condition préserve le comportement voiture)

#### 🔹 Fichier : `src/components/OwnerBookingCard.tsx`
- **Ligne** : 1119
- **Code actuel** : `navigate(`/vehicle/${booking.vehicle.license}`)`
- **Action** : Même logique que `RenterBookingCard.tsx` (vérifier `vehicle_type`)

#### 🔹 Fichier : `src/pages/owner/OwnerVehicles.tsx`
- **Ligne** : 478
- **Code actuel** : `<Link to={`/vehicle/${vehicle.license}`}>`
- **Action** : Vérifier `vehicle_type` :
  ```typescript
  <Link to={vehicle.vehicle_type === 'moto' 
    ? `/moto/${vehicle.license}` 
    : `/vehicle/${vehicle.license}`}>
  ```
- **Impact voiture** : Aucun (condition préserve le comportement voiture)

#### 🔹 Fichier : `src/pages/booking/BookingDiscussion.tsx`
- **Lignes** : 538, 877, 1215
- **Code actuel** : `navigate(`/vehicle/${vehicle.license}`)`
- **Action** : Vérifier `vehicle_type` du véhicule (même logique que ci-dessus)

#### 🔹 Fichier : `src/pages/owner/OwnerBookingDiscussion.tsx`
- **Ligne** : 662
- **Code actuel** : `navigate(`/vehicle/${vehicle?.license}`)`
- **Action** : Vérifier `vehicle_type` du véhicule

#### 🔹 Fichier : `src/pages/owner/OwnerBookings.tsx`
- **Ligne** : 533
- **Code actuel** : `navigate(`/vehicle/${booking.vehicle.license}/booking/discussion?start=...&end=...`)`
- **Action** : Adapter la route de base selon `vehicle_type` :
  ```typescript
  const baseRoute = booking.vehicle.vehicle_type === 'moto' 
    ? `/moto/${booking.vehicle.license}` 
    : `/vehicle/${booking.vehicle.license}`;
  navigate(`${baseRoute}/booking/discussion?start=...&end=...`);
  ```

### C) Route de discussion booking (sous-route)

#### 🔹 Fichier : `src/App.tsx`
- **Ligne actuelle** : 70
- **Route actuelle** : `<Route path="/vehicle/:license/booking/discussion" element={<BookingDiscussion />} />`
- **Action** : Ajouter la route moto équivalente :
  ```typescript
  <Route path="/moto/:license/booking/discussion" element={<BookingDiscussion />} />
  ```
- **Impact voiture** : Aucun (route séparée)
- **Note** : `BookingDiscussion` peut rester le même composant (il n'a pas besoin de connaître le type de véhicule pour fonctionner)

### D) Redirect optionnel (non recommandé)

**Justification** : Un redirect depuis `/vehicle/:license` vers `/moto/:license` si `vehicle_type === 'moto'` n'est **PAS recommandé** car :

1. **Complexité inutile** : Il faudrait charger le véhicule dans `VehicleDetails` pour vérifier le type, puis rediriger → double chargement
2. **Risque de régression** : Modifier `VehicleDetails` pour ajouter un redirect pourrait impacter le flux voiture
3. **Meilleure approche** : Router directement depuis les cartes/clics (voir section B)

**Si redirect absolument nécessaire** (non recommandé) :
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Ligne** : Après le chargement du véhicule (ligne 179, après `if (vehicle)`)
- **Code** :
  ```typescript
  if (vehicle.vehicle_type === 'moto') {
    navigate(`/moto/${license}`, { replace: true, state: location.state });
    return null;
  }
  ```
- **⚠️ Risque** : Modifie `VehicleDetails` (composant voiture), donc risque de régression

### Résumé section 3

**Fichiers à modifier** :

1. **Routing** :
   - `src/App.tsx` : Ajouter route `/moto/:license` et `/moto/:license/booking/discussion`

2. **Liens "Voir la fiche"** :
   - `src/pages/Index.tsx` : `handleVehicleClick` (ligne 528)
   - `src/components/RenterBookingCard.tsx` : ligne 1051
   - `src/components/OwnerBookingCard.tsx` : ligne 1119
   - `src/pages/owner/OwnerVehicles.tsx` : ligne 478
   - `src/pages/booking/BookingDiscussion.tsx` : lignes 538, 877, 1215
   - `src/pages/owner/OwnerBookingDiscussion.tsx` : ligne 662
   - `src/pages/owner/OwnerBookings.tsx` : ligne 533

3. **Nouveau composant** :
   - Créer `src/pages/vehicles/MotoVehicleDetails.tsx` (voir section 5)

**Fichiers à NE PAS modifier** :
- `src/pages/vehicles/VehicleDetails.tsx` : Garder inchangé pour voiture
- `src/components/vehicles/moto-vehicle-card.tsx` : Déjà correct (utilise `onClick` prop)

---

## 4️⃣ CHARGEMENT DES DONNÉES : Vérifier si le détail récupère le bon véhicule

### A) Méthode actuelle dans `VehicleDetails`

#### 🔹 Fichier : `src/pages/vehicles/VehicleDetails.tsx`
- **Fonction** : `loadVehicleData` (lignes 158-315)
- **Méthode** :
  1. Appelle `SupabaseVehiclesService.getAvailableVehicles()` (récupère TOUS les véhicules disponibles)
  2. Trouve le véhicule via : `allVehicles.find(v => v.id.substring(0, 8).toUpperCase() === license.toUpperCase())`
  3. Mappe le véhicule avec un mapping inline (lignes 181-253) qui est orienté voiture

#### 🔹 Problème identifié
- **Mapping utilisé** : Mapping inline voiture (lignes 181-253)
- **Mapper moto existant** : `mapToMotoVehicle` dans `src/mappers/vehicleMappers.ts` (lignes 51-80)
- **Conclusion** : Le détail utilise le **mauvais mapper** (inline voiture au lieu de `mapToMotoVehicle`)

### B) Compatibilité avec route moto dédiée

#### ✅ Compatible
- **Service** : `SupabaseVehiclesService.getAvailableVehicles()` retourne tous les véhicules (voitures + motos), donc compatible
- **Recherche par license** : La méthode `id.substring(0, 8).toUpperCase() === license` fonctionne pour tous les types de véhicules
- **Champs DB** : Les champs utilisés (`id`, `brand`, `model`, `year`, `price_per_day`, etc.) existent pour tous les types

#### ❌ Incompatible
- **Mapping** : Le mapping inline (lignes 181-253) est orienté voiture et ne correspond pas à `mapToMotoVehicle`

### C) Mapper moto existant

#### 🔹 Fichier : `src/mappers/vehicleMappers.ts`
- **Fonction** : `mapToMotoVehicle` (lignes 51-80)
- **Différences avec mapping voiture inline** :
  - `hasAC: false` (au lieu de `true`)
  - `doors: 0` (au lieu de `vehicle.seats || 5`)
  - `seats: vehicle.seats ?? undefined` (au lieu de non défini)
  - `engineCapacity: vehicle.engine_capacity || undefined` (spécifique moto)
  - `location: vehicle.pickup_zones?.join(", ") || undefined` (pas de fallback "Mamoudzou, Mayotte")
  - `transmission: normalizeTransmission(vehicle.transmission)` (normalisation spécifique)

### D) Ce que la page détail utilise actuellement

#### 🔹 Mapping actuel
- **Fichier** : `src/pages/vehicles/VehicleDetails.tsx`
- **Lignes** : 181-253
- **Type** : Mapping inline (pas de fonction dédiée)
- **Orientation** : Voiture uniquement
- **Utilise-t-il `mapToMotoVehicle` ?** : **NON**

### E) Ce qu'il faudra utiliser pour route moto dédiée

#### 🔹 Nouveau composant : `MotoVehicleDetails`
- **Service** : `SupabaseVehiclesService.getAvailableVehicles()` (identique, compatible)
- **Recherche** : `allVehicles.find(v => v.id.substring(0, 8).toUpperCase() === license.toUpperCase())` (identique, compatible)
- **Mapper** : `mapToMotoVehicle(vehicle)` depuis `@/mappers/vehicleMappers` (au lieu du mapping inline)

### Résumé section 4

**Aujourd'hui, détail utilise** :
- Service : `SupabaseVehiclesService.getAvailableVehicles()` ✅
- Recherche : `id.substring(0, 8).toUpperCase() === license` ✅
- Mapping : **Mapping inline voiture** (lignes 181-253) ❌ (inadapté pour moto)

**Pour moto route dédiée, il faudra utiliser** :
- Service : `SupabaseVehiclesService.getAvailableVehicles()` ✅ (identique)
- Recherche : `id.substring(0, 8).toUpperCase() === license` ✅ (identique)
- Mapping : `mapToMotoVehicle(vehicle)` depuis `@/mappers/vehicleMappers` ✅ (existe déjà)

**Conclusion** : Le service et la recherche sont compatibles. Seul le mapping doit changer (utiliser `mapToMotoVehicle` au lieu du mapping inline).

---

## 5️⃣ LIVRABLE FINAL : Plan exact de modifications (sans implémenter)

### A) Route à ajouter

#### 🔹 Route principale moto
- **Chemin** : `/moto/:license`
- **Fichier** : `src/App.tsx`
- **Ligne** : Après la ligne 69 (route voiture)
- **Code** :
  ```typescript
  <Route path="/moto/:license" element={<MotoVehicleDetails />} />
  ```

#### 🔹 Route discussion booking moto
- **Chemin** : `/moto/:license/booking/discussion`
- **Fichier** : `src/App.tsx`
- **Ligne** : Après la ligne 70 (route discussion voiture)
- **Code** :
  ```typescript
  <Route path="/moto/:license/booking/discussion" element={<BookingDiscussion />} />
  ```
- **Note** : `BookingDiscussion` peut rester le même (pas de dépendance au type de véhicule)

### B) Nouveau composant/page à créer

#### 🔹 Fichier : `src/pages/vehicles/MotoVehicleDetails.tsx`
- **Nom** : `MotoVehicleDetails`
- **Emplacement** : `src/pages/vehicles/`
- **Base** : Copier `VehicleDetails.tsx` et adapter
- **Modifications à apporter** :

  1. **Import du mapper moto** :
     ```typescript
     import { mapToMotoVehicle } from "@/mappers/vehicleMappers";
     import { isMoto } from "@/utils/vehicleType";
     ```

  2. **Dans `loadVehicleData` (ligne ~179)** :
     - Remplacer le mapping inline (lignes 181-253) par :
     ```typescript
     const mappedVehicle: Vehicle = mapToMotoVehicle(vehicle);
     ```

  3. **Adapter les sections car-only** :
     - **Ligne ~981** : Remplacer `"Description de la voiture"` par `"Description de la moto"` ou `"Description"`
     - **Ligne ~900** : Remplacer `"5 places"` par `{vehicle.seats ? t("vehicle.places", { count: vehicle.seats }) : t("common.not_specified")}` ou masquer
     - **Lignes ~1020-1022** : Masquer la tuile "Portes" (condition `if (vehicle.doors > 0)`)
     - **Lignes ~1024-1026** : Remplacer `"5"` par `{vehicle.seats ?? t("common.not_specified")}`
     - **Lignes ~1038-1080** : Adapter ou masquer la section "Options et accessoires" (moto n'a pas de climatisation, CarPlay, etc.)

  4. **Vérification de type (sécurité)** :
     - Après le chargement du véhicule (ligne ~179), ajouter :
     ```typescript
     if (vehicle && !isMoto(vehicle)) {
       toast({ title: "Erreur", description: "Ce véhicule n'est pas une moto.", variant: "destructive" });
       navigate("/");
       return;
     }
     ```

### C) Modifications de liens (MotoVehicleCard uniquement)

#### ✅ Aucune modification nécessaire
- **Fichier** : `src/components/vehicles/moto-vehicle-card.tsx`
- **Justification** : `MotoVehicleCard` utilise déjà `onClick` prop qui vient de `Index.tsx`. La modification dans `handleVehicleClick` (voir section 3.B) suffit.

### D) Modifications de liens (autres composants)

Voir section 3.B pour la liste complète. Résumé :

1. **`src/pages/Index.tsx`** : `handleVehicleClick` (ligne 528) → vérifier `isMoto(vehicle)`
2. **`src/components/RenterBookingCard.tsx`** : ligne 1051 → vérifier `vehicle_type`
3. **`src/components/OwnerBookingCard.tsx`** : ligne 1119 → vérifier `vehicle_type`
4. **`src/pages/owner/OwnerVehicles.tsx`** : ligne 478 → vérifier `vehicle_type`
5. **`src/pages/booking/BookingDiscussion.tsx`** : lignes 538, 877, 1215 → vérifier `vehicle_type`
6. **`src/pages/owner/OwnerBookingDiscussion.tsx`** : ligne 662 → vérifier `vehicle_type`
7. **`src/pages/owner/OwnerBookings.tsx`** : ligne 533 → vérifier `vehicle_type`

### E) Ce qu'on réutilise depuis la voiture

#### ✅ Composants/services réutilisables

1. **`PhotoService.getVehiclePhotos()`** :
   - Fichier : `src/services/supabase/photos`
   - Compatibilité : ✅ Fonctionne pour tous les types de véhicules
   - Utilisation : Identique dans `MotoVehicleDetails`

2. **`SupabaseVehiclesService.getAvailableVehicles()`** :
   - Fichier : `src/services/supabaseVehiclesService.ts`
   - Compatibilité : ✅ Retourne tous les véhicules (voitures + motos)
   - Utilisation : Identique dans `MotoVehicleDetails`

3. **`VehicleServiceOptions`** :
   - Fichier : `src/components/vehicles/VehicleServiceOptions.tsx`
   - Compatibilité : ✅ Tous les services sont compatibles moto (voir section 2.E)
   - Utilisation : Identique dans `MotoVehicleDetails`

4. **`BookingConfirmationModal`** :
   - Fichier : `src/components/booking/BookingConfirmationModal`
   - Compatibilité : ✅ Pas de dépendance au type de véhicule
   - Utilisation : Identique dans `MotoVehicleDetails`

5. **`VehicleOwnerCard`** :
   - Fichier : `src/components/VehicleOwnerCard`
   - Compatibilité : ✅ Fonctionne pour tous les types de véhicules
   - Utilisation : Identique dans `MotoVehicleDetails`

6. **`createVehicleRentalInfo`** :
   - Fichier : `src/lib/utils`
   - Compatibilité : ✅ Calcul de prix indépendant du type de véhicule
   - Utilisation : Identique dans `MotoVehicleDetails`

7. **`formatCurrency`, `formatLegacyFormattedPrice`** :
   - Fichiers : `src/utils/currency`, `src/utils/formatLegacyFormattedPrice`
   - Compatibilité : ✅ Formatage monétaire générique
   - Utilisation : Identique dans `MotoVehicleDetails`

8. **`BookingDiscussion`** :
   - Fichier : `src/pages/booking/BookingDiscussion.tsx`
   - Compatibilité : ✅ Pas de dépendance au type de véhicule
   - Utilisation : Route séparée mais même composant

9. **Sections statiques** :
   - Évaluations, Assurance, Avantages, Légal
   - Compatibilité : ✅ Génériques, pas de dépendance au type
   - Utilisation : Identique dans `MotoVehicleDetails`

### F) Ce qu'on ne réutilise pas (car-only sections)

#### ❌ Sections à adapter/masquer

1. **Mapping inline voiture** (lignes 181-253 de `VehicleDetails.tsx`) :
   - **Remplacé par** : `mapToMotoVehicle(vehicle)`

2. **Titre "Description de la voiture"** (ligne 981) :
   - **Remplacé par** : "Description de la moto" ou "Description"

3. **"5 places" hard-codé** (ligne 900) :
   - **Remplacé par** : `vehicle.seats` dynamique ou masqué

4. **Tuile "Portes"** (lignes 1020-1022) :
   - **Action** : Masquer (condition `if (vehicle.doors > 0)`)

5. **Tuile "Places" hard-codé "5"** (lignes 1024-1026) :
   - **Remplacé par** : `vehicle.seats` dynamique ou masqué

6. **Section "Options et accessoires"** (lignes 1038-1080) :
   - **Action** : Adapter (masquer options inadaptées comme climatisation, CarPlay) ou utiliser les champs DB `has_ac`, `has_gps`, etc.

### G) Garanties de non-régression voiture

#### ✅ Mesures de sécurité

1. **Route voiture inchangée** :
   - `/vehicle/:license` continue de pointer vers `VehicleDetails` (composant voiture)
   - Aucune modification dans `VehicleDetails.tsx`

2. **Mapper voiture inchangé** :
   - `mapToCarVehicle` continue d'être utilisé dans `Index.tsx` pour les cartes voiture
   - Le mapping inline dans `VehicleDetails.tsx` reste inchangé

3. **Conditionnelles dans les liens** :
   - Tous les liens vérifient `vehicle_type` avant de router
   - Si `vehicle_type !== 'moto'`, comportement voiture préservé

4. **Composants séparés** :
   - `VehicleDetails` pour voiture
   - `MotoVehicleDetails` pour moto
   - Aucun partage de code modifié

### Résumé section 5

**Plan d'implémentation minimal et safe** :

1. **Créer** `src/pages/vehicles/MotoVehicleDetails.tsx` (copie de `VehicleDetails.tsx` avec adaptations)
2. **Ajouter** routes dans `src/App.tsx` (2 routes moto)
3. **Modifier** `src/pages/Index.tsx` : `handleVehicleClick` (1 ligne)
4. **Modifier** 7 autres fichiers pour les liens (vérification `vehicle_type`)

**Réutilisations** :
- ✅ Tous les services (PhotoService, SupabaseVehiclesService, etc.)
- ✅ Tous les composants (VehicleServiceOptions, BookingConfirmationModal, etc.)
- ✅ Toutes les sections statiques (évaluations, assurance, etc.)

**Non-réutilisations** :
- ❌ Mapping inline voiture → remplacer par `mapToMotoVehicle`
- ❌ Sections car-only → adapter/masquer (voir section F)

**Garanties** :
- ✅ Route voiture inchangée
- ✅ Composant voiture inchangé
- ✅ Mapper voiture inchangé
- ✅ Conditionnelles préservent le comportement voiture

---

## 📋 CONCLUSION GÉNÉRALE

### Réponses aux questions

1. **`vehicle_type` est-il géré dans le détail ?** : **NON**
2. **Blocs car-only identifiés ?** : **OUI** (6 blocs principaux)
3. **Où brancher la route moto ?** : **Route séparée `/moto/:license` + modifications de liens**
4. **Chargement des données compatible ?** : **OUI** (service et recherche compatibles, seul le mapping doit changer)
5. **Plan exact de modifications ?** : **OUI** (voir section 5)

### Risques identifiés

- **Risque faible** : Modifications dans 8 fichiers pour les liens (mais conditionnelles préservent le comportement voiture)
- **Risque nul** : Route voiture et composant voiture restent inchangés

### Prochaines étapes (si implémentation)

1. Créer `MotoVehicleDetails.tsx` (copie + adaptations)
2. Ajouter routes dans `App.tsx`
3. Modifier `handleVehicleClick` dans `Index.tsx`
4. Modifier les 7 autres fichiers pour les liens
5. Tester avec une moto réelle en DB
6. Vérifier qu'une voiture continue de fonctionner sur `/vehicle/:license`

---

**Fin du diagnostic**

