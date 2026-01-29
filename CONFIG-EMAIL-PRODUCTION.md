# 📧 Configuration Email Production - Railway

**Date**: 2026-01-15  
**Plateforme**: Railway  
**Endpoint**: `/api/contact`

---

## A) VARIABLES À CONFIGURER

### Variables à ajouter/modifier sur Railway

**Obligatoires** :
```env
EMAIL_TO=chrisrentanoo@gmail.com
EMAIL_FROM=noreply@rentanoo.com
```

**Variables SMTP (si non configurées)** :
```env
SMTP_HOST=smtp.gmail.com          # Ou smtp.ovh.net, etc.
SMTP_PORT=587                      # Ou 465 pour SSL
SMTP_SECURE=false                  # true pour port 465, false pour 587
SMTP_USER=votre-email@gmail.com    # ⚠️ À configurer si non présent
SMTP_PASS=votre-app-password       # ⚠️ À configurer si non présent
```

---

## B) VÉRIFICATION DES VARIABLES EXISTANTES

**À vérifier sur Railway** :

1. Dashboard Railway → Projet → Service → Variables d'environnement
2. Vérifier si `SMTP_USER` et `SMTP_PASS` sont déjà configurées
3. Si absentes, demander les identifiants SMTP

**Provider SMTP possible** :
- **Gmail/Workspace** : Utiliser un "App Password" (pas le mot de passe normal)
- **OVH** : Identifiants SMTP standard
- **SendGrid/Mailgun** : API keys

---

## C) CONFIGURATION SUR RAILWAY

### Méthode 1: Dashboard Railway (Recommandé)

1. **Accéder au dashboard Railway** :
   - https://railway.app → Projet → Service

2. **Variables d'environnement** :
   - Onglet "Variables" → "Raw Editor" ou "Add Variable"

3. **Ajouter/modifier les variables** :
   ```
   EMAIL_TO=chrisrentanoo@gmail.com
   EMAIL_FROM=noreply@rentanoo.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=[À_COMPLÉTER]
   SMTP_PASS=[À_COMPLÉTER]
   ```

4. **Redémarrage automatique** :
   - Railway redémarre automatiquement le service après modification

---

### Méthode 2: Railway CLI (si installé)

```bash
# Installer Railway CLI (si non installé)
npm i -g @railway/cli

# Se connecter
railway login

# Lier au projet
railway link

# Ajouter les variables
railway variables set EMAIL_TO=chrisrentanoo@gmail.com
railway variables set EMAIL_FROM=noreply@rentanoo.com
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set SMTP_USER=votre-email@gmail.com
railway variables set SMTP_PASS=votre-app-password
```

---

## D) VALEURS EXACTES À CONFIGURER

### Valeurs confirmées

```env
EMAIL_TO=chrisrentanoo@gmail.com
EMAIL_FROM=noreply@rentanoo.com
```

### Valeurs à compléter (SMTP)

**Si provider Gmail/Workspace** :
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[VOTRE_EMAIL_GMAIL]           # Ex: chrisrentanoo@gmail.com
SMTP_PASS=[VOTRE_APP_PASSWORD]          # App Password Gmail (pas mot de passe normal)
```

**Si provider OVH** :
```env
SMTP_HOST=smtp.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[VOTRE_EMAIL_OVH]             # Ex: contact@rentanoo.com
SMTP_PASS=[VOTRE_MOT_DE_PASSE_OVH]      # Mot de passe SMTP OVH
```

**Si provider autre** :
- Voir `RAILWAY_ENV_VARIABLES.md` sections B7-B11 pour les détails

---

## E) CRÉATION APP PASSWORD GMAIL (si Gmail)

**Si provider Gmail/Workspace** :

1. **Activer l'authentification à 2 facteurs** :
   - https://myaccount.google.com/security
   - Activer "Validation en deux étapes"

2. **Générer un App Password** :
   - https://myaccount.google.com/apppasswords
   - Sélectionner "Mail" et "Autre (nom personnalisé)"
   - Nom : "Rentanoo Contact Form"
   - Copier le mot de passe généré (16 caractères)

3. **Utiliser dans `SMTP_PASS`** :
   ```env
   SMTP_PASS=xxxx xxxx xxxx xxxx    # Mot de passe généré (sans espaces ou avec)
   ```

**⚠️ Important** : Ne pas utiliser le mot de passe normal Gmail, uniquement un App Password.

---

## F) TEST APRÈS CONFIGURATION

### Test 1: Script automatique

```bash
node scripts/test-contact-api-prod.js
```

### Test 2: Test manuel

```bash
curl -X POST https://rentanoo.com/api/contact \
  -F "fullName=Test" \
  -F "email=test@example.com" \
  -F "subject=Test Production" \
  -F "message=Test d'envoi email en production"
```

### Résultats attendus

- ✅ **200 OK** : Email envoyé avec succès
- ✅ **Réception email** : Vérifier `chrisrentanoo@gmail.com`
- ⚠️ **500 + "Service d'envoi d'email non configuré"** : `SMTP_USER` ou `SMTP_PASS` manquants
- ⚠️ **500 + Erreur Nodemailer** : Variables SMTP incorrectes

---

## G) CHECKLIST FINALE

**Avant de tester** :

- [ ] `EMAIL_TO=chrisrentanoo@gmail.com` configuré sur Railway
- [ ] `EMAIL_FROM=noreply@rentanoo.com` configuré sur Railway
- [ ] `SMTP_USER` configuré (si non présent)
- [ ] `SMTP_PASS` configuré (si non présent)
- [ ] `SMTP_HOST` configuré (optionnel, défaut: `smtp.gmail.com`)
- [ ] `SMTP_PORT` configuré (optionnel, défaut: `587`)
- [ ] `SMTP_SECURE` configuré (optionnel, défaut: `false`)
- [ ] Service Railway redémarré (automatique après modification)

**Après configuration** :

- [ ] Tester avec `node scripts/test-contact-api-prod.js`
- [ ] Vérifier réception email sur `chrisrentanoo@gmail.com`
- [ ] Vérifier logs Railway pour erreurs éventuelles

---

## H) DOCUMENTATION RÉFÉRENCE

**Fichiers pertinents** :
- `server/index.ts` (lignes 215-338) - Endpoint `/api/contact`
- `RAILWAY_ENV_VARIABLES.md` (lignes 257-391) - Variables d'env SMTP
- `scripts/test-contact-api-prod.js` - Script de test automatique

**Variables d'env requises** :
- Voir `RAILWAY_ENV_VARIABLES.md` sections B5-B11 (EMAIL_TO, EMAIL_FROM, SMTP_*)

