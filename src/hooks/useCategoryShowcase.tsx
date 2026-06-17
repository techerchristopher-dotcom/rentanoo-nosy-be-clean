import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { LS_CATEGORY_MODAL_KEY } from "@/data/categoryShowcaseItems";

const AUTO_OPEN_DELAY_MS = 300;
export const CATEGORY_MODAL_AUTO_OPEN = false;

export type FilterableVehicleType =
  | "scooter"
  | "moto"
  | "quad"
  | "accommodation"
  | "car";

export type HomeCatalogHandlers = {
  applyCategoryFilter: (type: FilterableVehicleType) => void;
};

type CategoryShowcaseContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  registerHomeCatalogHandlers: (handlers: HomeCatalogHandlers) => void;
  unregisterHomeCatalogHandlers: () => void;
  selectAvailableCategory: (type: FilterableVehicleType) => void;
};

const CategoryShowcaseContext = createContext<CategoryShowcaseContextValue | null>(
  null,
);

function hasSeenModal(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LS_CATEGORY_MODAL_KEY) === "true";
  } catch {
    return true;
  }
}

function markModalSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_CATEGORY_MODAL_KEY, "true");
  } catch {
    /* ignore quota/private-mode errors */
  }
}

export function isFilterableVehicleType(
  value: string
): value is FilterableVehicleType {
  return (
    value === "scooter" ||
    value === "moto" ||
    value === "quad" ||
    value === "accommodation" ||
    value === "car"
  );
}

export function CategoryShowcaseProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const didAutoOpenRef = useRef(false);
  const homeHandlersRef = useRef<HomeCatalogHandlers | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!CATEGORY_MODAL_AUTO_OPEN) return;
    if (didAutoOpenRef.current) return;
    didAutoOpenRef.current = true;

    if (hasSeenModal()) return;

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, AUTO_OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    markModalSeen();
  }, []);

  const registerHomeCatalogHandlers = useCallback((handlers: HomeCatalogHandlers) => {
    homeHandlersRef.current = handlers;
  }, []);

  const unregisterHomeCatalogHandlers = useCallback(() => {
    homeHandlersRef.current = null;
  }, []);

  const selectAvailableCategory = useCallback(
    (type: FilterableVehicleType) => {
      close();
      const handlers = homeHandlersRef.current;
      if (handlers) {
        handlers.applyCategoryFilter(type);
      } else {
        navigate("/", { state: { categoryFilter: type, scrollCatalog: true } });
      }
    },
    [close, navigate],
  );

  const value = useMemo<CategoryShowcaseContextValue>(
    () => ({
      isOpen,
      open,
      close,
      registerHomeCatalogHandlers,
      unregisterHomeCatalogHandlers,
      selectAvailableCategory,
    }),
    [
      isOpen,
      open,
      close,
      registerHomeCatalogHandlers,
      unregisterHomeCatalogHandlers,
      selectAvailableCategory,
    ],
  );

  return (
    <CategoryShowcaseContext.Provider value={value}>
      {children}
    </CategoryShowcaseContext.Provider>
  );
}

export function useCategoryShowcase(): CategoryShowcaseContextValue {
  const ctx = useContext(CategoryShowcaseContext);
  if (!ctx) {
    throw new Error(
      "useCategoryShowcase must be used within a CategoryShowcaseProvider",
    );
  }
  return ctx;
}
