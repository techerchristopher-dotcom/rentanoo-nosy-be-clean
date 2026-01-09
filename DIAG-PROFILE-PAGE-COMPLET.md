# Diagnostic Complet - Page /profile

**Date** : 2025-01-27  
**Route** : `/profile`  
**URL locale** : http://localhost:3012/profile  
**Framework** : React + React Router (Vite)

---

## 1. LOCALISATION DE LA ROUTE ET ENTRÉE DE PAGE

### Route déclarée
- **Fichier** : `src/App.tsx`
- **Lignes** : 66-70
- **Router** : React Router v6 (`BrowserRouter`, `Routes`, `Route`)
- **Composant** : `<Profile />` (importé depuis `src/pages/Profile.tsx`)
- **Wrapper** : `<ErrorBoundary>` pour gestion d'erreurs

```66:70:src/App.tsx
<Route path="/profile" element={
  <ErrorBoundary>
    <Profile />
  </ErrorBoundary>
} />
```

### Fichier d'entrée principal
- **Fichier** : `src/pages/Profile.tsx`
- **Lignes** : 1-2049
- **Type** : Composant React fonctionnel (default export)
- **Taille** : ~2049 lignes (monolithique)

### Imports directs (dépendances principales)

#### React & Routing
- `react` : `useState`, `useEffect`, `useMemo`
- `react-router-dom` : `Link`
- `react-i18next` : `useTranslation` (i18n)

#### UI Components (shadcn/ui)
- `@/components/ui/button` : `Button`
- `@/components/ui/input` : `Input`
- `@/components/ui/label` : `Label`
- `@/components/ui/card` : `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `@/components/ui/avatar` : `Avatar`, `AvatarFallback`, `AvatarImage`
- `@/components/ui/calendar` : `Calendar`
- `@/components/ui/popover` : `Popover`, `PopoverContent`, `PopoverTrigger`
- `@/components/ui/select` : `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `@/components/ui/dialog` : `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`
- `@/components/ui/alert-dialog` : `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`
- `@/components/ui/textarea` : `Textarea`
- `@/components/ui/mobile-date-picker` : `MobileDatePicker`

#### Icons
- `lucide-react` : `ArrowLeft`, `Camera`, `Loader2`, `CalendarIcon`

#### Services & Utils
- `@/services/supabase/profile` : `ProfileService`
- `@/hooks/use-toast` : `useToast`
- `@/hooks/use-mobile-breakpoint` : `useMobileBreakpoint`
- `@/lib/utils` : `cn` (className utility)
- `@/types` : `User as UserType`
- `@/config/features` : `FEATURES` (feature flags)

#### Third-party
- `react-phone-number-input` : `PhoneInput` + styles CSS
- `date-fns` : `format` (formatage de dates)

---

## 2. INVENTAIRE UI EXHAUSTIF (ARBRE DES COMPOSANTS)

### Structure hiérarchique complète

```
Profile (src/pages/Profile.tsx)
│
├── Container principal
│   └── div.min-h-screen.bg-gradient-to-br
│       │
│       ├── Hero Section (Header)
│       │   └── div.bg-gradient-lagoon
│       │       ├── Link (Retour accueil)
│       │       │   └── ArrowLeft icon + texte
│       │       ├── h1 (Titre "Mon Profil")
│       │       └── p (Sous-titre)
│       │
│       └── Contenu principal
│           └── div.container
│               │
│               ├── Badge de statut profil
│               │   └── div.inline-flex (Profil X% complété)
│               │       ├── span (indicateur visuel)
│               │       └── texte dynamique
│               │
│               ├── Section Profil avec Avatar
│               │   └── div.relative.-mt-16
│               │       └── div.bg-white.rounded-2xl (Card utilisateur)
│               │           ├── Avatar
│               │           │   ├── AvatarImage (src={profileImage})
│               │           │   ├── AvatarFallback (initiales)
│               │           │   └── Overlay chargement (si isUploadingImage)
│               │           │       └── Loader2 + texte "Upload..."
│               │           │
│               │           └── Informations utilisateur
│               │               ├── h2 (Prénom + Nom)
│               │               ├── p (Email)
│               │               ├── Badges statut
│               │               │   ├── Badge rôle (Admin/Owner/Renter)
│               │               │   └── Badge KYC (Vérifié/Pending/Non vérifié)
│               │               │
│               │               └── Bouton "Changer la photo"
│               │                   ├── Input[type="file"] (hidden)
│               │                   ├── Label (cursor-pointer)
│               │                   └── Button (Camera icon + texte)
│               │
│               ├── Navigation par onglets
│               │   └── div.flex.flex-wrap.gap-2
│               │       ├── Button "📝 Informations de base" (activeSection === 'basic')
│               │       ├── Button "🏠 Adresse" (si FEATURES.profileAddressEnabled)
│               │       └── Button "🚗 Permis de conduire" (si FEATURES.profileDrivingLicenseEnabled)
│               │
│               └── Form (onSubmit={handleSubmit})
│                   │
│                   ├── SECTION 1: Informations de base (activeSection === 'basic')
│                   │   └── Card
│                   │       ├── CardHeader
│                   │       │   ├── CardTitle (👤 Informations personnelles)
│                   │       │   └── Badge "Étape 1/X"
│                   │       │
│                   │       └── CardContent
│                   │           │
│                   │           ├── Groupe Identité
│                   │           │   ├── h3 (🆔 Identité)
│                   │           │   └── Grid 2 colonnes
│                   │           │       ├── Input firstName
│                   │           │       │   └── Label + indicateur validation (point vert si rempli)
│                   │           │       └── Input lastName
│                   │           │
│                   │           ├── Groupe Contact
│                   │           │   ├── h3 (📧 Contact)
│                   │           │   └── Input email (readonly, disabled)
│                   │           │       └── Helper text "L'email ne peut pas être modifié"
│                   │           │
│                   │           ├── Groupe Informations personnelles
│                   │           │   ├── h3 (🎂 Informations personnelles)
│                   │           │   └── Grid 2 colonnes
│                   │           │       ├── Date de naissance
│                   │           │       │   ├── MobileDatePicker (si isMobile)
│                   │           │       │   └── 3x Select (Jour/Mois/Année) (si desktop)
│                   │           │       └── Input placeOfBirth
│                   │           │
│                   │           ├── Groupe Présentation personnelle
│                   │           │   ├── h3 (💬 Présentation personnelle)
│                   │           │   └── Textarea bio
│                   │           │       ├── maxLength={500}
│                   │           │       └── Compteur caractères (X/500)
│                   │           │
│                   │           ├── Groupe Téléphone
│                   │           │   ├── h3 (📱 Téléphone)
│                   │           │   └── PhoneInput (react-phone-number-input)
│                   │           │       └── defaultCountry="FR"
│                   │           │
│                   │           └── Groupe Statut compte
│                   │               ├── h3 (✅ Statut de votre compte)
│                   │               └── Badges
│                   │                   ├── Badge rôle
│                   │                   └── Badge KYC
│                   │
│                   │       └── Footer Card (Bouton sauvegarde section)
│                   │           ├── Indicateur "Sauvegardé" (si completedSections.has('basic'))
│                   │           └── Button "Sauvegarder mes informations"
│                   │               └── Disabled si !hasSectionChanges('basic')
│                   │
│                   ├── SECTION 2: Adresse (activeSection === 'address' && FEATURES.profileAddressEnabled)
│                   │   └── Card
│                   │       ├── CardHeader
│                   │       │   ├── CardTitle (🏠 Adresse)
│                   │       │   └── Badge "Étape 2/3"
│                   │       │
│                   │       └── CardContent
│                   │           └── Grid 2 colonnes
│                   │               ├── Input addressLine1
│                   │               ├── Input city
│                   │               ├── Input postalCode
│                   │               └── Select country
│                   │                   └── Options: France, La Réunion, Mayotte, Guadeloupe, Martinique, Guyane
│                   │
│                   │       └── Footer Card (Bouton sauvegarde section)
│                   │
│                   └── SECTION 3: Permis de conduire (activeSection === 'license' && FEATURES.profileDrivingLicenseEnabled)
│                       └── Card
│                           ├── CardHeader
│                           │   ├── CardTitle (🚗 Permis de conduire)
│                           │   └── Badge "Étape 3/3"
│                           │
│                           └── CardContent
│                               ├── Grid 2 colonnes
│                               │   ├── Input driverLicenseNumber
│                               │   └── Select driverLicenseCountry
│                               │
│                               ├── Upload document permis
│                               │   ├── Si fichier existant
│                               │   │   ├── Aperçu (PDF icon ou Image)
│                               │   │   ├── Nom fichier
│                               │   │   ├── Badge "✓ Fichier uploadé"
│                               │   │   └── Actions (Changer / Supprimer)
│                               │   └── Si aucun fichier
│                               │       └── Zone drag & drop
│                               │           ├── SVG upload icon
│                               │           ├── Texte "Cliquez pour uploader"
│                               │           └── Button "Choisir un fichier"
│                               │
│                               ├── Date d'obtention
│                               │   ├── MobileDatePicker (si isMobile)
│                               │   └── 3x Select (Jour/Mois/Année) (si desktop)
│                               │
│                               ├── Grid 2 colonnes
│                               │   ├── Input driverLicenseCategory (défaut: "B")
│                               │   └── Input[type="date"] driverLicenseExpirationDate
│                               │
│                               └── Select driverLicenseCountry (dupliqué)
│                           │
│                           └── Footer Card (Bouton sauvegarde section)
│
│                   └── Banner "Profil X% complété" (si calculateProfileCompletion() < 100)
│                       └── div.bg-gradient-to-r
│                           ├── h3 (Titre avec %)
│                           ├── p (Description)
│                           └── Button "Sauvegarder tout le profil" (type="submit")
│
│               └── Dialog (Modal aperçu permis)
│                   └── DialogContent
│                       └── img (aperçu grand format)
│                           └── Fallback si erreur chargement
```

---

## 3. FORMULAIRE & LOGIQUE MÉTIER

### Bibliothèque de formulaire
- **Aucune lib dédiée** : Pas de `react-hook-form`, `formik`, `zod`, `yup`
- **Gestion manuelle** : États React (`useState`) pour chaque champ
- **Validation** : Validation basique côté client (taille fichiers, types)

### Schéma de validation

#### Validation côté client (dans le composant)
1. **Upload photo profil** :
   - Taille max : 5MB
   - Type : `file.type.startsWith('image/')`
   - Messages via `toast` (i18n)

2. **Upload permis** :
   - Taille max : 10MB
   - Types autorisés : `['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']`
   - Messages via `toast` (i18n)

3. **Bio** :
   - `maxLength={500}` sur le Textarea
   - Compteur caractères affiché

#### Validation côté serveur
- Gérée par Supabase (contraintes DB, RLS)
- Erreurs retournées via `ProfileService.updateProfile()`

### Champs readOnly

#### Email (ligne 1137-1148)
```1137:1148:src/pages/Profile.tsx
<Input
  id="email"
  name="email"
  type="email"
  defaultValue={currentUser.email}
  placeholder={t(
    "profile.form.email.placeholder",
    "votre.email@exemple.com"
  )}
  className="h-11 bg-muted/20 border-primary-soft/20 text-muted-foreground rounded-lg"
  disabled
/>
```
- **Implémentation** : `disabled` prop + style `bg-muted/20 text-muted-foreground`
- **Helper text** : "L'email ne peut pas être modifié"

### Gestion de l'étape "Étape 1/3"

#### Source (lignes 1064-1068)
```1064:1068:src/pages/Profile.tsx
<div className="text-sm text-muted-foreground bg-white/60 px-3 py-1 rounded-full">
  {t(
    "profile.sections.basic.step",
    `Étape 1/${1 + (FEATURES.profileAddressEnabled ? 1 : 0) + (FEATURES.profileDrivingLicenseEnabled ? 1 : 0)}`
  )}
</div>
```
- **Calcul dynamique** : `1 + (address ? 1 : 0) + (license ? 1 : 0)`
- **Feature flags** : `FEATURES.profileAddressEnabled`, `FEATURES.profileDrivingLicenseEnabled`
- **i18n** : Clé `profile.sections.basic.step`

### Calcul "Profil X% complété"

#### Fonction (lignes 79-120)
```79:120:src/pages/Profile.tsx
const calculateProfileCompletion = () => {
  try {
    const fields: string[] = [
      // Section informations de base
      firstName,
      lastName,
      phone || '',
      birthDate ? format(birthDate, 'yyyy-MM-dd') : '',
      placeOfBirth,
      bio, // Champ de présentation (optionnel mais recommandé)
    ];

    // Inclure l'adresse seulement si la section est activée
    if (FEATURES.profileAddressEnabled) {
      fields.push(
        addressLine1,
        postalCode,
        city,
        country,
      );
    }

    // Inclure le permis seulement si la section est activée
    if (FEATURES.profileDrivingLicenseEnabled) {
      fields.push(
        driverLicenseNumber,
        driverLicenseIssueDate ? format(driverLicenseIssueDate, 'yyyy-MM-dd') : '',
        driverLicenseCategory, // Toujours rempli par défaut avec "B"
        driverLicenseCountry,
      );
    }

    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    const totalFields = fields.length;
    
    return Math.round((completedFields / totalFields) * 100);
  } catch (error) {
    console.error('Erreur dans calculateProfileCompletion:', error);
    return 0;
  }
};
```

**Formule** : `Math.round((completedFields / totalFields) * 100)`

**Champs comptés** :
- Base (6) : `firstName`, `lastName`, `phone`, `birthDate`, `placeOfBirth`, `bio`
- Adresse (4, si activée) : `addressLine1`, `postalCode`, `city`, `country`
- Permis (4, si activé) : `driverLicenseNumber`, `driverLicenseIssueDate`, `driverLicenseCategory`, `driverLicenseCountry`

**Total** : 6 à 14 champs selon feature flags

### Upload photo

#### Composant
- **Input** : `<Input type="file" accept="image/*" />` (ligne 956-962)
- **Handler** : `handleImageUpload` (lignes 479-568)

#### Endpoint
- **Service** : `ProfileService.uploadProfileImage(file)` (ligne 512)
- **Storage** : Supabase Storage bucket `avatars`
- **Path** : `avatars/${userId}-${timestamp}.${ext}`

#### Gestion erreurs
- Toast avec `variant: "destructive"`
- Messages i18n : `profile.toasts.avatar*`

#### Preview
- **Avatar** : `<AvatarImage src={profileImage} />` (ligne 903)
- **Fallback** : Initiales `{firstName[0]}{lastName[0]}` (ligne 905)
- **Loading overlay** : Si `isUploadingImage` (lignes 910-917)

#### Formats/limites
- **Formats** : Tous formats image (`accept="image/*"`)
- **Taille max** : 5MB (ligne 484)
- **Validation** : `file.size > 5 * 1024 * 1024`

---

## 4. DONNÉES & API

### Récupération des données

#### Service utilisé
- **Service** : `ProfileService.getCurrentUserProfile()` (ligne 228)
- **Fichier** : `src/services/supabase/profile.ts`
- **Méthode** : Supabase Client (`supabase.from('profiles').select('*')`)

#### Endpoint
- **Table** : `profiles`
- **Query** : `.eq('id', authUser.id).single()`
- **Auth** : `supabase.auth.getUser()` pour récupérer l'utilisateur connecté

#### Chargement initial
- **Hook** : `useEffect` (lignes 225-318)
- **Dépendances** : `[toast]` (seulement au mount)
- **Loading state** : Pas de state dédié, affichage conditionnel si `!currentUser` (lignes 819-829)

### Token/Session
- **Source** : Supabase Auth (cookies automatiques)
- **Lecture** : `supabase.auth.getUser()` dans `ProfileService`
- **Pas de localStorage** : Gestion automatique par Supabase

### Sauvegarde

#### Fonction submit principale
- **Handler** : `handleSubmit` (lignes 680-744)
- **Type** : `React.FormEvent` (form submit)
- **Service** : `ProfileService.updateProfile(updateData)`

#### Sauvegarde par section
- **Handler** : `saveSection(section: 'basic' | 'address' | 'license')` (lignes 571-677)
- **Appel** : Via bouton "Sauvegarder cette section" (ligne 1389)

#### Payload
```typescript
{
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string; // format: 'yyyy-MM-dd'
  placeOfBirth?: string;
  bio?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  driverLicenseNumber?: string;
  driverLicenseIssueDate?: string;
  driverLicenseExpirationDate?: string;
  driverLicenseCategory?: string;
  driverLicenseCountry?: string;
}
```

### Gestion loading/error/success

#### Loading
- **State** : `isLoading` (ligne 31)
- **Indicateurs** :
  - Boutons : `<Loader2 className="animate-spin" />` (ligne 1399)
  - Texte : "Sauvegarde..." (ligne 1400)

#### Error
- **Toasts** : `toast({ variant: "destructive", ... })`
- **Clés i18n** : `profile.toasts.*Error.*`
- **Gestion globale** : `useEffect` avec `window.addEventListener('error')` (lignes 747-779, 782-798)

#### Success
- **Toasts** : `toast({ title: "Succès", ... })`
- **Clés i18n** : `profile.toasts.*Success.*`
- **Mise à jour state** : `setCurrentUser(updatedUser)` (ligne 720)

---

## 5. STYLE GUIDE DE LA PAGE

### Couleurs principales

#### Palette (définie dans `tailwind.config.ts`)
- **Primary** : `hsl(var(--primary))` + `primary-soft` (variante douce)
- **Success** : `hsl(var(--success))` + `success-soft`
- **Warning** : `hsl(var(--warning))` + `warning-soft`
- **Muted** : `hsl(var(--muted))` + `muted-foreground`

#### Gradients
- **Hero** : `bg-gradient-lagoon` (défini dans CSS variables)
- **Background page** : `bg-gradient-to-br from-background via-primary-soft/5 to-background`
- **Card header** : `bg-gradient-to-r from-primary-soft/20 via-primary-soft/10 to-transparent`

#### Badges statut
- **100%** : `bg-success-soft text-success border-success-soft/30`
- **≥75%** : `bg-primary-soft text-primary border-primary-soft/30`
- **≥50%** : `bg-warning-soft text-warning border-warning-soft/30`
- **<50%** : `bg-muted text-muted-foreground border-muted/30`

### Radius & Shadows

#### Border radius
- **Cards** : `rounded-2xl` (1.5rem)
- **Inputs** : `rounded-lg` (0.5rem)
- **Badges** : `rounded-full`
- **Avatar** : `rounded-full` (cercle)

#### Shadows
- **Cards** : `shadow-soft` (défini dans CSS variables)
- **Hover cards** : `hover:shadow-lg`
- **Avatar** : `shadow-lg`
- **Bouton principal** : `shadow-lagoon` (défini dans CSS variables)

### Spacing

#### Padding
- **Container** : `px-4 py-8 sm:py-12`
- **Cards** : `p-6 sm:p-8` (responsive)
- **CardContent** : `p-8`
- **CardHeader** : `p-6`

#### Gaps
- **Grid** : `gap-4` (1rem)
- **Flex** : `space-x-8`, `space-y-6`

### Pattern de cartes

#### Structure
```tsx
<Card className="bg-white/90 backdrop-blur-sm border-primary-soft/20 shadow-soft hover:shadow-lg transition-all duration-300 rounded-2xl">
  <CardHeader className="bg-gradient-to-r from-primary-soft/20 via-primary-soft/10 to-transparent border-b border-primary-soft/10 p-6">
    <CardTitle>...</CardTitle>
  </CardHeader>
  <CardContent className="space-y-8 p-8">
    ...
  </CardContent>
</Card>
```

#### Caractéristiques
- **Background** : `bg-white/90 backdrop-blur-sm` (semi-transparent avec blur)
- **Border** : `border-primary-soft/20` (couleur primaire douce, 20% opacité)
- **Shadow** : `shadow-soft` (définie dans CSS)
- **Hover** : `hover:shadow-lg` (transition)
- **Header** : Gradient + border bottom

### Composants réutilisables

#### shadcn/ui
- `Card`, `CardHeader`, `CardContent`, `CardTitle`
- `Button`
- `Input`
- `Label`
- `Textarea`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Avatar`, `AvatarFallback`, `AvatarImage`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `AlertDialog` (pour changement de section sans permis)

#### Composants maison
- `MobileDatePicker` : `@/components/ui/mobile-date-picker`
- Hooks : `useMobileBreakpoint`, `useToast`

---

## 6. FLUX DES DONNÉES

### 1. Chargement initial (Mount)

```
useEffect (ligne 225)
  ↓
ProfileService.getCurrentUserProfile()
  ↓
supabase.auth.getUser() → authUser
  ↓
supabase.from('profiles').select('*').eq('id', authUser.id).single()
  ↓
Si erreur PGRST116 (profil inexistant)
  ↓
ProfileService.createUserProfile() (création auto)
  ↓
Conversion Supabase → User (format app)
  ↓
setCurrentUser(user)
setFirstName(data.firstName)
setLastName(data.lastName)
... (initialisation de tous les states)
setOriginalData({ ... }) (snapshot pour détecter modifications)
```

### 2. Affichage

```
currentUser !== null
  ↓
Render conditionnel (ligne 819)
  ↓
Affichage Hero + Badge statut + Avatar + Form
  ↓
calculateProfileCompletion() → % affiché
  ↓
activeSection détermine quelle Card afficher
```

### 3. Modification

```
User modifie un champ
  ↓
onChange → setState (ex: setFirstName(e.target.value))
  ↓
hasSectionChanges(section) → true (comparaison avec originalData)
  ↓
Bouton "Sauvegarder" devient actif
```

### 4. Sauvegarde (section)

```
User clique "Sauvegarder cette section"
  ↓
saveSection('basic' | 'address' | 'license')
  ↓
setIsLoading(true)
  ↓
Construction updateData (selon section)
  ↓
ProfileService.updateProfile(updateData)
  ↓
supabase.from('profiles').update(supabaseUpdate).eq('id', authUser.id)
  ↓
Si succès
  ↓
setCurrentUser(updatedUser)
setCompletedSections(prev => new Set([...prev, section]))
setOriginalData({ ... }) (mise à jour snapshot)
toast({ title: "Succès", ... })
  ↓
Si erreur
  ↓
toast({ variant: "destructive", ... })
  ↓
setIsLoading(false)
```

### 5. Sauvegarde (tout le profil)

```
User clique "Sauvegarder tout le profil"
  ↓
handleSubmit(e) (form submit)
  ↓
e.preventDefault()
setIsLoading(true)
  ↓
Construction updateData (tous les champs)
  ↓
ProfileService.updateProfile(updateData)
  ↓
Si succès
  ↓
setCurrentUser(updatedUser)
setCompletedSections(new Set(['basic', 'address', 'license']))
toast({ title: "Profil complet mis à jour", ... })
  ↓
setIsLoading(false)
```

### 6. Upload photo

```
User clique "Changer la photo"
  ↓
Input[type="file"].onChange → handleImageUpload
  ↓
Validation (taille 5MB, type image)
  ↓
setIsUploadingImage(true)
  ↓
ProfileService.uploadProfileImage(file)
  ↓
supabase.storage.from('avatars').upload(filePath, file)
  ↓
supabase.storage.from('avatars').getPublicUrl(filePath)
  ↓
ProfileService.updateProfile({ avatarUrl: imageUrl })
  ↓
Si succès
  ↓
setCurrentUser(updatedUser)
setProfileImage(imageUrl)
toast({ title: "Photo de profil mise à jour", ... })
  ↓
setIsUploadingImage(false)
```

---

## 7. TABLEAU RÉCAPITULATIF "Bloc UI → Composant → Fichier → Styles → Data Source"

| Bloc UI | Composant React | Fichier | Styles (Classes) | Data Source |
|---------|----------------|---------|-------------------|-------------|
| **Hero Header** | `div.bg-gradient-lagoon` | `Profile.tsx:834` | `bg-gradient-lagoon text-white py-12 sm:py-16` | Static (i18n) |
| **Lien Retour** | `Link` + `ArrowLeft` | `Profile.tsx:838` | `inline-flex items-center text-white/80 hover:text-white` | Static |
| **Titre "Mon Profil"** | `h1` | `Profile.tsx:842` | `text-3xl sm:text-4xl lg:text-5xl font-bold` | i18n: `profile.hero.title` |
| **Badge statut profil** | `div.inline-flex` | `Profile.tsx:859` | `px-4 py-2 rounded-full text-sm font-medium` + couleurs dynamiques | `calculateProfileCompletion()` |
| **Card utilisateur** | `div.bg-white.rounded-2xl` | `Profile.tsx:896` | `bg-white rounded-2xl shadow-lagoon p-6 sm:p-8 border border-primary-soft/20` | `currentUser` |
| **Avatar** | `Avatar` + `AvatarImage` | `Profile.tsx:902` | `h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-lg` | `profileImage` (state) |
| **Initiales fallback** | `AvatarFallback` | `Profile.tsx:904` | `bg-gradient-lagoon text-white text-2xl sm:text-3xl font-bold` | `currentUser.firstName[0] + lastName[0]` |
| **Nom utilisateur** | `h2` | `Profile.tsx:923` | `text-2xl sm:text-3xl font-bold text-foreground` | `currentUser.firstName + lastName` |
| **Email** | `p` | `Profile.tsx:926` | `text-muted-foreground` | `currentUser.email` |
| **Badge rôle** | `span.inline-flex` | `Profile.tsx:930` | `px-3 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary` | `currentUser.roles` |
| **Badge KYC** | `span.inline-flex` | `Profile.tsx:937` | Couleurs dynamiques selon `kycStatus` | `currentUser.kycStatus` |
| **Bouton changer photo** | `Button` + `Camera` | `Profile.tsx:968` | `bg-white hover:bg-primary-soft/10 border-primary-soft text-primary` | `isUploadingImage` (state) |
| **Onglets navigation** | `button` (x3) | `Profile.tsx:1010-1046` | `px-4 py-2 rounded-full text-sm font-medium` + état actif | `activeSection` (state) |
| **Card Informations de base** | `Card` | `Profile.tsx:1055` | `bg-white/90 backdrop-blur-sm border-primary-soft/20 shadow-soft rounded-2xl` | `activeSection === 'basic'` |
| **Titre section** | `CardTitle` | `Profile.tsx:1058` | `text-2xl font-bold text-primary` | i18n: `profile.sections.basic.title` |
| **Badge étape** | `div` | `Profile.tsx:1064` | `text-sm text-muted-foreground bg-white/60 px-3 py-1 rounded-full` | Calcul dynamique (1 + features) |
| **Input Prénom** | `Input` | `Profile.tsx:1097` | `h-11 bg-background/30 border-primary-soft/20 focus:border-primary rounded-lg` | `firstName` (state) |
| **Input Nom** | `Input` | `Profile.tsx:1110` | Idem | `lastName` (state) |
| **Input Email (readonly)** | `Input` | `Profile.tsx:1137` | `bg-muted/20 border-primary-soft/20 text-muted-foreground rounded-lg` + `disabled` | `currentUser.email` |
| **Date de naissance (mobile)** | `MobileDatePicker` | `Profile.tsx:1176` | Styles du composant | `birthDate` (state) |
| **Date de naissance (desktop)** | 3x `Select` | `Profile.tsx:1192` | `SelectTrigger` + `SelectContent` | `birthDay`, `birthMonth`, `birthYear` (states) |
| **Input Lieu de naissance** | `Input` | `Profile.tsx:1257` | Idem Input Prénom | `placeOfBirth` (state) |
| **Textarea Bio** | `Textarea` | `Profile.tsx:1287` | `min-h-[100px] bg-background/30 border-primary-soft/20 rounded-lg resize-none` | `bio` (state) |
| **Compteur caractères** | `div.text-xs` | `Profile.tsx:1299` | `text-xs text-muted-foreground text-right` | `bio.length` |
| **PhoneInput** | `PhoneInput` | `Profile.tsx:1322` | Classes custom + CSS `react-phone-number-input/style.css` | `phone` (state) |
| **Bouton sauvegarder section** | `Button` | `Profile.tsx:1387` | `px-6 py-2 rounded-lg text-sm font-medium` + état disabled | `hasSectionChanges('basic')` |
| **Card Adresse** | `Card` | `Profile.tsx:1417` | Idem Card Informations | `activeSection === 'address'` |
| **Input Adresse** | `Input` | `Profile.tsx:1443` | Idem | `addressLine1` (state) |
| **Input Ville** | `Input` | `Profile.tsx:1459` | Idem | `city` (state) |
| **Input Code postal** | `Input` | `Profile.tsx:1478` | Idem | `postalCode` (state) |
| **Select Pays** | `Select` | `Profile.tsx:1494` | `h-11 bg-background/30 border-primary-soft/20 rounded-lg` | `country` (state) |
| **Card Permis** | `Card` | `Profile.tsx:1557` | Idem | `activeSection === 'license'` |
| **Input Numéro permis** | `Input` | `Profile.tsx:1580` | Idem | `driverLicenseNumber` (state) |
| **Upload permis** | `input[type="file"]` + UI custom | `Profile.tsx:1617-1755` | `border-2 border-dashed border-border rounded-lg p-6` | `driverLicenseFile`, `driverLicenseFileName` (states) |
| **Aperçu fichier** | `img` ou PDF icon | `Profile.tsx:1634` | `w-16 h-20 bg-blue-100 rounded-lg` | `currentUser.driverLicenseFilePath` |
| **Date obtention permis** | `MobileDatePicker` ou 3x `Select` | `Profile.tsx:1762` | Idem date naissance | `driverLicenseIssueDate` (state) |
| **Input Catégorie permis** | `Input` | `Profile.tsx:1839` | Idem | `driverLicenseCategory` (state, défaut "B") |
| **Input Date expiration** | `Input[type="date"]` | `Profile.tsx:1863` | Idem | `driverLicenseExpirationDate` (state) |
| **Banner profil incomplet** | `div.bg-gradient-to-r` | `Profile.tsx:1940` | `bg-gradient-to-r from-primary-soft/20 to-primary-soft/10 rounded-2xl p-6` | `calculateProfileCompletion() < 100` |
| **Bouton sauvegarder tout** | `Button` (type="submit") | `Profile.tsx:1956` | `bg-gradient-lagoon text-white hover:opacity-90 shadow-lagoon py-4 px-8 text-lg rounded-xl` | `isLoading` (state) |
| **Modal aperçu permis** | `Dialog` | `Profile.tsx:1983` | `max-w-4xl max-h-[90vh] overflow-auto` | `showImageModal` (state) |

---

## 8. POINTS À REFACTORISER / AMÉLIORER

### 🔴 Critique (Priorité haute)

1. **Fichier monolithique (2049 lignes)**
   - **Problème** : Tout dans un seul composant, difficile à maintenir
   - **Solution** : Découper en sous-composants :
     - `ProfileHero.tsx`
     - `ProfileAvatar.tsx`
     - `ProfileTabs.tsx`
     - `ProfileBasicSection.tsx`
     - `ProfileAddressSection.tsx`
     - `ProfileLicenseSection.tsx`
     - `ProfileCompletionBanner.tsx`

2. **Gestion d'état excessive (30+ useState)**
   - **Problème** : Trop de states individuels, risque d'incohérence
   - **Solution** : Utiliser `useReducer` ou `react-hook-form` avec `useForm`

3. **Duplication de logique de sauvegarde**
   - **Problème** : `handleSubmit` et `saveSection` font presque la même chose
   - **Solution** : Factoriser dans une fonction unique avec paramètre `section?: string`

4. **Validation manuelle**
   - **Problème** : Pas de schéma de validation structuré
   - **Solution** : Intégrer `zod` + `react-hook-form` pour validation type-safe

5. **Gestion d'erreurs globale dupliquée**
   - **Problème** : 2x `useEffect` avec `window.addEventListener('error')` (lignes 747-779 et 782-798)
   - **Solution** : Fusionner en un seul effect

### 🟡 Important (Priorité moyenne)

6. **Calcul de completion non optimisé**
   - **Problème** : Recalculé à chaque render (pas de `useMemo`)
   - **Solution** : `const completion = useMemo(() => calculateProfileCompletion(), [deps])`

7. **Textes hardcodés dans section Permis**
   - **Problème** : Lignes 1564, 1567, 1578, etc. non traduites
   - **Solution** : Ajouter toutes les clés i18n manquantes

8. **Select Pays dupliqué (section Permis)**
   - **Problème** : Lignes 1596-1611 et 1882-1897 (même select)
   - **Solution** : Extraire en composant réutilisable `CountrySelect`

9. **Date picker desktop non localisé**
   - **Problème** : Ligne 1802 `toLocaleDateString('fr-FR')` hardcodé
   - **Solution** : Utiliser la locale i18n active

10. **Pas de debounce sur les inputs**
    - **Problème** : Chaque keystroke déclenche un re-render
    - **Solution** : Ajouter `debounce` sur les inputs texte (sauf si besoin validation temps réel)

### 🟢 Amélioration (Priorité basse)

11. **Accessibilité**
    - Ajouter `aria-label` sur les boutons icon-only
    - Ajouter `aria-describedby` sur les inputs avec helper text
    - Gérer le focus trap dans les modals

12. **Performance**
    - Lazy load `PhoneInput` (code splitting)
    - Optimiser les images avec `loading="lazy"`

13. **UX**
    - Ajouter un indicateur de "modifications non sauvegardées" (toast warning si user quitte)
    - Confirmation avant suppression du permis
    - Preview de l'image avant upload (URL.createObjectURL)

14. **Tests**
    - Aucun test unitaire détecté
    - Ajouter tests pour `calculateProfileCompletion()`, `hasSectionChanges()`, handlers

15. **Documentation**
    - Ajouter JSDoc sur les fonctions complexes
    - Documenter les feature flags et leur impact

---

## 9. COMMANDES UTILES (si disponibles)

```bash
# Recherche globale "profile"
grep -r "profile" src/ --include="*.tsx" --include="*.ts"

# Recherche "Mon Profil"
grep -r "Mon Profil" src/

# Recherche composants Card
find src/components/ui -name "*card*"

# Analyse des imports depuis Profile.tsx
npx madge --circular src/pages/Profile.tsx

# Recherche des clés i18n utilisées
grep -r "profile\." src/pages/Profile.tsx | grep "t("
```

---

## 10. RÉSUMÉ EXÉCUTIF

### Points forts
✅ UI moderne avec shadcn/ui  
✅ i18n intégré (react-i18next)  
✅ Responsive (mobile/desktop)  
✅ Gestion d'erreurs avec toasts  
✅ Feature flags pour sections optionnelles  

### Points faibles
❌ Fichier trop volumineux (2049 lignes)  
❌ Trop de states (30+)  
❌ Pas de validation structurée  
❌ Duplication de code  
❌ Textes hardcodés dans section Permis  

### Recommandations prioritaires
1. **Refactoriser en sous-composants** (réduire à <500 lignes par fichier)
2. **Migrer vers react-hook-form + zod** (validation + gestion état)
3. **Compléter l'i18n** (tous les textes traduits)
4. **Optimiser les performances** (useMemo, code splitting)

---

**Fin du diagnostic**

