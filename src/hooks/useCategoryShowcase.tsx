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
import { LS_CATEGORY_MODAL_KEY } from "@/data/categoryShowcaseItems";

const AUTO_OPEN_DELAY_MS = 300;

type CategoryShowcaseContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
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

export function CategoryShowcaseProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const didAutoOpenRef = useRef(false);

  useEffect(() => {
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

  const value = useMemo<CategoryShowcaseContextValue>(
    () => ({ isOpen, open, close }),
    [isOpen, open, close],
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
