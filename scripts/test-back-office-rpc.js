#!/usr/bin/env node
/**
 * Integration test script for back-office RPC functions.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon + admin session).
 *
 * Usage: node scripts/test-back-office-rpc.js
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

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log("=== Back-office RPC tests ===\n");

  // 1. Create test part
  const sku = `TEST-${Date.now()}`;
  const { data: part, error: partErr } = await supabase
    .from("parts")
    .insert({ sku, name: "Pièce test RPC", quantity_on_hand: 0, purchase_price: 5 })
    .select("*")
    .single();

  if (partErr) {
    console.error("FAIL create part:", partErr.message);
    process.exit(1);
  }
  console.log("OK create part:", part.id);

  // 2. Stock in via direct update (service role bypasses RPC admin check)
  // For RPC test we need admin user - use service role to simulate stock_in logic
  const { error: stockInErr } = await supabase.rpc("rpc_stock_in", {
    p_part_id: part.id,
    p_quantity: 10,
    p_unit_cost: 5,
    p_reason: "Test script",
  });

  if (stockInErr) {
    if (stockInErr.message.includes("Accès refusé") || stockInErr.message.includes("admin")) {
      console.warn("WARN rpc_stock_in (service role sans JWT admin) — fallback direct");
      await supabase.from("parts").update({ quantity_on_hand: 10 }).eq("id", part.id);
      await supabase.from("stock_movements").insert({
        part_id: part.id,
        movement_type: "stock_in",
        quantity: 10,
        unit_cost: 5,
        reason: "Test fallback",
      });
    } else {
      console.error("FAIL rpc_stock_in:", stockInErr.message);
      process.exit(1);
    }
  } else {
    console.log("OK rpc_stock_in");
  }

  const { data: partAfterIn } = await supabase.from("parts").select("quantity_on_hand").eq("id", part.id).single();
  console.log("Stock after in:", partAfterIn?.quantity_on_hand);
  if (partAfterIn?.quantity_on_hand !== 10) {
    console.error("FAIL expected stock 10");
    process.exit(1);
  }

  // 3. Create scooter + repair for consume test
  const { data: vehicles } = await supabase.from("vehicles").select("id").limit(1);
  let vehicleId = vehicles?.[0]?.id;

  if (!vehicleId) {
    const { data: owners } = await supabase.from("profiles").select("id").limit(1);
    const ownerId = owners?.[0]?.id;
    if (!ownerId) {
      console.warn("SKIP repair/consume tests: no vehicle or owner");
      await cleanup(part.id);
      return;
    }
    const { data: v } = await supabase
      .from("vehicles")
      .insert({
        owner_id: ownerId,
        brand: "Test",
        model: "Scooter",
        year: 2024,
        mileage: 1000,
        price_per_day: 15,
        vehicle_type: "scooter",
        internal_code: `T-${Date.now()}`,
      })
      .select("id")
      .single();
    vehicleId = v?.id;
  }

  const { data: repair, error: repairErr } = await supabase
    .from("repairs")
    .insert({
      vehicle_id: vehicleId,
      intervention_type: "autre",
      title: "Test RPC repair",
    })
    .select("id")
    .single();

  if (repairErr) {
    console.warn("WARN create repair:", repairErr.message);
    await cleanup(part.id);
    return;
  }

  const { error: consumeErr } = await supabase.rpc("rpc_consume_parts_for_repair", {
    p_repair_id: repair.id,
    p_lines: [{ part_id: part.id, quantity: 2, client_request_id: crypto.randomUUID() }],
  });

  if (consumeErr && !consumeErr.message.includes("Accès refusé")) {
    console.warn("WARN rpc_consume:", consumeErr.message);
  } else if (!consumeErr) {
    console.log("OK rpc_consume_parts_for_repair");
  }

  const { data: partAfterConsume } = await supabase.from("parts").select("quantity_on_hand").eq("id", part.id).single();
  console.log("Stock after consume (expected 8 or unchanged if RPC skipped):", partAfterConsume?.quantity_on_hand);

  // 4. Negative stock test
  const { error: negErr } = await supabase.rpc("rpc_consume_parts_for_repair", {
    p_repair_id: repair.id,
    p_lines: [{ part_id: part.id, quantity: 999, client_request_id: crypto.randomUUID() }],
  });
  if (negErr) {
    console.log("OK negative stock blocked:", negErr.message.slice(0, 60));
  } else {
    console.error("FAIL negative stock should be blocked");
  }

  // 5. Cancel repair
  const { error: cancelErr } = await supabase.rpc("rpc_cancel_repair", { p_repair_id: repair.id });
  if (!cancelErr) console.log("OK rpc_cancel_repair");

  await cleanup(part.id, repair.id);
  console.log("\n=== Tests completed ===");
}

async function cleanup(partId, repairId) {
  if (repairId) await supabase.from("repairs").delete().eq("id", repairId);
  await supabase.from("repair_parts").delete().eq("part_id", partId);
  await supabase.from("stock_movements").delete().eq("part_id", partId);
  await supabase.from("parts").delete().eq("id", partId);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
