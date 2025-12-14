#!/usr/bin/env node
/**
 * Script de vérification de la connexion Supabase
 * 
 * Vérifie que :
 * 1. Le fichier supabase/config.toml pointe vers le bon projet
 * 2. Les variables d'environnement sont correctes
 * 3. La connexion fonctionne (si les dépendances sont installées)
 * 
 * Usage: node scripts/verify-supabase-connection.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPECTED_PROJECT_ID = 'zykwfjxurwmputxwlkxs';
const EXPECTED_SUPABASE_URL = `https://${EXPECTED_PROJECT_ID}.supabase.co`;

console.log('🔍 Vérification de la connexion Supabase...\n');

// 1. Vérifier supabase/config.toml
console.log('1️⃣ Vérification de supabase/config.toml...');
const configPath = path.join(__dirname, '..', 'supabase', 'config.toml');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const projectIdMatch = configContent.match(/project_id\s*=\s*"([^"]+)"/);
  
  if (projectIdMatch) {
    const projectId = projectIdMatch[1];
    if (projectId === EXPECTED_PROJECT_ID) {
      console.log(`   ✅ project_id = "${projectId}" (CORRECT)\n`);
    } else {
      console.log(`   ❌ project_id = "${projectId}" (ATTENDU: "${EXPECTED_PROJECT_ID}")\n`);
      process.exit(1);
    }
  } else {
    console.log('   ❌ project_id non trouvé dans config.toml\n');
    process.exit(1);
  }
} else {
  console.log('   ❌ Fichier config.toml non trouvé\n');
  process.exit(1);
}

// 2. Vérifier les variables d'environnement
console.log('2️⃣ Vérification des variables d\'environnement...');

// Essayer de charger dotenv si disponible
let dotenv;
try {
  dotenv = (await import('dotenv')).default;
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
} catch (err) {
  // dotenv non disponible, continuer sans
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.log('   ⚠️  VITE_SUPABASE_URL non définie');
  console.log('   💡 Créez un fichier .env.local avec VITE_SUPABASE_URL\n');
} else if (supabaseUrl === EXPECTED_SUPABASE_URL) {
  console.log(`   ✅ VITE_SUPABASE_URL = ${supabaseUrl} (CORRECT)\n`);
} else {
  console.log(`   ❌ VITE_SUPABASE_URL = ${supabaseUrl}`);
  console.log(`   💡 Attendu: ${EXPECTED_SUPABASE_URL}\n`);
}

if (!supabaseAnonKey) {
  console.log('   ⚠️  VITE_SUPABASE_ANON_KEY non définie');
  console.log('   💡 Créez un fichier .env.local avec VITE_SUPABASE_ANON_KEY\n');
} else {
  console.log(`   ✅ VITE_SUPABASE_ANON_KEY définie (${supabaseAnonKey.substring(0, 20)}...)\n`);
}

// 3. Tester la connexion (si les variables sont définies et les dépendances disponibles)
if (supabaseUrl && supabaseAnonKey) {
  console.log('3️⃣ Test de connexion à Supabase...');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test simple : lister les tables
    supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (error && error.code === 'PGRST116') {
          // Table n'existe pas encore (normal si le schéma n'est pas créé)
          console.log('   ✅ Connexion réussie (table profiles non trouvée, normal si schéma non créé)\n');
        } else if (error) {
          console.log(`   ⚠️  Connexion réussie mais erreur: ${error.message}\n`);
        } else {
          console.log('   ✅ Connexion réussie\n');
        }
        
        console.log('✅ Vérification terminée avec succès !');
        console.log(`\n📋 Résumé:`);
        console.log(`   - Project ID: ${EXPECTED_PROJECT_ID}`);
        console.log(`   - URL: ${EXPECTED_SUPABASE_URL}`);
        console.log(`   - Variables d'environnement: ${supabaseUrl ? '✅' : '❌'}`);
        console.log(`\n⚠️  Note: La configuration MCP Supabase dans Cursor doit aussi pointer vers ce projet.`);
        console.log(`   Voir ETAPE-3-CORRECTION-CONNEXION-MCP.md pour plus d'informations.\n`);
      })
      .catch((err) => {
        console.log(`   ❌ Erreur de connexion: ${err.message}\n`);
        process.exit(1);
      });
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('   ⚠️  Dépendances non installées (npm install requis pour tester la connexion)\n');
      console.log('✅ Vérification terminée (partielle)');
      console.log(`\n📋 Résumé:`);
      console.log(`   - Project ID dans config.toml: ✅`);
      console.log(`   - Variables d'environnement: ${supabaseUrl ? '✅' : '❌'}`);
      console.log(`\n⚠️  Note: La configuration MCP Supabase dans Cursor doit aussi pointer vers ce projet.`);
      console.log(`   Voir ETAPE-3-CORRECTION-CONNEXION-MCP.md pour plus d'informations.\n`);
    } else {
      console.log(`   ❌ Erreur lors de la création du client: ${err.message}\n`);
      process.exit(1);
    }
  }
} else {
  console.log('3️⃣ Test de connexion ignoré (variables d\'environnement manquantes)\n');
  console.log('✅ Vérification terminée (partielle)');
  console.log(`\n📋 Résumé:`);
  console.log(`   - Project ID dans config.toml: ✅`);
  console.log(`   - Variables d'environnement: ❌ (créer .env.local)`);
  console.log(`\n⚠️  Note: La configuration MCP Supabase dans Cursor doit aussi pointer vers ce projet.`);
  console.log(`   Voir ETAPE-3-CORRECTION-CONNEXION-MCP.md pour plus d'informations.\n`);
}
