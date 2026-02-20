# OwnerLocationDropdown Component

Un composant spécialisé pour la sélection de ville lors de l'inscription des loueurs de véhicules. Ce composant exclut certaines villes qui ne sont pas adaptées comme lieu de résidence.

## Différences avec LocationDropdown

- **Villes exclues** : Aéroport, Barge Petite Terre, Barge Grande Terre
- **Design adapté** : Interface plus simple et compacte pour les formulaires
- **Usage spécifique** : Réservé aux formulaires d'inscription des propriétaires de véhicules

## Utilisation

```tsx
import { OwnerLocationDropdown } from '@/components/ui/owner-location-dropdown';

function OwnerRegistrationForm() {
  const [city, setCity] = useState('');

  return (
    <OwnerLocationDropdown
      value={city}
      onChange={setCity}
      placeholder="Sélectionner votre ville"
      className="w-full"
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | **Requis.** La valeur actuelle de la ville sélectionnée |
| `onChange` | `(city: string) => void` | - | **Requis.** Fonction appelée quand la valeur change |
| `placeholder` | `string` | `"Sélectionner votre ville"` | Texte d'aide affiché dans le champ |
| `className` | `string` | - | Classes CSS additionnelles |
| `disabled` | `boolean` | `false` | Désactive le composant |
| `showResetButton` | `boolean` | `false` | Affiche le bouton de réinitialisation |
| `onReset` | `() => void` | - | Fonction appelée lors de la réinitialisation |
| `onEnter` | `() => void` | - | Fonction appelée quand la touche Entrée est pressée |

## Fonctionnalités

- ✅ **Autocomplétion** : Filtrage intelligent des villes de Nosy Be (version filtrée)
- ✅ **Icônes spécifiques** : 
  - 📍 Épingle de carte pour tous les lieux (les icônes avion et bateau sont exclues)
- ✅ **Navigation clavier** : Flèches haut/bas, Entrée, Échap
- ✅ **Liste complète** : Bouton pour voir toutes les villes disponibles
- ✅ **Réinitialisation** : Bouton pour effacer la sélection
- ✅ **Design compact** : Interface adaptée aux formulaires
- ✅ **Animations** : Transitions fluides et effets visuels

## Liste des lieux disponibles

Le composant inclut toutes les villes de Nosy Be **SAUF** :

### ❌ Villes exclues (non adaptées pour résidence de loueurs)
- ✈️ Aéroport (lieu de prise en charge, pas de résidence)
- 🚢 Barge Petite Terre (lieu de transit, pas de résidence)
- 🚢 Barge Grande Terre (lieu de transit, pas de résidence)

### ✅ Villes disponibles (22 villes)
- 📍 Acoua
- 📍 Bandraboua
- 📍 Bandrele
- 📍 Bouéni
- 📍 Chiconi
- 📍 Chirongui
- 📍 Dembéni
- 📍 Dzaoudzi
- 📍 Hauts Vallons
- 📍 Kani-Kéli
- 📍 Kavani
- 📍 Koungou
- 📍 M'Tsangamouji
- 📍 Hell-Ville
- 📍 Mtsamboro
- 📍 Ouangani
- 📍 Pamandzi
- 📍 Passamainty
- 📍 Sada
- 📍 Tsingoni
- 📍 Tsoundzou
- 📍 Vahibé

## Comparaison des composants

| Composant | Usage | Villes | Design |
|-----------|-------|--------|---------|
| `LocationDropdown` | Page d'accueil - recherche | 25 villes (toutes) | Style hero avec animations |
| `OwnerLocationDropdown` | Inscription loueurs | 22 villes (exclut aéroport/barges) | Style formulaire compact |

## Ajout de nouveaux lieux

Pour ajouter de nouveaux lieux disponibles pour les loueurs, modifiez le filtre dans `src/components/ui/owner-location-dropdown.tsx` :

```typescript
// Modifier la liste des villes exclues si nécessaire
const OWNER_NOSYBE_CITIES = NOSYBE_CITIES.filter(city => 
  !["Aéroport", "Barge Petite Terre", "Barge Grande Terre", "NouvelleVilleExclue"].includes(city)
);
```

## Maintenance

- Le composant utilise automatiquement les données de `src/data/locations.ts`
- Les icônes sont gérées par la fonction `getLocationIcon`
- Les modifications de la liste principale se répercutent automatiquement
