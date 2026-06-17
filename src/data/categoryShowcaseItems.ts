import type { ComponentType, SVGProps } from "react";
import {
  MdMoped,
  MdTwoWheeler,
  MdTerrain,
  MdDirectionsBoat,
  MdHotel,
} from "react-icons/md";

export const LS_CATEGORY_MODAL_KEY = "rentanoo_category_modal_seen";

export type CategoryShowcaseItemId =
  | "scooter"
  | "moto"
  | "quad"
  | "boat"
  | "accommodation";

export interface CategoryShowcaseItem {
  id: CategoryShowcaseItemId;
  /** i18n key for the card label */
  labelKey: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  available: boolean;
  /** i18n key for the WhatsApp pre-filled message — present only for coming-soon items */
  waPrefillKey?: string;
  /** Stable id sent to GA4 events */
  gtagCategoryId: string;
}

export const CATEGORY_SHOWCASE_ITEMS: CategoryShowcaseItem[] = [
  {
    id: "scooter",
    labelKey: "categoryShowcase.items.scooter.label",
    Icon: MdMoped,
    available: true,
    gtagCategoryId: "scooter",
  },
  {
    id: "moto",
    labelKey: "categoryShowcase.items.moto.label",
    Icon: MdTwoWheeler,
    available: true,
    gtagCategoryId: "moto",
  },
  {
    id: "quad",
    labelKey: "categoryShowcase.items.quad.label",
    Icon: MdTerrain,
    available: true,
    gtagCategoryId: "quad",
  },
  {
    id: "boat",
    labelKey: "categoryShowcase.items.boat.label",
    Icon: MdDirectionsBoat,
    available: false,
    waPrefillKey: "categoryShowcase.items.boat.waPrefillMessage",
    gtagCategoryId: "boat",
  },
  {
    id: "accommodation",
    labelKey: "categoryShowcase.items.accommodation.label",
    Icon: MdHotel,
    available: true,
    gtagCategoryId: "accommodation",
  },
];

export const AVAILABLE_CATEGORIES = CATEGORY_SHOWCASE_ITEMS.filter(
  (item) => item.available,
);

export const COMING_SOON_CATEGORIES = CATEGORY_SHOWCASE_ITEMS.filter(
  (item) => !item.available,
);
