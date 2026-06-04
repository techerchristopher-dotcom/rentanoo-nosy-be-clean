import { useTranslation } from "react-i18next";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import { cn } from "@/lib/utils";

export function WhatsAppFloatingButton() {
  const { t } = useTranslation("common");
  const { waUrl, phoneDisplay, contact } = useWhatsAppContact();
  const hasPhoto = Boolean(contact.profilePhotoUrl);

  const bubbleMessage = t(
    "whatsapp.floatingBubbleMessage",
    "Bonjour ! Je suis Chris, le gérant de Rentanoo. Je suis disponible pour répondre à vos questions."
  );

  return (
    <div className="md:hidden fixed right-3 z-40 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] max-w-[min(280px,calc(100vw-1.5rem))]">
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-fab-float group flex flex-col items-end gap-2.5 outline-none"
        aria-label={t(
          "whatsapp.floatingButtonAria",
          `Contacter le service client via WhatsApp: ${phoneDisplay}`
        )}
      >
        <div className="relative mr-1">
          <div className="rounded-2xl rounded-br-md border border-[#25D366]/25 bg-white px-3.5 py-2.5 text-left text-xs leading-snug text-foreground shadow-[0_8px_24px_-6px_rgba(37,211,102,0.35),0_4px_12px_rgba(0,0,0,0.08)] transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]">
            <p>{bubbleMessage}</p>
          </div>
          <span
            className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-[#25D366]/25 bg-white"
            aria-hidden
          />
        </div>

        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span
            className="whatsapp-fab-halo absolute -inset-2 rounded-full bg-[#25D366]/35 blur-[2px]"
            aria-hidden
          />
          <span
            className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/40"
            aria-hidden
          />
          <span
            className={cn(
              "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-lg ring-2 ring-[#25D366]/30 transition-transform group-hover:scale-105 group-active:scale-95",
              hasPhoto ? "bg-muted" : "bg-[#25D366] text-white"
            )}
          >
            {hasPhoto ? (
              <img src={contact.profilePhotoUrl!} alt="" className="h-full w-full object-cover" />
            ) : (
              <WhatsAppIcon className="h-7 w-7" />
            )}
          </span>
        </div>
      </a>
    </div>
  );
}
