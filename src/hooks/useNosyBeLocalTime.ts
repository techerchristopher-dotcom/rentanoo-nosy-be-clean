import { useEffect, useState } from "react";

export const NOSY_BE_TIMEZONE = "Indian/Antananarivo";

function formatNosyBeTime(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: NOSY_BE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function useNosyBeLocalTime() {
  const [time, setTime] = useState(formatNosyBeTime);

  useEffect(() => {
    setTime(formatNosyBeTime());
    const id = setInterval(() => setTime(formatNosyBeTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  return time;
}
