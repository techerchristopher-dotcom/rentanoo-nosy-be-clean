/**
 * Composant lazy pour react-datepicker
 * Charge le composant et son CSS uniquement quand nécessaire
 */
import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactDatePickerProps } from "react-datepicker";

// Lazy-load du composant DatePicker
const DatePicker = lazy(() =>
  Promise.all([
    import("react-datepicker"),
    import("react-datepicker/dist/react-datepicker.css"),
    import("@/styles/datepicker-overrides.css")
  ]).then(([module]) => ({ default: module.default }))
);

// Fallback simple pendant le chargement
const DatePickerFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

interface LazyDatePickerProps extends ReactDatePickerProps {
  // Props du DatePicker original
}

export function LazyDatePicker(props: LazyDatePickerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <DatePickerFallback />;
  }

  return (
    <Suspense fallback={<DatePickerFallback />}>
      <DatePicker {...props} />
    </Suspense>
  );
}

