# Diagnostic : Téléphone obligatoire avant réservation

**Date** : 2025-01-27  
**Objectif** : Imposer le téléphone avant toute réservation (diagnostic uniquement, pas d'implémentation)

---

## 1. CHAMPS / SOURCE DE VÉRITÉ

### Fichiers de définition du type User

**Fichier principal** : `src/types/index.ts`  
**Lignes** : 68-92

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;  // ← CHAMP TÉLÉPHONE (optionnel)
  // ... autres champs
}
```

**Fichier Supabase** : `src/integrations/supabase/types.ts`  
**Lignes** : 163 (table `profiles.phone: string | null`)

### Nom exact du champ
- **Type TypeScript** : `phone?: string` (optionnel)
- **Base de données** : `profiles.phone` (nullable)
- **Format** : String (probablement format international via `react-phone-number-input`)

### Condition "téléphone renseigné"

**Règle de vérification** :
```typescript
// Vérifier que phone existe, n'est pas vide, et n'est pas seulement des espaces
const hasPhone = currentUser?.phone && currentUser.phone.trim().length > 0;
```

**Détails** :
- `phone` doit être défini (pas `undefined` ni `null`)
- `phone.trim().length > 0` (pas de chaîne vide ou uniquement espaces)
- Format : Le champ utilise `react-phone-number-input` dans `/profile`, donc format E.164 possible (ex: `+33612345678`), mais validation minimale = non vide

**Fichier de vérification** : `src/pages/Profile.tsx` (ligne 122 : `const [phone, setPhone] = useState<string | undefined>("")`)

### Stockage et mise à jour de currentUser

**Contexte Auth** : `src/contexts/AuthContext.tsx`
- **State** : `user: User | null` (ligne 6) - mais c'est le `User` de Supabase Auth, pas le profil complet
- **Hook** : `useAuth()` retourne `user` (Supabase Auth user)

**Profil utilisateur complet** :
- **Service** : `ProfileService.getCurrentUserProfile()` (`src/services/supabase/profile.ts`)
- **Stockage** : Pas de contexte global, chaque composant charge le profil via `ProfileService`
- **Exemple** : `src/pages/vehicles/VehicleDetails.tsx` (ligne ~150) : `const { data: currentUser } = await ProfileService.getCurrentUserProfile()`

**Mise à jour après édition** :
- Après `ProfileService.updateProfile()` → retourne `updatedUser`
- Les composants doivent recharger le profil ou mettre à jour leur state local
- **Pas de refresh automatique** : Chaque page doit gérer son propre state `currentUser`

**Livrable** :
- **Fichiers** : `src/types/index.ts` (ligne 73), `src/services/supabase/profile.ts` (ligne 95)
- **Vérification** : `currentUser?.phone && currentUser.phone.trim().length > 0`

---

## 2. POINTS D'ENTRÉE RÉSERVATION

### Tableau des points d'entrée

| Point d'entrée | Fichier | Handler | Crée réservation ? | Notes |
|----------------|---------|---------|---------------------|-------|
| **Bouton "Réserver" (voiture)** | `src/pages/vehicles/VehicleDetails.tsx` | `handleConfirmBooking` (ligne 400) | ✅ OUI | Appelle `SupabaseBookingsService.createBooking()` ligne 544 |
| **Bouton "Réserver" (moto)** | `src/pages/vehicles/MotoVehicleDetails.tsx` | `handleConfirmBooking` (ligne 423) | ✅ OUI | Appelle `SupabaseBookingsService.createBooking()` ligne 535 |
| **Modal confirmation** | `src/components/booking/BookingConfirmationModal.tsx` | `onConfirm` prop | ❌ NON | Déclenche `handleConfirmBooking` du parent |
| **Page MessageToOwners** | `src/pages/booking/MessageToOwners.tsx` | `handleSendRequest` (ligne 90) | ✅ OUI | Appelle `BookingsService.createBooking()` ligne 127 (ancien service, à vérifier) |
| **Service central** | `src/services/supabase/bookings.ts` | `SupabaseBookingsService.createBooking()` (ligne 43) | ✅ OUI | **Point central de création** |

### Détails des handlers

#### 1. VehicleDetails.tsx (voiture)
- **Ligne du bouton** : ~750, ~1329, ~1342
- **Handler** : `handleConfirmBooking` (ligne 400)
- **Flux** :
  1. Ferme la modal de confirmation
  2. Calcule les prix et options
  3. **Appelle `SupabaseBookingsService.createBooking()`** (ligne 544)
  4. Redirige vers `/vehicle/:license/booking/discussion`

#### 2. MotoVehicleDetails.tsx (moto)
- **Ligne du bouton** : ~1321
- **Handler** : `handleConfirmBooking` (ligne 423)
- **Flux** : Identique à VehicleDetails

#### 3. MessageToOwners.tsx
- **Handler** : `handleSendRequest` (ligne 90)
- **Flux** :
  1. Vérifie message, dates, user
  2. **Appelle `BookingsService.createBooking()`** (ligne 127) - **ANCIEN SERVICE** (à vérifier si encore utilisé)
  3. Redirige vers `/me/renter/bookings`

### Service central de création

**Fichier** : `src/services/supabase/bookings.ts`  
**Fonction** : `SupabaseBookingsService.createBooking()` (ligne 43)

**Signature** :
```typescript
static async createBooking(bookingData: BookingData): Promise<{
  data: BookingResponse | null;
  error: string | null;
}>
```

**Appels directs** :
- `VehicleDetails.tsx` ligne 544
- `MotoVehicleDetails.tsx` ligne 535

**Livrable** :
- **Points d'entrée UI** : 2 (VehicleDetails, MotoVehicleDetails)
- **Service central** : `SupabaseBookingsService.createBooking()` (1 seul point de création réel)
- **Point d'interception recommandé** : Dans `createBooking()` AVANT l'insertion DB

---

## 3. STRATÉGIE GUARD RECOMMANDÉE

### Comparaison des approches

#### A) Guard au clic du bouton (UI)
- **Avantages** : Feedback immédiat, contrôle UX
- **Inconvénients** : Duplication si plusieurs points d'entrée, risque d'oubli
- **Fichiers à modifier** : `VehicleDetails.tsx`, `MotoVehicleDetails.tsx`, `MessageToOwners.tsx`

#### B) Guard au niveau route (route protection)
- **Avantages** : Centralisé, impossible de contourner
- **Inconvénients** : Ne s'applique pas si réservation depuis plusieurs routes, complexité React Router
- **Fichiers à modifier** : `src/App.tsx` (route guards)

#### C) Guard au niveau service "createBooking" (central)
- **Avantages** : ✅ **UN SEUL POINT** à modifier, impossible de contourner, réutilisable
- **Inconvénients** : Aucun (c'est le point central)
- **Fichier à modifier** : `src/services/supabase/bookings.ts` (ligne 43)

#### D) Combinaison (UI + central)
- **Avantages** : Feedback UX + sécurité backend
- **Inconvénients** : Duplication, maintenance double

### ✅ STRATÉGIE RETENUE : **C) Guard au niveau service**

**Raison** :
1. **Point unique** : `SupabaseBookingsService.createBooking()` est le seul point réel de création
2. **Sécurité** : Impossible de contourner même si nouveaux points d'entrée ajoutés
3. **Maintenance** : Un seul endroit à modifier
4. **Cohérence** : Tous les appels passent par là

### Emplacement exact

**Fichier** : `src/services/supabase/bookings.ts`  
**Fonction** : `SupabaseBookingsService.createBooking()`  
**Ligne d'insertion** : **AVANT** la ligne 73 (`supabase.from('bookings').insert(...)`)

**Pseudo-code** :
```typescript
// Ligne ~47 (début de createBooking)
// 1. Récupérer currentUser via ProfileService.getCurrentUserProfile()
// 2. Vérifier phone: if (!currentUser?.phone || currentUser.phone.trim().length === 0)
// 3. Si absent → return { data: null, error: "PHONE_REQUIRED" }
// 4. Sinon → continuer création normale
```

### Comment éviter les oublis

**Garantie** : Tous les appels passent par `SupabaseBookingsService.createBooking()`, donc le guard est automatiquement appliqué partout.

**Vérification** :
- ✅ `VehicleDetails.tsx` → appelle `SupabaseBookingsService.createBooking()`
- ✅ `MotoVehicleDetails.tsx` → appelle `SupabaseBookingsService.createBooking()`
- ⚠️ `MessageToOwners.tsx` → appelle `BookingsService.createBooking()` (ancien service) → **À MIGRER** vers SupabaseBookingsService

**Livrable** :
- **Stratégie** : Guard central dans `SupabaseBookingsService.createBooking()`
- **Emplacement** : `src/services/supabase/bookings.ts` ligne ~47 (avant insert DB)
- **Raisons** : Point unique, sécurité, maintenance simple

---

## 4. MODAL

### Composant modal existant

**Composant** : `Dialog` (shadcn/ui, basé sur Radix UI)  
**Fichier** : `src/components/ui/dialog.tsx`  
**Librairie** : `@radix-ui/react-dialog`

**Exports disponibles** :
- `Dialog` (Root)
- `DialogContent`
- `DialogHeader`
- `DialogTitle`
- `DialogDescription`
- `DialogFooter`
- `DialogTrigger`
- `DialogClose`

### Exemples d'utilisation dans le projet

#### Exemple 1 : BookingConfirmationModal
**Fichier** : `src/components/booking/BookingConfirmationModal.tsx`  
**Pattern** :
```typescript
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
    </DialogHeader>
    {/* Contenu */}
    <DialogFooter>
      <Button onClick={onConfirm}>Confirmer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Exemple 2 : MultiVehicleModal
**Fichier** : `src/components/vehicles/MultiVehicleModal.tsx` (ligne 44)  
**Pattern** : Identique, avec `onOpenChange` pour contrôler l'ouverture

### Pattern d'appel depuis un handler

**Dans VehicleDetails.tsx** (exemple existant) :
```typescript
const [showConfirmationModal, setShowConfirmationModal] = useState(false);

// Dans handleConfirmBooking (ligne 400)
const handleConfirmBooking = async () => {
  setShowConfirmationModal(false); // Fermer modal
  // ... logique réservation
};

// Dans le JSX
<BookingConfirmationModal
  isOpen={showConfirmationModal}
  onClose={() => setShowConfirmationModal(false)}
  onConfirm={handleConfirmBooking}
/>
```

### Modal pour téléphone requis

**Pattern recommandé** :
```typescript
// Dans le service (pseudo-code)
if (!hasPhone) {
  // Retourner un code d'erreur spécial
  return { data: null, error: "PHONE_REQUIRED" };
}

// Dans les composants UI (VehicleDetails, MotoVehicleDetails)
const [showPhoneRequiredModal, setShowPhoneRequiredModal] = useState(false);

// Dans handleConfirmBooking
const handleConfirmBooking = async () => {
  const result = await SupabaseBookingsService.createBooking(...);
  if (result.error === "PHONE_REQUIRED") {
    setShowPhoneRequiredModal(true);
    return; // Bloquer la réservation
  }
  // ... continuer si OK
};

// Modal bloquante (pas de onClose, seulement CTA vers /profile)
<Dialog open={showPhoneRequiredModal} onOpenChange={() => {}}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Téléphone requis</DialogTitle>
      <DialogDescription>
        Vous devez renseigner votre numéro de téléphone avant de réserver.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => navigate('/profile?returnTo=...')}>
        Renseigner mon téléphone
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Livrable** :
- **Composant** : `Dialog` de `@/components/ui/dialog` (Radix UI)
- **Fichiers d'exemples** : `BookingConfirmationModal.tsx`, `MultiVehicleModal.tsx`
- **Pattern** : State `showPhoneRequiredModal` + `Dialog` avec `onOpenChange={() => {}}` pour bloquer la fermeture

---

## 5. RETOUR / REPRISE RÉSERVATION

### Mécanisme de retour recommandé

**Option retenue** : **Query string `returnTo`** + **sessionStorage pour données temporaires**

**Raison** :
- ✅ Simple à implémenter
- ✅ Compatible avec React Router
- ✅ Persiste même si refresh
- ✅ Pas de state React perdu

### Plan concret

#### 1. Stocker le contexte de réservation

**Avant redirection vers `/profile`** :
```typescript
// Dans VehicleDetails.tsx ou MotoVehicleDetails.tsx
// Avant navigate('/profile?returnTo=...')
sessionStorage.setItem('pendingBooking', JSON.stringify({
  vehicleId: vehicle.id,
  vehicleLicense: vehicle.license,
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  // ... autres données nécessaires
}));
```

#### 2. Redirection avec returnTo

**Dans le handler de réservation** :
```typescript
// Construire l'URL de retour
const currentPath = `/vehicle/${vehicle.license}`; // ou `/moto/${vehicle.license}`
const returnTo = encodeURIComponent(currentPath);
navigate(`/profile?returnTo=${returnTo}&section=phone`);
```

#### 3. Détection dans /profile

**Dans `src/pages/Profile.tsx`** :
```typescript
// Ligne ~225 (dans useEffect ou au mount)
const location = useLocation();
const searchParams = new URLSearchParams(location.search);
const returnTo = searchParams.get('returnTo');
const section = searchParams.get('section'); // "phone"

// Si returnTo présent → activer section téléphone
if (section === 'phone') {
  setActiveSection('basic'); // Section de base contient le téléphone
  // Scroll vers le champ téléphone (voir ci-dessous)
}
```

#### 4. Focus sur section téléphone

**Options** :
- **Anchor hash** : `/profile?returnTo=...&section=phone#phone` → scroll automatique si `id="phone"` sur le champ
- **Ref + scrollIntoView** : `useRef` sur le champ téléphone, `phoneInputRef.current?.scrollIntoView({ behavior: 'smooth' })`
- **State actif** : `setActiveSection('basic')` (déjà fait) + highlight visuel

**Recommandation** : **Ref + scrollIntoView** (plus fiable que anchor)

**Dans Profile.tsx** :
```typescript
const phoneInputRef = useRef<HTMLDivElement>(null);

// Dans useEffect si section === 'phone'
useEffect(() => {
  if (section === 'phone' && phoneInputRef.current) {
    setTimeout(() => {
      phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300); // Attendre que la section soit rendue
  }
}, [section]);

// Dans le JSX, sur le groupe téléphone
<div ref={phoneInputRef} id="phone-section">
  {/* Champ téléphone */}
</div>
```

#### 5. Détection "téléphone ajouté"

**Dans Profile.tsx, après save** :
```typescript
// Dans saveSection('basic') ou handleSubmit
const { data: updatedUser } = await ProfileService.updateProfile(...);

if (updatedUser && updatedUser.phone) {
  // Vérifier si on vient d'une réservation
  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const pendingBooking = sessionStorage.getItem('pendingBooking');
  
  if (returnTo && pendingBooking) {
    // Nettoyer sessionStorage
    sessionStorage.removeItem('pendingBooking');
    // Rediriger vers returnTo
    navigate(returnTo);
    // Optionnel : toast "Téléphone ajouté, vous pouvez maintenant réserver"
  }
}
```

#### 6. Reprendre la réservation

**Dans VehicleDetails.tsx (ou MotoVehicleDetails.tsx), au mount** :
```typescript
useEffect(() => {
  const pendingBooking = sessionStorage.getItem('pendingBooking');
  if (pendingBooking) {
    // Restaurer les données de réservation
    const bookingData = JSON.parse(pendingBooking);
    // Pré-remplir les champs (dates, véhicule, etc.)
    // Optionnel : toast "Vous pouvez maintenant finaliser votre réservation"
  }
}, []);
```

### Diagramme texte

```
Réservation (VehicleDetails)
  ↓
handleConfirmBooking()
  ↓
SupabaseBookingsService.createBooking()
  ↓
[GUARD] Vérification phone
  ↓
❌ Phone absent
  ↓
return { error: "PHONE_REQUIRED" }
  ↓
VehicleDetails détecte erreur
  ↓
sessionStorage.setItem('pendingBooking', {...})
  ↓
navigate('/profile?returnTo=/vehicle/XXX&section=phone')
  ↓
Profile.tsx charge
  ↓
Détecte ?section=phone
  ↓
setActiveSection('basic')
  ↓
scrollIntoView(phoneInputRef)
  ↓
User saisit téléphone
  ↓
saveSection('basic')
  ↓
ProfileService.updateProfile({ phone })
  ↓
Détecte returnTo + pendingBooking
  ↓
sessionStorage.removeItem('pendingBooking')
  ↓
navigate(returnTo) → /vehicle/XXX
  ↓
VehicleDetails restaure données
  ↓
User peut réessayer réservation
  ↓
✅ Phone présent → réservation OK
```

**Livrable** :
- **Mécanisme** : Query string `returnTo` + `sessionStorage` pour données
- **Focus téléphone** : `useRef` + `scrollIntoView` dans Profile.tsx
- **Détection ajout** : Vérifier `returnTo` après `updateProfile` dans Profile.tsx
- **Reprise** : Restaurer depuis `sessionStorage` au mount de VehicleDetails

---

## 6. CHECKLIST QA

### Scénarios de test

#### ✅ Test 1 : Utilisateur sans téléphone → réservation bloquée
1. **Prérequis** : User connecté, `phone` vide/null dans profil
2. **Action** : Aller sur `/vehicle/:license`, cliquer "Réserver"
3. **Attendu** :
   - Modal bloquante apparaît : "Téléphone requis"
   - CTA "Renseigner mon téléphone" visible
   - Impossible de fermer la modal (pas de X, pas d'ESC)
   - Réservation non créée dans DB
4. **Vérifier** : Table `bookings` → aucune nouvelle ligne

#### ✅ Test 2 : Redirection vers profil + focus téléphone
1. **Prérequis** : Modal "Téléphone requis" ouverte
2. **Action** : Cliquer "Renseigner mon téléphone"
3. **Attendu** :
   - Redirection vers `/profile?returnTo=/vehicle/XXX&section=phone`
   - Section "Informations de base" active
   - Scroll automatique vers champ téléphone
   - Champ téléphone visible et focusable
4. **Vérifier** : URL contient `returnTo` et `section=phone`

#### ✅ Test 3 : Saisie téléphone + retour réservation
1. **Prérequis** : Sur `/profile?returnTo=...&section=phone`
2. **Action** :
   - Saisir numéro téléphone (ex: `+33612345678`)
   - Cliquer "Sauvegarder mes informations"
3. **Attendu** :
   - Toast "Informations sauvegardées"
   - Redirection automatique vers `returnTo` (page véhicule)
   - `sessionStorage` nettoyé (pas de `pendingBooking`)
4. **Vérifier** : URL = `/vehicle/:license` (sans query params)

#### ✅ Test 4 : Reprise réservation après ajout téléphone
1. **Prérequis** : Vient de `/profile` après ajout téléphone, sur page véhicule
2. **Action** : Cliquer "Réserver" à nouveau
3. **Attendu** :
   - ✅ Pas de modal "Téléphone requis"
   - Réservation créée normalement
   - Redirection vers `/vehicle/:license/booking/discussion`
4. **Vérifier** : Table `bookings` → nouvelle ligne créée avec `user_id` correct

#### ✅ Test 5 : Utilisateur avec téléphone → réservation OK
1. **Prérequis** : User connecté, `phone` renseigné (ex: `+33612345678`)
2. **Action** : Aller sur `/vehicle/:license`, cliquer "Réserver"
3. **Attendu** :
   - ✅ Pas de modal "Téléphone requis"
   - Réservation créée directement
   - Redirection vers discussion
4. **Vérifier** : Réservation en DB avec statut `pending`

#### ✅ Test 6 : Annuler modal (si bouton annuler ajouté)
1. **Prérequis** : Modal "Téléphone requis" ouverte
2. **Action** : Cliquer "Annuler" (si présent) ou fermer (si autorisé)
3. **Attendu** :
   - Modal se ferme
   - **Réservation toujours bloquée** (pas créée)
   - User reste sur page véhicule
4. **Vérifier** : Pas de réservation créée

#### ✅ Test 7 : Multi points d'entrée (cohérence)
1. **Prérequis** : User sans téléphone
2. **Actions** :
   - Tester depuis `/vehicle/:license` (voiture)
   - Tester depuis `/moto/:license` (moto)
3. **Attendu** :
   - Même comportement : modal "Téléphone requis"
   - Même redirection vers `/profile?returnTo=...`
   - Même reprise après ajout téléphone
4. **Vérifier** : Comportement identique sur les 2 pages

#### ✅ Test 8 : Edge case - Téléphone vide/espaces
1. **Prérequis** : User avec `phone = ""` ou `phone = "   "` (espaces)
2. **Action** : Cliquer "Réserver"
3. **Attendu** :
   - ❌ Modal "Téléphone requis" (car `trim().length === 0`)
   - Traité comme "téléphone absent"
4. **Vérifier** : Guard détecte correctement

#### ✅ Test 9 : Edge case - Format téléphone invalide
1. **Prérequis** : User avec `phone = "123"` (trop court, format invalide)
2. **Action** : Cliquer "Réserver"
3. **Attendu** :
   - ✅ Réservation OK (validation minimale = non vide)
   - OU ❌ Modal si validation stricte (selon règle métier)
4. **Note** : À définir si validation format stricte requise

#### ✅ Test 10 : Edge case - User non connecté
1. **Prérequis** : User déconnecté
2. **Action** : Aller sur `/vehicle/:license`, cliquer "Réserver"
3. **Attendu** :
   - Redirection vers `/auth/login` (déjà géré par auth guard existant)
   - OU Modal "Connexion requise" (selon implémentation actuelle)
4. **Vérifier** : Pas de crash, pas de modal "Téléphone requis" (car user null)

#### ✅ Test 11 : Edge case - Refresh page pendant réservation
1. **Prérequis** : User sans téléphone, modal "Téléphone requis" ouverte
2. **Action** : Refresh page (F5)
3. **Attendu** :
   - Modal disparaît (state perdu)
   - `sessionStorage` persiste (données sauvegardées)
   - User peut réessayer réservation → même flow
4. **Vérifier** : `sessionStorage.getItem('pendingBooking')` existe après refresh

#### ✅ Test 12 : Edge case - Navigation directe vers /profile avec returnTo
1. **Prérequis** : User sans téléphone
2. **Action** : Aller directement sur `/profile?returnTo=/vehicle/XXX&section=phone`
3. **Attendu** :
   - Page profile charge normalement
   - Section "Informations de base" active
   - Scroll vers téléphone (si section=phone)
   - Après save → redirection vers returnTo
4. **Vérifier** : Flow fonctionne même sans passer par modal

### Checklist résumée

- [ ] Test 1 : Réservation bloquée si téléphone absent
- [ ] Test 2 : Redirection vers profil avec focus téléphone
- [ ] Test 3 : Saisie téléphone + retour automatique
- [ ] Test 4 : Reprise réservation après ajout téléphone
- [ ] Test 5 : Réservation OK si téléphone présent
- [ ] Test 6 : Annulation modal (si applicable)
- [ ] Test 7 : Cohérence multi points d'entrée
- [ ] Test 8 : Téléphone vide/espaces détecté
- [ ] Test 9 : Format téléphone (selon règle métier)
- [ ] Test 10 : User non connecté (pas de crash)
- [ ] Test 11 : Refresh page (persistence sessionStorage)
- [ ] Test 12 : Navigation directe vers /profile avec returnTo

---

## RÉSUMÉ EXÉCUTIF

### Points clés

1. **Champ téléphone** : `User.phone?: string` dans `src/types/index.ts` (ligne 73)
2. **Vérification** : `currentUser?.phone && currentUser.phone.trim().length > 0`
3. **Point d'interception** : `SupabaseBookingsService.createBooking()` dans `src/services/supabase/bookings.ts` (ligne 43)
4. **Modal** : `Dialog` de `@/components/ui/dialog` (Radix UI)
5. **Retour réservation** : Query string `returnTo` + `sessionStorage` pour données
6. **Focus téléphone** : `useRef` + `scrollIntoView` dans Profile.tsx

### Fichiers à modifier (pour référence future)

1. `src/services/supabase/bookings.ts` (ligne ~47) : Ajouter guard phone
2. `src/pages/vehicles/VehicleDetails.tsx` : Gérer erreur `PHONE_REQUIRED` + modal
3. `src/pages/vehicles/MotoVehicleDetails.tsx` : Idem
4. `src/pages/Profile.tsx` : Détecter `returnTo` + focus téléphone + redirection après save
5. (Optionnel) `src/pages/booking/MessageToOwners.tsx` : Migrer vers `SupabaseBookingsService`

### Risques identifiés

- ⚠️ `MessageToOwners.tsx` utilise encore `BookingsService` (ancien) → ne passera pas par le guard
- ⚠️ Pas de contexte global pour `currentUser` → chaque composant doit charger le profil
- ⚠️ Validation format téléphone : Actuellement minimale (non vide), à définir si validation stricte requise

---

**Fin du diagnostic**

