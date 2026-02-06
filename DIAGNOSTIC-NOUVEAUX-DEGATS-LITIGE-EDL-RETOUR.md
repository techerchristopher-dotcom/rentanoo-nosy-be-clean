# 🔍 Diagnostic "Nouveaux dégâts" + design litige (EDL retour)

**Date** : 2026-02-06  
**Type** : Diagnostic uniquement — aucune implémentation

---

## A) Cartographie du parcours "nouveaux dégâts" dans l'UI

### 1. Où répond-on oui/non à "nouveaux dégâts" ?

| Étape | Fichier | Lignes | Zones |
|-------|---------|--------|-------|
| **Step 3 (Extérieur)** | `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` | 219-260 | Par zone (avant, droit, arrière, gauche, coffre, jantes) |
| **Step 4 (Intérieur)** | `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` | 219-260 | Intérieur global |

### 2. Variables / state concernées

| Élément | Variable / path | Type |
|---------|-----------------|------|
| Oui/Non extérieur (par zone) | `returnData.step3.sections.{zoneKey}.isSameAsDepart` | `boolean` |
| Oui/Non intérieur | `returnData.step4.interior.isSameAsDepart` | `boolean` |
| Dérivé "nouveau dégât" | `hasNewDamage = isSameAsDepart === false` | `boolean` |
| Liste dégâts extérieur | `returnData.step3.sections.{zoneKey}.newDamages` | `array` |
| Liste dégâts intérieur | `returnData.step4.interior.newDamages` | `array` |

**Structure d’un élément `newDamages[0]` :**
```json
{
  "description": "Rayure sur la porte",
  "type": "Rayure",
  "area": "interieur",
  "photos": [
    { "storagePath": "...", "publicUrl": "...", "uploadedAt": "..." }
  ]
}
```

- **Extérieur** : `description`, `type`, `photos[]`
- **Intérieur** : `description`, `area`, `photos[]`

### 3. Intégration au payload final

| Step | Handler | Payload envoyé | Service appelé |
|------|---------|----------------|----------------|
| 3 | `handleNextFromStep3` | `sectionPayload = { isSameAsDepart, newDamages }` par zone | `checkinReturnService.saveReturnStep3Section` |
| 4 | `handleNextFromStep4` | `interiorPayload = { isSameAsDepart, newDamages }` | `checkinReturnService.saveReturnStep4Interior` |
| 7 | `handleFinalizeReturn` | `step7Payload = { completedAt, validation }` **uniquement** | `checkinReturnService.finalizeCheckinReturn` |

**Important** : step7 ne contient que les signatures. Les dégâts (step3, step4) sont déjà en DB via les clics "Suivant" des étapes 3 et 4.

---

## B) Parcours côté services / Supabase

### 4. Flux complet

```
handleNextFromStep3 (EtatDesLieuxRetourForm.tsx:227-303)
  → checkinReturnService.saveReturnStep3Section (checkinReturnService.ts:143-212)
    → SupabaseCheckinReturnService.saveCheckinReturnDraft
      → patch = { step3: { sections: { [zoneKey]: { isSameAsDepart, newDamages } } } }
      → mergedData = { ...existingData, step3 }
      → UPDATE checkin_return SET data = mergedData

handleNextFromStep4 (EtatDesLieuxRetourForm.tsx:307-348)
  → checkinReturnService.saveReturnStep4Interior (checkinReturnService.ts:217-275)
    → SupabaseCheckinReturnService.saveCheckinReturnDraft
      → patch = { step4: { interior: { isSameAsDepart, newDamages } } }
      → mergedData = { ...existingData, step4 }
      → UPDATE checkin_return SET data = mergedData

handleFinalizeReturn (EtatDesLieuxRetourForm.tsx:420-423)
  → checkinReturnService.finalizeCheckinReturn
    → saveCheckinReturnDraft({ data: { step7 } })  // merge, ne remplace pas step3/step4
    → createReturnSnapshot (lit checkin_return.data)
    → updateReturnStatus("completed")
```

### 5. Sauvegarde en DB

| Champ | Utilisation |
|-------|-------------|
| `checkin_return.data` | JSONB, structure `{ step2, step3, step4, step5, step6, step7 }` |
| `checkin_return.data.step3.sections.{zone}.newDamages` | Array de dégâts extérieurs par zone |
| `checkin_return.data.step4.interior.newDamages` | Array de dégâts intérieurs |

Aucune colonne dédiée type `has_new_damage` : tout est dans `data` (JSONB).

### 6. Causes possibles de perte de données

| Hypothèse | Vérification | Statut |
|-----------|--------------|--------|
| Payload dégâts non inclus dans step7 | step7 = signatures uniquement ; dégâts dans step3/4 | ✅ OK — sauvegarde aux steps 3 et 4 |
| Merge qui écrase step3/step4 | `saveCheckinReturnDraft` fait `{ ...existingData, ...patch }` | ✅ OK — merge au top level |
| Données non persistées au changement d’étape | `handleNextFromStep3/4` appelle le service avant `goToStep` | ✅ OK |
| Mismatch de chemins JSON | step3/step4 utilisent `newDamages` partout | ✅ Cohérent |
| Upload photos non persisté | Les photos sont ajoutées via `setValue` puis sauvegardées au "Suivant" | ⚠️ À vérifier : ordre `setValue` → clic "Suivant" |

Point à surveiller : si l’utilisateur upload des photos puis change d’étape sans cliquer "Suivant", les photos restent en mémoire (RHF) mais ne sont pas enregistrées.

---

## C) État actuel de `checkin_return`

### 7. Schéma (SCRIPT-RECREATE-SCHEMA-RENTANOO.sql lignes 302-319)

```sql
CREATE TABLE public.checkin_return (
    id uuid PRIMARY KEY,
    booking_id uuid NOT NULL,
    checkin_depart_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    data jsonb NOT NULL DEFAULT '{}',
    snapshot_legal jsonb,
    legal_pdf_url text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);
```

### 8. Structure recommandée "dégâts" dans `data`

La structure actuelle est déjà exploitable :

```json
{
  "step3": {
    "sections": {
      "avant": {
        "isSameAsDepart": false,
        "newDamages": [
          {
            "description": "Rayure",
            "type": "Rayure",
            "photos": [{ "storagePath": "...", "publicUrl": "...", "uploadedAt": "..." }]
          }
        ]
      }
    }
  },
  "step4": {
    "interior": {
      "isSameAsDepart": false,
      "newDamages": [
        {
          "area": "sieges",
          "description": "Tache sur le siège",
          "photos": [{ "storagePath": "...", "publicUrl": "..." }]
        }
      ]
    }
  }
}
```

Proposition de flag dérivé (à calculer, pas en DB) :

```typescript
const hasNewDamage = () => {
  const step3 = data?.step3?.sections || {};
  const step4 = data?.step4?.interior;
  const extHasDamage = Object.values(step3).some(s => s?.isSameAsDepart === false && (s?.newDamages?.length ?? 0) > 0);
  const intHasDamage = step4?.isSameAsDepart === false && (step4?.newDamages?.length ?? 0) > 0;
  return extHasDamage || intHasDamage;
};
```

---

## D) Option 1 vs Option 2

### 9. Comparatif

| Critère | Option 1 : JSON dans `checkin_return` | Option 2 : Table `damages` / `disputes` |
|---------|---------------------------------------|----------------------------------------|
| Simplicité | ✅ Déjà en place | ❌ Migration, modèles, services |
| Rapidité | ✅ Aucun changement structurel | ❌ Temps de développement |
| Scalabilité | ⚠️ JSON lourd si nombreux dégâts | ✅ Meilleure pour gros volumes |
| Litiges multiples | ⚠️ Pas de cycle de vie propre | ✅ Statuts (draft/open/closed) |
| Suivi litige | ⚠️ Limité | ✅ Échanges, pièces, workflow |
| Base pour "Ouvrir un litige" | ⚠️ Suffisant pour V1 | ✅ Idéal pour V2+ |

### 10. Recommandation

- Pour une V1 rapide : Option 1 (tout dans `checkin_return.data`) est cohérente avec l’existant.
- Si un vrai workflow litige est prévu (statuts, échanges, pièces) : privilégier Option 2 (table `damages` ou `disputes`).

---

## E) Spéc UI/UX : bouton "Ouvrir un litige"

### 11. Quand afficher le bouton

```text
checkin_return.status === "completed"
  && has_new_damage(checkin_return.data) === true
  && rôle === propriétaire
```

### 12. Où l’afficher

| Fichier | Emplacement proposé |
|---------|---------------------|
| `src/components/OwnerBookingCard.tsx` | Section actions, proche de "État des lieux de retour" (lignes ~1219-1245), pour `booking.status === 'terminated'` et `booking.checkinReturn?.status === 'completed'` |

### 13. Problème actuel

La requête des bookings propriétaire (`SupabaseBookingsService.getBookingsForOwner`) ne récupère **pas** `checkin_return.data` :

```typescript
// src/services/supabase/bookings.ts:438
checkin_return:checkin_return(id, status, legal_pdf_url, booking_id, checkin_depart_id, updated_at)
```

Donc le front ne peut pas calculer `has_new_damage` sans requête complémentaire (ex. `getReturnById` avec `data`).

### 14. Actions nécessaires (implémentation ultérieure)

1. Charger `checkin_return.data` pour les réservations terminées avec EDL retour completed.
2. Ou ajouter une colonne / vue dérivée `has_new_damage` pour simplifier les requêtes.

### 15. Données pour l’écran litige

- `checkin_return.id`
- `checkin_return.data.step3.sections` (dégâts extérieurs)
- `checkin_return.data.step4.interior` (dégâts intérieurs)
- `checkin_return.snapshot_legal` (récap)
- `booking_id`, `owner_id`, `renter_id`

---

## F) Deux routes pour le workflow EDL retour

### 16. Routes logiques

| Route | Condition | Action |
|-------|-----------|--------|
| **A** | `has_damage === false` | Email standard (actuel) |
| **B** | `has_damage === true` | Email "dommage détecté" + mention litige + infos/photos |

### 17. Calcul de `has_damage`

```typescript
function hasNewDamage(data: any): boolean {
  const step3 = data?.step3?.sections || {};
  const step4 = data?.step4?.interior;
  const ext = Object.values(step3).some((s: any) => s?.isSameAsDepart === false && (s?.newDamages?.length ?? 0) > 0);
  const int = step4?.isSameAsDepart === false && (step4?.newDamages?.length ?? 0) > 0;
  return ext || int;
}
```

### 18. Données disponibles pour n8n

Actuellement, le webhook envoie uniquement : `checkinId`, `bookingId`, `event`, `timestamp`.

Pour les deux routes, n8n doit :

1. Charger `checkin_return` par ID (incluant `data`) via l’API Supabase.
2. Calculer `has_damage` à partir de `data`.
3. Envoyer l’email adapté.

Alternative : enrichir le payload du webhook avec `has_damage` (et éventuellement un résumé des dégâts) pour éviter à n8n de requêter Supabase.

---

## Bonus : structure `damage` (Option 2)

### Champs minimaux proposés

```sql
CREATE TABLE damages (
  id uuid PRIMARY KEY,
  checkin_return_id uuid NOT NULL REFERENCES checkin_return(id),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  owner_id uuid NOT NULL REFERENCES profiles(id),
  renter_id uuid NOT NULL REFERENCES profiles(id),
  title text,
  description text,
  severity text,  -- 'minor' | 'moderate' | 'major'
  photos jsonb DEFAULT '[]',  -- array of {storagePath, publicUrl}
  status text DEFAULT 'draft',  -- 'draft' | 'open' | 'closed'
  zone text,  -- ex: 'avant', 'interieur'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Alimentation possible

- **Service / fonction** : dans `finalizeCheckinReturn`, après mise à jour du statut, parcourir `data.step3.sections` et `data.step4.interior`, et créer un enregistrement `damages` par dégât détecté.
- **Trigger** : possible sur `checkin_return` quand `status` passe à `completed`, mais plus complexe.
- **Job / cron** : moins adapté pour un flux temps réel.

---

## Synthèse des points critiques

| Point | Statut |
|-------|--------|
| Dégâts saisis en UI (step3, step4) | ✅ Implémenté |
| Sauvegarde dans `checkin_return.data` | ✅ Implémenté |
| Snapshot inclut les dégâts | ✅ Implémenté |
| Flag `has_new_damage` | ❌ Non présent (à dériver) |
| Propriétaire reçoit `data` pour calculer dégâts | ❌ Non — requête limitée à `id, status, legal_pdf_url, ...` |
| Bouton "Ouvrir un litige" | ❌ Non implémenté |
| Deux routes n8n (sans / avec dégâts) | ❌ Non — webhook actuel sans `has_damage` |
