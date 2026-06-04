/** Extrait la cylindrée (cc) depuis vehicles.engine_capacity ("125", "125 A", …). */
export function parseEngineCapacity(raw: string | null | undefined): number | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (Number.isFinite(n) && n >= 50 && n <= 2000) return n;
  return null;
}

/** Valeurs de cylindrée distinctes présentes dans une liste de véhicules, triées. */
export function getDistinctEngineCapacities(
  vehicles: Array<{ engine_capacity?: string | null }>
): number[] {
  const values = new Set<number>();
  for (const v of vehicles) {
    const cc = parseEngineCapacity(v.engine_capacity);
    if (cc != null) values.add(cc);
  }
  return Array.from(values).sort((a, b) => a - b);
}
