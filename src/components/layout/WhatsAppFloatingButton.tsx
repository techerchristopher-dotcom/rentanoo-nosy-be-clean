import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { WhatsAppIcon } from "@/components/layout/WhatsAppIcon";
import { cn } from "@/lib/utils";

const LS_POSITION_KEY = "rentanoo_whatsapp_fab_pos";
const SS_SESSION_START = "rentanoo_whatsapp_session_start";
const SS_BUBBLE_DISMISSED = "rentanoo_whatsapp_bubble_dismissed";
const SHOW_DELAY_MS = 15_000;
const AUTO_HIDE_MS = 5_000;
const DRAG_THRESHOLD = 6;
const FADE_MS = 600;
const AVATAR_SIZE = 56;

type BubblePhase = "hidden" | "visible" | "fading" | "dismissed";
/** Coin bas-droit de l’avatar (ancre de position). */
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
  const { waUrl, phoneDisplay, contact } = useWhatsAppContact();
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

  const [anchor, setAnchor] = useState<FabAnchor | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bubblePhase, setBubblePhase] = useState<BubblePhase>("hidden");

  const bubbleMessage = t(
    "whatsapp.floatingBubbleMessage",
    "Bonjour ! Je suis Chris, le gérant de Rentanoo. Je suis disponible pour répondre à vos questions."
  );

  const dismissBubble = useCallback(() => {
    setBubblePhase((prev) => {
      if (prev === "hidden" || prev === "dismissed" || prev === "fading") return prev;
      return "fading";
    });
  }, []);

  useEffect(() => {
    setAnchor(readSavedAnchor() ?? defaultAnchor());
    const onResize = () => setAnchor((prev) => (prev ? clampAnchor(prev.x, prev.y) : defaultAnchor()));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(SS_BUBBLE_DISMISSED)) {
      setBubblePhase("dismissed");
      return;
    }

    let start = sessionStorage.getItem(SS_SESSION_START);
    if (!start) {
      start = String(Date.now());
      sessionStorage.setItem(SS_SESSION_START, start);
    }

    const elapsed = Date.now() - Number(start);
    const delay = Math.max(0, SHOW_DELAY_MS - elapsed);

    const showTimer = window.setTimeout(() => {
      setBubblePhase((prev) => (prev === "dismissed" ? prev : "visible"));
    }, delay);

    return () => window.clearTimeout(showTimer);
  }, []);

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
      dismissBubble();
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
    }
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
            </div>
            <span
              className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-[#25D366]/25 bg-white"
              aria-hidden
            />
          </div>
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
