# 📋 PASSE 1 — TEXTES LAISSÉS HARDCODÉS FR (avec TODO)

## ✅ Textes traduits avec clés existantes

- ✅ "Année" → `t("vehicleForm.year")`
- ✅ "Zone de prise en charge" → `t("common.lieu_de_prise_en_charge")`
- ✅ "Non spécifié" → `t("common.not_specified")` (fallback)
- ✅ "Dates de location" → `t("common.dates")`
- ✅ "Départ" → `t("searchBar.departure")`
- ✅ "Retour" → `t("searchBar.return")`
- ✅ "Tarif de base" → `t("booking.baseRateLabel")` (avec adaptation pour enlever "* :")
- ✅ "par jour" / "/jour" → `t("common.par_jour")`
- ✅ "Annulation gratuite" → `t("booking.freeCancellation")` (badge)
- ✅ "Supprimer" (tooltip) → `t("profileForm.delete")`

## ✅ Éléments localisés (dates/durée/montants)

- ✅ Dates formatées → locale dynamique selon `i18n.language` (fr/enUS/it/de)
- ✅ Durée → `formatDuration(t, days, hours)` avec clés `duration.*`
- ✅ Tous les montants → `formatCurrency(amount, currencyLocale)`

---

## ❌ Textes hardcodés FR avec TODO(i18n) — À VALIDER POUR PASSE 2

### Titre et sous-titre modale

1. **Ligne 182** : "Confirmation de votre réservation"
   - TODO: `booking.confirmation.title`

2. **Ligne 185** : "Vérifiez les détails ci-dessous avant de confirmer"
   - TODO: `booking.confirmation.subtitle`

### Labels de prix

3. **Ligne 285** : "Location véhicule"
   - TODO: `booking.vehicleRental`

4. **Ligne 306** : "Options sélectionnées"
   - TODO: `booking.selectedOptions`

5. **Ligne 331** : "Sous-total options"
   - TODO: `booking.optionsSubtotal`

6. **Ligne 345** : "Sous-total"
   - TODO: `booking.subtotal`

7. **Ligne 351** : "Frais de service (15%)"
   - TODO: `booking.serviceFee`

8. **Ligne 359** : "TOTAL À PAYER"
   - TODO: `booking.totalToPay`

### Badges informatifs

9. **Ligne 377-378** : "Réponse rapide" / "Sous 24h"
   - TODO: `booking.benefits.quickResponse`

10. **Ligne 387-388** : "Paiement sûr" / "Après validation"
    - TODO: `booking.benefits.safePayment`

11. **Ligne 398** : "Gratuite 48h" (partie du badge Annulation)
    - TODO: Clé pour compléter `booking.freeCancellation` avec "48h"

12. **Ligne 407-408** : "Confirmation" / "Rapide"
    - TODO: `booking.benefits.quickConfirmation`

### Boutons

13. **Ligne 419** : "Modifier"
    - TODO: `common.modifier` (optionnel, peut être hardcodé)

14. **Ligne 426** : "Je confirme ma demande de réservation"
    - TODO: `booking.confirmBooking`

### Label "Durée :"

15. **Ligne 262** : "Durée :" (label avant la durée calculée)
    - TODO: Clé pour le label "Durée :" (optionnel, peut être hardcodé)

---

## 📊 Résumé

- **Textes traduits avec clés existantes** : 10 textes
- **Éléments localisés (dates/durée/montants)** : 100% localisés
- **Textes hardcodés FR avec TODO** : 15 textes/endroits

**Couverture Passe 1** : ~60-65% des textes visibles traduits/localisés

---

## 📝 Notes

- Tous les montants utilisent `formatCurrency()` avec locale dynamique
- Toutes les dates utilisent locale date-fns dynamique
- La durée utilise `formatDuration()` avec clés i18n `duration.*`
- Les textes hardcodés sont marqués avec `// TODO(i18n): missing key [clé_proposée]`

