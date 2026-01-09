# 📊 RAPPORT DE DIAGNOSTIC - DÉPLOIEMENT RENTANOO NOSY BE

**Date** : 2025-01-27  
**Projet** : Rentanoo Nosy Be - Plateforme de location de véhicules  
**Version** : Analyse complète pour recommandation plateforme de déploiement

---

## 🎯 A) RÉSUMÉ RAPIDE

### Type de Projet

**Architecture** : **Vite React SPA + Express.js backend monolithique**

- **Frontend** : React 18 + TypeScript + Vite (SPA)
- **Backend** : Express.js 5 (API REST + service du frontend buildé)
- **Type de rendu** : SPA (Single Page Application) - Client-side routing
- **Build** : Vite build → dossier `dist/`
- **Production** : Express sert le frontend statique + API sur le **même port**

### Composants Identifiés

| Composant | Technologie | Détails |
|----------|-----------|---------|
| **Frontend** | React + Vite | SPA avec react-router-dom |
| **Backend API** | Express.js | Routes `/api/*` |
| **Base de données** | Supabase (PostgreSQL) | DB hébergée, pas de migration locale |
| **Authentification** | Supabase Auth | Gestion complète des sessions |
| **Paiements** | Stripe | Checkout sessions + webhooks |
| **Emails** | Nodemailer | SMTP (Gmail ou autre) |
| **Stockage fichiers** | Supabase Storage | (probable, via Supabase) |
| **Webhooks** | Express + Edge Functions | Stripe webhooks (double implémentation) |

### Contraintes Techniques

✅ **Compatibles avec toutes les plateformes** :
- Pas de WebSockets
- Pas de cron jobs / tâches planifiées
- Pas de besoins de temps réel (polling classique)
- Pas de dépendances système spécifiques

⚠️ **Points d'attention** :
- **Webhooks Stripe** : Nécessitent une URL publique accessible (HTTPS)
- **SMTP** : Configuration email requise (variables d'environnement)
- **Supabase Edge Functions** : Déployées séparément sur Supabase (pas de déploiement nécessaire)
- **Variables d'environnement** : Nombreuses (voir section détaillée)

---

## 🔍 B) ANALYSE DÉTAILLÉE

### 1. Nature du Projet

#### Framework Frontend

```9:16:package.json
  "scripts": {
    "dev": "vite",
    "dev:renter": "vite --port 3000",
    "dev:tenant": "cross-env VITE_APP_CONTEXT=tenant vite --port 3012",
    "dev:owner": "cross-env VITE_APP_CONTEXT=owner vite --port 3013",
    "dev:3002": "vite --port 3002",
    "build": "vite build",
```

- **Framework** : Vite 5.4.19 + React 18.3.1
- **Type** : SPA (Single Page Application)
- **Routing** : Client-side (`react-router-dom`)
- **Build output** : `dist/` (fichiers statiques)

#### Backend

```14:25:server/index.ts
const app = express();
app.use(cors());

// Webhook Stripe nécessite le body RAW. On MONTE d'abord la route webhook (avec express.raw)
// puis ensuite seulement le parser JSON global.

// Supabase admin client (service role) pour mises à jour serveur
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);
```

- **Framework** : Express.js 5.1.0
- **Type** : API REST + serveur de fichiers statiques
- **Port** : 3000 (configurable via `PORT`)
- **Production** : Sert le frontend buildé depuis `dist/` + routes API

#### Configuration Build

```662:678:server/index.ts
// 🚀 PRODUCTION : Servir le frontend buildé depuis le dossier dist/
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  
  // Servir les fichiers statiques (CSS, JS, images, etc.)
  app.use(express.static(distPath));
  
  console.log(`📦 Serveur en mode PRODUCTION - Frontend servi depuis: ${distPath}`);
  
  // SPA fallback : toutes les routes non-API redirigent vers index.html
  // Express 5 / path-to-regexp v8 : wildcard must be named
  app.get("/*splat", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
} else {
  console.log(`🔧 Serveur en mode DÉVELOPPEMENT - Frontend sur ports 3012 (tenant) ou 3013 (owner) (Vite)`);
}
```

**Architecture de production** :
- Express sert les fichiers statiques depuis `dist/`
- Routes `/api/*` → API Express
- Toutes les autres routes → `index.html` (SPA fallback)

### 2. Dépendances Critiques

#### Base de Données : Supabase

```6:7:src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

- **Type** : Supabase (PostgreSQL hébergé)
- **URL** : `https://zykwfjxurwmputxwlkxs.supabase.co` (projet principal)
- **Accès** : Via SDK client (frontend) + Service Role Key (backend)
- **Pas de migration locale** : DB hébergée, pas besoin de PostgreSQL local

#### Authentification : Supabase Auth

```33:39:src/integrations/supabase/client.ts
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    storageKey: storageKey, // Isolation des sessions par contexte (tenant vs owner)
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

- **Provider** : Supabase Auth (intégré)
- **Stockage** : localStorage (côté client)
- **Pas de configuration serveur** : Géré par Supabase

#### Paiements : Stripe

**Frontend** :
```61:62:package.json
    "@stripe/react-stripe-js": "^5.3.0",
    "@stripe/stripe-js": "^8.2.0",
```

**Backend** :
```94:94:package.json
    "stripe": "^19.2.0",
```

**Edge Functions Supabase** :
- `create-checkout-session` : Création de sessions Stripe Checkout
- `stripe-webhook` : Traitement des webhooks Stripe

**Webhook Express** :
```28:190:server/index.ts
// Route Webhook Stripe - DOIT être déclarée avant app.use(express.json())
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
```

**⚠️ Important** : Le projet a **deux implémentations de webhooks Stripe** :
1. **Express webhook** : `/api/stripe/webhook` (server/index.ts)
2. **Edge Function** : `stripe-webhook` (supabase/functions/stripe-webhook/)

**Recommandation** : Utiliser une seule implémentation en production (Edge Function recommandée car plus simple à maintenir).

#### Emails : Nodemailer

```81:81:package.json
    "nodemailer": "^7.0.12",
```

```266:330:server/index.ts
    // Utiliser nodemailer si disponible, sinon fallback simple
    try {
      const nodemailer = await import("nodemailer");
      
      // Configuration du transporteur (SMTP)
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true pour 465, false pour autres ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
```

- **Provider** : Nodemailer (SMTP)
- **Configuration** : Variables d'environnement SMTP
- **Usage** : Formulaire de contact (`/api/contact`)

### 3. Architecture Déployable

#### Structure Monolithique

Le projet est conçu pour tourner en **une seule application** :

```682:688:server/index.ts
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`🚀 API backend démarrée sur http://localhost:${PORT}`);
  if (process.env.NODE_ENV === "production") {
    console.log(`✅ Frontend et API disponibles sur le même port: ${PORT}`);
  }
});
```

**En production** :
- Frontend buildé servi par Express
- API sur `/api/*`
- **Même port** pour tout (3000 par défaut)

#### Scripts NPM

```9:31:package.json
  "scripts": {
    "dev": "vite",
    "dev:renter": "vite --port 3000",
    "dev:tenant": "cross-env VITE_APP_CONTEXT=tenant vite --port 3012",
    "dev:owner": "cross-env VITE_APP_CONTEXT=owner vite --port 3013",
    "dev:3002": "vite --port 3002",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "dev:api": "tsx server/index.ts",
    "start": "tsx server/index.ts",
    "start:prod": "NODE_ENV=production tsx server/index.ts",
```

**Scripts de production** :
- `build` : Build Vite → `dist/`
- `start:prod` : Démarre Express en production (sert `dist/` + API)

#### Port Attendu

```682:682:server/index.ts
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
```

- **Par défaut** : 3000
- **Configurable** : Via variable d'environnement `PORT`
- **Toutes les plateformes** : Supportent la configuration de port

#### Besoin Serveur Long-Running

✅ **Oui** : Express.js nécessite un serveur long-running (pas serverless)

**Incompatible avec** :
- ❌ Vercel Serverless Functions (limite 10s)
- ❌ Netlify Functions (limite 10s)
- ✅ Railway, Render, DigitalOcean, Fly.io, VPS : Compatibles

### 4. Containerisation / Infrastructure

#### Nixpacks Configuration

```1:14:nixpacks.toml
# Force Nixpacks to use Node.js 22 avec npm (inclus)

[phases.setup]
nixPkgs = ["nodejs_22"]

[phases.install]
cmds = ["npm ci --include=dev"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start:prod"
```

- **Présent** : `nixpacks.toml` (Railway/Render compatible)
- **Dockerfile** : ❌ Absent
- **docker-compose.yml** : ❌ Absent

**Compatible avec** :
- ✅ Railway (détection automatique Nixpacks)
- ✅ Render (détection automatique Nixpacks)
- ⚠️ Autres plateformes : Nécessiteront un Dockerfile (facile à créer)

### 5. Variables d'Environnement Requises

#### Frontend (VITE_*)

```20:29:scripts/env-template-nosy-be.txt
VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
VITE_SUPABASE_ANON_KEY=[VOTRE_ANON_KEY]

# ============================================
# SITE URL (NOUVEAU DOMAINE)
# ============================================
#
# ⚠️ IMPORTANT : Changez rentanoo.yt en rentanoo.com
#
VITE_PUBLIC_SITE_URL=https://rentanoo.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_[VOTRE_CLE_STRIPE]
```

**Variables frontend** (injectées au build) :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_SITE_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`

#### Backend (sans préfixe VITE_)

```49:72:scripts/env-template-nosy-be.txt
# SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=[VOTRE_SERVICE_ROLE_KEY]
# STRIPE_SECRET_KEY=sk_test_[VOTRE_CLE_SECRETE_STRIPE]
# STRIPE_WEBHOOK_SECRET=whsec_[VOTRE_WEBHOOK_SECRET]

# ============================================
# EMAIL (Contact Form)
# ============================================
#
# Configuration pour l'envoi d'emails depuis le formulaire de contact
# Utilise Nodemailer avec SMTP
#
# EMAIL_TO=contact@rentanoo.com
# EMAIL_FROM=noreply@rentanoo.com
#
# Configuration SMTP (exemple Gmail)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=votre-email@gmail.com
# SMTP_PASS=votre-mot-de-passe-app
```

**Variables backend** :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EMAIL_TO`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `PORT` (optionnel, défaut: 3000)
- `NODE_ENV=production` (pour activer le mode production)

**Total** : ~15 variables d'environnement

---

## 🎯 C) RECOMMANDATIONS PAR PLATEFORME

### 🥇 RECOMMANDATION #1 : RAILWAY

#### Pourquoi Railway Correspond à Ce Projet

✅ **Points forts** :
1. **Détection automatique Nixpacks** : Votre `nixpacks.toml` sera utilisé automatiquement
2. **Déploiement simple** : Connectez GitHub → Railway détecte le projet → Déploiement automatique
3. **Variables d'environnement** : Interface graphique intuitive pour configurer les 15 variables
4. **Webhooks Stripe** : Railway fournit une URL HTTPS publique automatiquement
5. **Logs en temps réel** : Interface de logs intégrée
6. **SSL automatique** : Certificat HTTPS gratuit
7. **Scaling simple** : Augmentation de ressources en un clic
8. **Débutant-friendly** : Interface très simple, pas besoin de Docker

#### Coût Estimé Mensuel

- **Hobby Plan** : $5/mois (512MB RAM, 1 vCPU)
- **Pro Plan** : $20/mois (2GB RAM, 2 vCPU) - **Recommandé pour production**
- **Usage supplémentaire** : $0.000463/GB-heure de RAM

**Estimation pour ce projet** : **$20-30/mois** (Pro Plan + usage modéré)

#### Difficulté : ⭐⭐☆☆☆ (Débutant-friendly)

**Avantages pour débutants** :
- Interface graphique intuitive
- Pas besoin de Docker
- Documentation claire
- Support communautaire actif

#### Points d'Attention

1. **Variables d'environnement** :
   - Configurer toutes les variables dans l'interface Railway
   - ⚠️ **Important** : Les variables `VITE_*` doivent être configurées AVANT le build

2. **Webhooks Stripe** :
   - URL webhook : `https://votre-app.railway.app/api/stripe/webhook`
   - Configurer dans le dashboard Stripe

3. **Port** :
   - Railway définit automatiquement `PORT` (pas besoin de le configurer)
   - Votre code utilise déjà `process.env.PORT`

4. **Build** :
   - Railway exécute automatiquement `npm run build` (défini dans `nixpacks.toml`)
   - Puis `npm run start:prod`

#### Plan de Déploiement en 10 Étapes

1. **Créer un compte Railway** : https://railway.app
2. **Connecter GitHub** : Autoriser Railway à accéder à votre repo
3. **Créer un nouveau projet** : "New Project" → "Deploy from GitHub repo"
4. **Sélectionner le repo** : Choisir `rentanoo-nosy-be-clean`
5. **Configurer les variables d'environnement** :
   - Ouvrir "Variables" dans le projet
   - Ajouter toutes les variables (voir section Variables d'Environnement)
   - ⚠️ **Ordre important** : Configurer les variables AVANT le premier déploiement
6. **Déployer** : Railway détecte `nixpacks.toml` et déploie automatiquement
7. **Vérifier les logs** : Vérifier que le build et le démarrage réussissent
8. **Configurer le domaine** : "Settings" → "Generate Domain" (ou connecter un domaine personnalisé)
9. **Configurer Stripe Webhook** :
   - URL : `https://votre-domaine.railway.app/api/stripe/webhook`
   - Événements : `checkout.session.completed`
10. **Tester** : Vérifier que l'application fonctionne en production

**Temps estimé** : 30-45 minutes

---

### 🥈 RECOMMANDATION #2 : RENDER

#### Pourquoi Render Correspond à Ce Projet

✅ **Points forts** :
1. **Détection automatique Nixpacks** : Compatible avec votre `nixpacks.toml`
2. **Gratuit pour commencer** : Plan gratuit disponible (avec limitations)
3. **SSL automatique** : Certificat HTTPS gratuit
4. **Variables d'environnement** : Interface simple
5. **Webhooks Stripe** : URL HTTPS publique automatique
6. **Logs** : Interface de logs intégrée

#### Coût Estimé Mensuel

- **Free Plan** : $0/mois (limitations : spin down après 15 min d'inactivité)
- **Starter Plan** : $7/mois (512MB RAM, toujours actif)
- **Standard Plan** : $25/mois (2GB RAM, 2 vCPU) - **Recommandé pour production**

**Estimation pour ce projet** : **$25-35/mois** (Standard Plan)

#### Difficulté : ⭐⭐☆☆☆ (Débutant-friendly)

**Avantages pour débutants** :
- Interface simple
- Documentation claire
- Pas besoin de Docker

**Inconvénients** :
- Plan gratuit avec limitations (spin down)
- Interface légèrement moins intuitive que Railway

#### Points d'Attention

1. **Plan gratuit** : L'app "spin down" après 15 min d'inactivité (première requête lente)
2. **Variables d'environnement** : Configurer toutes les variables avant le build
3. **Webhooks Stripe** : URL : `https://votre-app.onrender.com/api/stripe/webhook`

#### Plan de Déploiement en 10 Étapes

1. **Créer un compte Render** : https://render.com
2. **Connecter GitHub** : Autoriser Render à accéder à votre repo
3. **Créer un nouveau Web Service** : "New" → "Web Service"
4. **Sélectionner le repo** : Choisir `rentanoo-nosy-be-clean`
5. **Configuration** :
   - **Name** : `rentanoo-nosy-be`
   - **Environment** : `Node`
   - **Build Command** : `npm run build` (détecté automatiquement)
   - **Start Command** : `npm run start:prod` (détecté automatiquement)
6. **Configurer les variables d'environnement** :
   - Section "Environment Variables"
   - Ajouter toutes les variables
7. **Choisir le plan** : Starter ($7/mois) ou Standard ($25/mois)
8. **Déployer** : Cliquer sur "Create Web Service"
9. **Configurer le domaine** : "Settings" → "Custom Domain" (ou utiliser le domaine Render)
10. **Configurer Stripe Webhook** : URL Render + `/api/stripe/webhook`

**Temps estimé** : 30-45 minutes

---

### 🥉 RECOMMANDATION #3 : DIGITALOCEAN APP PLATFORM

#### Pourquoi DigitalOcean Correspond à Ce Projet

✅ **Points forts** :
1. **App Platform** : Service PaaS simple (similaire à Railway/Render)
2. **Détection automatique** : Détecte Node.js et configure automatiquement
3. **SSL automatique** : Certificat HTTPS gratuit
4. **Variables d'environnement** : Interface simple
5. **Scaling** : Facile à scaler

⚠️ **Points d'attention** :
- Nécessite un Dockerfile OU configuration manuelle (pas de Nixpacks natif)
- Interface légèrement plus complexe que Railway/Render

#### Coût Estimé Mensuel

- **Basic Plan** : $12/mois (512MB RAM, 1 vCPU)
- **Professional Plan** : $24/mois (2GB RAM, 2 vCPU) - **Recommandé**

**Estimation pour ce projet** : **$24-30/mois**

#### Difficulté : ⭐⭐⭐☆☆ (Intermédiaire)

**Pourquoi plus complexe** :
- Pas de support Nixpacks natif (nécessite Dockerfile ou configuration manuelle)
- Interface moins intuitive que Railway/Render

#### Points d'Attention

1. **Dockerfile requis** : DigitalOcean App Platform nécessite un Dockerfile (à créer)
2. **Configuration manuelle** : Build et start commands à configurer manuellement
3. **Webhooks Stripe** : URL : `https://votre-app.ondigitalocean.app/api/stripe/webhook`

#### Plan de Déploiement en 10 Étapes

1. **Créer un compte DigitalOcean** : https://www.digitalocean.com
2. **Créer un Dockerfile** (voir section Dockerfile ci-dessous)
3. **Connecter GitHub** : Autoriser DigitalOcean à accéder à votre repo
4. **Créer une nouvelle App** : "Create" → "Apps" → "GitHub"
5. **Sélectionner le repo** : Choisir `rentanoo-nosy-be-clean`
6. **Configuration** :
   - **Build Command** : `npm run build`
   - **Run Command** : `npm run start:prod`
   - **Port** : 3000 (ou laisser détecter automatiquement)
7. **Configurer les variables d'environnement** : Section "Environment Variables"
8. **Choisir le plan** : Basic ($12/mois) ou Professional ($24/mois)
9. **Déployer** : Cliquer sur "Create Resources"
10. **Configurer Stripe Webhook** : URL DigitalOcean + `/api/stripe/webhook`

**Temps estimé** : 45-60 minutes (incluant création Dockerfile)

---

### 🔧 Alternative : VPS (DigitalOcean Droplet / Linode / Hetzner)

#### Pourquoi VPS

✅ **Points forts** :
1. **Contrôle total** : Accès root, configuration complète
2. **Coût** : Très économique ($5-10/mois pour un VPS basique)
3. **Flexibilité** : Installation de n'importe quel service

❌ **Inconvénients** :
1. **Complexité** : Nécessite connaissances Linux/SSH
2. **Maintenance** : Mises à jour système, sécurité, backups
3. **Configuration manuelle** : Nginx, SSL (Let's Encrypt), PM2, etc.
4. **Pas débutant-friendly** : Nécessite des compétences DevOps

#### Coût Estimé Mensuel

- **VPS basique** : $5-10/mois (1GB RAM, 1 vCPU)
- **VPS recommandé** : $12-20/mois (2GB RAM, 2 vCPU)

#### Difficulté : ⭐⭐⭐⭐☆ (Avancé)

**Recommandation** : **Éviter pour un débutant**. Utiliser Railway ou Render à la place.

---

### ❌ Plateformes Non Recommandées

#### Vercel

❌ **Incompatible** :
- Vercel est conçu pour les applications serverless (Next.js, Nuxt, etc.)
- Votre projet utilise Express.js long-running
- Limite de 10 secondes pour les fonctions serverless (insuffisant pour Express)

#### Netlify

❌ **Incompatible** :
- Même problème que Vercel
- Netlify Functions limitées à 10 secondes
- Pas adapté pour Express.js long-running

#### Fly.io

⚠️ **Compatible mais complexe** :
- Nécessite un Dockerfile
- Configuration plus complexe que Railway/Render
- Pas de support Nixpacks natif
- **Recommandation** : Utiliser Railway ou Render à la place

---

## 🎯 D) CONCLUSION : CHOIX #1 CLAIR

### 🏆 Je Recommande : **RAILWAY**

**Pourquoi Railway est le meilleur choix pour votre projet** :

1. **✅ Compatibilité parfaite** :
   - Détection automatique de `nixpacks.toml`
   - Pas besoin de Dockerfile
   - Configuration minimale requise

2. **✅ Débutant-friendly** :
   - Interface graphique très intuitive
   - Documentation claire
   - Support communautaire actif

3. **✅ Fonctionnalités complètes** :
   - SSL automatique
   - Variables d'environnement faciles à configurer
   - Logs en temps réel
   - Webhooks Stripe supportés (URL HTTPS publique)

4. **✅ Coût raisonnable** :
   - $20-30/mois pour un projet en production
   - Pas de coûts cachés

5. **✅ Déploiement rapide** :
   - 30-45 minutes pour déployer
   - Déploiement automatique depuis GitHub

### 🔄 Et Si Railway Est Impossible ?

**Fallback #2 : RENDER**

Si Railway n'est pas disponible ou si vous préférez une alternative :
- **Render** offre des fonctionnalités similaires
- Interface légèrement moins intuitive mais toujours accessible
- Coût similaire ($25-35/mois)

### 📋 Checklist de Déploiement (Railway)

Avant de déployer, assurez-vous d'avoir :

- [ ] Compte Railway créé
- [ ] Repo GitHub connecté
- [ ] Toutes les variables d'environnement listées (15 variables)
- [ ] Clés Supabase (URL + Anon Key + Service Role Key)
- [ ] Clés Stripe (Publishable Key + Secret Key + Webhook Secret)
- [ ] Configuration SMTP (Gmail ou autre)
- [ ] Domaine personnalisé (optionnel, Railway fournit un domaine gratuit)

---

## 📝 E) INFORMATIONS TECHNIQUES (PREUVES)

### Scripts NPM

```9:22:package.json
  "scripts": {
    "dev": "vite",
    "dev:renter": "vite --port 3000",
    "dev:tenant": "cross-env VITE_APP_CONTEXT=tenant vite --port 3012",
    "dev:owner": "cross-env VITE_APP_CONTEXT=owner vite --port 3013",
    "dev:3002": "vite --port 3002",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "dev:api": "tsx server/index.ts",
    "start": "tsx server/index.ts",
    "start:prod": "NODE_ENV=production tsx server/index.ts",
```

### Framework Détecté

- **Frontend** : Vite 5.4.19 + React 18.3.1
- **Backend** : Express.js 5.1.0
- **Type** : SPA (Single Page Application)

### Endpoints Server

```28:190:server/index.ts
// Route Webhook Stripe - DOIT être déclarée avant app.use(express.json())
app.post(
  "/api/stripe/webhook",
```

```214:338:server/index.ts
// Route contact form
app.post("/api/contact", upload.single("attachment"), async (req, res) => {
```

```340:351:server/index.ts
app.get("/api/stripe-health", async (_req, res) => {
```

```354:465:server/index.ts
// Route pour démarrer un état des lieux de départ
app.post("/api/checkin/start", async (req, res) => {
```

```468:655:server/index.ts
// Route pour sauvegarder un brouillon d'état des lieux de départ
app.post("/api/checkin/saveDraft", async (req, res) => {
```

**Endpoints API** :
- `POST /api/stripe/webhook` - Webhook Stripe
- `POST /api/contact` - Formulaire de contact (avec upload fichier)
- `GET /api/stripe-health` - Health check Stripe
- `POST /api/checkin/start` - Démarrage état des lieux
- `POST /api/checkin/saveDraft` - Sauvegarde brouillon état des lieux

### Configuration Nixpacks

```1:14:nixpacks.toml
# Force Nixpacks to use Node.js 22 avec npm (inclus)

[phases.setup]
nixPkgs = ["nodejs_22"]

[phases.install]
cmds = ["npm ci --include=dev"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start:prod"
```

### Variables d'Environnement (Extrait)

**Frontend (VITE_*)** :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_SITE_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`

**Backend** :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `EMAIL_TO`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `PORT` (optionnel)
- `NODE_ENV` (production)

**Total** : ~15 variables

### Dockerfile (Optionnel - Pour DigitalOcean)

Si vous choisissez DigitalOcean App Platform, voici un Dockerfile minimal :

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --include=dev

# Copier le code source
COPY . .

# Build l'application
RUN npm run build

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "run", "start:prod"]
```

**Note** : Ce Dockerfile n'est nécessaire que pour DigitalOcean App Platform. Railway et Render utilisent `nixpacks.toml` automatiquement.

---

## 🚀 PROCHAINES ÉTAPES

1. **Choisir la plateforme** : Railway (recommandé) ou Render
2. **Créer un compte** sur la plateforme choisie
3. **Connecter GitHub** et sélectionner le repo
4. **Configurer les variables d'environnement** (15 variables)
5. **Déployer** et vérifier les logs
6. **Configurer Stripe Webhook** avec l'URL de production
7. **Tester** l'application en production

**Temps total estimé** : 30-60 minutes selon la plateforme choisie

---

**Rapport généré le** : 2025-01-27  
**Version** : 1.0  
**Projet** : Rentanoo Nosy Be

