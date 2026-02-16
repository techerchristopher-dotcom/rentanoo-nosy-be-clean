# Diagnostic "Damage + Autosave + Storage bucket" (EDL retour)

**Date** : 2026-02-06  
**Type** : Diagnostic uniquement — aucune implémentation  
**Scope** : EDL retour (steps 3 et 4), pas n8n

---

## 1) Audit du stockage des dommages (front → service → DB)

### 1.1 Localisation précise

#### Définitions des chemins `newDamages`

| Élément | Path exact | Fichier | Lignes |
|---------|------------|---------|--------|
| Step 3 (extérieur) | `returnData.step3.sections[zoneKey].newDamages` | `Step3ExterieurRetour.tsx` | 145, 154, 191-192, 250-252 |
| Step 4 (intérieur) | `returnData.step4.interior.newDamages` | `Step4InterieurRetour.tsx` | 71, 95-96, 129, 244-246 |
| Oui/Non | `returnData.step3.sections[zone].isSameAsDepart` | Step3 | 191, 226-231 |
| Oui/Non | `returnData.step4.interior.isSameAsDepart` | Step4 | 69, 226-228, 242 |

#### Structure exacte des objets `newDamages[]`

```typescript
// checkinReturnService.ts ligne 27
interface ReturnSectionPayload {
  isSameAsDepart: boolean;
  newDamages: Array<{
    description?: string;
    type?: string;        // Step 3 extérieur uniquement
    area?: string;        // Step 4 intérieur uniquement
    photos: Array<{
      storagePath: string;
      publicUrl: string;
      uploadedAt?: string;
    }>;
  }>;
}
```

**Exemple Step 3 (extérieur)** :
```json
{
  "description": "Rayure sur la porte",
  "type": "Rayure",
  "photos": [
    { "storagePath": "resa_8/retour/degats_exterieur_avant_degat0_8_1738..._abc.jpg", "publicUrl": "https://...", "uploadedAt": "2026-02-06T..." }
  ]
}
```

**Exemple Step 4 (intérieur)** :
```json
{
  "area": "sieges",
  "description": "Tache sur le siège",
  "photos": [
    { "storagePath": "resa_8/retour/degats_interieur_sieges_8_1738..._def.jpg", "publicUrl": "https://...", "uploadedAt": "2026-02-06T..." }
  ]
}
```

#### Appels backend pour sauvegarder

| Handler | Service | Fichier |
|---------|---------|---------|
| `handleNextFromStep3` | `checkinReturnService.saveReturnStep3Section` | `EtatDesLieuxRetourForm.tsx` 282-290 |
| `handleNextFromStep4` | `checkinReturnService.saveReturnStep4Interior` | `EtatDesLieuxRetourForm.tsx` 326-334 |
| Steps 5 et 6 | Ne touchent pas aux dégâts | — |

### 1.2 Validation DB — merge et persistance

#### Logique de merge

**`SupabaseCheckinReturnService.saveCheckinReturnDraft`** (lignes 154-157) :
```typescript
const existingData = existing.data || {};
const mergedData = {
  ...existingData,
  ...(dataToSave.data || {}),
};
```

→ **Merge shallow au niveau top** : `{ step3 }` remplace tout `step3`, `{ step4 }` remplace tout `step4`.

**`checkinReturnService.saveReturnStep3Section`** (lignes 185-200) :
- Construit `mergedSections` en fusionnant la zone courante avec les existantes
- Envoie `patch = { step3: { ...existingStep3, sections: mergedSections } }`

**`checkinReturnService.saveReturnStep4Interior`** (lignes 256-264) :
- Merge `interior` : `{ ...(existing?.data?.step4?.interior || {}), ...interiorPayload }`
- Envoie `patch = { step4: mergedStep4 }`

→ Les dégâts sont correctement inclus dans le patch et ne sont pas écrasés par erreur.

#### Mapping UI → payload → service → DB

```
UI (RHF)
  returnData.step3.sections[zone].newDamages
  returnData.step4.interior.newDamages
    │
    ▼ handleNextFromStep3 / handleNextFromStep4
Payload
  sectionPayload = { isSameAsDepart, newDamages }
  interiorPayload = { isSameAsDepart, newDamages }
    │
    ▼ checkinReturnService.saveReturnStep3Section / saveReturnStep4Interior
Service
  patch = { step3 } ou { step4 }
    │
    ▼ SupabaseCheckinReturnService.saveCheckinReturnDraft
DB
  checkin_return.data.step3.sections[zone].newDamages
  checkin_return.data.step4.interior.newDamages
```

### 1.3 Cas où la persistance ne se fait pas

| Cas | Comportement |
|-----|--------------|
| Utilisateur upload des photos puis quitte l'étape **sans cliquer "Suivant"** | Photos en state RHF + Storage, **mais pas en DB** |
| Utilisateur ferme l’onglet/navigue ailleurs sans "Suivant" | Perte totale des données de l’étape |
| Erreur réseau sur `saveCheckinReturnDraft` | Données non persistées (erreur affichée) |
| `checkinReturnId` non résolu (draft non créé) | Erreur avant save |

---

## 2) Audit upload photos — points de rupture

### 2.1 Code d’upload

| Élément | Fichier | Détail |
|---------|---------|--------|
| Bucket | `checkinPhotos.ts` ligne 33 | `checkin-photos` |
| Upload extérieur | `CheckinPhotoService.uploadReturnExteriorDamagePhoto` | Lignes 513-528 |
| Upload intérieur | `CheckinPhotoService.uploadReturnInteriorDamagePhoto` | Lignes 537-551 |
| Path extérieur | — | `resa_N/retour/degats_exterieur_{zone}_degat{index}_N_<timestamp>_<uuid>.jpg` |
| Path intérieur | — | `resa_N/retour/degats_interieur_{area}_N_<timestamp>_<uuid>.jpg` |
| Stockage BDD | — | `newDamages[].photos[]` avec `{ storagePath, publicUrl, uploadedAt }` |

### 2.2 Séquence actuelle

```
1. Utilisateur sélectionne des fichiers
   ↓
2. handleExteriorDamageFilesChange / handleInteriorDamageFilesChange
   ↓
3. CheckinPhotoService.uploadReturnExteriorDamagePhoto / uploadReturnInteriorDamagePhoto
   → supabase.storage.from('checkin-photos').upload(storagePath, file)
   → getPublicUrl(storagePath)
   → retourne { storagePath, publicUrl, uploadedAt }
   ↓
4. setValue("returnData.step3.sections.{zone}.newDamages.0", updatedFirstDamage)
   → Met à jour le state RHF (photos ajoutées au tableau)
   ↓
5. PAS d’appel save DB ici
   ↓
6. Sauvegarde DB uniquement au clic "Suivant" (handleNextFromStep3/4)
```

### 2.3 Point de rupture

**Photos perdues en DB si** : l’utilisateur quitte l’étape (navigation, fermeture) sans cliquer "Suivant".

- Les fichiers sont bien en Storage (pas de rollback).
- Le state RHF est perdu.
- La DB n’a jamais reçu les `newDamages` avec les nouvelles photos.

### 2.4 Recommandation autosave

| Option | Où brancher | Avantages | Inconvénients |
|--------|-------------|-----------|---------------|
| **A** | Après chaque upload réussi (dans `handleExteriorDamageFilesChange` / `handleInteriorDamageFilesChange`) | Persistance immédiate | Beaucoup d’appels si plusieurs photos |
| **B** | Debounce (ex. 1–2 s) après `setValue` | Moins d’appels | Légère latence |
| **C** | Sur blur / onBeforeUnload | Couvre la fermeture de page | Ne couvre pas la navigation interne |

**Recommandation** : **Option A** — appeler `saveReturnStep3Section` (zone courante) ou `saveReturnStep4Interior` juste après le `setValue` dans les handlers d’upload. Le service fait déjà un merge correct, donc pas de perte de données des autres zones.

---

## 3) Contraintes Storage — bucket et chemins

### 3.1 Bucket actuel

| Attribut | Valeur |
|----------|--------|
| Nom | `checkin-photos` |
| Source | `checkinPhotos.ts` ligne 33, `scripts/duplicate-storage-buckets.sql` |
| Public | Oui (config actuelle) |
| Taille max fichier | 10 MB |
| MIME | image/jpeg, image/jpg, image/png, image/webp |
| Bucket séparé `damage` | **N’existe pas** — tout est dans `checkin-photos` |

### 3.2 Chemins actuels pour les dégâts

| Type | Path (prefix) |
|------|---------------|
| Dégâts extérieur | `resa_{N}/retour/degats_exterieur_{zone}_degat{index}_{N}_{timestamp}_{uuid}.jpg` |
| Dégâts intérieur | `resa_{N}/retour/degats_interieur_{area}_{N}_{timestamp}_{uuid}.jpg` |

En Supabase Storage, les dossiers sont des préfixes. Un "dossier" n’existe que lorsqu’un fichier est uploadé avec ce préfixe. Donc si `newDamages.length === 0` et qu’aucune photo n’est uploadée, aucun fichier `degats_*` n’est créé → comportement déjà conditionnel.

### 3.3 Schéma de chemin proposé (si bucket `damage` dédié)

**Option A** : Rester dans `checkin-photos` (recommandé pour la cohérence) :
- Garder les paths actuels sous `resa_N/retour/degats_*`.
- Aucun changement structurel.

**Option B** : Nouveau bucket `damage` (si séparation souhaitée) :
```
damage/checkin_return/{checkinReturnId}/{zone}_{damageIndex}/{filename}
```
- Exemple : `damage/checkin_return/abc-123/avant_0/photo_1738.jpg`
- `damageItemId` peut être `{zone}_{index}` ou un UUID si on ajoute une table.

### 3.4 Infos minimales au moment de l’upload

- `checkinReturnId` : requis si on utilise un path basé sur `checkin_return.id` (disponible après création du draft).
- `bookingId`, `referenceNumber` : déjà utilisés.
- `zone` / `area` : déjà présents.
- `damageIndex` : 0 en V1 (un dégât par zone).

### 3.5 Policies (référence `scripts/duplicate-storage-buckets.sql`)

- Upload : `auth.role() = 'authenticated'`
- Select : lecture publique (bucket public)
- Owner/renter : pas de restriction par participant dans les policies actuelles

---

## 4) Flag DB `has_new_damage` + `new_damage_count`

### 4.1 État actuel de `checkin_return`

**Colonnes existantes** (SCRIPT-RECREATE-SCHEMA-RENTANOO.sql 302-319) :
- `id`, `booking_id`, `checkin_depart_id`, `owner_id`, `renter_id`
- `status`, `data`, `snapshot_legal`, `legal_pdf_url`
- `created_at`, `updated_at`

**Colonnes absentes** : `has_new_damage`, `new_damage_count`.

### 4.2 Proposition de colonnes (sans migration)

```sql
ALTER TABLE checkin_return
  ADD COLUMN has_new_damage boolean DEFAULT false,
  ADD COLUMN new_damage_count int DEFAULT 0;
```

### 4.3 Stratégie de calcul

| Option | Où calculer | Fiabilité | Effort |
|--------|-------------|-----------|--------|
| **A** | Front | Risque de désync (race, multi-onglets) | Faible |
| **B** | Service backend | ✅ Recalcul à chaque save | Moyen |
| **C** | Trigger / colonne générée | ✅ Toujours à jour | Complexe |

**Recommandation** : **Option B** — le service `saveReturnStep3Section`, `saveReturnStep4Interior` et `finalizeCheckinReturn` recalcule le flag à chaque appel, puis le renvoie dans le payload `saveCheckinReturnDraft` (nouveau champ top-level ou via une extension de `data` si on évite les colonnes).

Si on ajoute les colonnes, le service les met à jour dans le même `UPDATE` que `data`.

### 4.4 Événements qui doivent recalculer le flag

- `saveReturnStep3Section` : après merge des sections
- `saveReturnStep4Interior` : après merge de l’intérieur
- `finalizeCheckinReturn` : avant passage en `completed` (lecture de `data` actuel)

### 4.5 Fonction de calcul

```typescript
function computeHasNewDamage(data: any): { has: boolean; count: number } {
  let count = 0;
  const step3 = data?.step3?.sections || {};
  for (const section of Object.values(step3) as any[]) {
    if (section?.isSameAsDepart === false && Array.isArray(section?.newDamages)) {
      count += section.newDamages.length;
    }
  }
  const step4 = data?.step4?.interior;
  if (step4?.isSameAsDepart === false && Array.isArray(step4?.newDamages)) {
    count += step4.newDamages.length;
  }
  return { has: count > 0, count };
}
```

---

## 5) UI/UX — bouton "Ouvrir un litige"

### 5.1 Données actuellement disponibles

**`SupabaseBookingsService.getBookingsForOwner`** (bookings.ts 438) :
```typescript
checkin_return:checkin_return(id, status, legal_pdf_url, booking_id, checkin_depart_id, updated_at)
```

→ **`checkin_return.data` n’est pas chargé** → impossible de dériver `has_new_damage` côté front sans requête supplémentaire.

### 5.2 Avec les colonnes `has_new_damage` et `new_damage_count`

Modifier le select pour inclure :
```typescript
checkin_return:checkin_return(id, status, legal_pdf_url, booking_id, checkin_depart_id, updated_at, has_new_damage, new_damage_count)
```

→ Le front peut afficher le bouton sans charger `data`.

### 5.3 Condition d’affichage

```typescript
// Pseudo-code
const showLitigeButton = 
  booking.checkinReturn?.status === 'completed' 
  && booking.checkinReturn?.has_new_damage === true
  && currentUserRole === 'owner';
```

### 5.4 Emplacement proposé

| Fichier | Emplacement |
|---------|-------------|
| `OwnerBookingCard.tsx` | Section actions, à côté des boutons "État des lieux de départ/retour" (lignes ~1219-1245) |
| Page détail booking | Si une page dédiée existe |
| Dashboard owner | Via `OwnerBookings` → `OwnerBookingCard` |

### 5.5 États UI

- Visible : `status === 'completed'` et `has_new_damage === true`
- Disabled : si litige déjà ouvert (à gérer quand la table `disputes` existera)
- Masqué : sinon

---

## 6) Vérifications MCP Supabase

**MCP Supabase** : aucune ressource MCP trouvée dans l’environnement. Les informations suivantes sont déduites du code et des scripts du repo.

### 6.1 Buckets (code)

| Bucket | Fichier | Policies |
|--------|---------|----------|
| `checkin-photos` | `checkinPhotos.ts`, `duplicate-storage-buckets.sql` | Upload: authenticated, Select: public |
| `vehicle-photos` | `photos.ts` | — |
| `avatars` | — | — |
| `driver-licenses` | — | — |

### 6.2 Tables

| Table | Colonnes |
|-------|----------|
| `checkin_return` | id, booking_id, checkin_depart_id, owner_id, renter_id, status, data, snapshot_legal, legal_pdf_url, created_at, updated_at |
| `damages` | **N’existe pas** |
| `disputes` | **N’existe pas** |

### 6.3 Risques

- **publicUrl** : bucket public → pas de signed URL, URLs accessibles à toute personne connaissant l’URL.
- **Policy mismatch** : si le bucket est passé en privé, les `publicUrl` actuelles ne fonctionneront plus.

---

## 7) Constats et plan V1

### Constats

| Problème | Détail |
|----------|--------|
| Photos perdues en DB | Upload → setValue uniquement, pas de save avant "Suivant" |
| Pas de flag `has_new_damage` | Impossible d’afficher le bouton litige sans charger `data` |
| Pas d’autosave | Dépendance totale au bouton "Suivant" |
| Dossier damage conditionnel | Déjà garanti par les paths `degats_*` (aucun upload = aucun fichier) |
| Merge | Correct (shallow top-level, services préparent le merge) |

### Plan V1 (sans implémentation)

1. **Autosave**  
   - Appeler `saveReturnStep3Section` / `saveReturnStep4Interior` après chaque upload réussi dans les handlers d’upload (Step3 et Step4).

2. **Bucket damage**  
   - Garder `checkin-photos` et les paths actuels `resa_N/retour/degats_*`.
   - Pas de nouveau bucket pour la V1.

3. **Flag DB**  
   - Ajouter `has_new_damage` et `new_damage_count` à `checkin_return`.
   - Les calculer dans les services (saveStep3, saveStep4, finalize) et les persister dans le même `UPDATE`.

4. **Bouton "Ouvrir un litige"**  
   - Inclure `has_new_damage` (et optionnellement `new_damage_count`) dans le select de `getBookingsForOwner`.
   - Afficher le bouton dans `OwnerBookingCard` si `checkinReturn?.status === 'completed'` et `checkinReturn?.has_new_damage === true`.

---

## 8) Checklist d’acceptation (tests)

| # | Test | Critère |
|---|------|---------|
| 1 | Ajouter un dégât + photo → refresh page | Dégât et photo restent visibles (autosave) |
| 2 | Ajouter puis supprimer un dégât | `has_new_damage` et `new_damage_count` mis à jour |
| 3 | Aucun dégât saisi | Aucun fichier `degats_*` uploadé dans Storage |
| 4 | Owner voit "Ouvrir un litige" | Uniquement si `has_new_damage === true` et `status === 'completed'` |
| 5 | Quitter l’étape sans "Suivant" après upload | Données conservées grâce à l’autosave |
