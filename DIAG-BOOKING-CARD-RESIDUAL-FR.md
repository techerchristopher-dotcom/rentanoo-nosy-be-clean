# DIAGNOSTIC i18n — Carte de réservation (RenterBookingCard) — Éléments FR résiduels

## Contexte

Page : `/me/renter/bookings`  
Langue active : **Anglais**  
Problème : Éléments non traduits / FR résiduels dans la carte de réservation

---

## 1. Localisation du composant

**Fichier :** `src/components/RenterBookingCard.tsx`  
**Rendu dans :** `src/pages/renter/RenterBookings.tsx` (ligne 857)

---

## 2. Éléments problématiques identifiés

### Tableau de diagnostic

| Élément | Code source | Type | Preuve runtime | Fix minimal recommandé |
|---------|-------------|------|----------------|------------------------|
| **Statut "En attente"** | `src/components/ui/status-badge.tsx:15` | **hardcoded** | `label: "En attente"` (hardcodé dans `statusConfig.pending.label`) | Utiliser `t('bookings.status.pending')` dans StatusBadge |
| **Label "Durée:"** | `src/components/RenterBookingCard.tsx:960` | **hardcoded** | `"Durée:"` (hardcodé, TODO comment présent) | Utiliser `t('bookings.card.durationLabel')` (clé à créer si manquante) |
| **Dates "18 décembre" + "à"** | `src/components/RenterBookingCard.tsx:935,950` | **hardcoded_in_format_string** | `format(date, "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })` - Le "à" est hardcodé dans la string | Utiliser `t('bookings.card.dateTimeSeparator')` ou format conditionnel selon locale |
| **Bouton "common.annuler"** | `src/components/RenterBookingCard.tsx:1261` | **wrong_key_or_namespace** | `t('common.annuler')` mais namespace = `"translation"` | Utiliser `t('annuler')` ou `t('bookings.cancel.confirm')` selon la clé disponible |

---

## 3. Détails par élément

### A) Statut "En attente"

**Code source :**
```typescript
// src/components/ui/status-badge.tsx:15
pending: { 
  color: "bg-[#fef2e1] text-[#d97706]", 
  label: "En attente",  // ← HARDCODÉ
  icon: Clock
}
```

**Utilisation :**
```typescript
// src/components/RenterBookingCard.tsx:788
return <StatusBadge status={booking.status} size="sm" />
```

**Type :** Hardcodé dans le composant `StatusBadge`  
**Preuve :** Le label est directement écrit en français dans `statusConfig`  
**Fix recommandé :** 
- Modifier `StatusBadge` pour utiliser i18n
- Ou créer un mapping dans RenterBookingCard qui utilise `getUserBookingStatusUI()` pour tous les statuts

---

### B) Label "Durée:"

**Code source :**
```typescript
// src/components/RenterBookingCard.tsx:959-960
{/* TODO(i18n): bookings.card.durationLabel */}
<span className="font-medium text-foreground">Durée:</span>
```

**Type :** Hardcodé (TODO présent indiquant qu'il faut i18n)  
**Preuve :** String littérale `"Durée:"` dans le JSX  
**Fix recommandé :**
- Vérifier si `bookings.card.durationLabel` existe dans les JSON
- Si oui : `t('bookings.card.durationLabel')`
- Si non : Créer la clé dans tous les fichiers de locale

---

### C) Dates "18 décembre" + "à"

**Code source :**
```typescript
// src/components/RenterBookingCard.tsx:935
const formatted = format(date, "d MMMM yyyy 'à' HH:mm", { locale: dateLocale })
```

**Locale utilisée :**
```typescript
// src/components/RenterBookingCard.tsx:106-111
const currentLang = i18n.language || "fr"
const dateLocale =
  currentLang.startsWith("fr") ? fr :
  currentLang.startsWith("it") ? itLocale :
  currentLang.startsWith("de") ? deLocale :
  enUS
```

**Type :** Le "à" est hardcodé dans la string de format date-fns  
**Problème :** 
- La locale `dateLocale` est correctement détectée selon `i18n.language`
- MAIS le séparateur "à" est hardcodé dans la string, donc toujours en français même si la locale est `enUS`

**Preuve runtime :**
- Si `i18n.language = "en"` → `dateLocale = enUS` → mois en anglais OK
- MAIS le "à" reste en français car hardcodé : `"18 December à 08:00"` au lieu de `"18 December at 08:00"`

**Fix recommandé :**
- Option 1 : Utiliser `t('bookings.card.dateTimeSeparator')` pour le séparateur
- Option 2 : Format conditionnel selon locale :
  ```typescript
  const separator = currentLang.startsWith("fr") ? "à" : "at"
  format(date, `d MMMM yyyy '${separator}' HH:mm`, { locale: dateLocale })
  ```
- Option 3 : Utiliser `date-fns` avec format localisé complet (mais plus complexe)

---

### D) Bouton "common.annuler"

**Code source :**
```typescript
// src/components/RenterBookingCard.tsx:1261
{t('common.annuler')}
```

**Namespace actuel :**
```typescript
// src/components/RenterBookingCard.tsx:103
const { t, i18n } = useTranslation() // defaultNS = "translation"
```

**Type :** Clé incorrecte ou namespace incorrect  
**Problème :**
- Le composant utilise `useTranslation()` donc namespace = `"translation"`
- La clé `common.annuler` cherche dans le namespace `"common"` (qui existe mais n'est pas le namespace actif)
- OU la clé `common.annuler` n'existe pas dans le namespace `"translation"`

**Preuve runtime :**
- `t('common.annuler')` retourne probablement la clé brute `"common.annuler"`
- `t('annuler')` devrait fonctionner si la clé existe dans `translation`

**Fix recommandé :**
- Vérifier si `annuler` existe dans le namespace `translation`
- Si oui : `t('annuler')`
- Si non : Vérifier `t('bookings.cancel.confirm')` ou créer la clé appropriée

---

## 4. Log DEV ajouté

Un log DEV complet a été ajouté dans `RenterBookingCard.tsx` (useEffect) pour capturer :

### A) Langue et namespaces runtime
- `i18n.language`
- `i18n.resolvedLanguage`
- `i18n.languages`
- `i18n.options.defaultNS`
- `i18n.options.ns`
- `i18n.options.fallbackLng`
- Store keys disponibles
- Namespaces présents pour la langue résolue

### B) Tests clés i18n critiques
Pour chaque clé :
- `exists(key)`
- `t(key)` (résultat actuel)
- `t(key, { lng: "en" })`
- `t(key, { lng: "fr" })`
- `t(key, { lng: "de" })`

Clés testées :
- `bookings.status.depositPending`
- `bookings.card.durationLabel`
- `duration.day_other`
- `annuler`
- `common.annuler`
- `bookings.cancel.confirm`

### C) Dates / locale runtime
- `i18n.language` + locale réellement utilisée pour date-fns
- Exemples de dates formatées :
  - `startDateTimeFormatted`
  - `endDateTimeFormatted`
- Indication que le "à" est hardcodé dans la string

### Format du log
```javascript
console.info('[booking-card-i18n-diag]', {
  language: { ... },
  store: { ... },
  keyTests: [ ... ],
  dates: { ... },
  problematicElements: { ... }
})
```

---

## 5. Instructions pour exécuter le diagnostic

1. **Ouvrir la console du navigateur** (F12)
2. **Naviguer vers** `/me/renter/bookings` en anglais
3. **Chercher le log** `[booking-card-i18n-diag]`
4. **Copier toutes les valeurs affichées**

### Valeurs à relever

```javascript
{
  language: {
    i18n_language: "...",        // Langue détectée
    i18n_resolvedLanguage: "...", // Langue résolue
    defaultNS: "...",            // Namespace par défaut
  },
  keyTests: [
    {
      key: "common.annuler",
      exists: true/false,
      t_current: "...",           // Résultat réel
      t_en: "...",                // Résultat EN
      t_fr: "...",                // Résultat FR
      isRawKey: true/false,       // Si retourne la clé brute
    },
    // ...
  ],
  dates: {
    dateLocale_used: "...",      // Locale utilisée
    startDateTimeFormatted: "...", // Exemple de date formatée
    separator_in_string: "'à'",   // Séparateur hardcodé
  },
  problematicElements: { ... }
}
```

---

## 6. Résumé des problèmes

| Problème | Cause | Impact |
|----------|-------|--------|
| Statut "En attente" | Hardcodé dans `StatusBadge` | Toujours en FR |
| Label "Durée:" | Hardcodé dans JSX | Toujours en FR |
| Dates "à" | Hardcodé dans format string | Toujours en FR même si mois traduit |
| Bouton "common.annuler" | Clé/namespace incorrect | Affiche la clé brute |

---

## 7. Fix recommandés (SANS implémenter)

### Fix 1 : Statut "En attente"
- **Option A :** Modifier `StatusBadge` pour accepter un prop `label` optionnel et utiliser i18n
- **Option B :** Utiliser `getUserBookingStatusUI()` pour tous les statuts dans RenterBookingCard

### Fix 2 : Label "Durée:"
- Vérifier existence de `bookings.card.durationLabel` dans les JSON
- Si existe : `t('bookings.card.durationLabel')`
- Si n'existe pas : Créer la clé dans tous les fichiers de locale

### Fix 3 : Dates "à"
- Utiliser `t('bookings.card.dateTimeSeparator')` pour le séparateur
- OU format conditionnel selon locale
- OU format date-fns localisé complet

### Fix 4 : Bouton "common.annuler"
- Vérifier si `annuler` existe dans namespace `translation`
- Si oui : `t('annuler')`
- Si non : Utiliser `t('bookings.cancel.confirm')` ou créer la clé

---

**STATUS :** Diagnostic prêt — Log DEV ajouté — En attente d'exécution pour preuves runtime complètes

