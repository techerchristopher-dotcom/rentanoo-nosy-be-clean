/**
 * Script de diagnostic pour vérifier les URLs d'authentification
 * 
 * Usage:
 * 1. Ouvrir la console du navigateur sur http://localhost:3050
 * 2. Coller ce script dans la console
 * 3. Analyser les résultats
 */

console.log('🔍 DIAGNOSTIC AUTH URL');
console.log('=====================\n');

// Vérifier window.location
console.log('📍 Window Location:');
console.log('  - origin:', window.location.origin);
console.log('  - href:', window.location.href);
console.log('  - hostname:', window.location.hostname);
console.log('  - port:', window.location.port);
console.log('');

// Vérifier les variables d'environnement (si disponibles)
console.log('🔐 Variables d\'environnement (import.meta.env):');
try {
  // Note: Ces valeurs ne sont accessibles que dans le code compilé
  // On peut les vérifier via le module config
  console.log('  - VITE_PUBLIC_SITE_URL:', typeof import.meta !== 'undefined' ? import.meta.env.VITE_PUBLIC_SITE_URL || '(non défini)' : '(non accessible depuis la console)');
} catch (e) {
  console.log('  - Variables non accessibles depuis la console (normal)');
}
console.log('');

// Vérifier localStorage pour d'éventuelles sessions Supabase
console.log('💾 LocalStorage (sessions Supabase):');
const supabaseKeys = Object.keys(localStorage).filter(key => 
  key.includes('supabase') || key.includes('auth')
);
if (supabaseKeys.length > 0) {
  supabaseKeys.forEach(key => {
    const value = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(value);
      console.log(`  - ${key}:`, parsed);
    } catch {
      console.log(`  - ${key}:`, value?.substring(0, 100) + '...');
    }
  });
} else {
  console.log('  - Aucune clé Supabase trouvée');
}
console.log('');

// Instructions pour vérifier le module config
console.log('📋 Pour vérifier AUTH_CALLBACK_URL dans le code:');
console.log('  1. Ouvrir les DevTools (F12)');
console.log('  2. Aller dans l\'onglet "Console"');
console.log('  3. Chercher le log: "🌍 Config:"');
console.log('  4. Vérifier les valeurs de SITE_URL et AUTH_CALLBACK_URL');
console.log('');

// Vérifier si on est en production ou dev
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
const isProduction = window.location.protocol === 'https:' && 
                      !isLocalhost;

console.log('🌍 Environnement détecté:');
console.log('  - Localhost:', isLocalhost ? '✅ OUI' : '❌ NON');
console.log('  - Production:', isProduction ? '✅ OUI' : '❌ NON');
console.log('  - Protocole:', window.location.protocol);
console.log('');

// Recommandations
console.log('💡 Recommandations:');
if (!isLocalhost && window.location.hostname.includes('rentanoo')) {
  console.log('  ⚠️  Tu es sur la PRODUCTION');
  console.log('  → C\'est normal d\'être redirigé vers rentanoo.yt');
} else if (isLocalhost) {
  console.log('  ✅ Tu es en LOCAL');
  console.log('  → Si tu es redirigé vers rentanoo.yt, c\'est un problème');
  console.log('  → Vérifie:');
  console.log('     1. La console pour le log "🌍 Config:"');
  console.log('     2. Supabase Dashboard → Auth → URL Configuration');
  console.log('     3. Google Cloud Console → Authorized redirect URIs');
  console.log('     4. Que le port 3050 est bien dans les deux configs');
}
console.log('');

// Test de construction d'URL
console.log('🧪 Test de construction d\'URL:');
const expectedCallbackUrl = `${window.location.origin}/auth/callback`;
console.log('  - URL callback attendue:', expectedCallbackUrl);
console.log('  - Cette URL doit être dans:');
console.log('     • Google Cloud Console → Authorized redirect URIs');
console.log('     • Supabase Dashboard → Redirect URLs');
console.log('');



