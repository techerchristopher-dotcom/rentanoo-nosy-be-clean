import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type SeoHeroTheme = "weather" | "flights" | "exchange";

const heroThemes: Record<SeoHeroTheme, string> = {
  weather: "from-sky-100/90 via-teal-50/40 to-background dark:from-sky-950/50 dark:via-teal-950/20",
  flights: "from-slate-100/90 via-primary/5 to-background dark:from-slate-900/50 dark:via-primary/10",
  exchange: "from-emerald-100/90 via-teal-50/40 to-background dark:from-emerald-950/40 dark:via-teal-950/20",
};

export function SeoPageShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen flex flex-col bg-background">{children}</div>;
}

export function SeoPageHero({
  theme,
  eyebrow,
  title,
  intro,
  children,
}: {
  theme: SeoHeroTheme;
  eyebrow: string;
  title: string;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-b", heroThemes[theme])} />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.12),transparent)]"
        aria-hidden
      />
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground">{intro}</p>
        {children}
      </div>
    </section>
  );
}

export function SeoStatCard({
  label,
  value,
  sub,
  icon,
  loading,
  loadingLabel,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/90 p-5 md:p-6 shadow-sm backdrop-blur-sm",
        "transition-all duration-200 hover:shadow-md hover:border-border",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
        {icon ? <span className="opacity-90">{icon}</span> : null}
      </div>
      <div className="mt-3 flex min-h-[2.25rem] items-center text-3xl font-bold tabular-nums tracking-tight md:text-4xl">
        {loading ? (
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-label={loadingLabel} />
        ) : (
          value
        )}
      </div>
      {!loading && sub ? <div className="mt-2 text-sm text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function SeoDataPanel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto max-w-4xl px-4 py-10", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
        {hint ? <p className="text-xs text-muted-foreground sm:text-right sm:max-w-xs">{hint}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SeoDataTable({
  children,
  minWidth,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/50 shadow-sm">
      <table className="w-full text-sm" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function SeoTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border/60 bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

export function SeoTableTh({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3.5 font-medium", className)}>{children}</th>;
}

export function SeoTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function SeoTableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/25">{children}</tr>
  );
}

export function SeoTableTd({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3.5", className)}>
      {children}
    </td>
  );
}

export function SeoTableLoadingRow({ colSpan, label }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-label={label} />
      </td>
    </tr>
  );
}

export function SeoDayPills({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="tablist" aria-label={ariaLabel}>
      {options.map(({ id, label }) => {
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-border/60 bg-card/80 text-foreground hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function SeoContentSection({ children }: { children: ReactNode }) {
  return <section className="mx-auto max-w-4xl px-4 pb-12">{children}</section>;
}

export function SeoFaqSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ q: string; a: string }>;
}) {
  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
      <Accordion type="single" collapsible className="mt-5 rounded-2xl border border-border/60 bg-card/40 px-1 shadow-sm">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border/40 px-3">
            <AccordionTrigger className="text-left hover:no-underline">{item.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export function SeoCtaPanel({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="relative mt-12 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8 shadow-sm">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="relative">
        <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{text}</p>
        <div className="mt-5 flex flex-wrap gap-3">{children}</div>
      </div>
    </div>
  );
}
