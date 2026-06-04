import { useTranslation } from "react-i18next";
import { getWhatsAppUrl, WHATSAPP_DISPLAY } from "@/constants/contact";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";

export function WhatsAppFloatingButton() {
  const { t } = useTranslation("common");

  return (
    <a
      href={getWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="md:hidden fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105 hover:bg-[#20bd5a] active:scale-95 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
      aria-label={t(
        "whatsapp.floatingButtonAria",
        `Contacter le service client via WhatsApp: ${WHATSAPP_DISPLAY}`
      )}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
