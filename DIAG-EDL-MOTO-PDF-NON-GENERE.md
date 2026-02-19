# DIAG — État des lieux moto : photos OK mais PDF non généré

**Contexte** : Lors d’un état des lieux de départ **moto**, les photos (zones, dégâts) sont bien stockées dans Supabase (bucket `checkin-photos`), mais le PDF ne se génère pas.

---

## 1) Flux actuel (résumé)

```
Checking.tsx (vehicleType === "moto")
    → EtatDesLieuxDepartFormMoto
        → Section1IdentificationMoto (step 1)
        → Section2RelevesMoto (step 2)
        → Section3ExterieurMoto (step 3) — zones + dégâts
        → [Step 4 masqué pour moto]
        → Section5AccessoiresMoto (step 5)
        → Section6RemarquesMoto (step 6)
        → Section8ValidationMoto (step 7) — Finaliser
```

**Finalisation** : `Section8ValidationMoto` appelle `finalizeCheckinDepart` qui :
1. Sauvegarde Step 7 (signatures)
2. Crée le snapshot légal (`createLegalSnapshot`)
3. Passe le statut en `completed`
4. Génère le PDF (`generateCheckinDepartPdf`)

---

## 2) Problèmes identifiés

### 2.1 Step 3 possiblement non sauvegardé avant finalisation

**Fait** : `Section8ValidationMoto` sauvegarde uniquement Step 2 (véhicule, relevés) avant d’appeler `finalizeCheckinDepart`. Step 3 (photos extérieures, dégâts) n’est **jamais** sauvegardé dans cette phase.

**Conséquence** : Si l’utilisateur :
- utilise le bouton **parent** « Suivant » en bas de page, au lieu du bouton « Suivant » **à l’intérieur** de `Section3ExterieurMoto`,  
→ les données Step 3 (zonesPhotos, damageReports) restent uniquement dans React Hook Form et ne sont **pas écrites** en base.

Le snapshot légal est construit à partir de `checkin_depart.data` en base. Si Step 3 manque ou est vide, le snapshot aura des photos/dégâts vides, ce qui peut impacter le PDF (sections vides) ou la robustesse de la génération.

### 2.2 Deux boutons « Suivant » sur l’étape 3

Sur l’étape 3, deux boutons coexistent :
1. Le bouton **dans** `Section3ExterieurMoto` — appelle `handleComplete` → sauvegarde Step 3 puis `onComplete()` (navigation).
2. Le bouton **du formulaire parent** — appelle uniquement `nextStep()` (navigation sans sauvegarde).

L’utilisateur peut passer à l’étape suivante **sans** sauvegarder Step 3.

### 2.3 Snapshot légal et structure moto

`SupabaseCheckinService.createLegalSnapshot` gère déjà la moto :
- `type_normalized === "moto"` → coffre non pertinent, intérieur null
- `step3.zonesPhotos` mappé : `cote_droit` → `droit`, `cote_gauche` → `gauche`, `jantes` → `janteAvDroit`
- `step3.damageReports` utilisé pour `exterior.damages`
- `propreteExterieure` : pour la moto, Step 3 n’envoie pas `propreteExterieure` → `exterior.cleanliness` reste vide (niveau null), ce qui est acceptable.

**Point d’attention** : Si `checkin.data.step3` est vide en base (par exemple si Step 3 n’a jamais été sauvegardé), le snapshot aura des photos vides, ce qui ne provoque pas forcément une erreur explicite, mais un PDF incomplet ou différent de ce que l’utilisateur attend.

### 2.4 Génération PDF côté client

Le PDF est généré **côté client** via :
- `html2canvas` + `jsPDF`
- Chargement d’images depuis des URLs Supabase (`publicUrl` ou `url`)

**Risques possibles** :
- CORS sur les images : si les URLs Supabase ne sont pas correctement accessibles en cross-origin, `html2canvas` peut échouer silencieusement ou lever une erreur.
- Erreurs de chargement d’images : si une URL est invalide ou expirée, la génération peut échouer.
- Erreur capturée et remontée dans `pdfError` sans empêcher la finalisation.

### 2.5 Erreur PDF peu visible pour l’utilisateur

Si la génération PDF échoue, `finalizeCheckinDepart` renvoie :
```js
{ data: finalizedCheckin, error: null, pdfError: "..." }
```
`Section8ValidationMoto` se contente de :
```js
if (result.pdfError) {
  console.warn("[Moto Validation] ⚠️ PDF error during finalizeCheckinDepart:", result.pdfError);
}
```
L’utilisateur voit la modale de succès et est redirigé, sans message explicite que le PDF n’a pas été généré.

---

## 3) Vérifications recommandées

### 3.1 Vérifier la console navigateur

Lors d’une finalisation moto, ouvrir la console et chercher :
- `[CHECKIN_SERVICE] ❌ Erreur génération PDF`
- `[CheckinDepartPdfService] ❌`
- `Snapshot légal manquant`
- Erreurs CORS liées aux images

### 3.2 Vérifier les données en base avant finalisation

Pour un `checkin_depart` donné :
```sql
SELECT id, status, 
       jsonb_pretty(data->'step3') AS step3,
       snapshot_legal IS NOT NULL AS has_snapshot,
       legal_pdf_url
FROM checkin_depart
WHERE id = '<checkin_id>';
```

S’assurer que `data.step3` contient bien `zonesPhotos` et `damageReports` **avant** que le statut passe en `completed`.

### 3.3 Vérifier le snapshot légal après création

```sql
SELECT 
  snapshot_legal->'exterior'->'photos' AS exterior_photos,
  snapshot_legal->'exterior'->'damages' AS exterior_damages,
  snapshot_legal->'vehicle'->>'type_normalized' AS vehicle_type
FROM checkin_depart
WHERE id = '<checkin_id>';
```

Confirmer que les photos et dégâts sont bien présents et que `type_normalized` vaut `'moto'`.

---

## 4) Corrections proposées

### 4.1 Sauvegarder Step 3 avant finalisation (prioritaire)

Dans `Section8ValidationMoto.handleFinalize`, avant `finalizeCheckinDepart` :

1. Lire `zonesPhotos` et `damageReports` depuis le formulaire.
2. Appeler `saveStep3DraftMoto` si le checkin a un Step 3 modifié (ou si Step 3 n’est pas encore en base).

Cela garantit que les photos et dégâts sont bien en base au moment de la création du snapshot.

### 4.2 Éviter de contourner la sauvegarde Step 3

- Soit masquer le bouton « Suivant » parent quand on est sur l’étape 3 (et utiliser uniquement celui de la section).
- Soit faire en sorte que le bouton parent déclenche aussi la sauvegarde Step 3 avant de naviguer.

### 4.3 Afficher une alerte si le PDF échoue

Dans `Section8ValidationMoto`, si `result.pdfError` est défini :
- afficher un toast d’avertissement (ex. « L’état des lieux est finalisé, mais le document PDF n’a pas pu être généré. Il pourra être régénéré ultérieurement. »),
- au lieu de se contenter d’un `console.warn`.

### 4.4 Optionnel : Régénération manuelle du PDF

Ajouter un bouton (ex. sur la fiche booking propriétaire/locataire) « Régénérer le PDF » qui appelle `generateCheckinDepartPdf(checkinId)` et met à jour `legal_pdf_url` en cas de succès.

---

## 5) Fichiers impactés

| Fichier | Rôle |
|--------|------|
| `src/modules/etatDesLieuxDepartMoto/sections/Section8ValidationMoto.tsx` | Sauvegarde Step 3 avant finalisation, affichage d’erreur PDF |
| `src/modules/etatDesLieuxDepartMoto/sections/Section3ExterieurMoto.tsx` | Sauvegarde Step 3 (zonesPhotos, damageReports) |
| `src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx` | Gestion des boutons Suivant/Précédent |
| `src/services/checkinDepartService.ts` | `saveStep3DraftMoto`, `finalizeCheckinDepart` |
| `src/services/supabaseCheckinService.ts` | `createLegalSnapshot` (mapping moto) |
| `src/services/checkinDepartPdfService.ts` | `generateCheckinDepartPdf`, `generatePdfBlob` |

---

## 6) Références

- `DIAG-PHASE2-ETAT-DES-LIEUX-MOTO.md` — conception moto
- `DIAG-RETOUR-MOTO-VS-VOITURE-FACTUEL.md` — comparaison moto / voiture
- `DIAG-PLAN-CHECKING-VEHICLE-TYPE-SWITCH.md` — flux de génération du PDF
