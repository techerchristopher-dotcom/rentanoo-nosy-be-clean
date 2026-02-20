# LocationDropdown Component

Un composant réutilisable pour sélectionner un lieu de prise en charge à Nosy Be avec autocomplétion et icônes spécifiques.

## Utilisation

```tsx
import { LocationDropdown } from '@/components/ui/location-dropdown';

function MyComponent() {
  const [location, setLocation] = useState('');

  return (
    <LocationDropdown
      value={location}
      onChange={setLocation}
      placeholder="Sélectionnez votre lieu de prise en charge"
      showResetButton={true}
      onReset={() => setLocation('')}
      onEnter={() => console.log('Recherche lancée')}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | **Requis.** La valeur actuelle du lieu sélectionné |
| `onChange` | `(location: string) => void` | - | **Requis.** Fonction appelée quand la valeur change |
| `placeholder` | `string` | `"Sélectionnez votre lieu de prise en charge"` | Texte d'aide affiché dans le champ |
| `className` | `string` | - | Classes CSS additionnelles |
| `disabled` | `boolean` | `false` | Désactive le composant |
| `showResetButton` | `boolean` | `false` | Affiche le bouton de réinitialisation |
| `onReset` | `() => void` | - | Fonction appelée lors de la réinitialisation |
| `onEnter` | `() => void` | - | Fonction appelée quand la touche Entrée est pressée |

## Fonctionnalités

- ✅ **Autocomplétion** : Filtrage intelligent des villes de Nosy Be
- ✅ **Icônes spécifiques** : 
  - ✈️ Avion pour "Aéroport"
  - 🚢 Bateau pour "Barge Petite Terre" et "Barge Grande Terre"
  - 📍 Épingle de carte pour les autres lieux
- ✅ **Navigation clavier** : Flèches haut/bas, Entrée, Échap
- ✅ **Liste complète** : Bouton pour voir toutes les villes
- ✅ **Réinitialisation** : Bouton pour effacer la sélection
- ✅ **Responsive** : S'adapte aux différentes tailles d'écran
- ✅ **Animations** : Transitions fluides et effets visuels

## Liste des lieux disponibles

Le composant inclut automatiquement toutes les villes de Nosy Be :

- Aéroport ✈️
- Barge Petite Terre 🚢
- Barge Grande Terre 🚢
- Acoua 📍
- Bandraboua 📍
- Bandrele 📍
- Bouéni 📍
- Chiconi 📍
- Chirongui 📍
- Dembéni 📍
- Dzaoudzi 📍
- Hauts Vallons 📍
- Kani-Kéli 📍
- Kavani 📍
- Koungou 📍
- M'Tsangamouji 📍
- Hell-Ville 📍
- Mtsamboro 📍
- Ouangani 📍
- Pamandzi 📍
- Passamainty 📍
- Sada 📍
- Tsingoni 📍
- Tsoundzou 📍
- Vahibé 📍

## Ajout de nouveaux lieux

Pour ajouter de nouveaux lieux, modifiez le fichier `src/data/locations.ts` :

```typescript
export const NOSYBE_CITIES = [
  // ... lieux existants
  "Nouveau Lieu",
];

// Pour ajouter une icône spécifique
export const getLocationIcon = (city: string) => {
  switch (city) {
    case "Aéroport":
      return Plane;
    case "Barge Petite Terre":
    case "Barge Grande Terre":
      return Ship;
    case "Nouveau Lieu":
      return NouvelleIcone; // Importez l'icône depuis lucide-react
    default:
      return MapPin;
  }
};
```
