#!/usr/bin/env node
/**
 * Verify back-office schema tables exist after migrations.
 * Usage: node scripts/verify-back-office-schema.js
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // ignore
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

const TABLES = [
  "parts",
  "stock_movements",
  "repairs",
  "repair_parts",
  "vehicle_states",
  "suppliers",
  "sales",
  "sale_lines",
  "maintenance_rules",
];

const VEHICLE_COLUMNS = [
  "vehicle_type",
  "internal_code",
  "operational_status",
  "vin",
  "purchase_price",
];

async function run() {
  console.log("=== Back-office schema verification ===\n");
  let failed = false;

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      console.error(`FAIL table ${table}:`, error.message);
      failed = true;
    } else {
      console.log(`OK table ${table}`);
    }
  }

  const { data: vehicle, error: vErr } = await supabase.from("vehicles").select("*").limit(1);
  if (vErr) {
    console.error("FAIL vehicles:", vErr.message);
    failed = true;
  } else if (vehicle?.[0]) {
    for (const col of VEHICLE_COLUMNS) {
      if (!(col in vehicle[0])) {
        console.error(`FAIL vehicles missing column: ${col}`);
        failed = true;
      }
    }
    if (!failed) console.log("OK vehicles extended columns");
  } else {
    console.log("OK vehicles (no rows to check columns)");
  }

  const RPC_CHECKS = [
    { name: "rpc_stock_in", args: { p_part_id: "00000000-0000-0000-0000-000000000000", p_quantity: 0, p_unit_cost: 0 } },
    { name: "rpc_stock_adjustment", args: { p_part_id: "00000000-0000-0000-0000-000000000000", p_delta: 0, p_reason: "verify" } },
    { name: "rpc_consume_parts_for_repair", args: { p_repair_id: "00000000-0000-0000-0000-000000000000", p_lines: [] } },
    { name: "rpc_cancel_repair", args: { p_repair_id: "00000000-0000-0000-0000-000000000000" } },
    { name: "rpc_create_part_sale", args: { p_payload: {} } },
    { name: "rpc_cancel_part_sale", args: { p_sale_id: "00000000-0000-0000-0000-000000000000" } },
  ];

  for (const { name, args } of RPC_CHECKS) {
    const { error } = await supabase.rpc(name, args);
    // Expected to fail with business/validation error, not "function does not exist"
    if (error?.message?.includes("Could not find the function") || error?.message?.includes("does not exist")) {
      console.error(`FAIL RPC ${name}: not found`);
      failed = true;
    } else {
      console.log(`OK RPC ${name} (exists)`);
    }
  }

  console.log(failed ? "\nSome checks FAILED" : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
}

run();
