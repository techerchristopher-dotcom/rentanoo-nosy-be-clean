import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import { trackMetaContact } from "@/lib/metaPixel";
import { trackGa4Event } from "@/lib/analytics";

const DIRECT_LINE_NUMBER = "+261373437912"; // Format E.164 pour tel:
const DIRECT_LINE_DISPLAY = "+261 37 34 379 12"; // Format affiché

// Le header est masqué dès qu'on scrolle (>SCROLL_THRESHOLD) et réapparaît
// quand on est revenu tout en haut. Mobile + desktop.
const SCROLL_THRESHOLD = 8;

export function WhatsAppHeader() {
  const { t } = useTranslation("common");
  const { waUrl, phoneDisplay } = useWhatsAppContact();
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const computeAtTop = () => setAtTop(window.scrollY <= SCROLL_THRESHOLD);
    computeAtTop();
    window.addEventListener("scroll", computeAtTop, { passive: true });
    window.addEventListener("resize", computeAtTop);
    return () => {
      window.removeEventListener("scroll", computeAtTop);
      window.removeEventListener("resize", computeAtTop);
    };
  }, []);

  const handleWhatsAppClick = () => {
    console.log("[WA-header] clic — fbq:", typeof window.fbq, "| gtag:", typeof window.gtag);
    trackMetaContact();
    trackGa4Event("contact", { method: "whatsapp" });
    console.log("[WA-header] tracking fired ✓");
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "hidden md:block sticky top-0 z-[60] bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-md overflow-hidden transition-all duration-200 ease-out",
        atTop ? "max-h-24 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}
      aria-hidden={!atTop}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6 py-2 md:py-2.5">
          {/* Section WhatsApp */}
          <button
            onClick={handleWhatsAppClick}
            className="flex items-center gap-2 md:gap-3 hover:bg-[#25D366]/20 transition-colors duration-200 group px-2 py-1 rounded min-w-0 max-w-full"
            aria-label={`Contacter le service client via WhatsApp: ${phoneDisplay}`}
          >
            <WhatsAppIcon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="font-bold text-sm md:text-base tracking-tight truncate">
              {phoneDisplay}
            </span>
            <span className="text-xs md:text-sm opacity-90 hidden sm:inline truncate">
              {t("whatsapp.contactOnly", "Contact WhatsApp uniquement")}
            </span>
            <span className="text-xs opacity-90 sm:hidden truncate">
              {t("whatsapp.contactOnlyShort", "WhatsApp uniquement")}
            </span>
            <span className="text-xs opacity-75 group-hover:opacity-100 transition-opacity flex-shrink-0">
              →
            </span>
          </button>

          <div className="h-4 w-px bg-white/30 hidden sm:block flex-shrink-0" />

          <a
            href={`tel:${DIRECT_LINE_NUMBER}`}
            className="flex items-center gap-2 md:gap-3 hover:bg-[#25D366]/20 transition-colors duration-200 group px-2 py-1 rounded min-w-0 max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#128C7E]"
            aria-label={t("whatsapp.directLineAria", "Appelez-nous au +261 37 34 379 12")}
          >
            <Phone className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="font-bold text-sm md:text-base tracking-tight truncate">
              {DIRECT_LINE_DISPLAY}
            </span>
            <span className="text-xs md:text-sm opacity-90 hidden sm:inline truncate">
              {t("whatsapp.directLine", "Ligne directe")}
            </span>
            <span className="text-xs opacity-90 sm:hidden truncate">
              {t("whatsapp.directLineShort", "Appelez-nous")}
            </span>
            <span className="text-xs opacity-75 group-hover:opacity-100 transition-opacity flex-shrink-0">
              →
            </span>
          </a>

          <div className="h-4 w-px bg-white/30 hidden sm:block flex-shrink-0" />

          <Link
            to="/contact"
            className="flex items-center gap-2 hover:bg-[#25D366]/20 transition-colors duration-200 group px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#128C7E] min-w-0"
            aria-label={t("whatsapp.sendEmail", "Envoyez un email")}
          >
            <Mail className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="text-sm md:text-base font-medium underline underline-offset-2 decoration-white/60 hover:decoration-white transition-colors truncate">
              {t("whatsapp.sendEmail", "Envoyez un email")}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

