export type ExtensionPending = {
  deltaSubtotal: number;
  deltaServiceFee: number;
  deltaTotalTTC: number;
  previousEndDate: string;
  extendedAt: string;
  stripePaymentIntentId?: string | null;
};

export function getOptionsItems(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)) {
    return (raw as { items: unknown[] }).items;
  }
  return [];
}

export function getExtensionPending(raw: unknown): ExtensionPending | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const pending = (raw as { extensionPending?: ExtensionPending }).extensionPending;
  if (!pending || typeof pending !== "object") return null;
  if (typeof pending.deltaTotalTTC !== "number" || pending.deltaTotalTTC <= 0) return null;
  return pending;
}

export function wrapSelectedOptionsWithExtension(
  raw: unknown,
  extensionPending: ExtensionPending | null
): unknown {
  const items = getOptionsItems(raw);
  if (!extensionPending) {
    return items.length > 0 ? items : null;
  }
  return {
    items,
    extensionPending,
  };
}

export function clearExtensionPending(raw: unknown): unknown {
  const items = getOptionsItems(raw);
  return items.length > 0 ? items : null;
}
