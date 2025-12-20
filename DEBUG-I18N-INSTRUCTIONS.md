# 🔍 INSTRUCTIONS DEBUG I18N — MODALE + formatDuration

## ✅ Debug ajouté (DEV-only)

Deux points de debug ont été ajoutés :

### 1. Panneau debug visuel dans la modale
**Fichier** : `src/components/booking/BookingConfirmationModal.tsx`

Le panneau apparaît **en bas de la modale** quand elle est ouverte en mode développement.

### 2. Logs console dans formatDuration
**Fichier** : `src/utils/formatDuration.ts`

Les logs apparaissent dans la **console du navigateur** à chaque appel de `formatDuration()`.

---

## 📋 Instructions de test

### Étape 1 : Ouvrir la modale en développement

1. Lancer l'app en mode développement (`npm run dev` ou équivalent)
2. Ouvrir la console du navigateur (F12 → Console)
3. Naviguer jusqu'à ouvrir la modale de confirmation de réservation
4. **Observer** :
   - Le panneau debug **en bas de la modale** (fond noir, texte vert)
   - Les logs dans la console `[formatDuration DEBUG]`

### Étape 2 : Tester chaque langue

Pour chaque langue (FR, EN, IT, DE) :

1. **Changer la langue** de l'application
2. **Ouvrir/fermer puis rouvrir la modale** (pour recharger)
3. **Copier** :
   - Le contenu JSON du **panneau debug** (section complète)
   - Une ligne du log **console** `[formatDuration DEBUG]`

---

## 📊 Données à remonter

Pour chaque langue (FR, EN, IT, DE), envoyer :

### A) Panneau debug (copier le JSON complet)

```json
{
  "component": "BookingConfirmationModal",
  "lang": "...",
  "namespaces": [...],
  "defaultNS": "...",
  "exists": {
    "searchBarDeparture": true/false,
    "searchBarReturn": true/false,
    "durationDay": true/false,
    "durationDayOne": true/false,
    "durationDayOther": true/false,
    "durationHour": true/false,
    "durationHourOne": true/false,
    "durationHourOther": true/false,
    "durationSeparator": true/false
  },
  "tValues": {
    "departure": "...",
    "return": "...",
    "durationDayCount1": "...",
    "durationDayCount4": "...",
    "durationHourCount1": "...",
    "durationHourCount6": "...",
    "separator": "..."
  }
}
```

### B) Console log formatDuration (une ligne)

```
[formatDuration DEBUG] { days: X, hours: Y, dayExists: true/false, hourExists: true/false, sepExists: true/false, dayValue: "...", hourValue: "...", sepValue: "..." }
```

---

## 🔍 Interprétation rapide

### Si `exists: false` pour une clé
→ La clé n'existe pas dans le JSON chargé (problème de structure JSON ou namespace)

### Si `exists: true` mais `tValues` = clé brute (ex: "duration.day")
→ i18next trouve la clé mais ne peut pas la résoudre (problème de pluralisation ou format)

### Si `lang` ≠ langue attendue
→ Problème de détection de langue

### Si `namespaces` ne contient pas "common"
→ Problème de configuration namespace

---

## ⚠️ Important

**Ne pas modifier les JSON ou le code** tant que les résultats du debug ne sont pas analysés.

Le debug est **DEV-only** et ne sera pas inclus en production.

---

## 📝 Format de remontée

Envoyer les résultats sous cette forme :

```
=== FR ===
Panneau: { JSON complet }
Console: { une ligne }

=== EN ===
Panneau: { JSON complet }
Console: { une ligne }

=== IT ===
Panneau: { JSON complet }
Console: { une ligne }

=== DE ===
Panneau: { JSON complet }
Console: { une ligne }
```

Une fois ces données reçues, on pourra décider :
- Rollback du renommage des clés
- Ajout d'alias dans les JSON
- Correction du problème de namespace/chargement

