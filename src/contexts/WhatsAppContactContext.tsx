import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FALLBACK_WHATSAPP_CONTACT,
  formatWhatsAppPhoneDisplay,
  getWhatsAppUrlFromE164,
  parseWhatsAppContact,
  type WhatsAppContactConfig,
} from "@/utils/whatsappContact";

type WhatsAppContactContextValue = {
  contact: WhatsAppContactConfig;
  phoneDisplay: string;
  waUrl: string;
  loading: boolean;
  refresh: () => Promise<void>;
};

const WhatsAppContactContext = createContext<WhatsAppContactContextValue | null>(null);

async function fetchPublicWhatsAppContact(): Promise<WhatsAppContactConfig> {
  try {
    const res = await fetch("/api/public/whatsapp-contact");
    if (!res.ok) return { ...FALLBACK_WHATSAPP_CONTACT };
    const json = (await res.json()) as { phoneE164?: string; profilePhotoUrl?: string | null };
    return parseWhatsAppContact(json);
  } catch {
    return { ...FALLBACK_WHATSAPP_CONTACT };
  }
}

export function WhatsAppContactProvider({ children }: { children: ReactNode }) {
  const [contact, setContact] = useState<WhatsAppContactConfig>(FALLBACK_WHATSAPP_CONTACT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchPublicWhatsAppContact();
      setContact(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<WhatsAppContactContextValue>(() => {
    const phoneE164 = contact.phoneE164 || FALLBACK_WHATSAPP_CONTACT.phoneE164;
    return {
      contact,
      phoneDisplay: formatWhatsAppPhoneDisplay(phoneE164),
      waUrl: getWhatsAppUrlFromE164(phoneE164),
      loading,
      refresh,
    };
  }, [contact, loading, refresh]);

  return (
    <WhatsAppContactContext.Provider value={value}>{children}</WhatsAppContactContext.Provider>
  );
}

export function useWhatsAppContact(): WhatsAppContactContextValue {
  const ctx = useContext(WhatsAppContactContext);
  if (!ctx) {
    const phoneE164 = FALLBACK_WHATSAPP_CONTACT.phoneE164;
    return {
      contact: FALLBACK_WHATSAPP_CONTACT,
      phoneDisplay: formatWhatsAppPhoneDisplay(phoneE164),
      waUrl: getWhatsAppUrlFromE164(phoneE164),
      loading: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
