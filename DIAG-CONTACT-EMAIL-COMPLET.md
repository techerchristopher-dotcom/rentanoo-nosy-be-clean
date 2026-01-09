# 🔍 DIAGNOSTIC COMPLET — Envoi automatique d'emails depuis /contact

**Date** : 2025-01-XX  
**Objectif** : Audit du système d'envoi d'emails automatique depuis le formulaire de contact

---

## A) RÉSUMÉ DU PROJET

### Framework & Stack
- **Framework** : **React 18.3.1** (PAS Next.js)
- **Build Tool** : **Vite 5.4.19**
- **Routing** : **React Router DOM 6.30.1** (client-side routing)
  - Pas de routes localisées (`/fr/contact`), route simple : `/contact`
  - Pas d'App Router ou Pages Router (Next.js)
- **Backend** : **Express 5.1.0** (serveur séparé dans `server/index.ts`)
  - Port par défaut : 3000 (dev) / variable PORT (prod)
  - Scripts : `npm run dev:api` (dev) / `npm run start:prod` (prod)

### UI Stack
- **Styling** : **Tailwind CSS 3.4.17** + **tailwindcss-animate**
- **Composants UI** : **shadcn/ui** (Radix UI primitives)
- **Icons** : **lucide-react 0.462.0**

### Validation & Forms
- **Form Library** : **react-hook-form 7.61.1**
- **Validation** : **zod 3.25.76** + **@hookform/resolvers 3.10.0**

### Supabase
- **Présent** : ✅ Oui
- **Version** : `@supabase/supabase-js 2.58.0`
- **Usages identifiés** :
  - Auth (authentification utilisateurs)
  - Database (vehicles, bookings, profiles, conversations, messages, etc.)
  - Storage (vehicle-photos, checkin-photos)
  - Edge Functions (2 fonctions : `create-checkout-session`, `stripe-webhook`)
- **Configuration** :
  - Client : `src/integrations/supabase/client.ts`
  - Variables env : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Project ID : `zykwfjxurwmputxwlkxs`

### Déploiement
- **Plateforme** : **Coolify** (via Nixpacks)
- **Fichier config** : `nixpacks.toml`
- **Architecture** :
  - Frontend : Build Vite → `dist/` → servi par Express en prod
  - Backend : Express serveur séparé (`server/index.ts`)
  - Port unique en production (frontend + API sur même port)

### i18n
- **Présent** : ✅ Oui
- **Librairie** : **react-i18next 15.1.0** + **i18next 23.15.1**
- **Langues** : FR, EN, IT, DE
- **Routes localisées** : ❌ Non (pas de `/fr/contact`, juste `/contact`)

---

## B) OÙ EST LE FORMULAIRE /contact ET COMMENT IL FONCTIONNE

### Localisation
- **Fichier** : `src/pages/Contact.tsx`
- **Route** : `/contact` (définie dans `src/App.tsx` ligne 93)
- **Layout** : Utilise `Navbar` + `Footer` (comme les autres pages)

### Structure du formulaire
- **Composants utilisés** :
  - `Input` (shadcn/ui) : Nom, Email, Téléphone, Objet
  - `Textarea` (shadcn/ui) : Message
  - `Input type="file"` : Pièce jointe
  - `Button` (shadcn/ui) : Bouton "Envoyer"
  - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` (shadcn/ui)

### Validation côté client
- **Schéma Zod** : `contactFormSchema` (lignes 17-25)
  - `fullName` : string, min 2 caractères
  - `email` : string, format email valide
  - `phone` : string, optionnel
  - `subject` : string, min 3 caractères
  - `message` : string, min 10 caractères
  - `attachment` : FileList, optionnel
  - `website` : string, optionnel (honeypot)
- **react-hook-form** : `useForm` avec `zodResolver`

### Fonction submit actuelle
- **Fichier** : `src/pages/Contact.tsx`, fonction `onSubmit` (lignes 43-108)
- **Flux** :
  1. Vérification honeypot (`data.website`)
  2. Construction `FormData` (multipart/form-data)
  3. Validation taille fichier (max 10MB côté client)
  4. **Appel API** : `fetch(`${apiUrl}/api/contact`, { method: "POST", body: formData })`
  5. Gestion des états : loading, success, error (via `toast`)

### Format payload
- **Type** : **multipart/form-data** (FormData)
- **Champs envoyés** :
  - `fullName` : string
  - `email` : string
  - `phone` : string (optionnel)
  - `subject` : string
  - `message` : string
  - `attachment` : File (optionnel, si présent)
  - `website` : string (honeypot, caché)

### Pièce jointe
- **Gérée** : ✅ Oui
- **Validation côté client** :
  - Taille max : 10MB (ligne 67)
  - Types acceptés : `.pdf,.jpg,.jpeg,.png,.doc,.docx` (ligne 240)
- **Traitement** : Ajoutée à FormData si présente (ligne 76)

### URL API
- **Détermination** : `import.meta.env.VITE_API_URL || "http://localhost:3000"` (ligne 80)
- **Problème détecté** : 
  - En dev : utilise `http://localhost:3000` (correct si backend sur port 3000)
  - En prod : utilise `VITE_API_URL` si défini, sinon chaîne vide (risque d'erreur)
  - **Vite config** : Proxy `/api` vers `http://localhost:3001` (ligne 20), mais le backend tourne sur 3000 par défaut
  - **Incohérence** : Proxy pointe vers 3001, mais `VITE_API_URL` par défaut pointe vers 3000

---

## C) EMAIL : CE QUI EXISTE DÉJÀ

### Dépendances email présentes
- **✅ nodemailer 7.0.12** : Installé et utilisé
- **✅ @types/nodemailer 7.0.4** : Types TypeScript présents
- **❌ resend** : Non installé
- **❌ sendgrid** : Non installé
- **❌ mailgun** : Non installé
- **❌ postmark** : Non installé
- **❌ aws-ses** : Non installé

### Endpoint API existant
- **✅ Route** : `POST /api/contact` (déjà implémentée)
- **Fichier** : `server/index.ts`, lignes 214-340
- **Middleware** : `upload.single("attachment")` (multer) pour gérer la pièce jointe
- **Fonctionnalités** :
  - ✅ Validation serveur (champs requis, format email)
  - ✅ Honeypot anti-spam (`website`)
  - ✅ Gestion pièce jointe (multer, max 10MB, types autorisés)
  - ✅ Envoi email via nodemailer (SMTP)
  - ✅ Template HTML + texte
  - ✅ Pièce jointe attachée si présente

### Configuration email
- **Variables d'environnement requises** (déjà documentées dans `scripts/env-template-nosy-be.txt`) :
  ```
  EMAIL_TO=contact@rentanoo.com
  EMAIL_FROM=noreply@rentanoo.com
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=votre-email@gmail.com
  SMTP_PASS=votre-mot-de-passe-app
  ```

### Systèmes d'email existants
- **Recherche effectuée** : Aucun autre système d'email trouvé
- **Pas de** :
  - Confirmation email custom
  - Reset password email custom
  - Notifications email
  - Autres endpoints d'envoi d'email

### Supabase Edge Functions
- **Fonctions existantes** :
  - `create-checkout-session` : Création session Stripe
  - `stripe-webhook` : Webhook Stripe
- **Aucune fonction email** : Pas d'Edge Function pour l'envoi d'email

---

## D) CONTRAINTES TECHNIQUES ET SÉCURITÉ

### Déploiement
- **Plateforme** : Coolify (via Nixpacks)
- **Architecture** : Express sert frontend + API sur même port en prod
- **Limites** :
  - Pas de limite de timeout spécifique détectée
  - Pas de limite de body size spécifique (Express par défaut ~100KB, mais multer gère jusqu'à 10MB)

### Pièce jointe
- **Taille max** : 10MB (configuré dans multer, ligne 199)
- **Types acceptés** : PDF, JPG, JPEG, PNG, DOC, DOCX
- **Validation** : Côté client (Contact.tsx) + côté serveur (multer fileFilter)
- **Stockage** : En mémoire (multer.memoryStorage), puis attaché à l'email

### Anti-spam
- **✅ Honeypot** : Champ `website` caché (ligne 135-141 Contact.tsx, ligne 221 server/index.ts)
- **❌ Rate limiting** : Non implémenté
- **❌ CAPTCHA** : Non présent (reCAPTCHA, hCaptcha, Turnstile)
- **❌ Validation email domaine** : Non (accepte n'importe quel email valide)

### Protection des secrets
- **✅ Variables env** : Secrets côté serveur uniquement (pas de préfixe `VITE_`)
- **✅ .gitignore** : `.env*` exclu
- **⚠️ Documentation** : Template présent dans `scripts/env-template-nosy-be.txt`

---

## E) RECOMMANDATION

### ✅ ÉTAT ACTUEL : IMPLÉMENTATION DÉJÀ COMPLÈTE

**Conclusion** : Le système d'envoi automatique d'emails depuis `/contact` est **DÉJÀ IMPLÉMENTÉ ET FONCTIONNEL**.

### Architecture actuelle (déjà en place)
- **Option choisie** : **Express API Route + Nodemailer SMTP**
- **Pourquoi cette solution** :
  1. ✅ **Cohérent avec l'architecture** : Backend Express déjà présent (`server/index.ts`)
  2. ✅ **Simple** : Nodemailer déjà installé et configuré
  3. ✅ **Gestion fichiers** : Multer déjà utilisé pour d'autres endpoints
  4. ✅ **Pas de dépendance externe** : Pas besoin de Supabase Edge Function ou n8n
  5. ✅ **Contrôle total** : Validation, sécurité, logs côté serveur

### Points forts de l'implémentation actuelle
1. ✅ **Validation complète** : Client (zod) + Serveur (regex, champs requis)
2. ✅ **Anti-spam basique** : Honeypot implémenté
3. ✅ **Gestion fichiers** : Multer avec validation taille/type
4. ✅ **Template email** : HTML + texte
5. ✅ **Gestion erreurs** : Try/catch avec messages clairs
6. ✅ **Logs** : Console.log pour debugging

### Points d'attention / Améliorations possibles

#### 🔴 CRITIQUE : Configuration URL API
- **Problème** : Incohérence entre proxy Vite (3001) et URL par défaut (3000)
- **Impact** : En développement, l'appel API peut échouer si backend sur mauvais port
- **Recommandation** : 
  - Option 1 : Utiliser le proxy Vite (`/api/contact` sans URL absolue)
  - Option 2 : Aligner les ports (backend sur 3001 ou proxy vers 3000)

#### 🟡 MOYEN : Rate limiting
- **Manquant** : Pas de protection contre le spam (limite de requêtes par IP)
- **Recommandation** : Ajouter `express-rate-limit` pour limiter à 5 requêtes/heure par IP

#### 🟡 MOYEN : Validation email domaine
- **Manquant** : Accepte n'importe quel email valide
- **Recommandation** : Optionnel, filtrer les domaines suspects (ex: 10minutemail.com)

#### 🟢 FAIBLE : CAPTCHA (optionnel)
- **Manquant** : Pas de CAPTCHA
- **Recommandation** : Ajouter Turnstile (Cloudflare) ou hCaptcha si spam devient problématique

#### 🟢 FAIBLE : Email de confirmation
- **Manquant** : Pas d'email de confirmation envoyé à l'utilisateur
- **Recommandation** : Optionnel, envoyer un email de confirmation à `email` après réception

#### 🟢 FAIBLE : Logs structurés
- **Actuel** : Console.log simple
- **Recommandation** : Optionnel, utiliser un logger structuré (winston, pino)

---

## F) PLAN D'IMPLÉMENTATION (AMÉLIORATIONS)

### ⚠️ IMPORTANT : L'implémentation de base est DÉJÀ FAITE

Ce plan concerne uniquement les **améliorations** et **corrections** identifiées.

### Étape 1 : Corriger l'URL API (CRITIQUE)

**Fichier à modifier** : `src/pages/Contact.tsx`

**Problème** : Incohérence proxy Vite (3001) vs URL par défaut (3000)

**Solution recommandée** : Utiliser le proxy Vite (plus simple)

```typescript
// AVANT (ligne 79-81)
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const response = await fetch(`${apiUrl}/api/contact`, {

// APRÈS
// En dev : utilise le proxy Vite (/api → localhost:3001)
// En prod : utilise le même domaine (pas besoin d'URL absolue)
const apiUrl = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "");
const response = await fetch(`${apiUrl}/api/contact`, {
```

**OU** (alternative) : Aligner les ports

**Fichier à modifier** : `vite.config.ts` (ligne 20)
```typescript
proxy: {
  "/api": {
    target: "http://localhost:3000", // Changer 3001 → 3000
    changeOrigin: true,
    secure: false,
  },
},
```

**ET** : `server/index.ts` (ligne 536)
```typescript
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000; // S'assurer que c'est 3000
```

### Étape 2 : Ajouter Rate Limiting (RECOMMANDÉ)

**Fichier à modifier** : `server/index.ts`

**Dépendance à installer** :
```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

**Code à ajouter** (après ligne 193, avant la route `/api/contact`) :
```typescript
import rateLimit from "express-rate-limit";

// Rate limiting pour le formulaire de contact
const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 requêtes max par IP par heure
  message: "Trop de tentatives. Veuillez réessayer dans 1 heure.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Appliquer le rate limit à la route contact
app.post("/api/contact", contactRateLimit, upload.single("attachment"), async (req, res) => {
  // ... code existant
});
```

### Étape 3 : Améliorer la validation email (OPTIONNEL)

**Fichier à modifier** : `server/index.ts` (ligne 234)

**Code à ajouter** (après validation format email) :
```typescript
// Validation format email (existant)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({
    error: "Format d'email invalide",
  });
}

// NOUVEAU : Filtrer les domaines suspects (optionnel)
const suspiciousDomains = [
  "10minutemail.com",
  "tempmail.com",
  "guerrillamail.com",
  // Ajouter d'autres si nécessaire
];
const emailDomain = email.split("@")[1]?.toLowerCase();
if (suspiciousDomains.includes(emailDomain)) {
  return res.status(400).json({
    error: "Domaines d'email temporaires non autorisés",
  });
}
```

### Étape 4 : Ajouter email de confirmation (OPTIONNEL)

**Fichier à modifier** : `server/index.ts` (après ligne 307)

**Code à ajouter** (après envoi email principal) :
```typescript
// Envoyer email de confirmation à l'utilisateur
try {
  const confirmationMailOptions = {
    from: emailFrom,
    to: email, // Email de l'utilisateur
    subject: `[Rentanoo] Confirmation de réception - ${subject}`,
    html: `
      <h2>Merci pour votre message</h2>
      <p>Bonjour ${fullName},</p>
      <p>Nous avons bien reçu votre message concernant : <strong>${subject}</strong></p>
      <p>Nous vous répondrons dans les plus brefs délais.</p>
      <hr>
      <p><small>Ceci est un email automatique, merci de ne pas y répondre.</small></p>
    `,
  };
  
  await transporter.sendMail(confirmationMailOptions);
  console.log("✅ Email de confirmation envoyé à:", email);
} catch (confirmationError) {
  // Ne pas faire échouer la requête si la confirmation échoue
  console.error("⚠️ Erreur envoi email de confirmation:", confirmationError);
}
```

### Étape 5 : Variables d'environnement (VÉRIFICATION)

**Fichier à vérifier** : `.env.local` (ou variables Coolify)

**Variables requises** (déjà documentées) :
```bash
EMAIL_TO=contact@rentanoo.com
EMAIL_FROM=noreply@rentanoo.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password
```

**Action** : Vérifier que ces variables sont configurées en production (Coolify dashboard)

---

## G) TEST PLAN

### Tests manuels à effectuer

1. **Test formulaire complet** :
   - Remplir tous les champs (nom, email, objet, message)
   - Ajouter une pièce jointe (PDF, 5MB)
   - Soumettre
   - Vérifier email reçu dans `EMAIL_TO`

2. **Test validation** :
   - Soumettre sans nom → Erreur attendue
   - Soumettre avec email invalide → Erreur attendue
   - Soumettre avec fichier > 10MB → Erreur attendue
   - Soumettre avec fichier .exe → Erreur attendue

3. **Test honeypot** :
   - Remplir le champ `website` (via DevTools)
   - Soumettre → Succès factice (pas d'email envoyé)

4. **Test pièce jointe** :
   - Envoyer avec PDF → Vérifier que le PDF est attaché
   - Envoyer avec JPG → Vérifier que le JPG est attaché

5. **Test rate limiting** (après implémentation) :
   - Envoyer 6 requêtes rapidement → 6ème doit être bloquée

6. **Test production** :
   - Vérifier que `EMAIL_TO`, `SMTP_*` sont configurés
   - Tester depuis l'URL de production

---

## H) RÉSUMÉ EXÉCUTIF

### ✅ État actuel
- **Implémentation** : **COMPLÈTE ET FONCTIONNELLE**
- **Endpoint** : `POST /api/contact` existe et fonctionne
- **Email** : Nodemailer configuré avec SMTP
- **Validation** : Client (zod) + Serveur (regex, champs requis)
- **Pièce jointe** : Gérée avec multer (max 10MB)
- **Anti-spam** : Honeypot implémenté

### 🔴 Action immédiate requise
1. **Corriger l'URL API** : Aligner proxy Vite et port backend (ou utiliser proxy)

### 🟡 Améliorations recommandées
1. **Rate limiting** : Protéger contre le spam (5 req/heure/IP)
2. **Validation email domaine** : Filtrer les emails temporaires (optionnel)
3. **Email de confirmation** : Envoyer un accusé de réception (optionnel)

### 🟢 Améliorations optionnelles
1. **CAPTCHA** : Si spam devient problématique
2. **Logs structurés** : Pour meilleur debugging

### 📋 Checklist avant mise en production
- [ ] Variables d'environnement configurées (Coolify)
- [ ] Test envoi email depuis production
- [ ] Vérifier que le proxy/URL API fonctionne en prod
- [ ] (Optionnel) Rate limiting activé
- [ ] (Optionnel) Email de confirmation testé

---

## I) FICHIERS CONCERNÉS

### Fichiers existants (déjà implémentés)
- ✅ `src/pages/Contact.tsx` : Formulaire frontend
- ✅ `server/index.ts` (lignes 195-212, 214-340) : Configuration multer + endpoint API
- ✅ `src/App.tsx` (ligne 93) : Route `/contact`
- ✅ `scripts/env-template-nosy-be.txt` (lignes 54-72) : Documentation variables env

### Fichiers à modifier (améliorations)
- 🔧 `src/pages/Contact.tsx` (ligne 79-81) : Corriger URL API
- 🔧 `server/index.ts` (après ligne 193) : Ajouter rate limiting
- 🔧 `server/index.ts` (après ligne 234) : Améliorer validation email (optionnel)
- 🔧 `server/index.ts` (après ligne 307) : Ajouter email confirmation (optionnel)
- 🔧 `vite.config.ts` (ligne 20) : Aligner proxy port (si nécessaire)

### Dépendances à installer (améliorations)
- `express-rate-limit` (pour rate limiting)
- `@types/express-rate-limit` (dev, types TypeScript)

---

**FIN DU DIAGNOSTIC**

