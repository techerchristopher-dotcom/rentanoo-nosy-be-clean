import type {
  InterventionType,
  OperationalStatus,
  PaymentMethod,
  PaymentStatus,
  RepairStatus,
  StockMovementType,
  Tables,
  TablesInsert,
  TablesUpdate,
  VehicleStateType,
} from "@/integrations/supabase/types";

export type Scooter = Tables<"vehicles"> & { vehicle_type: "scooter" };
export type ScooterInsert = TablesInsert<"vehicles">;
export type ScooterUpdate = TablesUpdate<"vehicles">;

export type Part = Tables<"parts">;
export type PartInsert = TablesInsert<"parts">;
export type PartUpdate = TablesUpdate<"parts">;

export type StockMovement = Tables<"stock_movements">;
export type Repair = Tables<"repairs">;
export type RepairInsert = TablesInsert<"repairs">;
export type RepairUpdate = TablesUpdate<"repairs">;
export type RepairPart = Tables<"repair_parts">;

export type VehicleState = Tables<"vehicle_states">;
export type VehicleStateInsert = TablesInsert<"vehicle_states">;

export type Supplier = Tables<"suppliers">;
export type SupplierInsert = TablesInsert<"suppliers">;
export type SupplierUpdate = TablesUpdate<"suppliers">;

export type Sale = Tables<"sales">;
export type SaleLine = Tables<"sale_lines">;

export type MaintenanceRule = Tables<"maintenance_rules">;
export type MaintenanceRuleInsert = TablesInsert<"maintenance_rules">;

export type VehicleDamage = {
  zone: string;
  severity: "light" | "medium" | "severe";
  description: string;
};

export type ScooterFilters = {
  operational_status?: OperationalStatus | "all";
  search?: string;
};

export type RepairFilters = {
  status?: RepairStatus | "all";
  vehicle_id?: string;
};

export type StockMovementFilters = {
  part_id?: string;
  movement_type?: StockMovementType | "all";
  limit?: number;
};

export type RepairPartLineInput = {
  part_id: string;
  quantity: number;
  client_request_id?: string;
};

export type SaleLineInput = {
  part_id: string;
  quantity: number;
  unit_sale_price?: number;
};

export type CreateSalePayload = {
  customer_id?: string | null;
  customer_name?: string | null;
  discount?: number;
  payment_method?: PaymentMethod | null;
  amount_paid?: number;
  notes?: string | null;
  lines: SaleLineInput[];
};

export type MaintenanceAlert = {
  rule_id: string;
  vehicle_id: string | null;
  vehicle_label: string;
  maintenance_type: string;
  status: "ok" | "soon" | "overdue";
  next_due_mileage: number | null;
  next_due_date: string | null;
  last_done_at: string | null;
  last_done_mileage: number | null;
};

export type ReportsSummary = {
  scootersAvailable: number;
  scootersTotal: number;
  scootersInMaintenance: number;
  lowStockCount: number;
  repairsCostLast30Days: number;
  lastMaintenanceDate: string | null;
  stockValue: number;
  salesThisMonth: number;
  salesMarginThisMonth: number;
  topCostlyScooters: { vehicle_id: string; label: string; total_cost: number }[];
  topUsedParts: { part_id: string; name: string; total_qty: number }[];
  topSoldParts: { part_id: string; name: string; total_qty: number }[];
};

export {
  type InterventionType,
  type OperationalStatus,
  type PaymentMethod,
  type PaymentStatus,
  type RepairStatus,
  type StockMovementType,
  type VehicleStateType,
};

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  available: "Disponible",
  rented: "En location",
  reserved: "Réservé",
  maintenance: "En entretien",
  broken: "En panne",
  accident: "Accidenté",
  retired: "Retiré",
};

export const INTERVENTION_TYPE_LABELS: Record<InterventionType, string> = {
  vidange: "Vidange",
  pneus: "Pneus",
  freins: "Freins",
  batterie: "Batterie",
  moteur: "Moteur",
  courroie: "Courroie",
  carrosserie: "Carrosserie",
  accident: "Accident",
  diagnostic: "Diagnostic",
  autre: "Autre",
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  open: "Ouverte",
  in_progress: "En cours",
  done: "Terminée",
  cancelled: "Annulée",
};

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  stock_in: "Entrée",
  internal_use: "Usage interne",
  customer_sale: "Vente client",
  adjustment: "Ajustement",
  return: "Retour",
};

export const VEHICLE_STATE_LABELS: Record<VehicleStateType, string> = {
  checkin: "Avant location",
  checkout: "Après retour",
  inspection: "Inspection",
  accident: "Accident",
  repair_before: "Avant réparation",
  repair_after: "Après réparation",
};
