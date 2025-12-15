# Migration Dictionary Entries - Guide d'application

## 📋 Fichier de migration

**Fichier** : `supabase/migrations/001_dictionary_entries.sql`

**Description** : Crée la table `dictionary_entries` pour gérer un dictionnaire multilingue avec étymologie.

---

## 🚀 Comment appliquer la migration

### Option 1 : Via Supabase SQL Editor (Recommandé pour test/validation)

1. **Accéder au SQL Editor** :
   - Ouvrir le dashboard Supabase : https://supabase.com/dashboard
   - Sélectionner le projet : `tbsgzykqcksmqxpimwry` (rentanoo-nosy-be)
   - Aller dans **SQL Editor** (menu de gauche)

2. **Exécuter le script** :
   - Cliquer sur **"New query"**
   - Copier-coller le contenu de `001_dictionary_entries.sql`
   - Cliquer sur **"Run"** (ou `Cmd/Ctrl + Enter`)

3. **Vérifier** :
   - Vérifier qu'aucune erreur n'apparaît
   - Vérifier dans **Table Editor** que la table `dictionary_entries` existe
   - Vérifier dans **Authentication > Policies** que les policies RLS sont créées

---

### Option 2 : Via Supabase CLI (Recommandé pour production)

**Prérequis** : Supabase CLI installé et configuré

```bash
# 1. Vérifier que vous êtes dans le bon projet
supabase link --project-ref tbsgzykqcksmqxpimwry

# 2. Appliquer la migration
supabase db push

# OU appliquer une migration spécifique
supabase migration up
```

**Note** : Si vous utilisez Supabase CLI, assurez-vous que le fichier est dans le bon format de nommage :
- Format attendu : `YYYYMMDDHHMMSS_description.sql` (timestamp)
- Exemple : `20250127120000_dictionary_entries.sql`

Pour renommer le fichier :
```bash
mv supabase/migrations/001_dictionary_entries.sql \
   supabase/migrations/$(date +%Y%m%d%H%M%S)_dictionary_entries.sql
```

---

### Option 3 : Via MCP Supabase (Cursor)

Si vous utilisez le MCP Supabase dans Cursor, vous pouvez appliquer la migration via :

```typescript
// Utiliser mcp_supabase_apply_migration
// Le contenu du fichier SQL sera appliqué directement
```

---

## ✅ Vérification post-migration

### 1. Vérifier la table

```sql
-- Vérifier que la table existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'dictionary_entries';

-- Vérifier la structure
\d dictionary_entries
```

### 2. Vérifier les index

```sql
-- Lister les index sur la table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'dictionary_entries';
```

**Index attendus** :
- `idx_dictionary_entries_word_normalized`
- `idx_dictionary_entries_language_code`
- `idx_dictionary_entries_tags` (GIN)
- `idx_dictionary_entries_fts` (GIN full-text)
- `idx_dictionary_entries_lang_word` (composite)
- `idx_dictionary_entries_status` (partial)

### 3. Vérifier RLS

```sql
-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'dictionary_entries';
-- rowsecurity doit être 't' (true)

-- Lister les policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'dictionary_entries';
```

**Policies attendues** :
- `dictionary_entries_select_public` (SELECT)
- `dictionary_entries_insert_authenticated` (INSERT)
- `dictionary_entries_update_creator` (UPDATE)
- `dictionary_entries_delete_creator` (DELETE)

### 4. Vérifier les triggers

```sql
-- Lister les triggers
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'dictionary_entries';
```

**Triggers attendus** :
- `trg_dictionary_entries_updated_at` (BEFORE UPDATE)
- `trg_dictionary_entries_updated_by` (BEFORE UPDATE)

### 5. Test d'insertion (optionnel)

```sql
-- Test d'insertion (nécessite un utilisateur authentifié)
-- Remplacer 'USER_UUID' par un UUID valide de la table profiles

INSERT INTO public.dictionary_entries (
    word,
    word_normalized,
    language_code,
    definitions,
    created_by
) VALUES (
    'Bonjour',
    'bonjour',
    'fr',
    '[{"text": "Salutation utilisée pour dire bonjour", "source": "Larousse"}]'::jsonb,
    'USER_UUID'::uuid
);

-- Vérifier l'insertion
SELECT * FROM public.dictionary_entries WHERE word = 'Bonjour';
```

---

## 🔒 Sécurité RLS

### Comportement attendu

1. **SELECT** : 
   - ✅ Public peut lire uniquement les entrées avec `status = 'published'`
   - ❌ Les entrées `draft` ou `archived` ne sont pas visibles publiquement

2. **INSERT** :
   - ✅ Utilisateurs authentifiés peuvent créer des entrées
   - ✅ `created_by` doit être égal à `auth.uid()`
   - ❌ Les utilisateurs anonymes ne peuvent pas insérer

3. **UPDATE** :
   - ✅ Seul le créateur (`created_by`) peut modifier son entrée
   - ✅ `updated_by` est automatiquement mis à jour via trigger
   - ❌ Les autres utilisateurs ne peuvent pas modifier

4. **DELETE** :
   - ✅ Seul le créateur peut supprimer son entrée
   - ❌ Les autres utilisateurs ne peuvent pas supprimer

---

## 📝 Notes importantes

### Normalisation du mot

Le champ `word_normalized` doit être généré **côté application** avant l'insertion :
- Convertir en lowercase
- Supprimer les accents (ex: "é" → "e")
- Stocker le résultat dans `word_normalized`

**Exemple JavaScript** :
```javascript
function normalizeWord(word) {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Supprime les accents
}

// Exemple
normalizeWord('Étymologie') // → 'etymologie'
```

### Structure JSONB

**definitions** :
```json
[
  {
    "text": "Définition principale",
    "source": "Larousse",
    "examples": ["Exemple 1", "Exemple 2"]
  }
]
```

**etymology** :
```json
{
  "origin": "Du latin etymologia",
  "derivation": "étymon + logie",
  "related_words": ["étymologie", "étymologique"]
}
```

**sources** :
```json
[
  {
    "name": "Dictionnaire Larousse",
    "page": "245",
    "year": 2020
  }
]
```

---

## 🐛 Dépannage

### Erreur : "function update_updated_at_column() does not exist"

**Solution** : La fonction est créée dans le script. Si elle existe déjà avec une signature différente, le script utilise `CREATE OR REPLACE` pour la mettre à jour.

### Erreur : "relation profiles does not exist"

**Solution** : Vérifier que la table `profiles` existe dans le schéma `public`. La migration dépend de cette table pour les foreign keys.

### Erreur : "permission denied for table dictionary_entries"

**Solution** : Vérifier que RLS est activé et que les policies sont correctement créées. Vérifier aussi que vous êtes authentifié si vous testez INSERT/UPDATE.

### Erreur : "check constraint violation" sur language_code

**Solution** : Vérifier que le `language_code` est bien l'une des 4 valeurs autorisées : `'fr'`, `'en'`, `'it'`, `'de'`.

---

## 📚 Prochaines étapes

Après validation de cette migration :

1. **Créer le service TypeScript** : `src/services/supabase/dictionary.ts`
2. **Créer les types** : `src/types/dictionary.ts`
3. **Créer les pages** : `src/pages/dictionary/`
4. **Créer les composants** : `src/components/dictionary/`

---

*Migration créée le : 2025-01-27*

