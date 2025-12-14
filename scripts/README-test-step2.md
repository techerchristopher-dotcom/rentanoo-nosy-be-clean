# 🧪 Script de test automatique - Étape 2 (Relevés du véhicule)

## 📋 Description

Ce script teste la sauvegarde complète de l'Étape 2 du check-in départ dans la table `checkin_depart`.

**Ce qu'il teste** :
- ✅ Sauvegarde des colonnes SQL (`kilometrage_depart`, `niveau_carburant`, `photos_dashboard`)
- ✅ Sauvegarde du JSON `data.step2`
- ✅ Présence des URLs dans `photos_dashboard` (jsonb)
- ✅ Cohérence entre colonnes SQL et JSON
- ✅ Format des URLs (checkin-photos/booking_.../depart/photos_dashboard_...)

---

## 🚀 Prérequis

1. **Bucket `checkin-photos` créé** dans Supabase (Public, 10MB, images)
2. **Variables d'environnement** :
   ```bash
   VITE_SUPABASE_URL=https://zykwfjxurwmputxwlkxs.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_anon_key
   ```
3. **Un booking_id existant** (récupérable depuis la table `bookings`)

---

## 📖 Usage

```bash
# Installer tsx si besoin
npm install -g tsx

# Exécuter le test avec un booking_id
npx tsx scripts/test-step2-save.ts fc920e13-b225-4d51-adbc-ddd118cec251
```

---

## 🔍 Ce que fait le script

### **Étapes d'exécution** :

1. **Vérification check-in existant** :
   - Si un check-in existe pour ce `booking_id` → Mode UPDATE
   - Sinon → Mode INSERT

2. **Construction du payload Step2** :
   ```typescript
   {
     completedAt: "2025-11-08T...",
     vehicule: { marque, modele, immatriculation },
     releves: {
       kilometrage: 45000,
       niveauCarburant: 75,
       dashboardPhotos: [
         {
           storagePath: "booking_.../depart/photos_dashboard_..._<timestamp>_<uuid>.jpg",
           publicUrl: "https://.../checkin-photos/booking_.../depart/photos_dashboard_...jpg",
           uploadedAt: "2025-11-08T..."
         }
       ]
     }
   }
   ```

3. **Sauvegarde dans `checkin_depart`** :
   - Colonnes SQL : `kilometrage_depart`, `niveau_carburant`, `photos_dashboard`
   - JSON : `data.step2`

4. **Vérification finale** :
   - Re-lecture de la ligne
   - Checklist de validation (9 points)

---

## ✅ Résultat attendu

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 TEST AUTOMATIQUE - SAUVEGARDE ÉTAPE 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Booking ID : fc920e13-b225-4d51-adbc-ddd118cec251

1️⃣ Vérification check-in existant...
✅ Check-in trouvé (id: 782f2ee5-02c0-4826-8f70-0de6431a5aac)
   Action : UPDATE

2️⃣ Construction du payload Step2...
✅ Payload Step2 : {
  completedAt: '2025-11-08T18:30:00.000Z',
  kilometrage: 45000,
  niveauCarburant: 75,
  photosCount: 2
}

3️⃣ Préparation des données pour Supabase...
✅ Mode UPDATE : merge avec step1 existant

4️⃣ Sauvegarde dans checkin_depart...
✅ Sauvegarde réussie, checkin_id: 782f2ee5-02c0-4826-8f70-0de6431a5aac

5️⃣ Vérification finale...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RÉSULTATS FINAUX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 COLONNES SQL :
   - kilometrage_depart : 45000
   - niveau_carburant   : 75
   - photos_dashboard (type): object
   - photos_dashboard (length): 2

📸 PHOTOS DASHBOARD (dans colonne SQL) :
   Photo 1 :
      - storagePath : booking_fc920e13-.../depart/photos_dashboard_fc920e13-..._1730846300000_a3f8k2.jpg
      - publicUrl   : https://zykwfjxurwmputxwlkxs.supabase.co/storage/v1/object/public/checkin-photos/booking_fc920e13-.../depart/photos_dashboard_...jpg
      - uploadedAt  : 2025-11-08T17:45:00.000Z
   Photo 2 :
      - storagePath : booking_fc920e13-.../depart/photos_dashboard_fc920e13-..._1730846310000_b9g3m1.jpg
      - publicUrl   : https://...checkin-photos/.../photos_dashboard_...jpg
      - uploadedAt  : 2025-11-08T17:45:10.000Z

📦 JSON data.step2 :
   - completedAt : 2025-11-08T18:30:00.000Z
   - vehicule    : { marque: 'Peugeot', modele: '208', immatriculation: 'AB-123-CD' }
   - releves.kilometrage      : 45000
   - releves.niveauCarburant  : 75
   - releves.dashboardPhotos (length): 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TEST RÉUSSI !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 CHECKLIST DE VALIDATION :
   ✅ Kilométrage stocké en SQL
   ✅ Niveau carburant stocké en SQL
   ✅ photos_dashboard est un array
   ✅ photos_dashboard contient des photos
   ✅ photos_dashboard[0] contient publicUrl
   ✅ data.step2 existe
   ✅ data.step2.releves.dashboardPhotos existe
   ✅ Cohérence SQL ↔ JSON (kilometrage)
   ✅ Cohérence SQL ↔ JSON (carburant)

🎉 TOUS LES TESTS SONT PASSÉS !
```

---

## 🐛 Troubleshooting

### **Erreur "Bucket not found"**
- ✅ Solution : Vérifier que le bucket `checkin-photos` existe et est public

### **Erreur "booking_id manquant"**
- ✅ Solution : Passer un booking_id valide en argument

### **Erreur "VITE_SUPABASE_ANON_KEY not found"**
- ✅ Solution : Charger les variables d'environnement depuis `.env`

---

## 📊 Requête SQL de vérification manuelle

```sql
SELECT
  id,
  booking_id,
  kilometrage_depart,
  niveau_carburant,
  jsonb_pretty(photos_dashboard) AS photos_dashboard_json,
  jsonb_pretty(data->'step2') AS step2_json
FROM checkin_depart
WHERE booking_id = 'fc920e13-b225-4d51-adbc-ddd118cec251'
ORDER BY created_at DESC
LIMIT 1;
```

