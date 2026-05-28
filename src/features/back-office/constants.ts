export const BACK_OFFICE_QUERY_KEYS = {
  scooters: ["back-office", "scooters"] as const,
  scooter: (id: string) => ["back-office", "scooters", id] as const,
  parts: ["back-office", "parts"] as const,
  part: (id: string) => ["back-office", "parts", id] as const,
  repairs: ["back-office", "repairs"] as const,
  repair: (id: string) => ["back-office", "repairs", id] as const,
  stockMovements: ["back-office", "stock-movements"] as const,
  vehicleStates: (vehicleId: string) => ["back-office", "vehicle-states", vehicleId] as const,
  suppliers: ["back-office", "suppliers"] as const,
  sales: ["back-office", "sales"] as const,
  sale: (id: string) => ["back-office", "sales", id] as const,
  maintenanceRules: ["back-office", "maintenance-rules"] as const,
  reports: ["back-office", "reports"] as const,
};

export const PART_CATEGORIES = [
  "pneu",
  "batterie",
  "freins",
  "huile",
  "filtre",
  "courroie",
  "carrosserie",
  "éclairage",
  "autre",
] as const;
