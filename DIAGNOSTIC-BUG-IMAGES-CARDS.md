# 🔍 Diagnostic Bug Images Cards - Production

**Date**: 2026-01-15  
**Problème**: Images ne chargent plus sur la page listing (cards), mais fonctionnent sur VehicleDetails  
**Environnement**: Production Vercel (https://rentanoo.com)

---

## A) CAUSE PRINCIPALE (avec preuves)

**Cause identifiée** : **Conflit entre `srcset` avec URLs optimisées (query params) et handler `onError` qui ne supprime pas le `srcset`**

### Preuves :

1. **Composants concernés** :
   - `src/components/vehicles/vehicle-card.tsx` (lignes 152-174)
   - `src/components/vehicles/moto-vehicle-card.tsx` (lignes 136-159)

2. **Génération d'URLs** :
   - **Cards** : Utilisent `getOptimizedImageUrl(imageUrl, 400)` pour `src` et `generateSrcSet(imageUrl, [400, 800])` pour `srcset`
   - **VehicleDetails** : Utilise `getOptimizedImageUrl(imageUrl, 800)` pour `src` et `generateSrcSet(imageUrl, [800, 1200])` pour `srcset`
   - **Fichier** : `src/utils/imageOptimization.ts` (lignes 23-68)

3. **Handler `onError` problématique** :
   - **Cards** : `handleImageError` (lignes 84-133 dans vehicle-card.tsx, 66-105 dans moto-vehicle-card.tsx)
   - **VehicleDetails** : **PAS de handler `onError`** (ligne 907-917)
   
4. **Comportement observé** :
   ```tsx
   // Cards : srcset présent + onError qui modifie src
   <img
     src={optimizedSrc}  // URL avec ?width=400&height=300&resize=cover&quality=80
     srcSet={srcSet}     // URLs avec query params (400w, 800w)
     onError={handleImageError}  // Modifie img.src mais PAS srcset
   />
   
   // VehicleDetails : srcset présent mais PAS de onError
   <img
     src={optimizedSrc}  // URL avec ?width=800&height=600&resize=cover&quality=80
     srcSet={srcSet}     // URLs avec query params (800w, 1200w)
     // PAS de onError
   />
   ```

5. **Séquence d'erreur probable** :
   - Le navigateur utilise `srcset` et choisit une URL optimisée (ex: `?width=400&height=300&resize=cover&quality=80`)
   - Cette URL échoue (transformations Supabase non configurées ou CORS)
   - Le navigateur déclenche `onError` avec l'URL du `src` (aussi optimisée)
   - Le handler récupère une URL originale (sans query params) via `PhotoService.getVehiclePhotos()`
   - Le handler met cette URL dans `img.src` (ligne 121 dans vehicle-card.tsx)
   - **MAIS** : Le `srcset` est toujours présent avec des URLs optimisées qui échouent
   - Le navigateur peut continuer à essayer les URLs du `srcset` → boucle d'erreur ou image blanche

6. **Différence avec VehicleDetails** :
   - VehicleDetails n'a **PAS de handler `onError`**, donc si les URLs optimisées échouent, l'image reste blanche mais pas de boucle
   - VehicleDetails utilise des tailles différentes (800w, 1200w) qui peuvent fonctionner si les transformations Supabase supportent ces tailles mais pas 400w

---

## B) CAUSES SECONDAIRES POSSIBLES

### H1) URLs optimisées invalides (query params mal formés)
- **Statut** : ❌ **ÉCARTÉ** - Les tests montrent que `getOptimizedImageUrl()` génère des URLs valides
- **Preuve** : Script de test confirme que les URLs sont bien formées, même avec query params existants

### H2) Transformations Supabase non configurées pour 400w/800w
- **Statut** : ⚠️ **POSSIBLE** - Les transformations Supabase peuvent ne pas être configurées pour toutes les tailles
- **Preuve** : VehicleDetails utilise 800w/1200w et fonctionne, cards utilisent 400w/800w et échouent
- **Action** : Vérifier en production si les URLs avec `?width=400` retournent 404 vs `?width=800` qui fonctionne

### H3) Handler `onError` qui crée une boucle
- **Statut** : ✅ **CONFIRMÉ** - Le handler modifie `img.src` mais ne supprime pas `srcset`
- **Preuve** : Ligne 121 dans vehicle-card.tsx : `img.src = firstValidPhoto.url` (URL originale sans query params)
- **Problème** : Le `srcset` reste présent avec des URLs optimisées qui échouent

### H4) Source des URLs différente (DB vs Storage)
- **Statut** : ⚠️ **POSSIBLE** - Index.tsx utilise `photo_url` depuis la DB, VehicleDetails génère depuis Storage
- **Preuve** : 
  - Index.tsx ligne 270 : `url: chosen.photo_url` (depuis table `vehicle_photos`)
  - VehicleDetails ligne 179 : `urlData.publicUrl` (généré depuis Storage)
- **Impact** : Si les URLs dans la DB sont invalides ou malformées, ça expliquerait le problème

### H5) CORS / Headers uniquement sur certaines tailles
- **Statut** : ⚠️ **POSSIBLE** - Les transformations Supabase peuvent avoir des règles CORS différentes
- **Action** : Vérifier les headers CORS en production pour les URLs avec query params

---

## C) FIX MINIMAL RECOMMANDÉ (sans refacto)

### Option 1 : Supprimer `srcset` dans le handler `onError` (RECOMMANDÉ)

**Fichiers à modifier** :
- `src/components/vehicles/vehicle-card.tsx` (ligne 84-133)
- `src/components/vehicles/moto-vehicle-card.tsx` (ligne 66-105)

**Changement** :
```tsx
// AVANT
img.src = firstValidPhoto.url;

// APRÈS
img.src = firstValidPhoto.url;
img.removeAttribute('srcset');  // Supprimer srcset pour forcer l'utilisation de src
```

**Avantages** :
- Fix minimal (1 ligne)
- Force le navigateur à utiliser l'URL originale (sans query params)
- Pas de refacto nécessaire

### Option 2 : Désactiver temporairement `srcset` pour les cards

**Fichiers à modifier** :
- `src/components/vehicles/vehicle-card.tsx` (ligne 155)
- `src/components/vehicles/moto-vehicle-card.tsx` (ligne 139)

**Changement** :
```tsx
// AVANT
const srcSet = isSupabaseUrl ? generateSrcSet(imageUrl, IMAGE_WIDTHS.CARD) : undefined;

// APRÈS
const srcSet = undefined;  // Désactiver temporairement pour éviter les erreurs
```

**Avantages** :
- Fix immédiat (pas de srcset = pas de conflit)
- Garde l'optimisation pour VehicleDetails
- Inconvénient : Perd les bénéfices du responsive images sur les cards

### Option 3 : Vérifier et corriger les URLs dans la DB

**Action** :
- Vérifier que les URLs dans `vehicle_photos.photo_url` sont valides
- Si elles contiennent déjà des query params, les nettoyer
- Si elles sont invalides, les régénérer depuis Storage

**Avantages** :
- Fix à la source
- Inconvénient : Nécessite une migration de données

---

## D) ÉTAPES DE VÉRIFICATION APRÈS FIX

### 1. Vérification locale

```bash
# Build et preview
npm run build
npm run preview

# Ouvrir http://localhost:4173
# Vérifier :
# - Les images des cards se chargent
# - Pas d'erreurs dans la console
# - Les images utilisent bien l'URL originale (sans query params) si srcset supprimé
```

### 2. Vérification en production

1. **Déployer le fix sur Vercel**
2. **Ouvrir https://rentanoo.com**
3. **Vérifier dans DevTools** :
   - Network tab : Vérifier que les images se chargent (status 200)
   - Console : Pas d'erreurs "Erreur de chargement de ressource"
   - Elements : Vérifier que les `<img>` ont bien `src` et pas de `srcset` (si Option 1 appliquée)

4. **Test spécifique** :
   - Ouvrir une card et vérifier que l'image s'affiche
   - Vérifier que le handler `onError` ne se déclenche pas
   - Vérifier que les images utilisent bien l'URL originale (sans query params)

### 3. Vérification des transformations Supabase

**Si Option 1 ou 2 appliquée** :
- Les images devraient utiliser l'URL originale (sans query params)
- Pas besoin de vérifier les transformations

**Si on garde srcset** :
- Tester manuellement une URL avec query params : `https://<project>.supabase.co/storage/v1/object/public/vehicle-photos/...jpg?width=400&height=300&resize=cover&quality=80`
- Vérifier que ça retourne bien une image (status 200) et pas 404/500
- Si 404 : Les transformations ne sont pas configurées → utiliser Option 1 ou 2

---

## RÉSUMÉ

**Cause principale** : Conflit entre `srcset` (URLs optimisées avec query params) et handler `onError` qui ne supprime pas le `srcset`, créant une boucle d'erreur.

**Fix recommandé** : Option 1 - Supprimer `srcset` dans le handler `onError` (1 ligne de code).

**Preuves** :
- Cards ont `srcset` + `onError` → échouent
- VehicleDetails a `srcset` mais PAS `onError` → fonctionne
- Handler modifie `img.src` mais pas `srcset` → conflit

**Fichiers concernés** :
- `src/components/vehicles/vehicle-card.tsx` (ligne 84-133)
- `src/components/vehicles/moto-vehicle-card.tsx` (ligne 66-105)

