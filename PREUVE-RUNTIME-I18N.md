# Preuve Runtime I18N - Instructions de validation

## Modifications effectuées

### 1. Debug complet ajouté dans `BookingConfirmationModal.tsx`

Le panneau debug affiche maintenant :
- `translationTopKeys` : 50 premières clés du namespace `translation`
- `commonTopKeys` : 50 premières clés du namespace `common`
- `bundleTranslationSize` : nombre de clés dans `translation`
- `bundleCommonSize` : nombre de clés dans `common`
- `resourceStoreNs` : namespaces chargés dans le store
- `structureCheck` : vérifications de structure exactes

### 2. Console logs ajoutés

Trois logs sont affichés dans la console :
- `[I18N STRUCTURE CHECK]` : vérifications de structure
- `[I18N BUNDLE TRANSLATION]` : détails du bundle `translation`
- `[I18N BUNDLE COMMON]` : détails du bundle `common`

### 3. Restructuration dans `config.ts`

Les ressources du namespace `translation` sont restructurées pour "déballer" les clés de `common` au niveau racine.

## Instructions de validation

### Étape 1 : Ouvrir la modale en FR

1. Démarrer le serveur : `npm run dev:3012`
2. Naviguer vers une page de véhicule
3. Ouvrir la modale de confirmation de réservation
4. Vérifier que la langue est en FR

### Étape 2 : Copier les logs console

Dans la console du navigateur (F12), copier :
1. Le log `[I18N STRUCTURE CHECK]`
2. Le log `[I18N BUNDLE TRANSLATION]`
3. Le log `[I18N BUNDLE COMMON]`

### Étape 3 : Copier le JSON debug

Dans le panneau debug (en bas de la modale), copier le JSON complet.

### Étape 4 : Vérifications attendues

#### ✅ Si la restructuration fonctionne :

```json
{
  "structureCheck": {
    "hasSearchBarAtRootTranslation": true,
    "hasSearchBarUnderCommonTranslation": false,
    "hasBookingAtRootTranslation": true,
    "hasDurationAtRootTranslation": true,
    "hasSearchBarAtRootCommon": false,
    "hasSearchBarUnderCommonCommon": true,
    "hasBookingAtRootCommon": false,
    "hasDurationAtRootCommon": false
  },
  "exists": {
    "searchBarDeparture": true,
    "searchBarReturn": true
  },
  "tValues": {
    "departure": "Départ",
    "return": "Retour"
  }
}
```

#### ❌ Si la restructuration ne fonctionne pas :

```json
{
  "structureCheck": {
    "hasSearchBarAtRootTranslation": false,
    "hasSearchBarUnderCommonTranslation": true,
    ...
  },
  "exists": {
    "searchBarDeparture": false,
    "commonSearchBarDeparture": true
  },
  "tValues": {
    "departure": "searchBar.departure",
    "commonDeparture": "Départ"
  }
}
```

## Décision après validation

### Si la restructuration fonctionne ✅

- Garder la configuration actuelle
- Les 18 composants utilisant `useTranslation("common")` continuent de fonctionner (car `common: frCommon` est conservé)
- La modale peut utiliser `t("searchBar.departure")` directement

### Si la restructuration ne fonctionne pas ❌

- Rollback vers la stratégie A (voir `ROLLBACK-I18N-STRATEGY-A.md`)
- Changer `defaultNS: "common"` et `ns: ["common"]`
- Modifier la modale pour utiliser `useTranslation("common")` et `t("common.searchBar.departure")`

## Risques identifiés

⚠️ **18 composants utilisent `useTranslation("common")`** :
- VehicleDetails.tsx
- MotoVehicleDetails.tsx
- VehicleOwnerCard.tsx
- Index.tsx
- vehicle-card.tsx
- moto-vehicle-card.tsx
- footer.tsx
- navbar.tsx
- Profile.tsx
- search-bar-airbnb.tsx
- Et 8 autres...

Ces composants **devraient** continuer à fonctionner car `common: frCommon` est conservé dans la config actuelle.

## Output attendu de l'utilisateur

1. JSON debug complet (copié depuis le panneau)
2. Les 3 logs console (`[I18N STRUCTURE CHECK]`, `[I18N BUNDLE TRANSLATION]`, `[I18N BUNDLE COMMON]`)
3. Confirmation si les traductions s'affichent correctement dans la modale

Ensuite, décision : garder ou rollback.

