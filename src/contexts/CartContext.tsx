import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const CART_MAX_ITEMS = 10;
const STORAGE_KEY = "rentanoo_cart_v1";

export type CartVehicleType = "car" | "moto" | "scooter" | "accommodation" | "quad";

export interface CartItem {
  id: string;
  vehicleId: string;
  vehicleType: CartVehicleType;
  vehicleLabel: string;
  vehicleThumbnail?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  selectedOptions?: string[];
  pickupLocation?: string;
  estimatedPrice?: number;
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  isFull: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "id">) => boolean;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<Omit<CartItem, "id">>) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage indisponible (mode privé, quota) : panier reste en mémoire pour la session
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [isOpen, setIsOpen] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    let added = false;
    setItems((prev) => {
      if (prev.length >= CART_MAX_ITEMS) return prev;
      added = true;
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
    return added;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<Omit<CartItem, "id">>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      isFull: items.length >= CART_MAX_ITEMS,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateItem,
      clearCart,
    }),
    [items, isOpen, openCart, closeCart, addItem, removeItem, updateItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
