# Diagnostic: Stripe Redirect → localhost refused (NO FIX)

**Date**: 2025-01-XX  
**Mode**: DIAG uniquement (pas de modification, pas de changement de secrets)  
**Erreur**: `ERR_CONNECTION_REFUSED` lors de la redirection Stripe vers `http://localhost:5173/paiement/success`

---

## 1) Vérification: D'où viennent les URLs de redirect Stripe

### Fichier: `supabase/functions/create-checkout-session/index.ts`

### Source des URLs

**Lignes 308-309**:
```typescript
const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");
```

**Lignes 357-358** (utilisation dans Stripe):
```typescript
const session = await stripe.checkout.sessions.create({
  // ...
  success_url: successUrl,
  cancel_url: cancelUrl,
  // ...
});
```

### Conclusion

✅ **Les URLs proviennent UNIQUEMENT des variables d'environnement Supabase**:
- `STRIPE_SUCCESS_URL` (ligne 308)
- `STRIPE_CANCEL_URL` (ligne 309)

❌ **Aucune valeur calculée** depuis la requête (pas d'extraction depuis `origin` ou `host` headers)

**Preuve**: Le code utilise directement `Deno.env.get()` sans aucune transformation ou calcul.

---

## 2) Vérification: Config des secrets et cohérence (dev vs prod)

### Secrets attendus

| Secret | Format attendu | Exemple DEV | Exemple PROD |
|--------|---------------|-------------|--------------|
| `STRIPE_SUCCESS_URL` | URL complète (http/https + chemin) | `http://localhost:3012/success` | `https://rentanoo.com/success` |
| `STRIPE_CANCEL_URL` | URL complète (http/https + chemin) | `http://localhost:3012/cancel` | `https://rentanoo.com/cancel` |

### Documentation dans le repo

**Fichier**: `supabase/functions/create-checkout-session/index.ts` (lignes 6-10)
```typescript
 * - STRIPE_SUCCESS_URL : URL de redirection après paiement réussi
 *   ⚠️ EN DEV LOCAL : Utiliser http://localhost:3012/success (tenant) ou http://localhost:3013/success (owner)
 *   ⚠️ Configurer selon l'instance utilisée (tenant sur 3012, owner sur 3013)
 * - STRIPE_CANCEL_URL : URL de redirection après annulation
 *   ⚠️ EN DEV LOCAL : Utiliser http://localhost:3012/cancel (tenant) ou http://localhost:3013/cancel (owner)
```

**Fichier**: `CHANGELOG-PORTS-3012-3013.md` (lignes 68-69)
```markdown
   - `STRIPE_SUCCESS_URL` : `http://localhost:3012/success` (tenant) ou `http://localhost:3013/success` (owner)
   - `STRIPE_CANCEL_URL` : `http://localhost:3012/cancel` (tenant) ou `http://localhost:3013/cancel` (owner)
```

### Mentions de `success`, `cancel`, `paiement/success`

**Routes React Router** (`src/App.tsx` lignes 79-80):
```typescript
<Route path="/success" element={<PaymentSuccess />} />
<Route path="/cancel" element={<PaymentCancel />} />
```

**Conclusion**:
- ✅ Routes existantes: `/success` et `/cancel` (pas `/paiement/success`)
- ⚠️ **Incohérence**: L'utilisateur mentionne `localhost:5173/paiement/success` mais:
  - La route réelle est `/success` (pas `/paiement/success`)
  - Le port documenté est `3012` ou `3013` (pas `5173`)

---

## 3) Vérification: Port réel du serveur front

### Configuration Vite

**Fichier**: `vite.config.ts` (lignes 11, 15-17)
```typescript
const devPort = Number(process.env.VITE_DEV_PORT || process.env.PORT || 3002);

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: devPort,
    // ...
  },
}));
```

**Port par défaut**: `3002` (si `VITE_DEV_PORT` et `PORT` ne sont pas définis)

### Scripts package.json

**Fichier**: `package.json` (lignes 12-13)
```json
"dev:tenant": "cross-env VITE_APP_CONTEXT=tenant vite --port 3012",
"dev:owner": "cross-env VITE_APP_CONTEXT=owner vite --port 3013",
```

**Ports configurés**:
- `dev:tenant` → Port `3012` (forcé via `--port 3012`)
- `dev:owner` → Port `3013` (forcé via `--port 3013`)
- `dev` (sans option) → Port `3002` (défaut dans vite.config.ts)

### Comportement Vite si port occupé

**Comportement Vite**:
- Si le port spécifié est **occupé**, Vite affiche un message et **propose un port alternatif**
- Vite peut **basculer automatiquement** sur un port disponible (ex: `5173`, `5174`, etc.)
- Le message dans le terminal indique le port réel utilisé

**Exemple**:
```
Port 3012 is in use, trying another one...
  ➜  Local:   http://localhost:5173/
```

**Conclusion**: ⚠️ **Le port peut changer automatiquement** si `3012` ou `3013` est occupé, mais les secrets Stripe pointent toujours vers le port configuré initialement.

---

## 4) Vérification: Route existe et SPA peut répondre

### Routes React Router

**Fichier**: `src/App.tsx` (lignes 79-80)
```typescript
<Route path="/success" element={<PaymentSuccess />} />
<Route path="/cancel" element={<PaymentCancel />} />
```

**Composants**:
- `PaymentSuccess` (`src/pages/renter/PaymentSuccess.tsx`) - ✅ Existe
- `PaymentCancel` (`src/pages/renter/PaymentCancel.tsx`) - ✅ Existe

### Route `/paiement/success`

❌ **Route `/paiement/success` n'existe PAS** dans le router React.

**Routes disponibles**:
- ✅ `/success` (existe)
- ✅ `/cancel` (existe)
- ❌ `/paiement/success` (n'existe pas)
- ❌ `/paiement/cancel` (n'existe pas)

### SPA fallback (Vite dev server)

**Vite dev server**:
- ✅ Sert automatiquement `index.html` pour toutes les routes (SPA mode)
- ✅ Les routes React Router fonctionnent même avec un refresh direct
- ✅ Pas besoin de configuration spéciale en dev

**Conclusion**: ✅ Le serveur Vite peut servir `/success` et `/cancel` correctement, mais **pas `/paiement/success`**.

---

## 5) Hypothèses classées

### Cause #1: Port incorrect dans les secrets Stripe (PROBABILITÉ: 80%)

**Hypothèse**: Les secrets `STRIPE_SUCCESS_URL` et `STRIPE_CANCEL_URL` pointent vers `localhost:5173` alors que le serveur Vite tourne sur un autre port (`3012`, `3013`, ou un port alternatif).

**Preuve**:
- La doc mentionne `localhost:3012` ou `localhost:3013` (pas `5173`)
- Vite peut basculer automatiquement sur `5173` si le port configuré est occupé
- Les secrets Stripe sont statiques et ne s'adaptent pas au port réel du serveur

**Scénario**:
1. L'utilisateur lance `npm run dev:tenant` (devrait être sur `3012`)
2. Le port `3012` est occupé → Vite bascule sur `5173`
3. Les secrets Stripe pointent vers `localhost:5173/success` (ou un autre port)
4. Mais le serveur tourne réellement sur un autre port → `ERR_CONNECTION_REFUSED`

**Vérification**:
```bash
# Vérifier le port réel du serveur Vite
# Dans le terminal où Vite tourne, chercher:
# "Local:   http://localhost:XXXX/"

# Vérifier les secrets configurés
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE
```

---

### Cause #2: Chemin incorrect dans les secrets Stripe (PROBABILITÉ: 15%)

**Hypothèse**: Les secrets `STRIPE_SUCCESS_URL` pointent vers `/paiement/success` alors que la route réelle est `/success`.

**Preuve**:
- L'utilisateur mentionne `localhost:5173/paiement/success`
- La route réelle dans React Router est `/success` (pas `/paiement/success`)
- Les secrets peuvent avoir été configurés avec le mauvais chemin

**Scénario**:
1. Les secrets Stripe pointent vers `http://localhost:5173/paiement/success`
2. La route réelle est `/success` (pas `/paiement/success`)
3. Stripe redirige vers `/paiement/success` → Route non trouvée (404 ou erreur)

**Vérification**:
```bash
# Vérifier les secrets configurés
supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE_SUCCESS_URL

# Vérifier si le chemin contient "/paiement/success" ou "/success"
```

---

### Cause #3: Serveur Vite arrêté après le paiement (PROBABILITÉ: 5%)

**Hypothèse**: Le serveur Vite a été arrêté après avoir lancé le paiement Stripe, donc quand Stripe redirige, le serveur n'est plus disponible.

**Preuve**:
- L'erreur `ERR_CONNECTION_REFUSED` indique que rien n'écoute sur le port
- Si le serveur Vite est arrêté, aucune application n'écoute sur `localhost:5173`

**Scénario**:
1. L'utilisateur lance le paiement Stripe
2. Le serveur Vite tourne sur `localhost:5173`
3. L'utilisateur arrête le serveur Vite (ou il crash)
4. Stripe redirige vers `localhost:5173/success` → `ERR_CONNECTION_REFUSED`

**Vérification**:
```bash
# Vérifier si le serveur Vite tourne encore
# Dans le terminal, chercher le processus Vite
ps aux | grep vite

# Ou vérifier si le port est ouvert
lsof -i :5173
# ou
netstat -an | grep 5173
```

---

## 6) Ce que je vérifierais en 30 secondes

### Commandes à exécuter (sans les exécuter)

1. **Vérifier le port réel du serveur Vite**:
   ```bash
   # Dans le terminal où Vite tourne, chercher:
   # "Local:   http://localhost:XXXX/"
   # Noter le port réel (peut être différent de 3012/3013/5173)
   ```

2. **Vérifier les secrets Stripe configurés**:
   ```bash
   supabase secrets list --project-ref tbsgzykqcksmqxpimwry | grep STRIPE
   # Vérifier:
   # - Le port dans les URLs (doit correspondre au port réel du serveur)
   # - Le chemin dans les URLs (doit être "/success" et "/cancel", pas "/paiement/success")
   ```

3. **Vérifier si le serveur Vite tourne encore**:
   ```bash
   # Vérifier si le processus Vite est actif
   ps aux | grep vite
   # ou
   lsof -i :5173
   ```

4. **Tester l'accès direct à la route**:
   ```bash
   # Ouvrir dans le navigateur:
   http://localhost:XXXX/success
   # (remplacer XXXX par le port réel du serveur)
   # Si ça fonctionne, la route existe et le serveur répond
   ```

5. **Vérifier les routes React Router**:
   ```bash
   # Chercher dans src/App.tsx:
   grep -n "path.*success\|path.*cancel" src/App.tsx
   # Confirmer que les routes sont "/success" et "/cancel" (pas "/paiement/success")
   ```

---

## 7) Résumé exécutif

### Problème identifié

**Erreur**: `ERR_CONNECTION_REFUSED` lors de la redirection Stripe vers `http://localhost:5173/paiement/success`

**Incohérences détectées**:
1. ⚠️ **Port**: L'utilisateur mentionne `5173`, mais la doc mentionne `3012` ou `3013`
2. ⚠️ **Chemin**: L'utilisateur mentionne `/paiement/success`, mais la route réelle est `/success`
3. ⚠️ **Port dynamique**: Vite peut changer de port automatiquement si le port configuré est occupé

### Causes probables

1. **#1 (80%)**: Port incorrect dans les secrets Stripe (pointent vers `5173` alors que le serveur tourne sur un autre port)
2. **#2 (15%)**: Chemin incorrect dans les secrets Stripe (pointent vers `/paiement/success` au lieu de `/success`)
3. **#3 (5%)**: Serveur Vite arrêté après le paiement

### Actions de vérification

1. Vérifier le port réel du serveur Vite (dans le terminal)
2. Vérifier les secrets Stripe configurés (port + chemin)
3. Vérifier que le serveur Vite tourne encore
4. Tester l'accès direct à `/success` (pas `/paiement/success`)

---

**Note**: Ce diagnostic est **uniquement informatif**. Aucune modification n'a été apportée au code ou aux secrets. Les actions correctives doivent être effectuées manuellement après vérification des secrets dans Supabase Dashboard.

