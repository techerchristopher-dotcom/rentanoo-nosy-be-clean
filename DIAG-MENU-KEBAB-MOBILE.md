# 🔍 DIAGNOSTIC — Menu Kebab Mobile pour User Menu

**Date** : 2025-01-06  
**Objectif** : Comprendre pourquoi le menu utilisateur disparaît en mobile et définir l'implémentation d'un menu kebab (⋮) avec dropdown selon le rôle.

---

## 1) Fichier header + usage

### Composant principal

**Fichier** : `src/components/layout/navbar.tsx`

**Inclusion dans les pages** : Chaque page importe et rend directement `<Navbar />` dans son JSX.

**Exemple** (page Index) :
```18:18:src/pages/Index.tsx
import { Navbar } from "@/components/layout/navbar";
```

**Rendu** : Le composant est rendu directement dans chaque page, pas via un layout global.

**Structure actuelle** :
- Pas de layout wrapper global
- Chaque page gère son propre `<Navbar />` + `<Footer />`
- Le Navbar est donc présent sur toutes les pages qui l'importent

---

## 2) Bloc user desktop + conditions responsive

### Extrait du menu utilisateur desktop

```85:187:src/components/layout/navbar.tsx
          {/* User Menu / Auth + CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {user ? (
              <div className="flex items-center space-x-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 h-auto hover:bg-black/5 focus:outline-none"
                      aria-haspopup="menu"
                      data-testid="user-button"
                    >
                      <UserAvatar size={28} showName={true} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{t('common.utilisateur_connect', 'Utilisateur connecté')}</p>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* Dashboard uniquement pour propriétaires */}
                    {isOwner && (
                      <DropdownMenuItem onClick={() => navigate("/me/dashboard")}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t('common.mon_dashboard', 'Mon Dashboard')}
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      {t('common.modifier_mon_profil', 'Modifier mon profil')}
                    </DropdownMenuItem>
                    
                    {/* Mes réservations (locataire) */}
                    <DropdownMenuItem asChild>
                      <Link to="/me/renter/bookings">
                        <User className="mr-2 h-4 w-4" />
                        {t('common.mes_rservations', 'Mes réservations')}
                      </Link>
                    </DropdownMenuItem>

                    {/* Items Owner-only */}
                    {isOwner && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/me/owner/vehicles")}>
                          <Car className="mr-2 h-4 w-4" />
                          {t('common.mes_vhicules', 'Mes véhicules')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/me/owner/bookings")}>
                          <User className="mr-2 h-4 w-4" />
                          {t('common.demandes_de_location', 'Demandes de location')}
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('common.se_dconnecter', 'Se déconnecter')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/auth/login">
                  <Button variant="ghost">{t("nav.login")}</Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="bg-gradient-lagoon hover:opacity-90 shadow-lagoon">
                    Inscription
                  </Button>
                </Link>
              </div>
            )}
            
            {/* CTA - Devenir loueur (désactivé pour les locataires, badge \"Bientôt disponible\") */}
            {canBecomeOwner && (
              <div className="inline-flex flex-col items-center gap-0.5">
                <div className="text-[11px] font-medium text-primary/80">
                  {t('common.comingSoon', 'Bientôt disponible')}
                </div>
                <Button
                  type="button"
                  disabled
                  aria-disabled="true"
                  tabIndex={-1}
                  className="bg-gradient-lagoon text-white shadow-lagoon/70 transition-all duration-300 font-medium opacity-70 cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  ⭐ {t('common.devenir_loueur', 'Devenir loueur')}
                </Button>
              </div>
            )}
          </div>
```

### Conditions d'affichage

1. **Classe responsive** : `hidden md:flex` (ligne 86)
   - **Masqué** sur mobile (< 768px)
   - **Visible** sur desktop (≥ 768px)

2. **Condition utilisateur** : `{user ? ... : ...}` (ligne 90)
   - **Si connecté** : Affiche avatar + dropdown
   - **Si non connecté** : Affiche boutons "Connexion" + "Inscription"

3. **Condition rôle** : `isOwner` (lignes 111, 132)
   - Affiche des items supplémentaires si l'utilisateur est propriétaire

4. **Condition CTA** : `canBecomeOwner` (ligne 167)
   - Affiche le bouton "Devenir loueur" si l'utilisateur est locataire mais pas propriétaire

---

## 3) Cause disparition mobile

### Cause exacte

**Ligne 86** : `className="hidden md:flex items-center space-x-4"`

Le menu utilisateur est dans un conteneur avec `hidden md:flex`, ce qui signifie :
- **Mobile (< 768px)** : `hidden` → **masqué**
- **Desktop (≥ 768px)** : `md:flex` → **visible**

### Historique

1. **Avant les modifications** : Le menu mobile (burger) contenait les liens de navigation + les actions utilisateur dans un drawer
2. **Après masquage du menu nav** : Le menu mobile a été complètement supprimé (lignes 252-365 supprimées)
3. **Résultat actuel** : 
   - Desktop : Menu utilisateur visible (avatar + dropdown)
   - Mobile : **Aucun menu utilisateur** (tout est masqué)

### Lignes responsables

- **Ligne 86** : `hidden md:flex` → masque tout le bloc utilisateur en mobile
- **Lignes 252-365** : Menu mobile supprimé (n'existe plus dans le code)

### Conclusion

Le menu utilisateur n'a **jamais été prévu pour mobile** dans l'architecture actuelle. Il était uniquement dans le menu burger qui a été supprimé. Il faut donc créer un nouveau bloc mobile dédié.

---

## 4) Liste items dropdown + conditions par rôle

### Tableau des items

| Item | Route | Condition | Où défini | i18n |
|------|-------|-----------|-----------|------|
| **Identité** |
| Email utilisateur | - | `user` | Ligne 105 | - |
| Statut "Utilisateur connecté" | - | `user` | Ligne 106 | `common.utilisateur_connect` |
| **Navigation Owner** |
| Mon Dashboard | `/me/dashboard` | `isOwner` | Ligne 112 | `common.mon_dashboard` |
| Mes véhicules | `/me/owner/vehicles` | `isOwner` | Ligne 134 | `common.mes_vhicules` |
| Demandes de location | `/me/owner/bookings` | `isOwner` | Ligne 138 | `common.demandes_de_location` |
| **Navigation Renter** |
| Mes réservations | `/me/renter/bookings` | Toujours (si connecté) | Ligne 125 | `common.mes_rservations` |
| **Actions communes** |
| Modifier mon profil | `/profile` | `user` | Ligne 118 | `common.modifier_mon_profil` |
| Se déconnecter | `/` (après logout) | `user` | Ligne 146 | `common.se_dconnecter` |
| **Auth (non connecté)** |
| Se connecter | `/auth/login` | `!user` | Ligne 156 | `nav.login` |
| Inscription | `/auth/register` | `!user` | Ligne 159 | - (hardcodé) |
| **CTA spécial** |
| Devenir loueur | - (disabled) | `canBecomeOwner` | Ligne 172 | `common.devenir_loueur` |

### Logique de rôle

**Variables** (lignes 65-69) :
```typescript
const isOwner = !!userProfile && userProfile.roles.includes("owner");
const isRenter = !!userProfile && userProfile.roles.includes("renter");
const canBecomeOwner = isRenter && !isOwner;
```

**Source** : `userProfile` chargé via `ProfileService.getCurrentUserProfile()` (lignes 30-53)

**Structure** : `userProfile.roles` est un tableau de strings contenant `["owner"]`, `["renter"]`, ou les deux.

---

## 5) Composant dropdown recommandé

### Composant existant

**Fichier** : `src/components/ui/dropdown-menu.tsx`

**Base** : Radix UI (`@radix-ui/react-dropdown-menu`)

**Composants disponibles** :
- `DropdownMenu` (Root)
- `DropdownMenuTrigger` (Bouton déclencheur)
- `DropdownMenuContent` (Contenu du dropdown)
- `DropdownMenuItem` (Item cliquable)
- `DropdownMenuSeparator` (Séparateur)
- `DropdownMenuLabel` (Label optionnel)

### Exemple d'usage existant

**Fichier** : `src/components/BookingMoreActionsMenu.tsx` (lignes 52-85)

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Plus d'actions">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleAction}>
      <FileText className="h-4 w-4 mr-2" />
      Action
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Props importantes

- **`align="end"`** : Aligne le dropdown à droite du trigger (recommandé pour header)
- **`sideOffset={4}`** : Espacement par défaut (peut être surchargé)
- **`asChild`** sur Trigger : Permet d'utiliser un composant custom comme trigger
- **`z-50`** : Z-index déjà géré dans `DropdownMenuContent`

### Icône kebab recommandée

**Import** : `MoreVertical` de `lucide-react` (déjà utilisé dans `BookingMoreActionsMenu.tsx`)

**Usage** : `<MoreVertical className="h-5 w-5" />` (taille adaptée pour mobile)

---

## 6) Plan d'implémentation (sans code)

### Architecture proposée

#### A) Placement du bouton kebab

**Où** : Dans le header, à droite, même zone que le menu utilisateur desktop

**Structure** :
```
[Logo]                    [Kebab Mobile] [User Desktop]
```

**Condition responsive** :
- Desktop (`md:flex`) : Afficher le menu utilisateur actuel (avatar + dropdown)
- Mobile (`md:hidden`) : Afficher le bouton kebab (⋮)

#### B) Structure du dropdown mobile

**Trigger** : Bouton avec icône `MoreVertical` (⋮)

**Contenu** (identique au dropdown desktop) :

1. **En-tête** (si connecté) :
   - Avatar (petit, 24px)
   - Email utilisateur
   - Statut "Utilisateur connecté"

2. **Séparateur**

3. **Navigation selon rôle** :
   - **Owner** : Dashboard, Mes véhicules, Demandes de location
   - **Renter** : Mes réservations
   - **Commun** : Modifier mon profil

4. **Séparateur**

5. **Actions** :
   - Se déconnecter (rouge/destructive)

**Si non connecté** :
- Bouton "Se connecter"
- Bouton "Inscription"

#### C) Gestion du Language Switcher mobile

**Option 1** : Dans le dropdown kebab (ajouter une section "Langue")
**Option 2** : Séparé, petit bouton drapeau à côté du kebab
**Option 3** : Omettre en mobile (moins prioritaire)

**Recommandation** : **Option 1** — Intégrer dans le dropdown pour garder le header minimal.

#### D) Conditions d'affichage

**Bouton kebab** :
- `md:hidden` : Visible uniquement sur mobile
- Toujours visible (même si non connecté, pour afficher "Se connecter")

**Dropdown** :
- Même logique que desktop : `isOwner`, `isRenter`, `user`, etc.

#### E) Positionnement CSS

**Header actuel** : `justify-between` (logo gauche, menu droite)

**Mobile** :
- Logo : `flex-1` ou `flex-shrink-0`
- Kebab : `flex-shrink-0` à droite
- Pas de problème d'alignement (même structure que desktop)

#### F) Accessibilité

- **`aria-label="Menu utilisateur"`** sur le bouton kebab
- **`aria-haspopup="menu"`** (déjà géré par Radix)
- **Focus** : Géré automatiquement par Radix
- **Fermeture** : Automatique au clic extérieur (Radix)

---

## 7) Risques & checklist

### Risques identifiés

#### CSS / Layout

1. **Z-index** : 
   - ✅ **Sûr** : `DropdownMenuContent` a déjà `z-50` (ligne 64 de `dropdown-menu.tsx`)
   - ⚠️ **Vérifier** : Le header a `z-50` (ligne 73), le dropdown aussi → pas de conflit

2. **Overflow hidden** :
   - ⚠️ **Risque** : Si un parent a `overflow-hidden`, le dropdown peut être coupé
   - ✅ **Solution** : Radix utilise un Portal (ligne 59 de `dropdown-menu.tsx`), donc le dropdown est rendu en dehors du DOM parent → **pas de problème**

3. **Fixed header** :
   - ✅ **Sûr** : Le header a `sticky top-0` (ligne 73), le dropdown s'adapte automatiquement

#### Accessibilité

1. **Focus** :
   - ✅ **Géré par Radix** : Navigation clavier automatique
   - ✅ **Focus trap** : Radix gère le focus dans le dropdown

2. **Fermeture** :
   - ✅ **Clic extérieur** : Géré par Radix
   - ✅ **Escape** : Géré par Radix
   - ✅ **Tab** : Fermeture automatique si focus sort

3. **Screen reader** :
   - ⚠️ **À ajouter** : `aria-label` sur le bouton kebab
   - ✅ **Items** : Les `DropdownMenuItem` sont déjà accessibles

#### Responsive

1. **Desktop** :
   - ✅ **Pas de conflit** : Le kebab est `md:hidden`, le menu desktop est `hidden md:flex` → **jamais affichés en même temps**

2. **Mobile** :
   - ✅ **Taille** : Le dropdown s'adapte automatiquement (largeur min 8rem, max selon contenu)
   - ⚠️ **Scroll** : Si beaucoup d'items, le dropdown scroll automatiquement (géré par Radix)

### Checklist de tests

#### ✅ Desktop (≥ 768px)

- [ ] Le menu utilisateur desktop (avatar + dropdown) est visible
- [ ] Le bouton kebab **n'apparaît pas** (`md:hidden`)
- [ ] Le dropdown desktop fonctionne (ouvre/ferme, navigation clavier)
- [ ] Les items selon rôle s'affichent correctement (owner vs renter)

#### ✅ Mobile (< 768px)

- [ ] Le menu utilisateur desktop **n'apparaît pas** (`hidden md:flex`)
- [ ] Le bouton kebab (⋮) est visible à droite du header
- [ ] Le bouton kebab est cliquable et ouvre le dropdown
- [ ] Le dropdown s'affiche correctement (aligné à droite, pas coupé)
- [ ] Les items s'affichent selon le rôle (owner vs renter vs non connecté)
- [ ] La navigation fonctionne (clic sur items → navigation vers la route)
- [ ] Le dropdown se ferme au clic extérieur
- [ ] Le dropdown se ferme avec Escape
- [ ] La navigation clavier fonctionne (Tab, Enter, Escape)

#### ✅ Accessibilité

- [ ] Le bouton kebab a un `aria-label` descriptif
- [ ] Le focus est visible sur le bouton kebab
- [ ] Le focus est visible dans le dropdown (items)
- [ ] Un screen reader annonce correctement le menu et les items
- [ ] La navigation clavier fonctionne (Tab pour ouvrir, flèches pour naviguer, Enter pour sélectionner)

#### ✅ États utilisateur

- [ ] **Non connecté** : Affiche "Se connecter" + "Inscription"
- [ ] **Renter** : Affiche "Mes réservations" + "Modifier mon profil" + "Se déconnecter"
- [ ] **Owner** : Affiche "Dashboard" + "Mes véhicules" + "Demandes de location" + "Mes réservations" + "Modifier mon profil" + "Se déconnecter"
- [ ] **Owner + Renter** : Affiche tous les items owner + renter

#### ✅ Layout / CSS

- [ ] Le header reste aligné (logo gauche, kebab droite)
- [ ] Pas d'espace vide bizarre
- [ ] Le dropdown ne dépasse pas de l'écran (mobile)
- [ ] Le dropdown s'adapte si beaucoup d'items (scroll interne)
- [ ] Le z-index est correct (dropdown au-dessus du contenu)

#### ✅ Fonctionnalités

- [ ] Le Language Switcher est accessible (si intégré dans le dropdown)
- [ ] La déconnexion fonctionne
- [ ] La navigation vers les routes fonctionne
- [ ] Le CTA "Devenir loueur" s'affiche si `canBecomeOwner` (désactivé)

---

## Résumé exécutif

### Où c'est rendu
- **Fichier** : `src/components/layout/navbar.tsx`
- **Usage** : Importé directement dans chaque page (pas de layout global)

### Bloc user desktop
- **Lignes** : 85-187
- **Classe responsive** : `hidden md:flex` → masqué en mobile
- **Conditions** : `user`, `isOwner`, `isRenter`, `canBecomeOwner`

### Cause disparition mobile
- **Ligne 86** : `hidden md:flex` masque tout le bloc utilisateur en mobile
- **Menu mobile supprimé** : Les actions utilisateur étaient dans le menu burger (lignes 252-365 supprimées)

### Items dropdown
- **8-10 items** selon le rôle (owner/renter/non connecté)
- **Logique** : `userProfile.roles.includes("owner")` / `includes("renter")`

### Composant dropdown
- **Recommandé** : `DropdownMenu` de `@/components/ui/dropdown-menu` (Radix UI)
- **Exemple** : `BookingMoreActionsMenu.tsx` (lignes 52-85)
- **Icône** : `MoreVertical` de `lucide-react`

### Plan d'implémentation
- **Bouton kebab** : `md:hidden` à droite du header
- **Dropdown** : Même structure que desktop, avec conditions de rôle
- **Language Switcher** : Optionnel, intégré dans le dropdown ou séparé

### Risques
- **Z-index** : ✅ Sûr (dropdown en Portal, z-50)
- **Overflow** : ✅ Sûr (Portal)
- **Responsive** : ✅ Sûr (conditions `md:hidden` / `hidden md:flex`)

---

**Conclusion** : L'implémentation d'un menu kebab mobile est **sûre et simple**. Le composant `DropdownMenu` existe déjà, la logique de rôle est en place, et l'architecture responsive permet d'ajouter un bloc mobile sans conflit avec le desktop.

