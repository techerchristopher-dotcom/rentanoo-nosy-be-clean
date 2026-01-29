# Fix removeChild - Version Minimale (Rollback DOM cleanup)

## ✅ Modifications appliquées

### 1. Rollback du cleanup DOM

**Fichier** : `src/modules/etatDesLieuxDepart/sections/Section1Identification.tsx`

#### ❌ Supprimé :
- `useEffect(() => return cleanup)` avec manipulation DOM
- `document.getElementById('radix-portal-root')`
- `querySelectorAll('[data-radix-select-content]')`
- `setAttribute('data-state', 'closed')`
- `blur()` sur les triggers
- `setTimeout(50)` dans `handleCompleteIdentificationAndGoNext`

#### ✅ Conservé :
- Select contrôlés avec `open={paysEmissionOpen}` et `onOpenChange={setPaysEmissionOpen}`
- Fermeture après sélection dans `onValueChange` : `setPaysEmissionOpen(false)`
- Fermeture avant navigation : `setPaysEmissionOpen(false)` et `setCategoriePermisOpen(false)` (sans setTimeout)

### 2. Diagnostic DEV conservé

**Fichier** : `src/utils/removeChildDiagnostic.ts`
- Monkey-patch `Node.prototype.removeChild` en mode DEV uniquement
- Logs détaillés avec stack trace si erreur `removeChild` invalide

### 3. Wrapper moto avec flags de test

**Fichier** : `src/modules/etatDesLieuxDepartMoto/sections/Section1IdentificationMoto.tsx`
- Flags de test définis (pour usage futur si nécessaire)
- Pour l'instant, utilise directement `Section1Identification` (pas de modification)

## 🧪 Tests à effectuer

### Test 1 : Vérifier que le fix minimal fonctionne

1. Ouvrir le formulaire moto → Step 1
2. Interagir avec les Select :
   - Ouvrir "Pays d'émission"
   - Sélectionner un pays
   - Ouvrir "Catégorie"
   - Sélectionner une catégorie
   - Répéter plusieurs fois
3. **Résultat attendu** : ✅ Aucune erreur `removeChild` dans la console

### Test 2 : Si l'erreur persiste - Utiliser le diagnostic DEV

1. Ouvrir la console du navigateur
2. Interagir avec Step 1 jusqu'à ce que l'erreur apparaisse
3. Chercher le log `[DEV] removeChild invalide`
4. **Copier** :
   - La stack trace complète
   - Les informations sur le parent et child (tagName, id, className)
   - Le fichier/ligne applicatif responsable (pas seulement react-dom)

### Test 3 : Isolation binaire (si nécessaire)

Si l'erreur persiste après le fix minimal, utiliser les flags dans `Section1IdentificationMoto.tsx` :

1. **Test A - Désactiver les Select** :
   ```tsx
   const TEST_FLAGS = {
     DISABLE_SELECTS: true,  // ← Activer
     DISABLE_PHOTO_FIELDS: false,
     DISABLE_DATE_FIELDS: false,
   };
   ```
   - Modifier `Section1Identification.tsx` pour remplacer les Select par des Input texte si `DISABLE_SELECTS`
   - Tester : si l'erreur disparaît → les Select sont responsables

2. **Test B - Désactiver PhotoCaptureField** :
   ```tsx
   const TEST_FLAGS = {
     DISABLE_SELECTS: false,
     DISABLE_PHOTO_FIELDS: true,  // ← Activer
     DISABLE_DATE_FIELDS: false,
   };
   ```
   - Masquer les champs photo dans `Section1Identification.tsx`
   - Tester : si l'erreur disparaît → PhotoCaptureField est responsable

3. **Test C - Désactiver les date pickers** :
   ```tsx
   const TEST_FLAGS = {
     DISABLE_SELECTS: false,
     DISABLE_PHOTO_FIELDS: false,
     DISABLE_DATE_FIELDS: true,  // ← Activer
   };
   ```
   - Remplacer `<Input type="date">` par `<Input type="text">` dans `Section1Identification.tsx`
   - Tester : si l'erreur disparaît → les date pickers sont responsables

## 📝 Code final (fix minimal)

### Section1Identification.tsx - États Select contrôlés uniquement

```tsx
// États pour contrôler l'ouverture des Select (fix removeChild)
// Fix minimal : uniquement contrôle React state, pas de manipulation DOM
const [paysEmissionOpen, setPaysEmissionOpen] = useState(false);
const [categoriePermisOpen, setCategoriePermisOpen] = useState(false);

// Select contrôlé
<Select 
  open={paysEmissionOpen} 
  onOpenChange={setPaysEmissionOpen}
  onValueChange={(value) => {
    field.onChange(value);
    setPaysEmissionOpen(false); // Fermeture après sélection
  }} 
  value={field.value}
>

// Fermeture avant navigation (sans setTimeout)
const handleCompleteIdentificationAndGoNext = async () => {
  setPaysEmissionOpen(false);
  setCategoriePermisOpen(false);
  // ... reste du handler
};
```

## ✅ Validation

- [x] Cleanup DOM supprimé
- [x] setTimeout supprimé
- [x] Select contrôlés conservés
- [x] Diagnostic DEV conservé
- [x] Wrapper moto créé (prêt pour flags si nécessaire)
- [x] Aucune erreur de lint
- [ ] Tests manuels effectués
- [ ] Validation que plus d'erreur `removeChild` ne survient

## 🎯 Prochaines étapes

1. **Tester localement** avec le formulaire moto Step 1
2. **Si l'erreur persiste** :
   - Utiliser le diagnostic DEV pour obtenir la stack trace
   - Utiliser les flags de test pour isoler le composant exact
   - Appliquer un correctif ciblé sur le composant responsable
3. **Si l'erreur disparaît** : ✅ Fix validé, problème résolu

## ⚠️ Important

- **Ne jamais modifier** le composant voiture pour un debug moto
- **Utiliser les flags** uniquement pour isoler le problème
- **Garder le fix minimal** : React state uniquement, pas de manipulation DOM
- **Compatible StrictMode** : tous les correctifs sont strict-safe

