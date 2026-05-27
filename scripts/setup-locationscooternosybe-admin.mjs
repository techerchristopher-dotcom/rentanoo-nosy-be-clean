#!/usr/bin/env node
/**
 * Setup du compte locationscooternosybe@gmail.com comme admin/owner unique
 * et transfert de tous les vehicules vers ce compte.
 *
 * Operations effectuees (idempotentes) :
 *   A. Creation du compte auth.users via /auth/v1/admin/users (email_confirm=true)
 *      -> trigger handle_new_user cree automatiquement la ligne dans public.profiles
 *   B. UPDATE profiles SET is_admin=true, admin_role='admin', role='owner'
 *      -> trigger sync_profile_is_admin met a jour auth.users.raw_app_meta_data.is_admin
 *   C. UPDATE vehicles SET owner_id = <new_id> WHERE owner_id IN (<anciens_owners>)
 *   D. UPDATE conversations SET owner_id = <new_id> WHERE status='active' AND owner_id IN (<anciens_owners>)
 *   E. Verification finale + recap
 *
 * Usage : node scripts/setup-locationscooternosybe-admin.mjs
 *
 * Pre-requis : .env.local doit contenir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_EMAIL = 'locationscooternosybe@gmail.com';
const TARGET_PASSWORD = 'Azerty123';
const TARGET_FIRST_NAME = 'Location Scooter';
const TARGET_LAST_NAME = 'Nosy Be';

const PREVIOUS_OWNER_IDS = [
  'bd19376c-cf76-4495-b8f6-e6499b3aef72',
  '74efa893-e2a4-4644-8a4a-51cfa757c573',
];

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local introuvable : ${envPath}`);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERREUR : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local');
  process.exit(1);
}

const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)\./)?.[1] || 'unknown';
console.log(`\n=== Projet cible : ${projectRef} (${SUPABASE_URL}) ===\n`);

const restHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function api(path, opts = {}) {
  const url = SUPABASE_URL + path;
  const res = await fetch(url, { ...opts, headers: { ...restHeaders, ...(opts.headers || {}) } });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

// ---- Etape A : creation auth user (ou recuperation si existe deja) ----

async function ensureAuthUser() {
  console.log('A) Creation du compte auth.users...');

  const created = await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: TARGET_EMAIL,
      password: TARGET_PASSWORD,
      email_confirm: true,
      user_metadata: { firstName: TARGET_FIRST_NAME, lastName: TARGET_LAST_NAME },
    }),
  });

  if (created.ok && created.body?.id) {
    console.log(`   OK -> user cree avec id = ${created.body.id}`);
    return created.body.id;
  }

  // Detection d'un compte existant : Supabase renvoie 422 ou message d'erreur explicite
  const errMsg = JSON.stringify(created.body || {}).toLowerCase();
  const alreadyExists =
    created.status === 422 ||
    created.status === 400 ||
    errMsg.includes('already') ||
    errMsg.includes('exists') ||
    errMsg.includes('registered');

  if (alreadyExists) {
    console.log(`   Compte deja existant -> recuperation de l'id...`);
    // L'API admin GoTrue ne supporte pas de filtre fiable par email,
    // donc on passe par public.profiles (FK 1-1 avec auth.users).
    let existing = null;
    const profileLookup = await api(
      `/rest/v1/profiles?email=eq.${encodeURIComponent(TARGET_EMAIL)}&select=id,email`,
    );
    if (profileLookup.ok && Array.isArray(profileLookup.body) && profileLookup.body[0]) {
      existing = { id: profileLookup.body[0].id, email: profileLookup.body[0].email };
    } else {
      // Fallback : parcourir la liste paginee
      let page = 1;
      while (page <= 20 && !existing) {
        const list = await api(`/auth/v1/admin/users?page=${page}&per_page=200`);
        if (!list.ok || !Array.isArray(list.body?.users) || list.body.users.length === 0) break;
        existing = list.body.users.find((u) => u.email === TARGET_EMAIL) || null;
        page++;
      }
    }
    if (existing) {
      console.log(`   OK -> user existant id = ${existing.id}`);

      // Mettre a jour le mot de passe pour garantir Azerty123
      const upd = await api(`/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          password: TARGET_PASSWORD,
          email_confirm: true,
        }),
      });
      if (upd.ok) {
        console.log(`   OK -> mot de passe synchronise sur "${TARGET_PASSWORD}"`);
      } else {
        console.warn(`   WARN -> impossible de resynchroniser le mot de passe :`, upd.body);
      }
      return existing.id;
    }
    console.error('   ECHEC -> compte signale comme existant mais introuvable.');
    process.exit(1);
  }

  console.error('   ECHEC creation auth user :', created.status, created.body);
  process.exit(1);
}

// ---- Etape B : promotion admin/owner ----

async function promoteToAdminOwner(userId) {
  console.log('\nB) Promotion en admin/owner dans public.profiles...');

  // S'assurer que le profil existe (au cas ou le trigger handle_new_user n'aurait pas tourne)
  const check = await api(
    `/rest/v1/profiles?id=eq.${userId}&select=id,email,is_admin,admin_role,role`,
  );
  if (!check.ok) {
    console.error('   ECHEC lecture profil :', check.status, check.body);
    process.exit(1);
  }

  if (!Array.isArray(check.body) || check.body.length === 0) {
    console.log('   Profil absent -> creation manuelle (fallback)...');
    const ins = await api('/rest/v1/profiles', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        id: userId,
        email: TARGET_EMAIL,
        first_name: TARGET_FIRST_NAME,
        last_name: TARGET_LAST_NAME,
        role: 'owner',
        is_admin: true,
        admin_role: 'admin',
        kyc_status: 'verified',
      }),
    });
    if (!ins.ok) {
      console.error('   ECHEC insert profile :', ins.status, ins.body);
      process.exit(1);
    }
    console.log('   OK -> profile cree :', ins.body);
    return;
  }

  console.log('   Profil existant :', check.body[0]);

  const upd = await api(`/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      is_admin: true,
      admin_role: 'admin',
      role: 'owner',
      first_name: TARGET_FIRST_NAME,
      last_name: TARGET_LAST_NAME,
    }),
  });
  if (!upd.ok) {
    console.error('   ECHEC update profile :', upd.status, upd.body);
    process.exit(1);
  }
  console.log('   OK -> profile mis a jour :', upd.body);

  // Filet de securite : forcer is_admin:true dans auth.users.app_metadata
  // au cas ou le trigger sync_profile_is_admin n'existerait pas / n'aurait pas tourne.
  const syncMeta = await api(`/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ app_metadata: { is_admin: true } }),
  });
  if (syncMeta.ok) {
    console.log('   OK -> auth.users.app_metadata.is_admin = true (forcage)');
  } else {
    console.warn('   WARN -> impossible de forcer app_metadata :', syncMeta.body);
  }
}

// ---- Etape C : transfert des vehicules ----

async function transferVehicles(newOwnerId) {
  console.log('\nC) Transfert des vehicules vers le nouveau owner...');

  const previousFilter = PREVIOUS_OWNER_IDS.map((id) => `"${id}"`).join(',');
  const upd = await api(
    `/rest/v1/vehicles?owner_id=in.(${previousFilter})`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ owner_id: newOwnerId }),
    },
  );
  if (!upd.ok) {
    console.error('   ECHEC transfert vehicules :', upd.status, upd.body);
    process.exit(1);
  }
  const count = Array.isArray(upd.body) ? upd.body.length : 0;
  console.log(`   OK -> ${count} vehicule(s) transfere(s)`);
}

// ---- Etape D : transfert des conversations actives ----

async function transferActiveConversations(newOwnerId) {
  console.log('\nD) Transfert des conversations actives (status=active)...');

  const previousFilter = PREVIOUS_OWNER_IDS.map((id) => `"${id}"`).join(',');
  const upd = await api(
    `/rest/v1/conversations?status=eq.active&owner_id=in.(${previousFilter})`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ owner_id: newOwnerId }),
    },
  );
  if (!upd.ok) {
    console.error('   ECHEC transfert conversations :', upd.status, upd.body);
    process.exit(1);
  }
  const count = Array.isArray(upd.body) ? upd.body.length : 0;
  console.log(`   OK -> ${count} conversation(s) active(s) transferee(s)`);
}

// ---- Etape E : verification finale ----

async function verify(newOwnerId) {
  console.log('\nE) Verification finale...\n');

  // 1) Repartition vehicles par owner_id
  const vRes = await api('/rest/v1/vehicles?select=owner_id');
  if (vRes.ok && Array.isArray(vRes.body)) {
    const byOwner = {};
    for (const v of vRes.body) byOwner[v.owner_id] = (byOwner[v.owner_id] || 0) + 1;
    console.log('   Repartition vehicles par owner_id :');
    for (const [id, n] of Object.entries(byOwner)) {
      const marker = id === newOwnerId ? '  <-- nouveau owner' : '';
      console.log(`     ${id} : ${n}${marker}`);
    }
  }

  // 2) Profil du nouveau owner
  const pRes = await api(
    `/rest/v1/profiles?id=eq.${newOwnerId}&select=id,email,first_name,last_name,role,is_admin,admin_role,kyc_status`,
  );
  if (pRes.ok && Array.isArray(pRes.body) && pRes.body[0]) {
    console.log('\n   Profil du nouveau owner :');
    console.log('    ', JSON.stringify(pRes.body[0], null, 2).replace(/\n/g, '\n     '));
  }

  // 3) Verifier raw_app_meta_data.is_admin propage cote auth.users
  const aRes = await api(`/auth/v1/admin/users/${newOwnerId}`);
  if (aRes.ok && aRes.body) {
    console.log('\n   auth.users.raw_app_meta_data :');
    console.log('    ', JSON.stringify(aRes.body.app_metadata || {}));
    console.log('   email_confirmed_at :', aRes.body.email_confirmed_at || '(non confirme)');
  }

  // 4) Conversations actives par owner_id
  const cRes = await api('/rest/v1/conversations?status=eq.active&select=owner_id');
  if (cRes.ok && Array.isArray(cRes.body)) {
    const byOwner = {};
    for (const c of cRes.body) byOwner[c.owner_id] = (byOwner[c.owner_id] || 0) + 1;
    console.log('\n   Repartition conversations actives par owner_id :');
    if (Object.keys(byOwner).length === 0) console.log('     (aucune)');
    for (const [id, n] of Object.entries(byOwner)) {
      const marker = id === newOwnerId ? '  <-- nouveau owner' : '';
      console.log(`     ${id} : ${n}${marker}`);
    }
  }
}

// ---- Main ----

(async () => {
  try {
    const userId = await ensureAuthUser();
    await promoteToAdminOwner(userId);
    await transferVehicles(userId);
    await transferActiveConversations(userId);
    await verify(userId);

    console.log('\n=== TERMINE ===');
    console.log(`Compte : ${TARGET_EMAIL}`);
    console.log(`Mot de passe : ${TARGET_PASSWORD}`);
    console.log(`User id : ${userId}\n`);
  } catch (err) {
    console.error('\nERREUR FATALE :', err);
    process.exit(1);
  }
})();
