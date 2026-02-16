# IMPLEMENTATION — Bouton "Renvoyer l'email" via n8n

**Date** : 2026-02-11  
**Statut** : ✅ Implémenté (corrigé)  
**Fichiers modifiés** : 1 fichier + 1 config

---

## 🎯 OBJECTIF

Remplacer l'appel `supabase.auth.resend()` par un appel au webhook n8n **existant** `profiles-created` pour contourner les limitations de Supabase Auth (email déjà confirmé, etc.).

**Correction** : Utilisation du webhook existant au lieu d'en créer un nouveau.

---

## 📝 MODIFICATIONS EFFECTUÉES

### 1️⃣ Fichier : `src/pages/onboarding/ClientOnboarding.tsx`

**Fonction modifiée** : `handleResendEmail` (lignes 141-181)

**Changements** :
- ✅ Suppression de `supabase.auth.resend()`
- ✅ Ajout d'un `fetch()` vers le webhook n8n
- ✅ Payload JSON : `{ email, userId, firstName }`
- ✅ Logs diagnostic : `[RESEND N8N] ok` / `[RESEND N8N] failed`
- ✅ Gestion d'erreur HTTP avec status et message

**Diff** :
```diff
- const { error } = await supabase.auth.resend({
-   type: "signup",
-   email: userEmail,
-   options: {
-     emailRedirectTo: `${window.location.origin}/onboarding/client`,
-   },
- });

+ const webhookUrl = import.meta.env.VITE_N8N_PROFILES_CREATED_WEBHOOK_URL;
+ if (!webhookUrl) {
+   toast({ title: "Erreur", description: "Configuration email manquante (webhook)." });
+   return;
+ }
+ 
+ const response = await fetch(webhookUrl, {
+   method: "POST",
+   headers: { "Content-Type": "application/json" },
+   body: JSON.stringify({
+     body: {
+       record: {
+         id: userId,
+         email: userEmail,
+         first_name: profile?.firstName || null,
+         last_name: profile?.lastName || null,
+         phone: profile?.phone || null,
+       },
+     },
+   }),
+ });
```

---

### 2️⃣ Fichier : `.env.local`

**Variable ajoutée** :
```env
VITE_N8N_PROFILES_CREATED_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/profiles-created
```

**Pas de fallback hardcodé** :  
Si la variable n'est pas définie, un toast d'erreur s'affiche : "Configuration email manquante (webhook)."

---

### 3️⃣ Fichier : `.env.local.example`

**Création** : Fichier d'exemple pour documenter la variable d'environnement

```env
# n8n Webhooks
VITE_N8N_PROFILES_CREATED_WEBHOOK_URL=https://n8n.srv1285649.hstgr.cloud/webhook/profiles-created
```

---

## 🔌 WEBHOOK N8N UTILISÉ

### URL
`https://n8n.srv1285649.hstgr.cloud/webhook/profiles-created`

**Important** : C'est le **même webhook** que celui déclenché par le trigger Supabase Database lors de la création d'un profil.

### Payload envoyé
```json
{
  "body": {
    "record": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "first_name": "Jean",
      "last_name": "Dupont",
      "phone": "+262..."
    }
  }
}
```

**Format** : Compatible avec le format attendu par n8n (`items[0].json.body.record`)

### Comportement du workflow n8n
1. Reçoit le payload avec `body.record`
2. Génère un magic link Supabase via l'API Auth
3. Envoie un email de confirmation avec le template Gmail
4. Répond HTTP 200/201 si succès
5. Répond 4xx/5xx avec message d'erreur si échec

---

## 🧪 TESTS

### Test local (avec serveur de dev)

1. Créer un compte via `/auth/register`
2. Sur `/onboarding/client` → Step 2 → cliquer "J'ai confirmé mon compte"
3. Si `kyc_status !== "verified"` → bouton "Renvoyer l'email" apparaît
4. Cliquer "Renvoyer l'email"
5. **Vérifier dans la console** :
   - ✅ `[RESEND N8N] ok` → succès
   - ❌ `[RESEND N8N] failed` → erreur avec status et message

### Test en prod

1. Le webhook n8n `profiles-created` existe déjà et fonctionne
2. Tester avec un compte en Step 2
3. Vérifier réception de l'email

---

## ⚠️ POINTS D'ATTENTION

### 1. Réutilisation du workflow existant

**Le workflow n8n `profiles-created` existe déjà** et est déclenché automatiquement par le trigger Supabase Database lors de la création d'un profil.

**Avantage** : Pas besoin de créer un nouveau workflow, on réutilise l'existant.

**Important** : Le payload doit être au format `body.record` pour être compatible avec le workflow.

### 2. Différence avec Supabase resend()

**Avantage de n8n** :
- Pas de limitation "User already registered"
- Contrôle total sur le template email
- Peut renvoyer même si `email_confirmed_at` est déjà défini
- Réutilise le workflow existant (pas de duplication)

**Inconvénient** :
- Dépendance externe (n8n doit être up)
- Variable d'environnement requise (pas de fallback)

---

## 🔄 ROLLBACK

Si le webhook n8n ne fonctionne pas, voici le code Supabase original à remettre :

```ts
const { error } = await supabase.auth.resend({
  type: "signup",
  email: userEmail,
  options: {
    emailRedirectTo: `${window.location.origin}/onboarding/client`,
  },
});
if (error) {
  toast({
    title: "Erreur",
    description: error.message || "Impossible de renvoyer l'email.",
    variant: "destructive",
  });
} else {
  toast({
    title: "Email renvoyé",
    description: "Vérifiez votre boîte mail.",
  });
}
```

---

## ✅ VALIDATION

- [x] Code modifié (handleResendEmail)
- [x] Variable env ajoutée (.env.local)
- [x] Fichier example créé (.env.local.example)
- [x] Logs diagnostic ajoutés
- [x] Toast succès/erreur conservé
- [x] Serveur de dev redémarré
- [x] Webhook n8n `profiles-created` existe déjà (réutilisé)
- [x] Payload compatible avec le workflow existant
- [x] Pas de fallback hardcodé
- [ ] Test manuel effectué
- [ ] Email reçu après clic "Renvoyer"

---

## 📋 PROCHAINES ÉTAPES

1. **Tester en local** : cliquer "Renvoyer l'email" et vérifier les logs console
2. **Vérifier en prod** : s'assurer que l'URL webhook est accessible depuis le front
3. **Déployer** : commit + push + vérifier en production
4. **Vérifier réception email** : confirmer que l'email arrive avec le magic link

---

**Implémentation terminée** ✅
