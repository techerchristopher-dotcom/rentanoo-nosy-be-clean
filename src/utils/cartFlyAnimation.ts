// Désactivable rapidement si besoin de revenir à un simple toast sans animation
export const CART_FLY_ANIMATION = true;

const FLY_DURATION_MS = 600;
const FLY_EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

/**
 * Anime une vignette (photo du véhicule ou icône panier) depuis le bouton
 * "Ajouter au panier" cliqué jusqu'à l'icône panier de la navbar (#navbar-cart-icon).
 * Déclenche aussi un pulse sur le badge une fois la vignette arrivée.
 */
export function flyToCart(originEl: HTMLElement, thumbnailUrl?: string) {
  if (!CART_FLY_ANIMATION) return;

  const desktopTarget = document.getElementById("navbar-cart-icon");
  const mobileTarget = document.getElementById("navbar-cart-icon-mobile");
  const target =
    [desktopTarget, mobileTarget].find((el) => el && el.offsetParent !== null) || desktopTarget;
  if (!target) return;

  const originRect = originEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const ghost = document.createElement("div");
  ghost.style.position = "fixed";
  ghost.style.zIndex = "9999";
  ghost.style.left = `${originRect.left + originRect.width / 2 - 16}px`;
  ghost.style.top = `${originRect.top + originRect.height / 2 - 16}px`;
  ghost.style.width = "32px";
  ghost.style.height = "32px";
  ghost.style.borderRadius = "9999px";
  ghost.style.overflow = "hidden";
  ghost.style.pointerEvents = "none";
  ghost.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
  ghost.style.transition = `transform ${FLY_DURATION_MS}ms ${FLY_EASING}, opacity ${FLY_DURATION_MS}ms ${FLY_EASING}`;
  ghost.style.background = thumbnailUrl
    ? `center/cover no-repeat url(${thumbnailUrl})`
    : "#0D9488";

  document.body.appendChild(ghost);

  requestAnimationFrame(() => {
    const dx =
      targetRect.left + targetRect.width / 2 - (originRect.left + originRect.width / 2);
    const dy =
      targetRect.top + targetRect.height / 2 - (originRect.top + originRect.height / 2);
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
    ghost.style.opacity = "0";
  });

  setTimeout(() => {
    ghost.remove();
    const badge = target.querySelector(".cart-badge");
    if (badge) {
      badge.classList.add("animate-cart-badge-pulse");
      setTimeout(() => badge.classList.remove("animate-cart-badge-pulse"), 500);
    }
  }, FLY_DURATION_MS);
}
