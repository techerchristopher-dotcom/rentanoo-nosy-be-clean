/**
 * Script de test pour vérifier l'endpoint /api/contact en production
 * 
 * Usage:
 *   node scripts/test-contact-api-prod.js
 *   node scripts/test-contact-api-prod.js --url https://rentanoo.com
 */

const targetUrl = process.argv.includes('--url') 
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'https://rentanoo.com';

const apiUrl = `${targetUrl}/api/contact`;

console.log('🔍 Test de l\'endpoint /api/contact en production');
console.log(`📍 URL: ${apiUrl}\n`);

// Test 1: Vérifier que l'endpoint répond (OPTIONS pour CORS, GET pour voir la réponse)
async function testEndpoint() {
  try {
    console.log('📡 Test 1: Vérifier que l\'endpoint répond...');
    
    // Test OPTIONS (CORS preflight)
    const optionsResponse = await fetch(apiUrl, {
      method: 'OPTIONS',
    });
    
    console.log(`   ✅ OPTIONS: ${optionsResponse.status} ${optionsResponse.statusText}`);
    console.log(`   📋 Headers CORS:`, {
      'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods'),
    });
    
    // Test POST avec données invalides (devrait retourner 400)
    console.log('\n📡 Test 2: Envoi POST avec données invalides (devrait retourner 400)...');
    const testResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Données manquantes - devrait retourner 400
      }),
    });
    
    const testResult = await testResponse.json().catch(() => ({ error: 'Erreur parsing JSON' }));
    
    console.log(`   📊 Status: ${testResponse.status} ${testResponse.statusText}`);
    console.log(`   📦 Réponse:`, JSON.stringify(testResult, null, 2));
    
    if (testResponse.status === 400 || testResponse.status === 415) {
      console.log('   ✅ L\'endpoint répond correctement (400 = validation, 415 = Content-Type)');
    } else if (testResponse.status === 500) {
      console.log('   ⚠️  L\'endpoint répond mais retourne 500 (variables d\'env SMTP manquantes ?)');
      console.log('   💡 Vérifier les variables SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_TO');
    } else if (testResponse.status === 404) {
      console.log('   ❌ L\'endpoint n\'existe pas (404) - backend non déployé ?');
    } else {
      console.log(`   ⚠️  Status inattendu: ${testResponse.status}`);
    }
    
    // Test POST avec FormData (format réel du formulaire)
    console.log('\n📡 Test 3: Envoi POST avec FormData (format réel)...');
    const formData = new FormData();
    formData.append('fullName', 'Test API');
    formData.append('email', 'test@example.com');
    formData.append('subject', 'Test API Contact');
    formData.append('message', 'Ceci est un test automatique de l\'API');
    
    const formResponse = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });
    
    const formResult = await formResponse.json().catch(() => ({ error: 'Erreur parsing JSON' }));
    
    console.log(`   📊 Status: ${formResponse.status} ${formResponse.statusText}`);
    console.log(`   📦 Réponse:`, JSON.stringify(formResult, null, 2));
    
    if (formResponse.status === 200) {
      console.log('   ✅ Email envoyé avec succès !');
      console.log('   💡 Vérifier ta boîte mail pour confirmer la réception');
    } else if (formResponse.status === 500 && formResult.error?.includes('SMTP') || formResult.error?.includes('EMAIL_TO')) {
      console.log('   ⚠️  Erreur configuration SMTP/EMAIL_TO');
      console.log('   💡 Variables manquantes ou incorrectes:');
      console.log('      - EMAIL_TO (requis)');
      console.log('      - SMTP_HOST (optionnel, défaut: smtp.gmail.com)');
      console.log('      - SMTP_PORT (optionnel, défaut: 587)');
      console.log('      - SMTP_USER (requis)');
      console.log('      - SMTP_PASS (requis)');
      console.log('      - EMAIL_FROM (optionnel)');
    } else {
      console.log(`   ⚠️  Status: ${formResponse.status} - ${formResult.error || 'Erreur inconnue'}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`✅ Endpoint accessible: ${apiUrl}`);
    console.log(`✅ CORS configuré: ${optionsResponse.headers.get('access-control-allow-origin') || 'Non'}`);
    console.log(`📊 Status final: ${formResponse.status}`);
    
    if (formResponse.status === 200) {
      console.log('\n🎉 L\'endpoint fonctionne correctement !');
      console.log('✅ Variables SMTP configurées');
      console.log('✅ Email envoyé avec succès');
    } else if (formResponse.status === 500) {
      console.log('\n⚠️  L\'endpoint répond mais les variables SMTP/EMAIL ne sont pas configurées');
      console.log('💡 Action requise: Configurer les variables d\'environnement sur Railway/VPS');
    } else {
      console.log(`\n⚠️  Status inattendu: ${formResponse.status}`);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error('\n💡 Vérifications:');
    console.error('   1. Le backend est-il déployé en production ?');
    console.error('   2. L\'URL est-elle correcte ?');
    console.error('   3. Le DNS pointe-t-il vers le bon serveur ?');
    console.error('   4. Y a-t-il un firewall qui bloque les requêtes ?');
    process.exit(1);
  }
}

testEndpoint();

