/**
 * Diagnostic runtime pour ?debugDialogs=1 sur /me/renter/bookings.
 * Objectif : relier overlays / nœuds Radix ouverts aux modales applicatives.
 */

const LOG_PREFIX = "[rentanoo:debugDialogs]";

export type OpenNodeDetail = {
  tag: string;
  id?: string;
  className: string;
  role?: string;
  dataState?: string | null;
  position: string;
  zIndex: string;
  opacity: string;
  pointerEvents: string;
  visibility: string;
  display: string;
  rect: { w: number; h: number; top: number; left: number };
  /** Extrait court du texte visible (titres / premiers caractères) */
  textPreview: string;
  /** Heuristique : quelle modale / composant */
  guessedSource: string;
  /** true si ressemble à un overlay plein écran Radix Dialog */
  looksLikeDialogOverlay: boolean;
  /** true si ressemble au panneau de contenu dialog */
  looksLikeDialogContent: boolean;
};

export type FixedFullscreenCandidate = {
  tag: string;
  id?: string;
  className: string;
  zIndex: string;
  opacity: string;
  pointerEvents: string;
  visibility: string;
  display: string;
  rect: { w: number; h: number; top: number; left: number };
  dataState?: string | null;
  guessedSource: string;
  /** Couvre ~tout le viewport */
  coversViewport: boolean;
  /** Probablement pas un “vrai” dialog visible (opacité très basse, etc.) */
  suspiciousInvisibleBlocker: boolean;
};

function truncate(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

function guessFromText(text: string): string | null {
  if (/confirmer et payer/i.test(text)) return "PaymentFlowModal";
  if (/activer la caution/i.test(text)) return "DepositFlowModal";
  if (/étape\s*1.*payer ma location/i.test(text)) return "PaymentFlowModal (corps)";
  if (/annul(er|ation).*réservation|motif d annulation/i.test(text)) return "RenterBookingCard — annulation";
  if (/détails.*réservation|référence|rentanoo/i.test(text) && text.length > 40)
    return "RenterBookingCard — détails";
  return null;
}

function guessModalLabel(contextEl: Element): string {
  const parent = contextEl.parentElement;
  if (parent) {
    for (const child of parent.children) {
      if (child === contextEl) continue;
      if (child.getAttribute("role") === "dialog") {
        const g = guessFromText(child.textContent || "");
        if (g) return `${g} (overlay → voisin dialog)`;
        break;
      }
    }
  }

  const dialogRoot =
    contextEl.closest('[role="dialog"]') ??
    (contextEl.getAttribute("role") === "dialog" ? contextEl : null);

  const searchRoots: Element[] = dialogRoot ? [dialogRoot] : [contextEl];

  for (const root of searchRoots) {
    const byId = root.querySelector(
      "#deposit-modal-title, [data-testid], h1, h2, [class*='text-2xl'], [class*='text-3xl'], [class*='font-bold']"
    );
    if (byId?.textContent) {
      const t = truncate(byId.textContent, 120);
      const fromKnown = guessFromText(t);
      if (fromKnown) return fromKnown;
      return `Heading: "${t}"`;
    }
  }

  const anyText = truncate(contextEl.textContent || "", 200);
  const fromKnown = guessFromText(anyText);
  if (fromKnown) return fromKnown;

  if (anyText.length > 0) return `Texte: "${truncate(anyText, 80)}"`;
  return "(pas de texte direct — probable overlay ou menu)";
}

function serializeOpenNode(el: Element): OpenNodeDetail {
  const html = el as HTMLElement;
  const cs = getComputedStyle(html);
  const rect = html.getBoundingClientRect();
  const role = el.getAttribute("role") || undefined;
  const className = typeof el.className === "string" ? el.className : "";
  const looksOverlay =
    cs.position === "fixed" &&
    parseFloat(cs.opacity || "1") > 0.01 &&
    rect.width >= window.innerWidth * 0.85 &&
    rect.height >= window.innerHeight * 0.85;
  const looksContent =
    role === "dialog" || el.getAttribute("aria-modal") === "true";

  return {
    tag: el.tagName,
    id: el.id || undefined,
    className: truncate(className, 160),
    role,
    dataState: el.getAttribute("data-state"),
    position: cs.position,
    zIndex: cs.zIndex,
    opacity: cs.opacity,
    pointerEvents: cs.pointerEvents,
    visibility: cs.visibility,
    display: cs.display,
    rect: {
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
    },
    textPreview: truncate(el.textContent || "", 100),
    guessedSource: guessModalLabel(el),
    looksLikeDialogOverlay: looksOverlay && !looksContent,
    looksLikeDialogContent: !!looksContent,
  };
}

function collectFixedFullscreenCandidates(root: ParentNode): FixedFullscreenCandidate[] {
  const out: FixedFullscreenCandidate[] = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  root.querySelectorAll("*").forEach((node) => {
    const el = node as HTMLElement;
    if (!el.getBoundingClientRect) return;
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") return;
    if (cs.pointerEvents === "none") return;
    const rect = el.getBoundingClientRect();
    const covers =
      rect.width >= vw * 0.88 &&
      rect.height >= vh * 0.88 &&
      rect.top <= 8 &&
      rect.left <= 8;
    if (!covers) return;

    const op = parseFloat(cs.opacity || "1");
    const suspiciousInvisible =
      op < 0.08 || cs.visibility === "hidden" || cs.display === "none";

    out.push({
      tag: el.tagName,
      id: el.id || undefined,
      className: truncate(typeof el.className === "string" ? el.className : "", 160),
      zIndex: cs.zIndex,
      opacity: cs.opacity,
      pointerEvents: cs.pointerEvents,
      visibility: cs.visibility,
      display: cs.display,
      rect: {
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      },
      dataState: el.getAttribute("data-state"),
      guessedSource: guessModalLabel(el),
      coversViewport: covers,
      suspiciousInvisibleBlocker: suspiciousInvisible && cs.pointerEvents !== "none",
    });
  });

  return out;
}

export type RadixPortalDebugSnapshot = {
  openStateNodes: number;
  openNodeDetails: OpenNodeDetail[];
  bodyOverflow: string;
  bodyPointerEvents: string;
  bodyStyleAttr: string;
  bodyOverflowComputed: string;
  bodyPointerEventsComputed: string;
  htmlOverflow: string;
  htmlOverflowComputed: string;
  /** fixed quasi plein écran dans le portail */
  portalFixedFullscreen: FixedFullscreenCandidate[];
  /** fixed quasi plein écran dans tout le document (hors scoping strict) */
  documentFixedFullscreen: FixedFullscreenCandidate[];
  /** Message explicite si overlay plein écran sans dialog visible */
  orphanOverlayHint: string | null;
};

function hasVisibleDialogOpen(portal: HTMLElement | null, details: OpenNodeDetail[]): boolean {
  const hasRoleDialog = details.some((d) => d.role === "dialog" || d.looksLikeDialogContent);
  if (hasRoleDialog) return true;
  if (!portal) return false;
  return portal.querySelector('[role="dialog"][data-state="open"]') !== null;
}

export function captureRadixPortalDebug(): RadixPortalDebugSnapshot {
  const portal = document.getElementById("radix-portal-root");
  const openInPortal = portal?.querySelectorAll('[data-state="open"]') ?? [];
  const openNodeDetails = [...openInPortal].map((el) => serializeOpenNode(el));

  const portalFixed = portal ? collectFixedFullscreenCandidates(portal) : [];
  const documentFixed = collectFixedFullscreenCandidates(document.body);

  const body = document.body;
  const html = document.documentElement;
  const bodyCs = getComputedStyle(body);
  const htmlCs = getComputedStyle(html);

  const visibleDialog = hasVisibleDialogOpen(portal, openNodeDetails);
  const blockingFullscreen = documentFixed.filter((c) => c.display !== "none");

  const hints: string[] = [];
  if (!visibleDialog && blockingFullscreen.length > 0) {
    hints.push(
      "OVERLAY_ORPHELIN_POSSIBLE: aucun [role=dialog] ouvert détecté alors qu’au moins un calque fixed plein-écran a pointer-events ≠ none — inspecter documentFixedFullscreen / portalFixedFullscreen."
    );
  }
  if (blockingFullscreen.some((c) => c.suspiciousInvisibleBlocker)) {
    hints.push(
      "OVERLAY_INVISIBLE_MAIS_BLOQUANT: fixed plein-écran avec opacité ~0 / visibility hidden mais pointer-events actifs — très suspect pour clics morts."
    );
  }
  if (openNodeDetails.length > 0 && !openNodeDetails.some((d) => d.role === "dialog" || d.looksLikeDialogContent)) {
    hints.push(
      "DATA_STATE_OPEN_SANS_DIALOG: [data-state=open] présent(s) sans rôle dialog (menu, popover, etc.) — vérifier openNodeDetails[].guessedSource."
    );
  }
  const orphanOverlayHint = hints.length > 0 ? hints.join(" | ") : null;

  return {
    openStateNodes: openInPortal.length,
    openNodeDetails,
    bodyOverflow: body.style.overflow || "(inline vide)",
    bodyPointerEvents: body.style.pointerEvents || "(inline vide)",
    bodyStyleAttr: truncate(body.getAttribute("style") || "", 200),
    bodyOverflowComputed: bodyCs.overflow,
    bodyPointerEventsComputed: bodyCs.pointerEvents,
    htmlOverflow: html.style.overflow || "(inline vide)",
    htmlOverflowComputed: htmlCs.overflow,
    portalFixedFullscreen: portalFixed,
    documentFixedFullscreen: documentFixed,
    orphanOverlayHint,
  };
}

export function logRadixPortalDebug(): void {
  const snap = captureRadixPortalDebug();
  // eslint-disable-next-line no-console
  console.info(LOG_PREFIX, {
    openStateNodes: snap.openStateNodes,
    openNodeDetails: snap.openNodeDetails,
    body: {
      styleOverflowInline: snap.bodyOverflow,
      stylePointerEventsInline: snap.bodyPointerEvents,
      styleAttr: snap.bodyStyleAttr,
      overflowComputed: snap.bodyOverflowComputed,
      pointerEventsComputed: snap.bodyPointerEventsComputed,
    },
    html: {
      styleOverflowInline: snap.htmlOverflow,
      overflowComputed: snap.htmlOverflowComputed,
    },
    portalFixedFullscreen: snap.portalFixedFullscreen,
    documentFixedFullscreen: snap.documentFixedFullscreen,
    orphanOverlayHint: snap.orphanOverlayHint,
  });
}

export function subscribeRadixPortalDebug(onLog: () => void): () => void {
  const portal = document.getElementById("radix-portal-root");
  const cleanups: Array<() => void> = [];

  const moPortal = new MutationObserver(() => onLog());
  if (portal) {
    moPortal.observe(portal, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "style", "class"],
    });
  }
  cleanups.push(() => moPortal.disconnect());

  const moBody = new MutationObserver(() => onLog());
  moBody.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });
  cleanups.push(() => moBody.disconnect());

  const moHtml = new MutationObserver(() => onLog());
  moHtml.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });
  cleanups.push(() => moHtml.disconnect());

  return () => cleanups.forEach((fn) => fn());
}
