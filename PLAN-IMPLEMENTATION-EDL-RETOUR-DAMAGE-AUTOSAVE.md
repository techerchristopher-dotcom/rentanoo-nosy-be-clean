# Plan d’implémentation V1 — EDL Retour : dommages + autosave + flag + bouton litige

**Date** : 2026-02-06  
**Type** : Diagnostic + plan (aucune implémentation)  
**Scope** : EDL retour (steps 3 et 4), sans n8n

---

## 1) Constat — pourquoi les dégâts ne sont pas enregistrés

### Preuve dans le code

| Fichier | Lignes | Preuve |
|---------|--------|--------|
| `Step3ExterieurRetour.tsx` | 152-154 | Après upload : `setValue(..., updatedFirstDamage)` → **aucun appel de sauvegarde DB** |
| `Step4InterieurRetour.tsx` | 127-129 | Même logique : `setValue(...)` → **aucun appel de sauvegarde DB** |
| `EtatDesLieuxRetourForm.tsx` | 282-290, 326-334 | `saveReturnStep3Section` / `saveReturnStep4Interior` sont appelés **uniquement** dans `handleNextFromStep3` / `handleNextFromStep4` |

→ La persistance DB se fait uniquement au clic sur "Suivant". Si l’utilisateur quitte l’étape (navigation, fermeture) sans cliquer "Suivant", les photos restent en Storage et dans le state RHF, mais **jamais en `checkin_return.data`**.

---

## 2) Points d’accroche pour l’autosave

### 2.1 Où brancher l’autosave

| Composant | Fonction | Ligne | Point d’appel autosave |
|-----------|----------|-------|------------------------|
| `Step3ExterieurRetour.tsx` | `handleExteriorDamageFilesChange` | 154 | Juste après `setValue(..., updatedFirstDamage)` (ligne 154) |
| `Step3ExterieurRetour.tsx` | onClick "Non" (pas de dégât) | ~231 | Après `setValue(..., newDamages: [])` |
| `Step3ExterieurRetour.tsx` | onClick "Oui" (nouveau dégât) | ~252 | Après `setValue(..., newDamages: [{...}])` |
| `Step4InterieurRetour.tsx` | `handleInteriorDamageFilesChange` | 129 | Juste après `setValue(..., updatedFirstDamage)` |
| `Step4InterieurRetour.tsx` | onClick "Non" | ~228 | Après `setValue(..., newDamages: [])` |
| `Step4InterieurRetour.tsx` | onClick "Oui" | ~246 | Après `setValue(..., newDamages: [{...}])` |

### 2.2 Problème : Step3/Step4 n’ont pas les IDs

`StepProps` actuels : `departData`, `returnData`, `setValue`, `watch`, `bookingData`, `bookingId`, `vehicleType`.

Manquants pour appeler les services : `checkinReturnId`, `checkinDepartId`, `ownerId`, `renterId`.

Solution : ajouter un callback `onAutoSaveStep3?: (zoneKey: string) => Promise<void>` et `onAutoSaveStep4?: () => Promise<void>` fourni par `EtatDesLieuxRetourForm`, qui contient ces IDs.

---

## 3) Bucket et accès

| Élément | Valeur actuelle |
|---------|-----------------|
| Bucket | `checkin-photos` |
| Fichier | `checkinPhotos.ts` ligne 33 |
| Génération URL | `supabase.storage.from(BUCKET).getPublicUrl(storagePath)` → URL publique |
| Policies | Upload : `auth.role() = 'authenticated'`, Select : public (bucket public) |

Owner et renter peuvent voir les photos (bucket public). Pas de signed URL aujourd’hui.

---

## 4) Réutilisation des services existants

### 4.1 Signatures actuelles

```typescript
// checkinReturnService.ts
saveReturnStep3Section(params: {
  bookingId, checkinDepartId, checkinReturnId?, ownerId, renterId,
  sectionKey: string,
  sectionPayload: { isSameAsDepart: boolean; newDamages: any[] }
}): Promise<{ data, error }>

saveReturnStep4Interior(params: {
  bookingId, checkinDepartId, checkinReturnId?, ownerId, renterId,
  interiorPayload: { isSameAsDepart?: boolean; newDamages: any[] }
}): Promise<{ data, error }>
```

### 4.2 Utilisation pour l’autosave

- Pas d’effet de bord : merge JSONB par zone / section, pas de side-effect métier.
- Réutilisables pour l’autosave sans changement de signature.
- Appels fréquents acceptables (quelques updates par minute au pire).

### 4.3 Debounce

- Pour l’upload : un batch de photos → un seul `setValue` → un seul autosave. Pas de debounce.
- Pour les toggles "Oui"/"Non" : un clic → un autosave. Pas de debounce.
- Pour les champs description/type : optionnel en V1 (on peut ajouter un debounce 500 ms si nécessaire).

---

## 5) Recalcul du flag DB

### 5.1 Endroits à modifier

| Fichier | Fonction | Modification |
|---------|----------|--------------|
| `checkinReturnService.ts` | `saveReturnStep3Section` | Après merge, calculer `has_new_damage` et `new_damage_count` sur `mergedData`, passer à `saveCheckinReturnDraft` |
| `checkinReturnService.ts` | `saveReturnStep4Interior` | Idem |
| `checkinReturnService.ts` | `finalizeCheckinReturn` | Avant ou après `updateReturnStatus`, recalculer le flag sur le `data` final et faire un UPDATE avec ces colonnes (filet de sécurité) |
| `supabaseCheckinReturnService.ts` | `saveCheckinReturnDraft` | Accepter et persister `has_new_damage` et `new_damage_count` dans l’UPDATE |

### 5.2 Fonction de calcul (à placer dans `checkinReturnService` ou utilitaire)

```typescript
function computeDamageFlags(data: any): { has_new_damage: boolean; new_damage_count: number } {
  let count = 0;
  const step3 = data?.step3?.sections || {};
  for (const s of Object.values(step3) as any[]) {
    if (s?.isSameAsDepart === false && Array.isArray(s?.newDamages))
      count += s.newDamages.length;
  }
  const step4 = data?.step4?.interior;
  if (step4?.isSameAsDepart === false && Array.isArray(step4?.newDamages))
    count += step4.newDamages.length;
  return { has_new_damage: count > 0, new_damage_count: count };
}
```

---

## 6) UI owner — bouton "Ouvrir un litige"

| Élément | Fichier | Lignes |
|---------|---------|--------|
| Composant carte | `src/components/OwnerBookingCard.tsx` | ~1192-1245 |
| Query bookings | `src/services/supabase/bookings.ts` | 434-441 |
| Select actuel | `checkin_return(id, status, legal_pdf_url, booking_id, checkin_depart_id, updated_at)` | 438 |
| Modification | Ajouter `has_new_damage`, `new_damage_count` | — |
| Emplacement bouton | Après le bloc "Retour complété" (lignes ~1196-1207), visible si `checkinReturn?.status === 'completed' && checkinReturn?.has_new_damage === true` | — |

---

## 7) Plan d’implémentation V1 (étapes)

### Étape 1 — Migration SQL

Créer une migration Supabase :

```sql
ALTER TABLE public.checkin_return
  ADD COLUMN IF NOT EXISTS has_new_damage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_damage_count integer DEFAULT 0;
```

### Étape 2 — Extension du service Supabase

- Fichier : `src/services/supabaseCheckinReturnService.ts`
- Dans `saveCheckinReturnDraft` : ajouter `has_new_damage?: boolean` et `new_damage_count?: number` au payload.
- Dans l’UPDATE : inclure ces colonnes quand elles sont fournies.
- Mettre à jour l’interface `CheckinReturn` pour inclure ces champs.

### Étape 3 — Recalcul du flag dans le service métier

- Fichier : `src/services/checkinReturnService.ts`
- Créer `computeDamageFlags(data)`.
- Dans `saveReturnStep3Section` : après merge, calculer les flags sur `mergedData`, passer `has_new_damage` et `new_damage_count` à `saveCheckinReturnDraft`.
- Idem dans `saveReturnStep4Interior`.
- Dans `finalizeCheckinReturn` : recalculer sur le `data` final, puis UPDATE `checkin_return` avec ces colonnes avant ou après le changement de statut (si `saveCheckinReturnDraft` ne gère pas le cas finalize, faire un UPDATE direct).

### Étape 4 — Callbacks autosave dans le formulaire

- Fichier : `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx`
- Créer `handleAutoSaveStep3 = async (zoneKey: string) => { ... }` : lire `returnData.step3.sections[zoneKey]`, appeler `checkinReturnService.saveReturnStep3Section`.
- Créer `handleAutoSaveStep4 = async () => { ... }` : lire `returnData.step4.interior`, appeler `checkinReturnService.saveReturnStep4Interior`.
- Passer `onAutoSaveStep3={handleAutoSaveStep3}` et `onAutoSaveStep4={handleAutoSaveStep4}` à `CurrentStepComponent`.

### Étape 5 — Props et appels dans Step3

- Fichier : `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx`
- Ajouter à `StepProps` : `onAutoSaveStep3?: (zoneKey: string) => Promise<void>`.
- Après `setValue` (ligne 154) : appeler `onAutoSaveStep3?.(zoneKey)` (fire-and-forget, ne pas bloquer l’UI).
- Dans les onClick "Oui"/"Non" : appeler `onAutoSaveStep3?.(zoneKey)` après les `setValue`.

### Étape 6 — Props et appels dans Step4

- Fichier : `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx`
- Ajouter `onAutoSaveStep4?: () => Promise<void>`.
- Après `setValue` (ligne 129) : appeler `onAutoSaveStep4?.()`.
- Dans les onClick "Oui"/"Non" : appeler `onAutoSaveStep4?.()`.

### Étape 7 — Path Storage (optionnel V1)

- Fichier : `src/services/supabase/checkinPhotos.ts`
- Option A (simple) : garder les paths actuels `resa_N/retour/degats_exterieur_*` et `resa_N/retour/degats_interieur_*` (aucun upload si pas de dégât).
- Option B (conforme au plan) : ajouter une variante pour les photos dégâts retour avec path `checkin_return/<checkinReturnId>/damage/<zone-or-area>/<timestamp>_<uuid>.<ext>` (nécessite de passer `checkinReturnId` aux méthodes d’upload retour).

Recommandation V1 : Option A (pas de changement de path), pour limiter la surface de modification.

### Étape 8 — Query owner et bouton litige

- Fichier : `src/services/supabase/bookings.ts`
- Modifier le select :  
  `checkin_return(id, status, legal_pdf_url, booking_id, checkin_depart_id, updated_at, has_new_damage, new_damage_count)`.

- Fichier : `src/components/OwnerBookingCard.tsx`
- Dans le bloc `booking.checkinReturn?.status === 'completed'` (lignes ~1196-1207), ajouter un bouton "Ouvrir un litige" visible si `(booking.checkinReturn as any)?.has_new_damage === true`.
- Pour l’instant : lien ou bouton vers une route placeholder (ex. `/dispute/{bookingId}` ou `#` avec `onClick` vide) — pas d’écran litige en V1.

### Étape 9 — Type `CheckinReturnSummary`

- Fichier : `src/types/index.ts` (ou équivalent)
- Ajouter `has_new_damage?: boolean` et `new_damage_count?: number` à `CheckinReturnSummary` si ce type existe.

---

## 8) Stratégie autosave (résumé)

| Événement | Composant | Action |
|-----------|-----------|--------|
| Upload photo réussi | Step3 / Step4 | Après `setValue`, appeler `onAutoSaveStep3(zoneKey)` ou `onAutoSaveStep4()` |
| Clic "Oui" (nouveau dégât) | Step3 / Step4 | Après `setValue`, appeler le callback autosave |
| Clic "Non" (pas de dégât) | Step3 / Step4 | Après `setValue`, appeler le callback autosave |

Pas de debounce pour la V1. En cas de batch de photos, un seul `setValue` et un seul autosave.

---

## 9) Stratégie path Storage (résumé)

- V1 simple : garder `resa_N/retour/degats_*` (pas de changement).
- V1 avancée (si souhaité) : introduire `checkin_return/<id>/damage/<zone>/...` et adapter `CheckinPhotoService` pour accepter `checkinReturnId` dans les uploads retour.

---

## 10) Checklist de tests E2E

| # | Test | Critère de succès |
|---|------|-------------------|
| 1 | Upload photo dégât puis refresh | Photo visible, présente dans `checkin_return.data` |
| 2 | Ajouter un dégât (Oui) puis refresh | Dégât présent en DB |
| 3 | Supprimer un dégât (Non) | `has_new_damage` et `new_damage_count` mis à jour |
| 4 | Aucun dégât saisi | Aucun fichier `degats_*` ou `damage/` créé |
| 5 | Owner et bouton litige | Bouton visible uniquement si `status === 'completed'` et `has_new_damage === true` |
| 6 | Quitter l’étape sans "Suivant" après upload | Données conservées après rechargement (autosave) |

---

## 11) Fichiers impactés (liste)

| Fichier | Modifications |
|---------|---------------|
| `supabase/migrations/YYYYMMDD_add_has_new_damage_checkin_return.sql` | Nouvelle migration |
| `src/services/supabaseCheckinReturnService.ts` | Payload + UPDATE pour `has_new_damage`, `new_damage_count` |
| `src/services/checkinReturnService.ts` | `computeDamageFlags`, passage du flag dans save + finalize |
| `src/modules/etatDesLieuxRetour/EtatDesLieuxRetourForm.tsx` | Callbacks autosave, passage aux steps |
| `src/modules/etatDesLieuxRetour/steps/Step3ExterieurRetour.tsx` | Prop `onAutoSaveStep3`, appels après setValue et toggles |
| `src/modules/etatDesLieuxRetour/steps/Step4InterieurRetour.tsx` | Prop `onAutoSaveStep4`, appels après setValue et toggles |
| `src/services/supabase/bookings.ts` | Select étendu avec `has_new_damage`, `new_damage_count` |
| `src/components/OwnerBookingCard.tsx` | Bouton "Ouvrir un litige" conditionnel |
| `src/types/index.ts` (ou équivalent) | Extension de `CheckinReturnSummary` |

---

## 12) Risques et points d’attention

- Erreur réseau sur autosave : ne pas bloquer l’UI ; log et éventuel toast discret.
- Doublons si "Suivant" et autosave coexistent : pas de conflit car le merge est idempotent (même payload).
- `checkinReturnId` indisponible avant création du draft : l’autosave ne s’exécute qu’en Step3/Step4, où le draft existe déjà.
