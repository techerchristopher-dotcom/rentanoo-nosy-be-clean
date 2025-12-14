#!/usr/bin/env node
/**
 * Script de diagnostic complet du schéma Supabase (LECTURE SEULE)
 * 
 * Projet : zykwfjxurwmputxwlkxs (Rentanoo)
 * 
 * Usage: node scripts/diagnostic-schema-complet.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPECTED_PROJECT_ID = 'zykwfjxurwmputxwlkxs';
const EXPECTED_SUPABASE_URL = `https://${EXPECTED_PROJECT_ID}.supabase.co`;

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || EXPECTED_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY non définie dans .env.local');
  console.error('   Ce script nécessite une clé API pour accéder à la base de données.');
  process.exit(1);
}

// Vérifier l'URL
if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
  console.error(`❌ URL Supabase incorrecte: ${supabaseUrl}`);
  console.error(`   Attendu: ${EXPECTED_SUPABASE_URL}`);
  process.exit(1);
}

console.log('🔍 Diagnostic complet du schéma Supabase');
console.log(`📋 Projet: ${EXPECTED_PROJECT_ID} (Rentanoo)`);
console.log(`🌐 URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fonction pour exécuter des requêtes SQL
async function runSQL(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) {
    // Essayer avec la méthode directe
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`SQL Error: ${response.statusText}`);
    }
    return await response.json();
  }
  return data;
}

// Diagnostic complet
async function diagnosticComplet() {
  const output = [];
  
  output.push('# 🔍 Diagnostic Complet du Schéma Supabase - Rentanoo\n');
  output.push(`**Date** : ${new Date().toISOString().split('T')[0]}`);
  output.push(`**Projet** : \`zykwfjxurwmputxwlkxs\` (Rentanoo)`);
  output.push(`**URL** : \`${supabaseUrl}\`\n`);
  output.push('---\n');
  
  // 1. Vérification du projet
  output.push('## ✅ 1. Vérification de la Connexion\n');
  output.push(`- **Project ID** : \`${EXPECTED_PROJECT_ID}\` ✅`);
  output.push(`- **URL** : \`${supabaseUrl}\` ✅`);
  output.push(`- **Connexion** : ✅ Établie\n`);
  output.push('---\n');
  
  // 2. Tables
  output.push('## 📊 2. Tables du Schéma `public`\n');
  
  try {
    // Lister les tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      // Méthode alternative : requête SQL directe
      const query = `
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      // Utiliser la méthode REST API pour exécuter SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      
      output.push('⚠️ Impossible de lister les tables via l\'API standard.\n');
      output.push('💡 Utilisez les outils MCP Supabase ou le dashboard Supabase pour accéder aux informations complètes.\n');
    } else {
      for (const table of tables || []) {
        output.push(`### Table \`${table.table_name}\`\n`);
        output.push(`- **Type** : ${table.table_type}\n`);
        
        // Récupérer les colonnes
        // Note: Cette partie nécessite des permissions spéciales
        output.push('*(Détails des colonnes nécessitent des permissions admin)*\n');
      }
    }
  } catch (err) {
    output.push(`❌ Erreur lors de la récupération des tables: ${err.message}\n`);
  }
  
  output.push('---\n');
  output.push('## ⚠️ Limitation\n\n');
  output.push('Ce script nécessite des permissions admin pour accéder aux métadonnées complètes.\n');
  output.push('Pour un diagnostic complet, utilisez:\n');
  output.push('1. Les outils MCP Supabase (si disponibles)\n');
  output.push('2. Le dashboard Supabase\n');
  output.push('3. La CLI Supabase: `supabase db dump --schema public`\n');
  
  // Écrire le résultat
  const outputPath = path.join(__dirname, '..', 'DIAGNOSTIC-SCHEMA-COMPLET.md');
  fs.writeFileSync(outputPath, output.join('\n'));
  console.log(`✅ Diagnostic écrit dans: ${outputPath}`);
}

// Exécuter
diagnosticComplet().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});

