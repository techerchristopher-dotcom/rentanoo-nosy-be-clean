# Back-office — Tests de non-régression

Checklist manuelle à exécuter après déploiement des migrations back-office.

## Prérequis

1. Appliquer les migrations Supabase :
   ```bash
   supabase db push
   ```
2. Créer les buckets `scooter-docs` et `repair-photos` (voir `supabase/STORAGE-BUCKETS.md`).
3. Vérifier le schéma :
   ```bash
   node scripts/verify-back-office-schema.js
   ```

## Réservations & site public (ne doit pas régresser)

- [ ] Page d'accueil `/` : liste des véhicules disponibles s'affiche
- [ ] Recherche / filtres véhicules fonctionnels
- [ ] Réservation web d'un scooter (sandbox Stripe si applicable)
- [ ] EDL départ `/checking/:bookingId` sur un scooter
- [ ] EDL retour `/checkin-return/:bookingId`
- [ ] Paiement Stripe booking → statut `confirmed`

## Admin existant

- [ ] Connexion admin → accès `/admin`
- [ ] `/admin/bookings` liste les réservations
- [ ] `/admin/bookings/new` création réservation agence
- [ ] `/admin/planning` et `/admin/revenue` inchangés

## Back-office nouveau

- [ ] `/admin/fleet` : liste scooters, filtres statut
- [ ] Créer scooter S-001, modifier, changer statut
- [ ] `/admin/parts` : créer pièce, entrée stock, alerte stock bas
- [ ] `/admin/workshop` : créer réparation, consommer pièces, clôturer
- [ ] Annuler réparation → stock restauré
- [ ] `/admin/parts/movements` : historique visible
- [ ] `/admin/reports` : KPI affichés
- [ ] `/admin/sales/new` : vente comptoir multi-lignes
- [ ] `/admin/suppliers` : CRUD fournisseur
- [ ] `/admin/maintenance` : règles + alertes

## Tests automatisés RPC

```bash
node scripts/test-back-office-rpc.js
```

Vérifie : création pièce, entrée stock, consommation réparation, blocage stock négatif, annulation.
