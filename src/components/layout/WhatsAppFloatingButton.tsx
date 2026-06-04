import { useTranslation } from "react-i18next";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import { cn } from "@/lib/utils";

export function WhatsAppFloatingButton() {
  const { t } = useTranslation("common");
  const { waUrl, phoneDisplay, contact } = useWhatsAppContact();
  const hasPhoto = Boolean(contact.profilePhotoUrl);

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "md:hidden fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-95 bottom-[calc(5.25rem+env(safe-area-inset-bottom))]",
        hasPhoto ? "overflow-hidden bg-muted" : "bg-[#25D366] text-white hover:bg-[#20bd5a]"
      )}
      aria-label={t(
        "whatsapp.floatingButtonAria",
        `Contacter le service client via WhatsApp: ${phoneDisplay}`
      )}
    >
      {hasPhoto ? (
        <img
          src={contact.profilePhotoUrl!}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <WhatsAppIcon className="h-7 w-7" />
      )}
    </a>
  );
}
