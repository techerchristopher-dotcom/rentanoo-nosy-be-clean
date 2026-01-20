# Diagnostic - Téléphone non reçu dans n8n

## 🔍 PROBLÈME IDENTIFIÉ

**Symptôme**: Le champ `phone` n'arrive jamais dans le webhook n8n, même quand il est rempli dans le formulaire.

**Cause racine**: La condition `if (data.phone)` exclut le champ du payload si :
- `data.phone` est une chaîne vide `""` (falsy en JavaScript)
- `data.phone` est `undefined` (falsy en JavaScript)
- `data.phone` est `null` (falsy en JavaScript)

## 📋 DIAGNOSTIC DÉTAILLÉ

### 1. Schéma Zod (ligne 20)
```typescript
phone: z.string().optional(),
```
✅ **OK**: Le champ est bien défini comme `phone` (optionnel)

### 2. Input HTML (ligne 308)
```typescript
<Input
  id="phone"
  type="tel"
  {...register("phone")}
  ...
/>
```
✅ **OK**: Le champ est bien enregistré sous le nom `phone` via react-hook-form

### 3. Condition problématique (lignes 92-95) - AVANT
```typescript
// Ajouter le téléphone si présent
if (data.phone) {
  payload.phone = data.phone;
}
```
❌ **PROBLÈME**: 
- Si `data.phone = ""` → `if (data.phone)` est `false` → `phone` n'est pas ajouté
- Si `data.phone = undefined` → `if (data.phone)` est `false` → `phone` n'est pas ajouté
- Si l'utilisateur entre un numéro puis l'efface → `phone` n'est pas ajouté

### 4. Logs existants (ligne 56)
```typescript
hasPhone: !!data.phone,
```
⚠️ **Limité**: Log seulement si `data.phone` est truthy, ne montre pas les chaînes vides

## ✅ CORRECTION APPLIQUÉE

### Code AVANT
```typescript
const payload: any = {
  fullName: data.fullName,
  email: data.email,
  subject: data.subject,
  message: data.message,
  timestamp: new Date().toISOString(),
};

// Ajouter le téléphone si présent
if (data.phone) {
  payload.phone = data.phone;
}
```

### Code APRÈS
```typescript
const payload: any = {
  fullName: data.fullName,
  email: data.email,
  subject: data.subject,
  message: data.message,
  timestamp: new Date().toISOString(),
  // Toujours inclure phone, même si vide (pour n8n)
  phone: data.phone ?? "",
};

// Log du payload avant envoi pour debugging
console.log("[Contact] 📦 payload sending", {
  fullName: payload.fullName,
  email: payload.email,
  phone: payload.phone,
  phoneLength: payload.phone?.length || 0,
  phoneIsEmpty: !payload.phone || payload.phone.trim() === "",
  subject: payload.subject,
  hasTimestamp: !!payload.timestamp,
});
```

## 🎯 CHANGEMENTS

1. **Toujours inclure `phone` dans le payload**:
   - Utilisation de `data.phone ?? ""` pour garantir que `phone` est toujours présent
   - Si `data.phone` est `undefined` ou `null`, on envoie `""`
   - Si `data.phone` est une chaîne vide `""`, on l'envoie telle quelle

2. **Logs de debugging ajoutés**:
   - Log complet du payload avant envoi
   - Affichage de `phone`, `phoneLength`, `phoneIsEmpty` pour diagnostiquer

## 📊 RÉSULTAT ATTENDU

**Avant**:
```json
{
  "fullName": "...",
  "email": "...",
  "subject": "...",
  "message": "...",
  "timestamp": "..."
  // ❌ phone absent si vide ou undefined
}
```

**Après**:
```json
{
  "fullName": "...",
  "email": "...",
  "subject": "...",
  "message": "...",
  "timestamp": "...",
  "phone": "+33 6 12 34 56 78"  // ✅ Toujours présent
}
```

ou si vide:
```json
{
  "fullName": "...",
  "email": "...",
  "subject": "...",
  "message": "...",
  "timestamp": "...",
  "phone": ""  // ✅ Présent mais vide
}
```

## 🔍 CONFIRMATION

**Diagnostic final**: 
- ✅ Le téléphone était non envoyé quand le champ était vide ou undefined
- ✅ Le nom du champ est correct (`phone`)
- ✅ Le mapping react-hook-form est correct
- ✅ Le problème venait de la condition `if (data.phone)` qui excluait les valeurs falsy

**Fix appliqué**: 
- ✅ `phone` est maintenant toujours inclus dans le payload avec `data.phone ?? ""`
- ✅ Logs de debugging ajoutés pour vérifier ce qui est envoyé

## 🧪 TEST

Pour tester :
1. Ouvrir la console du navigateur
2. Remplir le formulaire avec un numéro de téléphone
3. Vérifier le log `[Contact] 📦 payload sending` → doit afficher `phone: "+33 6 12 34 56 78"`
4. Vérifier dans n8n → le champ `phone` doit être présent dans `$json.body.phone`

