#!/usr/bin/env bash
# =============================================================================
# Backup Supabase "bookings" + "platform_settings" avant migration Fees v1 (P0)
# =============================================================================
#
# Objectif
#   Produire deux artefacts hors-repo avant d'exécuter les migrations P1 :
#     1. Un dump SQL --data-only de la table public.bookings
#     2. Un export CSV des colonnes pricing-critiques (lecture humaine + diff)
#   + un dump de public.platform_settings (config existante).
#
# Pré-requis
#   - pg_dump >= 14 (utiliser celui packagé par Supabase CLI si possible)
#   - psql  >= 14
#   - Variable d'environnement DATABASE_URL pointant vers la base PROD ou STAGING
#     (ex: postgresql://postgres:****@db.<project_ref>.supabase.co:5432/postgres)
#
# Usage
#   chmod +x scripts/backup-bookings-pre-fees-v2.sh
#   DATABASE_URL="postgresql://..." OUTPUT_DIR="/secure/backups" \
#     ./scripts/backup-bookings-pre-fees-v2.sh
#
# Variables
#   DATABASE_URL  (requis)   URL de connexion Postgres complète
#   OUTPUT_DIR    (optionnel) Dossier de sortie (défaut: $HOME/rentanoo-backups)
#   LABEL         (optionnel) Suffixe (défaut: timestamp UTC)
#
# Sécurité
#   - Le dossier de sortie est créé avec chmod 700
#   - Les fichiers produits sont en chmod 600
#   - NE PAS commiter les artefacts dans git (OUTPUT_DIR doit être hors repo)
# =============================================================================

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL non défini. Exemple :"
  echo "   export DATABASE_URL='postgresql://postgres:****@db.<project_ref>.supabase.co:5432/postgres'"
  exit 1
fi

OUTPUT_DIR="${OUTPUT_DIR:-$HOME/rentanoo-backups}"
LABEL="${LABEL:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_DIR="${OUTPUT_DIR}/fees-v1-pre-migration-${LABEL}"

mkdir -p "${RUN_DIR}"
chmod 700 "${RUN_DIR}"

DUMP_FILE="${RUN_DIR}/bookings.dump.sql"
CSV_FILE="${RUN_DIR}/bookings.snapshot.csv"
SETTINGS_FILE="${RUN_DIR}/platform_settings.dump.sql"
SCHEMA_FILE="${RUN_DIR}/bookings.schema.sql"
META_FILE="${RUN_DIR}/backup-meta.txt"

echo "📁 Dossier de sortie : ${RUN_DIR}"

echo "🛡️  Vérification de la connexion (read-only)…"
psql "${DATABASE_URL}" -tAc "SELECT current_database(), current_user, now() AT TIME ZONE 'UTC';" \
  > "${META_FILE}"

echo "📐 Dump du schéma de la table bookings…"
pg_dump "${DATABASE_URL}" \
  --schema-only \
  --table=public.bookings \
  --no-owner --no-privileges \
  > "${SCHEMA_FILE}"

echo "📦 Dump des données : public.bookings…"
pg_dump "${DATABASE_URL}" \
  --data-only \
  --table=public.bookings \
  --no-owner --no-privileges \
  > "${DUMP_FILE}"

echo "📦 Dump des données : public.platform_settings…"
pg_dump "${DATABASE_URL}" \
  --data-only \
  --table=public.platform_settings \
  --no-owner --no-privileges \
  > "${SETTINGS_FILE}"

echo "📊 Export CSV des colonnes pricing-critiques…"
psql "${DATABASE_URL}" -At -F',' -P 'footer=off' \
  -c "\copy (
        SELECT
          id,
          reference_number,
          status,
          pricing_mode,
          offline_payment_method,
          base_price,
          options_total,
          subtotal,
          service_fee,
          total_price,
          service_fee_renter,
          service_fee_owner,
          owner_payout_amount,
          platform_total_fee,
          amount_total_paid,
          currency,
          paid_at,
          stripe_checkout_session_id,
          stripe_payment_intent_id,
          created_at,
          updated_at
        FROM public.bookings
        ORDER BY created_at DESC
      ) TO STDOUT WITH (FORMAT CSV, HEADER true)" \
  > "${CSV_FILE}"

chmod 600 "${DUMP_FILE}" "${CSV_FILE}" "${SETTINGS_FILE}" "${SCHEMA_FILE}" "${META_FILE}"

ROWS=$(wc -l < "${CSV_FILE}" | tr -d ' ')
DUMP_SIZE=$(du -h "${DUMP_FILE}" | awk '{print $1}')

cat <<META >> "${META_FILE}"

label: ${LABEL}
run_dir: ${RUN_DIR}
csv_rows_with_header: ${ROWS}
dump_size: ${DUMP_SIZE}
files:
  - $(basename "${SCHEMA_FILE}")
  - $(basename "${DUMP_FILE}")
  - $(basename "${SETTINGS_FILE}")
  - $(basename "${CSV_FILE}")
META

echo ""
echo "✅ Backup terminé."
echo "   Dossier        : ${RUN_DIR}"
echo "   Schéma         : $(basename "${SCHEMA_FILE}")"
echo "   Dump bookings  : $(basename "${DUMP_FILE}") (${DUMP_SIZE})"
echo "   Dump settings  : $(basename "${SETTINGS_FILE}")"
echo "   CSV snapshot   : $(basename "${CSV_FILE}") (${ROWS} lignes header inclus)"
echo "   Meta           : $(basename "${META_FILE}")"
echo ""
echo "⚠️  Ne commitez PAS ces fichiers dans Git."
echo "   Conservez-les hors repo jusqu'à confirmation post-migration."
