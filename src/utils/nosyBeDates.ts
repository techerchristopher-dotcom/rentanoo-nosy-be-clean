export const NOSY_BE_TIMEZONE = "Indian/Antananarivo";

export function todayYmdNosyBe(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NOSY_BE_TIMEZONE }).format(new Date());
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatYmdLabel(ymd: string, locale: string, opts?: { today?: string; tomorrow?: string }): string {
  const today = todayYmdNosyBe();
  const tomorrow = addDaysYmd(today, 1);
  if (ymd === today && opts?.today) return opts.today;
  if (ymd === tomorrow && opts?.tomorrow) return opts.tomorrow;
  const d = new Date(`${ymd}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}
