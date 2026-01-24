# Diagnostic Crash Retour Stripe Checkout - Routing SPA

## 🔍 Cause racine principale

**Le fallback SPA dans Express est mal ordonné** : `express.static()` retourne une 404 si le fichier `/success` n'existe pas, et le fallback `app.get("/*splat", ...)` ne s'exécute jamais car Express arrête le traitement après la 404.

## 📋 Analyse détaillée

### 1. Vérification success_url ✅

**Fichier** : `supabase/functions/create-checkout-session/index.ts`  
**Ligne 502** : `success_url: ${successUrl}?session_id={CHECKOUT_SESSION_ID}`

✅ **Correct** : Le `session_id` est bien inclus dans l'URL.

### 2. Vérification route front ✅

**Fichier** : `src/App.tsx`  
**Ligne 110-114** : Route `/success` bien définie avec `PaymentSuccess` component

✅ **Correct** : La route existe dans React Router.

### 3. Problème identifié : Fallback SPA mal ordonné ❌

**Fichier** : `server/index.ts`  
**Lignes 834-849** :

```typescript
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  
  // Servir les fichiers statiques (CSS, JS, images, etc.)
  app.use(express.static(distPath));  // ⚠️ PROBLÈME ICI
  
  console.log(`📦 Serveur en mode PRODUCTION - Frontend servi depuis: ${distPath}`);
  
  // SPA fallback : toutes les routes non-API redirigent vers index.html
  app.get("/*splat", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
}
```

**Problème** :
- `express.static()` essaie de servir `/success` comme fichier statique
- Le fichier n'existe pas → Express retourne 404
- Le fallback `app.get("/*splat", ...)` ne s'exécute jamais car Express arrête après la 404

**Solution** : Utiliser `express.static()` avec `fallthrough: false` ou mieux, utiliser un middleware personnalisé qui vérifie d'abord si le fichier existe, sinon sert `index.html`.

### 4. Vérification PaymentSuccess ✅

**Fichier** : `src/pages/renter/PaymentSuccess.tsx`

✅ **Correct** :
- Récupère `session_id` depuis l'URL
- Gère les erreurs
- Attend 2 secondes pour laisser le webhook traiter
- Redirige vers `/me/renter/bookings?afterPayment=1`

### 5. Vérification logique "confirmed" ✅

**Fichier** : `src/pages/renter/RenterBookings.tsx`  
**Ligne 100** : Filtre inclut maintenant `status === 'confirmed'`

✅ **Correct** : La recherche inclut le status "confirmed" mis par le webhook.

## 🔧 Corrections à appliquer

### Correction 1 : Fixer le fallback SPA dans Express

**Fichier** : `server/index.ts`

**Remplacer lignes 834-849 par** :

```typescript
// 🚀 PRODUCTION : Servir le frontend buildé depuis le dossier dist/
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  
  console.log(`📦 Serveur en mode PRODUCTION - Frontend servi depuis: ${distPath}`);
  
  // Servir les fichiers statiques (CSS, JS, images, etc.)
  // fallthrough: false permet au middleware suivant de s'exécuter si le fichier n'existe pas
  app.use(express.static(distPath, { fallthrough: false }));
  
  // SPA fallback : toutes les routes non-API redirigent vers index.html
  // Cette route DOIT être déclarée APRÈS express.static pour capturer les 404
  app.get("*", (req, res, next) => {
    // Ignorer les routes API (elles sont déjà gérées plus haut)
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Servir index.html pour toutes les autres routes (SPA routing)
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        console.error("❌ [SPA Fallback] Erreur servage index.html:", err);
        res.status(500).send("Erreur serveur");
      }
    });
  });
} else {
  console.log(`🔧 Serveur en mode DÉVELOPPEMENT - Frontend sur ports 3012 (tenant) ou 3013 (owner) (Vite)`);
}
```

**Note** : `fallthrough: false` n'existe pas dans Express. La vraie solution est d'utiliser un middleware personnalisé ou de gérer les 404 différemment.

**Solution correcte** :

```typescript
// 🚀 PRODUCTION : Servir le frontend buildé depuis le dossier dist/
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  
  console.log(`📦 Serveur en mode PRODUCTION - Frontend servi depuis: ${distPath}`);
  
  // Servir les fichiers statiques (CSS, JS, images, etc.)
  app.use(express.static(distPath));
  
  // SPA fallback : toutes les routes non-API redirigent vers index.html
  // Cette route DOIT être déclarée APRÈS express.static pour capturer les routes non trouvées
  app.get("*", (req, res, next) => {
    // Ignorer les routes API (elles sont déjà gérées plus haut)
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Vérifier si c'est une requête pour un fichier statique (extension présente)
    const hasExtension = /\.[^/]+$/.test(req.path);
    if (hasExtension) {
      // C'est une requête pour un fichier statique qui n'existe pas → 404
      return res.status(404).send("File not found");
    }
    
    // Sinon, c'est une route SPA → servir index.html
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        console.error("❌ [SPA Fallback] Erreur servage index.html:", err);
        res.status(500).send("Erreur serveur");
      }
    });
  });
} else {
  console.log(`🔧 Serveur en mode DÉVELOPPEMENT - Frontend sur ports 3012 (tenant) ou 3013 (owner) (Vite)`);
}
```

### Correction 2 : Améliorer les logs dans PaymentSuccess

**Fichier** : `src/pages/renter/PaymentSuccess.tsx`

**Ajouter des logs plus détaillés** :

```typescript
useEffect(() => {
  // Log pour debug
  const fullUrl = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");
  
  console.log("🔍 [PaymentSuccess] Page chargée:", {
    fullUrl,
    pathname: window.location.pathname,
    search: window.location.search,
    sessionId: sessionId ? sessionId.substring(0, 15) + "..." : "MANQUANT",
    timestamp: new Date().toISOString(),
  });
  
  if (sessionId) {
    console.log("✅ [PaymentSuccess] Session ID reçu:", sessionId.substring(0, 15) + "...");
  } else {
    console.warn("⚠️ [PaymentSuccess] session_id manquant dans l'URL");
  }

  // Vérifier le paiement : attendre un peu pour laisser le webhook traiter
  const verifyPayment = async () => {
    try {
      console.log("⏳ [PaymentSuccess] Attente webhook (2s)...");
      // Attendre 2 secondes pour laisser le webhook Stripe traiter checkout.session.completed
      // Le webhook met à jour le status de la réservation en "confirmed"
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("✅ [PaymentSuccess] Redirection vers bookings...");
      setIsVerifying(false);
      // Rediriger vers les bookings avec le flag afterPayment
      navigate("/me/renter/bookings?afterPayment=1");
    } catch (err) {
      console.error("❌ [PaymentSuccess] Erreur vérification paiement:", err);
      setError("Erreur lors de la vérification du paiement. Veuillez rafraîchir la page.");
      setIsVerifying(false);
    }
  };

  verifyPayment();
}, [navigate]);
```

### Correction 3 : Ajouter logs dans Edge Function

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

**Déjà fait** : Les logs incluent maintenant le session_id et le type de clé Stripe.

## 📝 Patch code complet

### Patch 1 : server/index.ts (Fallback SPA)

```typescript
// Remplacer lignes 834-852
// 🚀 PRODUCTION : Servir le frontend buildé depuis le dossier dist/
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  
  console.log(`📦 Serveur en mode PRODUCTION - Frontend servi depuis: ${distPath}`);
  
  // Servir les fichiers statiques (CSS, JS, images, etc.)
  app.use(express.static(distPath));
  
  // SPA fallback : toutes les routes non-API redirigent vers index.html
  // Cette route DOIT être déclarée APRÈS express.static pour capturer les routes non trouvées
  app.get("*", (req, res, next) => {
    // Ignorer les routes API (elles sont déjà gérées plus haut)
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Vérifier si c'est une requête pour un fichier statique (extension présente)
    const hasExtension = /\.[^/]+$/.test(req.path);
    if (hasExtension) {
      // C'est une requête pour un fichier statique qui n'existe pas → 404
      return res.status(404).send("File not found");
    }
    
    // Sinon, c'est une route SPA → servir index.html
    console.log(`🔄 [SPA Fallback] Route SPA détectée: ${req.path} → index.html`);
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        console.error("❌ [SPA Fallback] Erreur servage index.html:", err);
        res.status(500).send("Erreur serveur");
      }
    });
  });
} else {
  console.log(`🔧 Serveur en mode DÉVELOPPEMENT - Frontend sur ports 3012 (tenant) ou 3013 (owner) (Vite)`);
}
```

### Patch 2 : src/pages/renter/PaymentSuccess.tsx (Logs améliorés)

Voir Correction 2 ci-dessus.

## ✅ Checklist de test

### Test 1 : Accès direct à /success

1. Ouvrir directement `https://rentanoo.com/success?session_id=cs_test_123` dans un nouvel onglet
2. **Résultat attendu** : La page PaymentSuccess s'affiche (pas de 404)
3. **Vérifier les logs console** :
   - `🔍 [PaymentSuccess] Page chargée:` avec les infos de l'URL
   - `✅ [PaymentSuccess] Session ID reçu:` ou `⚠️ [PaymentSuccess] session_id manquant`

### Test 2 : Paiement test complet

1. Lancer un paiement test sur rentanoo.com
2. Compléter le paiement sur Stripe Checkout
3. **Vérifier la redirection** :
   - URL doit contenir `?session_id=cs_test_...`
   - La page PaymentSuccess doit s'afficher (pas de crash)
4. **Vérifier les logs serveur** :
   - `🔄 [SPA Fallback] Route SPA détectée: /success → index.html`
5. **Vérifier les logs console navigateur** :
   - `🔍 [PaymentSuccess] Page chargée:`
   - `✅ [PaymentSuccess] Session ID reçu:`
   - `⏳ [PaymentSuccess] Attente webhook (2s)...`
   - `✅ [PaymentSuccess] Redirection vers bookings...`
6. **Vérifier la redirection finale** :
   - Redirection vers `/me/renter/bookings?afterPayment=1`
   - La réservation apparaît avec le bon statut (`confirmed`)

### Test 3 : Vérifier Supabase

1. Après le paiement, vérifier dans Supabase :
   - Table `bookings` → Status = `"confirmed"`
   - `stripe_checkout_session_id` présent
   - `paid_at` présent

### Test 4 : Vérifier les logs Edge Function

```bash
supabase functions logs create-checkout-session --project-ref tbsgzykqcksmqxpimwry
```

**Chercher** :
- `✅ [create-checkout-session] Session créée avec succès:` avec `sessionId`
- `success_url` doit contenir `?session_id={CHECKOUT_SESSION_ID}`

## 🚨 Troubleshooting

### Problème : Toujours 404 sur /success

**Vérifications** :
1. ✅ Vérifier que `NODE_ENV=production` est défini sur Railway
2. ✅ Vérifier que le dossier `dist/` existe après le build
3. ✅ Vérifier que `index.html` existe dans `dist/`
4. ✅ Vérifier les logs serveur pour voir si le fallback s'exécute

### Problème : Page blanche / erreur React

**Vérifications** :
1. ✅ Vérifier la console navigateur pour les erreurs JavaScript
2. ✅ Vérifier que React Router est bien initialisé
3. ✅ Vérifier que la route `/success` est bien définie dans `App.tsx`

### Problème : session_id manquant

**Vérifications** :
1. ✅ Vérifier que `success_url` dans l'Edge Function contient `?session_id={CHECKOUT_SESSION_ID}`
2. ✅ Vérifier que Stripe remplace bien `{CHECKOUT_SESSION_ID}` (vérifier dans les logs Stripe Dashboard)

## 📊 Résumé des causes probables (par probabilité)

1. **🔴 Très probable** : Fallback SPA mal ordonné dans Express (404 avant fallback)
2. **🟡 Probable** : `NODE_ENV` pas défini en production (serveur en mode dev)
3. **🟢 Moins probable** : Dossier `dist/` absent ou `index.html` manquant
4. **🟢 Moins probable** : Route `/success` mal définie dans React Router

## 🎯 Action immédiate recommandée

1. **Appliquer le Patch 1** (fixer le fallback SPA dans `server/index.ts`)
2. **Appliquer le Patch 2** (améliorer les logs dans `PaymentSuccess.tsx`)
3. **Redéployer sur Railway**
4. **Tester avec Test 1** (accès direct à `/success`)
5. **Tester avec Test 2** (paiement complet)

