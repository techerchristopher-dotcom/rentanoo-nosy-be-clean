# 🔍 DIAGNOSTIC — Menu Header Navigation

**Date** : 2025-01-06  
**Objectif** : Analyser où et comment le menu de navigation du header est rendu, et évaluer les risques de masquage côté UI.

---

## 1) Où c'est rendu (fichiers + extrait)

### Composant principal

**Fichier** : `src/components/layout/navbar.tsx`

**Lignes** : 86-133 (menu desktop) + 252-363 (menu mobile)

### Extrait du menu desktop

```78:133:src/components/layout/navbar.tsx
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src="/brand/rentanoo-logo.svg" 
              alt="Rentanoo" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary transition-colors"
            >
              {t("nav.home")}
            </Link>
            <Link 
              to="/dictionary" 
              className="text-foreground hover:text-primary transition-colors"
            >
              {t("nav.dictionary")}
            </Link>
            {user ? (
              <>
                {/* Lien Mes réservations pour locataire */}
                {isRenter && (
                  <Link 
                    to="/me/renter/bookings" 
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Mes réservations
                  </Link>
                )}
                
                {/* Lien Demandes de location pour propriétaire */}
                {isOwner && (
                  <Link 
                    to="/me/owner/bookings" 
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Demandes de location
                  </Link>
                )}
                
                {/* Lien Mes véhicules pour propriétaire */}
                {isOwner && (
                  <Link 
                    to="/me/owner/vehicles" 
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Mes véhicules
                  </Link>
                )}
              </>
            ) : null}
          </nav>
```

### Extrait du menu mobile

```252:270:src/components/layout/navbar.tsx
        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {/* Mobile Navigation Links */}
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t("nav.home")}
              </Link>
              <Link 
                to="/dictionary" 
                className="text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t("nav.dictionary")}
              </Link>
```

**Note** : Le menu mobile utilise le même composant `Navbar`, mais avec un état `isOpen` qui contrôle l'affichage via `{isOpen && ...}`.

---

## 2) D'où viennent les liens et leurs labels

### Source des labels

#### Liens traduits (i18n)
- **"Accueil"** : `t("nav.home")` → clé i18n dans `src/i18n/locales/*/common.json`
- **"Dictionnaire"** : `t("nav.dictionary")` → clé i18n dans `src/i18n/locales/*/common.json`

#### Liens hardcodés (texte brut)
- **"Mes réservations"** : Texte hardcodé ligne 108
- **"Demandes de location"** : Texte hardcodé ligne 118
- **"Mes véhicules"** : Texte hardcodé ligne 128

### Conditions d'affichage

Les liens sont conditionnels selon :

1. **`user`** (ligne 100) : Affiche les liens privés uniquement si l'utilisateur est connecté
2. **`isRenter`** (ligne 103) : Affiche "Mes réservations" uniquement si l'utilisateur a le rôle `renter`
3. **`isOwner`** (lignes 113, 123) : Affiche "Demandes de location" et "Mes véhicules" uniquement si l'utilisateur a le rôle `owner`

### Calcul des rôles

```65:70:src/components/layout/navbar.tsx
  // Vérifier les rôles de l'utilisateur
  const isOwner = !!userProfile && userProfile.roles.includes("owner");
  const isRenter = !!userProfile && userProfile.roles.includes("renter");

  // Vérifier si l'utilisateur est un locataire (peut devenir loueur)
  const canBecomeOwner = isRenter && !isOwner;
```

**Source** : `userProfile` est chargé via `ProfileService.getCurrentUserProfile()` (lignes 30-54).

### Structure

- **Pas de config centralisée** : Les liens sont hardcodés directement dans le JSX
- **Pas de tableau de routes** : Chaque lien est un composant `<Link>` individuel
- **Pas de highlight de route active** : Aucun `NavLink` ou logique `useLocation()` pour mettre en évidence la page courante

---

## 3) Rôle fonctionnel du menu (risques si on masque)

### Comportements associés

#### Navigation pure
- **Desktop** : Liens `<Link to="...">` vers les routes React Router
- **Mobile** : Même navigation + `onClick={() => setIsOpen(false)}` pour fermer le menu burger

#### Gestion du responsive
- **Desktop** : `<nav className="hidden md:flex ...">` → masqué sur mobile, visible sur desktop
- **Mobile** : `<div className="md:hidden ...">` → visible uniquement sur mobile quand `isOpen === true`

#### Layout et espacement
- **Desktop** : `space-x-6` entre les liens
- **Position** : Entre le logo (gauche) et le menu utilisateur (droite)
- **Flexbox** : `justify-between` sur le conteneur parent (ligne 76) → le menu prend l'espace disponible au centre

#### Pas de comportements avancés
- ❌ **Pas de highlight de route active** : Aucun `NavLink` ou logique pour mettre en évidence la page courante
- ❌ **Pas de guards/permissions côté front** : Les permissions sont gérées par les conditions `isOwner`/`isRenter`, mais pas de redirection forcée
- ❌ **Pas de tests e2e ciblés** : Aucun `data-testid` sur les liens de navigation (seul `data-testid="user-button"` existe ligne 148)

### Dépendances

**Aucune dépendance externe** : Le menu est autonome dans `Navbar`. Aucun autre composant ne dépend de sa structure.

**Cependant** :
- Le menu mobile partage le même état `isOpen` que le bouton burger (ligne 241)
- Si on masque le menu desktop, il faut vérifier que le menu mobile reste fonctionnel

---

## 4) Options pour masquer sur `/me/owner/*` (A/B/C/D + recommandation)

### Option A : Condition selon la route (`useLocation().pathname`)

**Implémentation** :
```tsx
import { useLocation } from "react-router-dom";

const location = useLocation();
const isOwnerRoute = location.pathname.startsWith('/me/owner');

// Dans le JSX
{!isOwnerRoute && (
  <nav className="hidden md:flex items-center space-x-6">
    {/* liens */}
  </nav>
)}
```

**Avantages** :
- ✅ Simple et direct
- ✅ Pas de duplication de code
- ✅ Fonctionne immédiatement

**Inconvénients** :
- ⚠️ Nécessite d'importer `useLocation` dans `Navbar`
- ⚠️ Logique de routing dans le composant UI

**Risque** : **FAIBLE** — C'est la solution la plus simple et la plus maintenable.

---

### Option B : Layout différent pour `/me/*`

**Implémentation** :
Créer un composant `DashboardLayout.tsx` qui n'inclut pas le menu, et l'utiliser dans les routes `/me/*`.

**Avantages** :
- ✅ Séparation claire des responsabilités
- ✅ Permet d'avoir un header différent pour le dashboard

**Inconvénients** :
- ⚠️ Nécessite de modifier toutes les pages `/me/*` pour utiliser le nouveau layout
- ⚠️ Duplication potentielle du header (logo, user menu)
- ⚠️ Risque d'oublier certaines pages

**Risque** : **MOYEN** — Plus de refactoring, mais plus propre architecturalement.

---

### Option C : Flag de config / prop du Layout

**Implémentation** :
```tsx
<Navbar showMainNav={false} />
```

**Avantages** :
- ✅ Flexible
- ✅ Réutilisable

**Inconvénients** :
- ⚠️ Nécessite de passer la prop à chaque page
- ⚠️ Pas de layout global actuellement (chaque page importe `Navbar` individuellement)

**Risque** : **MOYEN** — Nécessite de modifier toutes les pages qui utilisent `Navbar`.

---

### Option D : CSS responsive (masquer sur certaines tailles)

**Implémentation** :
```tsx
<nav className="hidden md:flex lg:hidden items-center space-x-6">
```

**Avantages** :
- ✅ Aucune modification de logique

**Inconvénients** :
- ❌ Ne permet pas de masquer selon la route, seulement selon la taille d'écran
- ❌ Ne répond pas au besoin (masquer sur `/me/owner/*`)

**Risque** : **ÉLEVÉ** — Ne répond pas au besoin.

---

### 🎯 Recommandation : **Option A** (condition selon la route)

**Pourquoi** :
1. **Architecture actuelle** : Chaque page importe `Navbar` individuellement (pas de layout global)
2. **Simplicité** : Une seule condition dans `Navbar`, pas besoin de modifier les pages
3. **Maintenabilité** : La logique est centralisée dans un seul endroit
4. **Flexibilité** : Facile d'ajouter d'autres conditions si besoin

**Code recommandé** :
```tsx
import { useLocation } from "react-router-dom";

export function Navbar() {
  const location = useLocation();
  const hideMainNav = location.pathname.startsWith('/me/owner');
  
  // ...
  
  return (
    <header>
      {/* ... */}
      {!hideMainNav && (
        <nav className="hidden md:flex items-center space-x-6">
          {/* liens */}
        </nav>
      )}
      {/* ... */}
    </header>
  );
}
```

---

## 5) Risques si on masque (CSS vs condition vs layout)

### Option 1 : Masquer via CSS (`hidden`, `display:none`)

**Implémentation** :
```tsx
<nav className="hidden md:flex items-center space-x-6 opacity-0 pointer-events-none">
```

**Risques** :
- ⚠️ **Layout** : L'espace est toujours réservé (le menu prend de la place même s'il est invisible)
- ⚠️ **Accessibilité** : Les liens restent dans le DOM et accessibles au clavier (tab navigation)
- ⚠️ **Focus** : Les utilisateurs peuvent tabuler sur des liens invisibles
- ✅ **Pas de risque de casser le menu mobile** : Le menu mobile est séparé

**Recommandation** : ❌ **Ne pas utiliser** — Problèmes d'accessibilité et d'espace réservé.

---

### Option 2 : Ne pas rendre le JSX (condition)

**Implémentation** :
```tsx
{!hideMainNav && (
  <nav className="hidden md:flex items-center space-x-6">
    {/* liens */}
  </nav>
)}
```

**Risques** :
- ✅ **Layout** : L'espace n'est pas réservé, le menu utilisateur se déplace vers la gauche
- ✅ **Accessibilité** : Les liens ne sont pas dans le DOM, pas de problème de focus
- ✅ **Menu mobile** : Le menu mobile est séparé (lignes 252-363), donc pas de risque de casser
- ⚠️ **Alignement** : Le menu utilisateur (droite) se déplace, mais le logo reste à gauche → layout OK avec `justify-between`

**Recommandation** : ✅ **Recommandé** — C'est la solution la plus propre et la plus sûre.

---

### Option 3 : Layout séparé "Dashboard"

**Implémentation** :
Créer `DashboardLayout.tsx` sans le menu, utiliser dans les routes `/me/owner/*`.

**Risques** :
- ⚠️ **Duplication** : Risque de dupliquer le header (logo, user menu) si mal géré
- ⚠️ **Oubli de pages** : Risque d'oublier certaines pages `/me/owner/*` qui continuent d'utiliser `Navbar`
- ⚠️ **Maintenance** : Deux composants à maintenir (Navbar + DashboardLayout)
- ✅ **Séparation claire** : Si bien fait, séparation claire des responsabilités

**Recommandation** : ⚠️ **Possible mais plus risqué** — Nécessite plus de refactoring et de tests.

---

### 🎯 Recommandation finale : **Option 2** (condition JSX)

**Pourquoi** :
1. **Pas de risque de casser le menu mobile** : Le menu mobile est dans un bloc séparé
2. **Pas de problème d'accessibilité** : Les liens ne sont pas dans le DOM
3. **Layout propre** : L'espace n'est pas réservé, le menu utilisateur se repositionne naturellement
4. **Simple à tester** : Facile de vérifier que le menu disparaît sur `/me/owner/*`

---

## 6) Checklist de validation (avant décision)

### Tests à effectuer après masquage

#### ✅ Desktop (≥768px)
- [ ] Le menu de navigation n'apparaît **pas** sur `/me/owner/*`
- [ ] Le menu de navigation **apparaît** sur `/`, `/dictionary`, `/me/renter/bookings`
- [ ] Le logo reste aligné à gauche
- [ ] Le menu utilisateur (avatar, dropdown) reste aligné à droite
- [ ] L'espace entre logo et menu utilisateur est correct (pas de vide bizarre)

#### ✅ Mobile (<768px)
- [ ] Le bouton burger (☰) fonctionne toujours
- [ ] Le menu mobile s'ouvre et se ferme correctement
- [ ] Les liens du menu mobile fonctionnent (navigation + fermeture du menu)
- [ ] Le menu mobile contient toujours "Accueil", "Dictionnaire", et les liens conditionnels selon le rôle

#### ✅ Navigation alternative
- [ ] Les utilisateurs peuvent toujours accéder aux pages via :
  - Le logo (retour à l'accueil)
  - Le menu utilisateur (dropdown avec "Mes réservations", "Mes véhicules", etc.)
  - Le footer (liens de navigation)
  - URLs directes (bookmarks, liens externes)

#### ✅ Rôles utilisateur
- [ ] **Owner** : Le menu n'apparaît pas sur `/me/owner/*`, mais apparaît sur les autres pages
- [ ] **Renter** : Le menu apparaît normalement (avec "Mes réservations")
- [ ] **Non connecté** : Le menu apparaît normalement (sans liens privés)

#### ✅ Active route / highlight
- [ ] **Note** : Actuellement, il n'y a **pas** de highlight de route active. Si on ajoute cette fonctionnalité plus tard, vérifier qu'elle fonctionne avec le masquage conditionnel.

#### ✅ Accessibilité
- [ ] **Tab navigation** : Sur desktop, tabuler ne passe pas sur des liens invisibles
- [ ] **Screen reader** : Les liens masqués ne sont pas annoncés par les lecteurs d'écran
- [ ] **Focus visible** : Les liens visibles ont un focus visible au clavier

#### ✅ Tests automatisés (si existants)
- [ ] Vérifier que les tests e2e qui cherchent "Accueil" ou "Dictionnaire" fonctionnent toujours sur les pages publiques
- [ ] Vérifier que les tests e2e sur `/me/owner/*` ne cherchent pas ces liens

---

## Résumé exécutif

### Où c'est rendu
- **Fichier** : `src/components/layout/navbar.tsx` (lignes 86-133 desktop, 252-363 mobile)
- **Structure** : Liens hardcodés en JSX avec conditions `user`, `isRenter`, `isOwner`

### D'où viennent les liens
- **Labels** : i18n pour "Accueil"/"Dictionnaire", hardcodés pour les autres
- **Conditions** : Basées sur `user`, `isRenter`, `isOwner` (chargés via `ProfileService`)

### Rôle fonctionnel
- **Navigation pure** : Liens React Router
- **Responsive** : Menu desktop (`hidden md:flex`) + menu mobile séparé
- **Pas de highlight** : Aucune logique de route active
- **Pas de dépendances** : Le menu est autonome

### Recommandation pour masquer
- **Option A** : Condition `useLocation().pathname.startsWith('/me/owner')` dans `Navbar`
- **Implémentation** : `{!hideMainNav && <nav>...</nav>}`

### Risques
- **Option 2 (condition JSX)** : ✅ **Recommandé** — Pas de risque de casser le menu mobile, pas de problème d'accessibilité, layout propre

### Checklist
- 7 points à tester : desktop, mobile, navigation alternative, rôles, accessibilité, tests automatisés

---

**Conclusion** : Le masquage conditionnel du menu sur `/me/owner/*` est **sûr et simple** à implémenter via une condition `useLocation()` dans `Navbar`. Le menu mobile est séparé et ne sera pas affecté.

