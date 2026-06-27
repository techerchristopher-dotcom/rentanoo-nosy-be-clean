import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import {
  SS_BUBBLE_DISMISSED,
  useWhatsAppBubbleTrigger,
} from "@/hooks/useWhatsAppBubbleTrigger";
import { trackWhatsAppFabEvent } from "@/lib/whatsappAnalytics";
import { trackMetaContact } from "@/lib/metaPixel";
import { trackGa4Event } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const LS_POSITION_KEY = "rentanoo_whatsapp_fab_pos";
const LS_DRAG_HINT_KEY = "rentanoo_whatsapp_drag_hint_seen";
const AUTO_HIDE_MS = 5_000;
const DRAG_THRESHOLD = 6;
const FADE_MS = 600;
const AVATAR_SIZE = 56;
const DRAG_HINT_MS = 4_000;

type BubblePhase = "hidden" | "visible" | "fading" | "dismissed";
type FabAnchor = { x: number; y: number };

function bottomOffsetPx(): number {
  return 5.25 * 16 + 12;
}

function clampAnchor(x: number, y: number): FabAnchor {
  const margin = 8;
  return {
    x: Math.min(Math.max(AVATAR_SIZE + margin, x), window.innerWidth - margin),
    y: Math.min(Math.max(AVATAR_SIZE + margin, y), window.innerHeight - margin),
  };
}

function defaultAnchor(): FabAnchor {
  return clampAnchor(window.innerWidth - 12, window.innerHeight - bottomOffsetPx());
}

function readSavedAnchor(): FabAnchor | null {
  try {
    const raw = localStorage.getItem(LS_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FabAnchor;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") return clampAnchor(parsed.x, parsed.y);
  } catch {
    /* ignore */
  }
  return null;
}

export function WhatsAppFloatingButton() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { waUrl, phoneDisplay, contact } = useWhatsAppContact();
  const { shouldShowBubble, triggerReason } = useWhatsAppBubbleTrigger();
  const hasPhoto = Boolean(contact.profilePhotoUrl);

  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const justDraggedRef = useRef(false);
  const bubbleShownSentRef = useRef(false);

  const [anchor, setAnchor] = useState<FabAnchor | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bubblePhase, setBubblePhase] = useState<BubblePhase>(() =>
    sessionStorage.getItem(SS_BUBBLE_DISMISSED) ? "dismissed" : "hidden"
  );
  const [showDragHint, setShowDragHint] = useState(
    () => !localStorage.getItem(LS_DRAG_HINT_KEY)
  );

  const bubbleMessage = t(
    "whatsapp.floatingBubbleMessage",
    "Bonjour ! Je suis Chris, le gérant de Rentanoo. Je suis disponible pour répondre à vos questions."
  );
  const responseHint = t(
    "whatsapp.floatingBubbleResponseHint",
    "Réponse habituelle sous 2 h."
  );
  const dragHint = t("whatsapp.floatingDragHint", "Maintenir pour déplacer");

  const dismissBubble = useCallback(() => {
    setBubblePhase((prev) => {
      if (prev === "hidden" || prev === "dismissed" || prev === "fading") return prev;
      return "fading";
    });
  }, []);

  const hideDragHint = useCallback(() => {
    setShowDragHint(false);
    localStorage.setItem(LS_DRAG_HINT_KEY, "1");
  }, []);

  useEffect(() => {
    setAnchor(readSavedAnchor() ?? defaultAnchor());
    const onResize = () => setAnchor((prev) => (prev ? clampAnchor(prev.x, prev.y) : defaultAnchor()));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!shouldShowBubble || bubblePhase === "dismissed" || bubblePhase === "visible" || bubblePhase === "fading") {
      return;
    }
    setBubblePhase("visible");
  }, [shouldShowBubble, bubblePhase]);

  useEffect(() => {
    if (bubblePhase !== "visible" || bubbleShownSentRef.current) return;
    bubbleShownSentRef.current = true;
    trackWhatsAppFabEvent("whatsapp_bubble_shown", {
      page_path: location.pathname,
      trigger: triggerReason ?? "unknown",
    });
  }, [bubblePhase, location.pathname, triggerReason]);

  useEffect(() => {
    if (bubblePhase !== "visible") return;
    const hideTimer = window.setTimeout(() => dismissBubble(), AUTO_HIDE_MS);
    return () => window.clearTimeout(hideTimer);
  }, [bubblePhase, dismissBubble]);

  useEffect(() => {
    if (bubblePhase !== "fading") return;
    const doneTimer = window.setTimeout(() => {
      setBubblePhase("dismissed");
      sessionStorage.setItem(SS_BUBBLE_DISMISSED, "1");
    }, FADE_MS);
    return () => window.clearTimeout(doneTimer);
  }, [bubblePhase]);

  useEffect(() => {
    if (!showDragHint) return;
    const timer = window.setTimeout(() => hideDragHint(), DRAG_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [showDragHint, hideDragHint]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: anchor?.x ?? 0,
      originY: anchor?.y ?? 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      drag.moved = true;
      setIsDragging(true);
      hideDragHint();
      dismissBubble();
      trackWhatsAppFabEvent("whatsapp_fab_drag", { page_path: location.pathname });
    }

    if (!drag.moved) return;

    setAnchor(clampAnchor(drag.originX + dx, drag.originY + dy));
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active || e.pointerId !== drag.pointerId) return;

    const didMove = drag.moved;
    drag.active = false;
    drag.moved = false;
    setIsDragging(false);

    if (didMove) {
      justDraggedRef.current = true;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const final = clampAnchor(drag.originX + dx, drag.originY + dy);
      setAnchor(final);
      localStorage.setItem(LS_POSITION_KEY, JSON.stringify(final));
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onAvatarClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (justDraggedRef.current) {
      e.preventDefault();
      justDraggedRef.current = false;
      return;
    }

    // Empêche la navigation native pour garantir que le tracking part
    // AVANT l'ouverture du nouvel onglet (iOS suspend le tab courant
    // dès que target="_blank" navigue — les beacons seraient perdus).
    e.preventDefault();

    console.log("[WA] onAvatarClick — fbq:", typeof window.fbq, "| gtag:", typeof window.gtag);

    trackWhatsAppFabEvent("whatsapp_fab_click", {
      page_path: location.pathname,
      bubble_visible: bubblePhase === "visible" ? "yes" : "no",
    });
    trackMetaContact();
    trackGa4Event("contact", { method: "whatsapp" });

    console.log("[WA] tracking fired ✓ — opening WhatsApp tab");

    // Ouvre le lien après le tracking (synchrone dans le même handler
    // de clic = pas bloqué par les popup blockers).
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const showBubble = bubblePhase === "visible" || bubblePhase === "fading";

  if (!anchor) return null;

  return (
    <div
      className="md:hidden fixed z-40 touch-none select-none"
      style={{
        left: anchor.x - AVATAR_SIZE,
        top: anchor.y - AVATAR_SIZE,
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
      }}
    >
      {showBubble ? (
        <div
          className={cn(
            "absolute bottom-full right-0 mb-2.5 w-[min(280px,calc(100vw-2rem))] pointer-events-none",
            bubblePhase === "visible" && "whatsapp-bubble-enter",
            bubblePhase === "fading" && "whatsapp-bubble-exit"
          )}
          aria-hidden={bubblePhase === "fading"}
        >
          <div className="relative mr-1">
            <div className="rounded-2xl rounded-br-md border border-[#25D366]/25 bg-white px-3.5 py-2.5 text-left text-xs leading-snug text-foreground shadow-[0_8px_24px_-6px_rgba(37,211,102,0.35),0_4px_12px_rgba(0,0,0,0.08)]">
              <p>{bubbleMessage}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{responseHint}</p>
            </div>
            <span
              className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-[#25D366]/25 bg-white"
              aria-hidden
            />
          </div>
        </div>
      ) : null}

      {showDragHint && !showBubble ? (
        <div
          className="absolute top-full right-0 mt-1.5 whitespace-nowrap rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-medium text-background shadow-md whatsapp-bubble-enter pointer-events-none"
          aria-hidden
        >
          {dragHint}
        </div>
      ) : null}

      <div
        className={cn("relative h-14 w-14", !isDragging && "whatsapp-fab-float")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <span
          className="whatsapp-fab-halo absolute -inset-2 rounded-full bg-[#25D366]/35 blur-[2px] pointer-events-none"
          aria-hidden
        />
        <span
          className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/40 pointer-events-none"
          aria-hidden
        />
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onAvatarClick}
          className={cn(
            "relative flex h-14 w-14 cursor-grab items-center justify-center overflow-hidden rounded-full shadow-lg ring-2 ring-[#25D366]/30 transition-transform hover:scale-105 active:cursor-grabbing active:scale-95",
            hasPhoto ? "bg-muted" : "bg-[#25D366] text-white"
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
              className="h-full w-full object-cover pointer-events-none"
              draggable={false}
            />
          ) : (
            <WhatsAppIcon className="h-7 w-7 pointer-events-none" />
          )}
        </a>
      </div>
    </div>
  );
}
