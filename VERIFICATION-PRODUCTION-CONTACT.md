# ✅ Vérification Production - Formulaire Contact

**Date**: 2026-01-15  
**URL**: https://rentanoo.com  
**Endpoint**: `/api/contact`

---

## A) RÉSULTATS DES TESTS

### ✅ Test 1: Endpoint accessible en production

**Test OPTIONS (CORS)** :
```bash
curl -X OPTIONS https://rentanoo.com/api/contact
```
**Résultat** : ✅ **204 No Content**  
**Conclusion** : Endpoint accessible, CORS configuré

---

### ⚠️ Test 2: Variables SMTP configurées

**Test POST** :
```bash
curl -X POST https://rentanoo.com/api/contact \
  -F "fullName=Test" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Test"
```

**Résultat** : ⚠️ **500 Internal Server Error**  
**Réponse** : `{"error":"Configuration serveur manquante"}`

**Code source** (`server/index.ts:245-250`) :
```typescript
const emailTo = process.env.EMAIL_TO;

if (!emailTo) {
  console.error("❌ EMAIL_TO non configuré dans les variables d'environnement");
  return res.status(500).json({
    error: "Configuration serveur manquante",
  });
}
```

**Conclusion** : ⚠️ **`EMAIL_TO` n'est pas configuré** en production

---

## B) DIAGNOSTIC

### ✅ Ce qui fonctionne

1. **Backend déployé** : ✅ Express est déployé en production (Railway/VPS)
2. **Endpoint accessible** : ✅ `/api/contact` répond (pas de 404)
3. **CORS configuré** : ✅ OPTIONS retourne 204
4. **Code prêt** : ✅ L'endpoint `/api/contact` est implémenté et fonctionne

### ⚠️ Ce qui manque

1. **Variable `EMAIL_TO`** : ❌ Non configurée en production
   - Requis pour recevoir les emails
   - L'endpoint retourne 500 si absente

2. **Variables SMTP** : ❓ À vérifier
   - `SMTP_USER` (requis si on veut envoyer des emails)
   - `SMTP_PASS` (requis si on veut envoyer des emails)
   - `SMTP_HOST` (optionnel, défaut: `smtp.gmail.com`)
   - `SMTP_PORT` (optionnel, défaut: `587`)
   - `SMTP_SECURE` (optionnel, défaut: `false`)
   - `EMAIL_FROM` (optionnel, fallback: email du formulaire)

---

## C) ACTION REQUISE

### Configuration requise sur Railway/VPS

**Variables d'environnement à ajouter** :

```env
# REQUIS
EMAIL_TO=contact@rentanoo.com          # ⚠️ MANQUANT - À configurer
SMTP_USER=votre-email@gmail.com        # À vérifier
SMTP_PASS=votre-mot-de-passe-app       # À vérifier

# OPTIONNEL (avec valeurs par défaut)
EMAIL_FROM=noreply@rentanoo.com        # Optionnel
SMTP_HOST=smtp.gmail.com               # Défaut: smtp.gmail.com
SMTP_PORT=587                          # Défaut: 587
SMTP_SECURE=false                      # Défaut: false
```

**Où configurer** :
- **Railway** : Dashboard → Projet → Service → Variables d'environnement
- **VPS** : Fichier `.env` ou variables d'environnement système

**Après configuration** :
- Railway redémarre automatiquement le service
- VPS : Redémarrer le service (PM2, systemd, etc.)

---

## D) PLAN D'ACTION

### Étape 1: Configurer `EMAIL_TO` (OBLIGATOIRE)

1. Accéder au dashboard Railway/VPS
2. Ajouter la variable `EMAIL_TO=contact@rentanoo.com` (ou l'adresse de ton choix)
3. Redémarrer le service si nécessaire

### Étape 2: Configurer variables SMTP (OBLIGATOIRE pour l'envoi)

**Gmail** (recommandé) :
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-app-password          # Créer un "App Password" sur Gmail
```

**Créer un App Password Gmail** :
1. Activer l'authentification à 2 facteurs : https://myaccount.google.com/security
2. Générer un "Mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe dans `SMTP_PASS` (pas le mot de passe normal)

**Autres providers** (OVH, SendGrid, etc.) :
- Voir `RAILWAY_ENV_VARIABLES.md` sections B7-B11 pour les détails

### Étape 3: Tester à nouveau

```bash
# Test après configuration
curl -X POST https://rentanoo.com/api/contact \
  -F "fullName=Test" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Test"

# Ou utiliser le script de test
node scripts/test-contact-api-prod.js
```

**Résultats attendus** :
- ✅ **200 OK** : Email envoyé avec succès
- ⚠️ **500 + "Service d'envoi d'email non configuré"** : `SMTP_USER` ou `SMTP_PASS` manquants
- ⚠️ **500 + Erreur Nodemailer** : Variables SMTP incorrectes

---

## E) RÉSUMÉ

### ✅ Statut actuel

| Vérification | Statut | Détails |
|--------------|--------|---------|
| **Backend déployé** | ✅ OK | Express répond en production |
| **Endpoint accessible** | ✅ OK | `/api/contact` répond (204/500) |
| **CORS configuré** | ✅ OK | OPTIONS retourne 204 |
| **Code implémenté** | ✅ OK | Endpoint `/api/contact` fonctionne |
| **Variable `EMAIL_TO`** | ❌ **MANQUANTE** | Erreur 500: "Configuration serveur manquante" |
| **Variables SMTP** | ❓ **À VÉRIFIER** | Nécessaire pour l'envoi d'email |

### 📋 Action requise

**Avant de donner l'adresse `EMAIL_TO`** :

1. ✅ **Endpoint accessible** : Confirmé (test réussi)
2. ⚠️ **Variables SMTP** : À vérifier/configurer sur Railway/VPS

**Après configuration** :
- Donner l'adresse `EMAIL_TO` pour que je la configure
- Tester l'envoi d'email réel

---

## F) COMMANDES DE TEST

### Test rapide (curl)

```bash
# Test endpoint (devrait retourner 200 après configuration)
curl -X POST https://rentanoo.com/api/contact \
  -F "fullName=Test" \
  -F "email=test@example.com" \
  -F "subject=Test" \
  -F "message=Message test"
```

### Test complet (script automatique)

```bash
# Test avec l'URL par défaut (https://rentanoo.com)
node scripts/test-contact-api-prod.js

# Test avec une URL custom
node scripts/test-contact-api-prod.js --url https://rentanoo.com
```

---

## G) DOCUMENTATION RÉFÉRENCE

**Fichiers pertinents** :
- `server/index.ts` (lignes 215-338) - Endpoint `/api/contact`
- `RAILWAY_ENV_VARIABLES.md` (lignes 257-391) - Variables d'env SMTP
- `scripts/test-contact-api-prod.js` - Script de test automatique

**Variables d'env requises** :
- Voir `RAILWAY_ENV_VARIABLES.md` sections B5-B11 (EMAIL_TO, EMAIL_FROM, SMTP_*)
