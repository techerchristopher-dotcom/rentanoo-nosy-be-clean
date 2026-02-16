# DIAG API SetupIntent — "Erreur lors de la création du formulaire de saisie"

**Mode** : DIAG ONLY — aucun fichier modifié.  
**Objectif** : Identifier la cause de l’erreur affichée dans DepositFlowModal.

---

## 1️⃣ FRONT — Appel réseau

### Fonction `createSetupIntentClientSecret`

**Fichier** : `src/lib/depositCaution.ts` L.14-38

```typescript
export async function createSetupIntentClientSecret(bookingId: string): Promise<{ clientSecret: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("Vous devez être connecté pour activer la caution.");
  }

  const res = await fetch(`${API_BASE}/api/deposit/create-setup-intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ bookingId }),
  });

  const raw = await res.text();
  const json = safeParseResponse(raw);
  if (!res.ok) {
    const msg = (json?.message as string) || (json?.error as string) || raw || "Erreur lors de la création du formulaire de saisie";
    throw new Error(typeof msg === "string" ? msg : "Erreur lors de la création du formulaire de saisie");
  }
  if (!json?.clientSecret) {
    throw new Error(raw ? "Réponse serveur invalide (format JSON attendu)" : "Réponse serveur vide");
  }
  return { clientSecret: String(json.clientSecret) };
}
```

### Détails de l’appel

| Élément | Valeur |
|--------|--------|
| **URL** | `/api/deposit/create-setup-intent` (relatif, donc `http://localhost:3002/api/deposit/create-setup-intent` si front sur 3002) |
| **Méthode** | POST |
| **Headers** | `Content-Type: application/json`, `Authorization: Bearer <JWT>` |
| **Body** | `{ "bookingId": "<uuid>" }` |
| **Parsing** | `const raw = await res.text()` puis `safeParseResponse(raw)` — **plus de `res.json()`** |

### Quand le message "Erreur lors de la création du formulaire de saisie" apparaît

Ce message est utilisé uniquement lorsque :

1. `!res.ok` (status 4xx ou 5xx)
2. **et** `json?.message` est falsy
3. **et** `json?.error` est falsy  
4. **et** `raw` est falsy (body vide)

Autrement dit : **réponse non-2xx avec un body vide**.  
Si le serveur renvoie du JSON avec `message` ou `error`, c’est ce texte qui est affiché, pas ce message générique.

---

## 2️⃣ NETWORK — Réponse du backend

À vérifier dans l’onglet **Network** (F12) lors du clic « Activer la caution » :

- **STATUS** : code HTTP de la réponse
- **HEADERS** : au moins `Content-Type` de la réponse
- **BODY** : contenu brut de la réponse

Si le status est 4xx/5xx et le body vide → c’est cohérent avec le message d’erreur affiché.

---

## 3️⃣ SERVER — Route `create-setup-intent`

**Fichier** : `server/index.ts` L.264-342

```typescript
app.post("/api/deposit/create-setup-intent", async (req, res) => {
  try {
    const authResult = await getAuthUserFromRequest(req);
    if (!authResult) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Token d'authentification requis ou invalide" });
    }
    const { user } = authResult;

    const { bookingId } = req.body;
    if (!bookingId || typeof bookingId !== "string") {
      return res.status(400).json({ ok: false, error: "MISSING_BOOKING_ID", message: "bookingId requis" });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin.from("bookings")...

    if (bookingErr || !booking) {
      return res.status(404).json({ ok: false, error: "BOOKING_NOT_FOUND", message: "Réservation introuvable" });
    }

    if (booking.user_id !== user.id) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Cette réservation ne vous appartient pas" });
    }

    // ... validation deposit_status, status allowed, etc.

    return res.status(200).json({ clientSecret: setupIntent.client_secret });
  } catch (err: any) {
    console.error("[deposit/create-setup-intent] Error:", err?.message || err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Erreur serveur" });
  }
});
```

Tous les chemins d’erreur renvoient du **JSON avec `message`**.  
Donc si la requête atteint Express, le front ne devrait pas afficher « Erreur lors de la création du formulaire de saisie » sauf si ce JSON est mal parsé ou inaccessible.

---

## 4️⃣ Point important : status `pending_payment` vs `confirmed`

**Validation dans la route** : L.295-298

```typescript
const allowedStatuses = ["confirmed", "accepted"];
if (!allowedStatuses.includes(booking.status)) {
  return res.status(400).json({ ok: false, error: "INVALID_BOOKING_STATUS", message: "Statut de réservation incompatible" });
}
```

Tes logs indiquent : `status: "pending_payment"`.

`"pending_payment"` n’est **pas** dans `allowedStatuses`.  
Dans ce cas, le serveur répond :

- Status : 400  
- Body :  
  `{ "ok": false, "error": "INVALID_BOOKING_STATUS", "message": "Statut de réservation incompatible" }`

Donc tu devrais voir **« Statut de réservation incompatible »**, pas « Erreur lors de la création du formulaire de saisie », **si** la requête arrive bien sur Express et que le body est reçu.

---

## 5️⃣ Proxy Vite (crucial)

**Fichier** : `vite.config.ts` L.19-24

```typescript
proxy: {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
    secure: false,
  },
},
```

- Le front sert les pages (par ex. sur 3002).
- Les requêtes vers `/api/*` sont proxyfiées vers `http://localhost:3001`.

Si **aucun serveur Express n’écoute sur 3001** :

- Le proxy renverra typiquement une réponse d’erreur (502, 504, etc.).
- Le body peut être vide ou du HTML.
- Dans ce cas, le front reçoit une réponse non-2xx avec un body vide ou non-JSON → le message générique « Erreur lors de la création du formulaire de saisie » apparaît.

---

## 6️⃣ Variables d’environnement serveur

Variables utilisées :

| Variable | Où | Usage |
|----------|----|--------|
| `SUPABASE_URL` | `server/index.ts` L.59, `depositAuth.ts` L.7 | Client Supabase admin + validation JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | `server/index.ts` L.60 | Client Supabase admin |
| `SUPABASE_ANON_KEY` | `depositAuth.ts` L.8 | Validation JWT `getAuthUserFromRequest` |
| `STRIPE_SECRET_KEY` | `server/lib/stripe.ts` L.24 | Création SetupIntent |

Si une de ces variables est absente :

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` manquants → `getAuthUserFromRequest` log `[depositAuth] SUPABASE_URL or SUPABASE_ANON_KEY missing` et renvoie `null` → 401 avec un body JSON valide.
- `STRIPE_SECRET_KEY` manquante → `getStripe()` lève une erreur → 500 via le `catch` → réponse JSON valide.

Donc, tant que la route est atteinte, les erreurs sont renvoyées en JSON et ne devraient pas produire le message générique.

---

## 7️⃣ Conclusion — causes probables

| Option | Description |
|--------|-------------|
| **A — Route non atteinte** | Serveur API non lancé sur 3001 → proxy Vite renvoie une erreur avec body vide ou HTML. |
| **B — 401 auth** | Renvoi JSON explicite `{ message: "Token..." }` → le front devrait afficher ce message, pas le générique. |
| **C — 400 métier** | Idem, réponse JSON avec `message`. |
| **D — 500 Stripe** | Idem, réponse JSON avec `message` ou `err?.message`. |
| **E — Réponse non JSON / vide** | Cohérent avec le message générique : proxy ou autre middleware renvoie un body vide ou non-JSON. |
| **F — Erreur CORS / proxy** | CORS ne renvoie en général pas une réponse vide, mais un échec réseau peut parfois donner un corps vide. |

Causes les plus plausibles :

1. **Serveur API non démarré** : seul `npm run dev` (Vite) tourne, pas `npm run dev:api` → proxy vers 3001 échoue → body vide ou HTML.
2. **Mauvais port** : `server/index.ts` L.1070 utilise `PORT` (par défaut **3000**), alors que le proxy Vite cible **3001**. Si `PORT` n’est pas défini à 3001, le serveur écoute sur 3000 et le proxy ne trouve rien sur 3001.

---

## 8️⃣ Actions de vérification

1. **Lancer le serveur API** : `npm run dev:api` ou `PORT=3001 npm run dev:api` pour qu’il écoute sur 3001 (port ciblé par le proxy Vite).
2. **Ouvrir l’onglet Network** lors du clic « Activer la caution ».
3. **Inspecter la requête** vers `create-setup-intent` : status, headers, body.
4. **Vérifier les logs serveur** au moment du clic.
5. **Si le booking est en `pending_payment`** : soit adapter `allowedStatuses` pour inclure `pending_payment`, soit s’assurer que le CTA n’apparaît que pour des bookings `confirmed` (cohérence métier).
