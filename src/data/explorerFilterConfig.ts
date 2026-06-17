import type { ComponentType, SVGProps } from "react";
import { Car } from "lucide-react";
import { MdHotel, MdMoped, MdTwoWheeler, MdTerrain } from "react-icons/md";

export type ExplorerMainCategoryId =
  | "accommodation"
  | "scooter"
  | "moto"
  | "quad"
  | "car";

export type ExplorerSubFilterKind =
  | "vehicle_category"
  | "engine_exact"
  | "engine_min"
  | "model_keyword";

export interface ExplorerEmptyStateConfig {
  titleKey: string;
  descriptionKey: string;
  ctaKey: string;
  waPrefillKey: string;
  illustration?: "home" | "scooter" | "moto" | "car";
}

export interface ExplorerSubFilterConfig {
  id: string;
  labelKey: string;
  kind: ExplorerSubFilterKind;
  /** DB vehicle_category value(s) */
  dbValues?: string[];
  /** Exact engine cc (125, 150, …) */
  engineCc?: number;
  /** Minimum cc inclusive (200+, 250+) */
  engineMin?: number;
  /** Model name keywords for model_keyword kind */
  modelKeywords?: string[];
  emptyState?: ExplorerEmptyStateConfig;
}

export interface ExplorerMainCategoryConfig {
  id: ExplorerMainCategoryId;
  labelKey: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  vehicleType: ExplorerMainCategoryId | "car_fallback";
  subFilters: ExplorerSubFilterConfig[];
  emptyState: ExplorerEmptyStateConfig;
  alwaysVisible: true;
  gtagCategoryId: string;
}

export const EXPLORER_MAIN_CATEGORIES: ExplorerMainCategoryConfig[] = [
  {
    id: "accommodation",
    labelKey: "explorerFilters.categories.accommodation",
    Icon: MdHotel,
    vehicleType: "accommodation",
    alwaysVisible: true,
    gtagCategoryId: "accommodation",
    emptyState: {
      titleKey: "explorerFilters.empty.accommodation.title",
      descriptionKey: "explorerFilters.empty.accommodation.description",
      ctaKey: "explorerFilters.empty.cta.request",
      waPrefillKey: "explorerFilters.empty.waPrefill.accommodation.generic",
      illustration: "home",
    },
    subFilters: [
      {
        id: "appartement",
        labelKey: "explorerFilters.sub.accommodation.appartement",
        kind: "vehicle_category",
        dbValues: ["Appartement"],
        emptyState: {
          titleKey: "explorerFilters.empty.accommodation.appartement.title",
          descriptionKey: "explorerFilters.empty.accommodation.appartement.description",
          ctaKey: "explorerFilters.empty.cta.request",
          waPrefillKey: "explorerFilters.empty.waPrefill.accommodation.appartement",
          illustration: "home",
        },
      },
      {
        id: "villa",
        labelKey: "explorerFilters.sub.accommodation.villa",
        kind: "vehicle_category",
        dbValues: ["Villa"],
        emptyState: {
          titleKey: "explorerFilters.empty.accommodation.villa.title",
          descriptionKey: "explorerFilters.empty.accommodation.villa.description",
          ctaKey: "explorerFilters.empty.cta.request",
          waPrefillKey: "explorerFilters.empty.waPrefill.accommodation.villa",
          illustration: "home",
        },
      },
      {
        id: "bungalow",
        labelKey: "explorerFilters.sub.accommodation.bungalow",
        kind: "vehicle_category",
        dbValues: ["Bungalow"],
        emptyState: {
          titleKey: "explorerFilters.empty.accommodation.bungalow.title",
          descriptionKey: "explorerFilters.empty.accommodation.bungalow.description",
          ctaKey: "explorerFilters.empty.cta.request",
          waPrefillKey: "explorerFilters.empty.waPrefill.accommodation.bungalow",
          illustration: "home",
        },
      },
      {
        id: "maison",
        labelKey: "explorerFilters.sub.accommodation.maison",
        kind: "vehicle_category",
        dbValues: ["Maison"],
        emptyState: {
          titleKey: "explorerFilters.empty.accommodation.maison.title",
          descriptionKey: "explorerFilters.empty.accommodation.maison.description",
          ctaKey: "explorerFilters.empty.cta.request",
          waPrefillKey: "explorerFilters.empty.waPrefill.accommodation.maison",
          illustration: "home",
        },
      },
      {
        id: "chambre",
        labelKey: "explorerFilters.sub.accommodation.chambre",
        kind: "vehicle_category",
        dbValues: ["Chambre"],
        emptyState: {
          titleKey: "explorerFilters.empty.accommodation.chambre.title",
          descriptionKey: "explorerFilters.empty.accommodation.chambre.description",
          ctaKey: "explorerFilters.empty.cta.request",
          waPrefillKey: "explorerFilters.empty.waPrefill.accommodation.chambre",
          illustration: "home",
        },
      },
    ],
  },
  {
    id: "scooter",
    labelKey: "explorerFilters.categories.scooter",
    Icon: MdMoped,
    vehicleType: "scooter",
    alwaysVisible: true,
    gtagCategoryId: "scooter",
    emptyState: {
      titleKey: "explorerFilters.empty.scooter.title",
      descriptionKey: "explorerFilters.empty.scooter.description",
      ctaKey: "explorerFilters.empty.cta.request",
      waPrefillKey: "explorerFilters.empty.waPrefill.scooter",
      illustration: "scooter",
    },
    subFilters: [
      {
        id: "50cc",
        labelKey: "explorerFilters.sub.engine.50cc",
        kind: "engine_exact",
        engineCc: 50,
        emptyState: {
          titleKey: "explorerFilters.empty.scooter.50cc.title",
          descriptionKey: "explorerFilters.empty.scooter.50cc.description",
          ctaKey: "explorerFilters.empty.cta.request",
          waPrefillKey: "explorerFilters.empty.waPrefill.scooter",
          illustration: "scooter",
        },
      },
      {
        id: "125cc",
        labelKey: "explorerFilters.sub.engine.125cc",
        kind: "engine_exact",
        engineCc: 125,
      },
      {
        id: "150cc",
        labelKey: "explorerFilters.sub.engine.150cc",
        kind: "engine_exact",
        engineCc: 150,
      },
      {
        id: "200plus",
        labelKey: "explorerFilters.sub.engine.200plus",
        kind: "engine_min",
        engineMin: 200,
      },
    ],
  },
  {
    id: "moto",
    labelKey: "explorerFilters.categories.moto",
    Icon: MdTwoWheeler,
    vehicleType: "moto",
    alwaysVisible: true,
    gtagCategoryId: "moto",
    emptyState: {
      titleKey: "explorerFilters.empty.moto.title",
      descriptionKey: "explorerFilters.empty.moto.description",
      ctaKey: "explorerFilters.empty.cta.request",
      waPrefillKey: "explorerFilters.empty.waPrefill.moto",
      illustration: "moto",
    },
    subFilters: [
      {
        id: "125cc",
        labelKey: "explorerFilters.sub.engine.125cc",
        kind: "engine_exact",
        engineCc: 125,
      },
      {
        id: "150cc",
        labelKey: "explorerFilters.sub.engine.150cc",
        kind: "engine_exact",
        engineCc: 150,
      },
      {
        id: "200cc",
        labelKey: "explorerFilters.sub.engine.200cc",
        kind: "engine_exact",
        engineCc: 200,
      },
      {
        id: "250plus",
        labelKey: "explorerFilters.sub.engine.250plus",
        kind: "engine_min",
        engineMin: 250,
      },
    ],
  },
  {
    id: "quad",
    labelKey: "explorerFilters.categories.quad",
    Icon: MdTerrain,
    vehicleType: "quad",
    alwaysVisible: true,
    gtagCategoryId: "quad",
    emptyState: {
      titleKey: "explorerFilters.empty.quad.title",
      descriptionKey: "explorerFilters.empty.quad.description",
      ctaKey: "explorerFilters.empty.cta.request",
      waPrefillKey: "explorerFilters.empty.waPrefill.quad",
    },
    subFilters: [
      {
        id: "300cc",
        labelKey: "explorerFilters.sub.quad.300cc",
        kind: "engine_exact",
        engineCc: 300,
      },
      {
        id: "buggy",
        labelKey: "explorerFilters.sub.quad.buggy",
        kind: "model_keyword",
        modelKeywords: ["buggy"],
      },
    ],
  },
  {
    id: "car",
    labelKey: "explorerFilters.categories.car",
    Icon: Car,
    vehicleType: "car_fallback",
    alwaysVisible: true,
    gtagCategoryId: "car",
    emptyState: {
      titleKey: "explorerFilters.empty.car.title",
      descriptionKey: "explorerFilters.empty.car.description",
      ctaKey: "explorerFilters.empty.cta.request",
      waPrefillKey: "explorerFilters.empty.waPrefill.car",
      illustration: "car",
    },
    subFilters: [
      {
        id: "citadine",
        labelKey: "explorerFilters.sub.car.citadine",
        kind: "vehicle_category",
        dbValues: ["Citadine"],
      },
      {
        id: "suv",
        labelKey: "explorerFilters.sub.car.suv",
        kind: "vehicle_category",
        dbValues: ["SUV"],
      },
      {
        id: "4x4",
        labelKey: "explorerFilters.sub.car.4x4",
        kind: "vehicle_category",
        dbValues: ["Pick-up"],
      },
      {
        id: "van",
        labelKey: "explorerFilters.sub.car.van",
        kind: "vehicle_category",
        dbValues: ["Minibus", "Camionnette"],
      },
      {
        id: "luxe",
        labelKey: "explorerFilters.sub.car.luxe",
        kind: "vehicle_category",
        dbValues: ["Berline", "Coupé", "Cabriolet"],
      },
    ],
  },
];

export function getMainCategoryConfig(
  id: ExplorerMainCategoryId | string | undefined | null
): ExplorerMainCategoryConfig | undefined {
  if (!id) return undefined;
  return EXPLORER_MAIN_CATEGORIES.find((c) => c.id === id);
}

export function getSubFilterConfig(
  mainId: ExplorerMainCategoryId | string | undefined | null,
  subId: string | null | undefined
): ExplorerSubFilterConfig | undefined {
  if (!mainId || !subId) return undefined;
  return getMainCategoryConfig(mainId)?.subFilters.find((s) => s.id === subId);
}

export function resolveEmptyStateConfig(
  mainId: ExplorerMainCategoryId | string | undefined | null,
  subId?: string | null
): ExplorerEmptyStateConfig | undefined {
  const sub = getSubFilterConfig(mainId as ExplorerMainCategoryId, subId);
  if (sub?.emptyState) return sub.emptyState;
  return getMainCategoryConfig(mainId)?.emptyState;
}
