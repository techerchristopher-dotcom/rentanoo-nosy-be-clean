/**
 * Composant lazy pour react-phone-number-input
 * Charge le composant et son CSS uniquement quand nécessaire
 */
import { lazy, Suspense, useEffect, useState } from "react";
import type { Props as PhoneInputProps } from "react-phone-number-input";

// Lazy-load du composant PhoneInput
const PhoneInput = lazy(() => 
  Promise.all([
    import("react-phone-number-input"),
    import("react-phone-number-input/style.css")
  ]).then(([module]) => ({ default: module.default }))
);

// Fallback simple pendant le chargement
const PhoneInputFallback = () => (
  <div className="flex h-11 w-full rounded-lg border border-primary-soft/20 bg-background/30 px-3 py-2 items-center">
    <div className="animate-pulse text-muted-foreground text-sm">Chargement...</div>
  </div>
);

export function LazyPhoneInput(props: PhoneInputProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <PhoneInputFallback />;
  }

  return (
    <Suspense fallback={<PhoneInputFallback />}>
      <PhoneInput {...props} />
    </Suspense>
  );
}

