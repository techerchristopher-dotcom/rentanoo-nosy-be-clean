#!/usr/bin/env node

/**
 * Script de diagnostic pour la duplication du projet
 * Collecte toutes les informations nécessaires avant la duplication
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 DIAGNOSTIC DE DUPLICATION DU PROJET\n');
console.log('=' .repeat(60));

// 1. Vérifier les fichiers de configuration
console.log('\n📁 1. FICHIERS DE CONFIGURATION');
console.log('-'.repeat(60));

const configFiles = [
  '.env',
  '.env.local',
  'supabase/config.toml',
  'package.json',
  'vite.config.ts',
  'nixpacks.toml',
];

configFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} : EXISTE`);
    
    // Lire le contenu pour certaines vérifications
    if (file === 'supabase/config.toml') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const projectIdMatch = content.match(/project_id\s*=\s*"([^"]+)"/);
      if (projectIdMatch) {
        console.log(`   → Project ID: ${projectIdMatch[1]}`);
      }
    }
    
    if (file === '.env' || file === '.env.local') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const supabaseUrl = content.match(/VITE_SUPABASE_URL=(.+)/);
      const supabaseKey = content.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
      const siteUrl = content.match(/VITE_PUBLIC_SITE_URL=(.+)/);
      
      if (supabaseUrl) console.log(`   → VITE_SUPABASE_URL: ${supabaseUrl[1]}`);
      if (supabaseKey) console.log(`   → VITE_SUPABASE_ANON_KEY: ${supabaseKey[1].substring(0, 20)}...`);
      if (siteUrl) console.log(`   → VITE_PUBLIC_SITE_URL: ${siteUrl[1]}`);
    }
  } else {
    console.log(`❌ ${file} : MANQUANT`);
  }
});

// 2. Chercher les références au domaine
console.log('\n🌐 2. RÉFÉRENCES AU DOMAINE');
console.log('-'.repeat(60));

function searchInFiles(dir, pattern, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
  const results = [];
  
  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (pattern.test(content)) {
            const relativePath = path.relative(projectRoot, fullPath);
            const lines = content.split('\n');
            const matchingLines = lines
              .map((line, index) => ({ line: line.trim(), number: index + 1 }))
              .filter(({ line }) => pattern.test(line))
              .slice(0, 3); // Limiter à 3 lignes par fichier
            
            results.push({
              file: relativePath,
              lines: matchingLines,
            });
          }
        } catch (err) {
          // Ignorer les fichiers binaires
        }
      }
    }
  }
  
  walkDir(dir);
  return results;
}

const domainPattern = /rentanoo\.yt/gi;
const domainRefs = searchInFiles(projectRoot, domainPattern);

if (domainRefs.length > 0) {
  console.log(`⚠️  Trouvé ${domainRefs.length} fichier(s) contenant "rentanoo.yt":`);
  domainRefs.slice(0, 10).forEach(({ file, lines }) => {
    console.log(`   📄 ${file}`);
    lines.forEach(({ line, number }) => {
      console.log(`      L${number}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
    });
  });
  if (domainRefs.length > 10) {
    console.log(`   ... et ${domainRefs.length - 10} autre(s) fichier(s)`);
  }
} else {
  console.log('✅ Aucune référence à "rentanoo.yt" trouvée');
}

// 3. Chercher les références au Project ID Supabase
console.log('\n🗄️  3. RÉFÉRENCES AU PROJECT ID SUPABASE');
console.log('-'.repeat(60));

const projectIdPattern = /zykwfjxurwmputxwlkxs/gi;
const projectIdRefs = searchInFiles(projectRoot, projectIdPattern);

if (projectIdRefs.length > 0) {
  console.log(`⚠️  Trouvé ${projectIdRefs.length} fichier(s) contenant le Project ID:`);
  projectIdRefs.slice(0, 10).forEach(({ file }) => {
    console.log(`   📄 ${file}`);
  });
  if (projectIdRefs.length > 10) {
    console.log(`   ... et ${projectIdRefs.length - 10} autre(s) fichier(s)`);
  }
} else {
  console.log('✅ Aucune référence au Project ID trouvée');
}

// 4. Chercher les buckets de storage utilisés
console.log('\n📦 4. BUCKETS DE STORAGE UTILISÉS');
console.log('-'.repeat(60));

const storagePattern = /storage\.from\(['"]([^'"]+)['"]\)/g;
const storageRefs = searchInFiles(projectRoot, /storage\.from/);
const buckets = new Set();

storageRefs.forEach(({ file }) => {
  try {
    const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
    let match;
    while ((match = storagePattern.exec(content)) !== null) {
      buckets.add(match[1]);
    }
  } catch (err) {
    // Ignorer
  }
});

if (buckets.size > 0) {
  console.log('✅ Buckets trouvés dans le code:');
  Array.from(buckets).sort().forEach(bucket => {
    console.log(`   📦 ${bucket}`);
  });
} else {
  console.log('⚠️  Aucun bucket trouvé dans le code');
}

// 5. Chercher les Edge Functions
console.log('\n⚡ 5. EDGE FUNCTIONS');
console.log('-'.repeat(60));

const functionsDir = path.join(projectRoot, 'supabase', 'functions');
if (fs.existsSync(functionsDir)) {
  const functions = fs.readdirSync(functionsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  
  if (functions.length > 0) {
    console.log('✅ Edge Functions trouvées:');
    functions.forEach(func => {
      console.log(`   ⚡ ${func}`);
      
      // Vérifier les variables d'environnement dans les commentaires
      const funcPath = path.join(functionsDir, func, 'index.ts');
      if (fs.existsSync(funcPath)) {
        const content = fs.readFileSync(funcPath, 'utf-8');
        const envVars = content.match(/Deno\.env\.get\(["']([^"']+)["']\)/g);
        if (envVars) {
          const uniqueVars = [...new Set(envVars.map(v => v.match(/["']([^"']+)["']/)[1]))];
          console.log(`      Variables d'env: ${uniqueVars.join(', ')}`);
        }
      }
    });
  } else {
    console.log('⚠️  Aucune Edge Function trouvée');
  }
} else {
  console.log('❌ Dossier supabase/functions introuvable');
}

// 6. Chercher les appels aux Edge Functions
console.log('\n🔗 6. APPELS AUX EDGE FUNCTIONS');
console.log('-'.repeat(60));

const functionCallPattern = /functions\/v1\/([^"'\s]+)/g;
const functionCalls = searchInFiles(projectRoot, /functions\/v1/);

if (functionCalls.length > 0) {
  const calledFunctions = new Set();
  functionCalls.forEach(({ file }) => {
    try {
      const content = fs.readFileSync(path.join(projectRoot, file), 'utf-8');
      let match;
      while ((match = functionCallPattern.exec(content)) !== null) {
        calledFunctions.add(match[1]);
      }
    } catch (err) {
      // Ignorer
    }
  });
  
  if (calledFunctions.size > 0) {
    console.log('✅ Edge Functions appelées dans le code:');
    Array.from(calledFunctions).sort().forEach(func => {
      console.log(`   🔗 ${func}`);
    });
  }
} else {
  console.log('⚠️  Aucun appel à une Edge Function trouvé');
}

// 7. Résumé et checklist
console.log('\n📋 7. CHECKLIST DE VÉRIFICATION');
console.log('-'.repeat(60));
console.log(`
Avant de commencer la duplication, vérifiez dans le Dashboard Supabase :

✅ Configuration Auth:
   → Site URL: https://rentanoo.yt
   → Redirect URLs: Liste complète (rentanoo.yt, localhost, etc.)

✅ OAuth Google:
   → Client ID configuré
   → Authorized redirect URIs dans Google Cloud Console

✅ Storage Buckets:
   → avatars (public: ${buckets.has('avatars') ? 'trouvé' : 'à vérifier'})
   → driver-licenses (public: ${buckets.has('driver-licenses') ? 'trouvé' : 'à vérifier'})
   → checkin-photos (public: ${buckets.has('checkin-photos') ? 'trouvé' : 'à vérifier'})
   ${Array.from(buckets).filter(b => !['avatars', 'driver-licenses', 'checkin-photos'].includes(b)).map(b => `   → ${b} (à vérifier)`).join('\n')}

✅ Edge Functions:
   ${functions.length > 0 ? functions.map(f => `   → ${f} (variables d'env à noter)`).join('\n') : '   → Aucune trouvée'}

✅ Stripe:
   → Publishable Key (Test/Live)
   → Secret Key (Test/Live)
   → Webhook endpoint URL
   → Webhook signing secret

✅ Déploiement:
   → Variables d'environnement dans Coolify/Dashboard
   → Domaine configuré (rentanoo.yt)
`);

console.log('\n' + '='.repeat(60));
console.log('✅ Diagnostic terminé !');
console.log('📖 Consultez GUIDE-DUPLICATION-PROJET.md pour le plan complet.\n');
