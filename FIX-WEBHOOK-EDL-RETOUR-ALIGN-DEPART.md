# Fix webhook EDL retour — alignement sur EDL départ

## 1. Appel webhook DEPART (référence)

**Fichier** : `src/services/checkinDepartService.ts` (lignes 1077-1130)

**Bloc exact** :

```ts
if (finalizedCheckin.status === "completed") {
  const n8nWebhookUrl = 
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_N8N_WEBHOOK_CHECKIN_DEPART_URL) ||
    "https://n8n.srv1285649.hstgr.cloud/webhook/checkin-depart-updated";

  console.log("[CHECKIN_SERVICE] 📧 Appel webhook n8n pour envoi email EDL...");

  try {
    const n8nPayload = {
      event: "checkin_depart_completed",
      checkinId: params.checkinId,
      bookingId: params.bookingId,
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // ... logs succès/erreur ...
  } catch (n8nError: any) {
    // Ne pas bloquer la finalisation
    console.warn("[CHECKIN_SERVICE] ⚠️ Erreur appel webhook n8n (non-bloquant):", {...});
  }
}
```

---

## 2. Champs envoyés au webhook DÉPART

| Champ      | Valeur                          | Format  |
|-----------|----------------------------------|---------|
| `event`   | `"checkin_depart_completed"`    | string  |
| `checkinId` | UUID du `checkin_depart`      | string  |
| `bookingId` | UUID de la réservation        | string  |
| `timestamp` | ISO 8601                      | string  |

- **Méthode** : `POST`
- **Headers** : `Content-Type: application/json`
- **Body** : JSON (via `JSON.stringify(n8nPayload)`)
- **Pas de query params** : tout est dans le body

---

## 3. Modifications appliquées au RETOUR

**Fichier** : `src/services/checkinReturnService.ts` (finalizeCheckinReturn)

### Changements

1. **Ordre des champs** : aligné sur le départ  
   - Avant : `checkinId`, `event`, `bookingId`, `timestamp`  
   - Après : `event`, `checkinId`, `bookingId`, `timestamp`

2. **Payload** : même structure que le départ  
   - `event: "checkin_return_completed"`
   - `checkinId: checkinReturnId` (UUID `checkin_return.id`)
   - `bookingId`
   - `timestamp: new Date().toISOString()`

3. **Body explicite** : `bodyStr = JSON.stringify(n8nPayload)` utilisé dans le `fetch` pour éviter tout doute sur le body envoyé.

4. **Logs de debug** ajoutés avant l’appel :
   - `url`
   - `method: "POST"`
   - `body` (string JSON)
   - `payloadKeys`

5. **Gestion des erreurs** : inchangée (timeout 8 s + catch sans throw).

---

## 4. Pourquoi n8n pouvait recevoir `body: {}`

- Le code côté app était déjà correct : `method: "POST"`, `Content-Type: application/json`, `body: JSON.stringify(payload)`.
- Si n8n affichait quand même `body: {}`, causes probables :
  1. **Configuration n8n** : le nœud Webhook du workflow RETOUR est configuré pour une méthode autre que POST (ex. GET), et n8n n’expose alors pas le body.
  2. **Réception différente** : le workflow RETOUR lit autre chose que `$json.body` ou `$input.body`.
  3. **CORS / preflight** : cas particulier pouvant impacter certains navigateurs ou environnements (moins probable si le départ fonctionne).

**Recommandation n8n** : dans le workflow RETOUR, vérifier que le nœud Webhook accepte bien `POST` et lit le body JSON (ex. `{{ $json.body }}` ou via le nœud « HTTP Request » / paramètre body).

---

## 5. URLs

| EDL     | URL |
|--------|-----|
| DÉPART | `https://n8n.srv1285649.hstgr.cloud/webhook/checkin-depart-updated` |
| RETOUR | `https://n8n.srv1285649.hstgr.cloud/webhook/7da2e622-bc36-44b3-b716-68e088522a54` |
