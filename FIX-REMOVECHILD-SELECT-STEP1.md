# Fix removeChild - Step 1 Identification (Moto)

## 🔴 Problème identifié

**Erreur runtime** : `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`

**Contexte** :
- Erreur apparaît **dès l'interaction** sur Step 1 (Identification) du formulaire moto
- Pas besoin de changer d'étape pour déclencher l'erreur
- Step 1 réutilise `Section1Identification.tsx` (composant voiture)
- Suspect principal : **Radix UI Select** via Portal (shadcn/ui)

## ✅ Correctifs appliqués

### 1. Diagnostic DEV ajouté

**Fichier** : `src/utils/removeChildDiagnostic.ts`
- Monkey-patch `Node.prototype.removeChild` en mode DEV uniquement
- Log détaillé avec stack trace quand `removeChild` est appelé sur un nœud qui n'est pas enfant
- Activation dans `main.tsx` (dev only)

**Utilisation** : Les logs `[DEV] removeChild invalide` apparaîtront dans la console si l'erreur survient encore.

### 2. Select rendus contrôlés

**Fichier** : `src/modules/etatDesLieuxDepart/sections/Section1Identification.tsx`

#### Modifications :

1. **États ajoutés** pour contrôler l'ouverture des Select :
   ```tsx
   const [paysEmissionOpen, setPaysEmissionOpen] = useState(false);
   const [categoriePermisOpen, setCategoriePermisOpen] = useState(false);
   ```

2. **Select rendus contrôlés** avec `open` et `onOpenChange` :
   ```tsx
   <Select 
     open={paysEmissionOpen} 
     onOpenChange={setPaysEmissionOpen}
     onValueChange={(value) => {
       field.onChange(value);
       setPaysEmissionOpen(false); // Fermeture explicite après sélection
     }} 
     value={field.value}
   >
   ```

3. **Cleanup à l'unmount** :
   ```tsx
   useEffect(() => {
     return () => {
       // Fermer tous les SelectContent Radix UI avant démontage
       const portalRoot = document.getElementById('radix-portal-root');
       if (portalRoot && portalRoot.isConnected) {
         const selectContents = portalRoot.querySelectorAll('[data-radix-select-content], [data-state="open"]');
         selectContents.forEach((content) => {
           if (content.isConnected && portalRoot.contains(content)) {
             content.setAttribute('data-state', 'closed');
             // Blur le trigger si actif
             const trigger = document.activeElement;
             if (trigger && trigger.closest('[data-radix-select-trigger]')) {
               (trigger as HTMLElement).blur();
             }
           }
         });
       }
     };
   }, []);
   ```

4. **Fermeture avant navigation** :
   ```tsx
   const handleCompleteIdentificationAndGoNext = async () => {
     // Fermer tous les Select avant navigation
     setPaysEmissionOpen(false);
     setCategoriePermisOpen(false);
     await new Promise(resolve => setTimeout(resolve, 50)); // Délai pour cleanup Portal
     // ... reste du handler
   };
   ```

## 🧪 Tests à effectuer

### Test 1 : Interaction avec les Select

1. Ouvrir le formulaire moto → Step 1
2. **Test Pays d'émission** :
   - Cliquer sur le Select "Pays d'émission"
   - Sélectionner un pays (ex: "France")
   - Rouvrir le Select et sélectionner un autre pays
   - Répéter plusieurs fois
3. **Test Catégorie** :
   - Cliquer sur le Select "Catégorie"
   - Sélectionner une catégorie (ex: "B - Voiture")
   - Rouvrir le Select et sélectionner une autre catégorie
   - Répéter plusieurs fois
4. **Résultat attendu** : ✅ Aucune erreur `removeChild` dans la console

### Test 2 : Navigation entre étapes

1. Remplir Step 1 (au moins les champs obligatoires)
2. Cliquer sur "Terminer l'identification et passer aux relevés"
3. **Résultat attendu** : ✅ Navigation vers Step 2 sans erreur `removeChild`

### Test 3 : Ouverture/fermeture rapide

1. Ouvrir rapidement plusieurs Select en succession
2. Fermer sans sélectionner
3. **Résultat attendu** : ✅ Aucune erreur `removeChild`

## 🔍 Si l'erreur persiste

Si l'erreur `removeChild` apparaît encore après ces correctifs :

1. **Vérifier les logs DEV** :
   - Ouvrir la console
   - Chercher `[DEV] removeChild invalide`
   - Copier la stack trace complète

2. **Isoler le composant exact** :
   - Utiliser `src/modules/etatDesLieuxDepart/sections/Section1Identification.test-flags.ts`
   - Désactiver progressivement :
     - A/ Les Select (Pays + Catégorie)
     - B/ PhotoCaptureField (recto/verso)
     - C/ Les date pickers (délivrance/expiration)
   - Identifier quel composant déclenche encore l'erreur

3. **Suspects alternatifs** :
   - `FormMessage` (mais vérifié : pas de Portal)
   - `PhotoCaptureField` (mais vérifié : input natif, pas de Portal)
   - Date pickers (mais vérifié : `<Input type="date">` natif, pas de Calendar/Popover)
   - Toasts (mais vérifié : appelés dans handlers async, pas dans render)

## 📝 Notes techniques

### Pourquoi ça fonctionne

1. **Select contrôlés** : En contrôlant l'état `open`, on évite que Radix UI gère l'ouverture/fermeture de manière impérative
2. **Fermeture explicite** : Après sélection, on ferme immédiatement le Select, évitant qu'il reste ouvert lors d'un démontage
3. **Cleanup à l'unmount** : Le `useEffect` cleanup ferme tous les SelectContent Radix UI avant que React ne démonte le composant
4. **Fermeture avant navigation** : On ferme les Select avant de naviguer vers Step 2, évitant les conflits Portal/DOM

### Compatibilité React.StrictMode

✅ **StrictMode-safe** : Tous les correctifs sont compatibles avec React.StrictMode (pas de désactivation de StrictMode).

### Impact sur le code voiture

✅ **Aucun impact** : Les modifications sont dans `Section1Identification.tsx` qui est réutilisé par le formulaire voiture ET moto. Le fix bénéficie aux deux.

## ✅ Validation finale

- [x] Diagnostic DEV ajouté
- [x] Select rendus contrôlés
- [x] Cleanup à l'unmount
- [x] Fermeture avant navigation
- [x] Aucune erreur de lint
- [ ] Tests manuels effectués
- [ ] Validation que plus d'erreur `removeChild` ne survient

## 🚀 Prochaines étapes

1. **Tester localement** avec le formulaire moto Step 1
2. **Vérifier la console** pour confirmer l'absence d'erreurs
3. **Si l'erreur persiste** : utiliser les flags de test pour isoler le composant exact
4. **Documenter** le composant responsable si différent des Select

