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

const heroAccents: Record<SeoHeroTheme, string> = {
  weather: "from-sky-400/20 via-transparent to-amber-300/10",
  flights: "from-white/10 via-transparent to-sky-300/10",
  exchange: "from-emerald-400/15 via-transparent to-amber-300/10",
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
    <section className="relative overflow-hidden bg-gradient-lagoon text-white">
      <div className="absolute inset-0 premium-mesh" aria-hidden />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-60",
          heroAccents[theme]
        )}
        aria-hidden
      />
      <div
        className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl premium-float-slow"
        aria-hidden
      />
      <div
        className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
        style={{ animationDelay: "2s" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-4 py-14 md:py-20">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-amber-200/80 to-transparent" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-100/90">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl md:leading-[1.1] lg:text-[3.25rem]">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-white/80">{intro}</p>
        {children}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />
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
  variant = "dark",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
  variant?: "dark" | "light";
}) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "premium-card-shine premium-accent-top relative rounded-2xl p-5 md:p-6",
        "transition-all duration-300 hover:-translate-y-0.5",
        isDark
          ? "premium-glass-dark premium-accent-top-dark hover:shadow-[0_8px_32px_-8px_hsl(200_20%_10%/0.4)]"
          : "premium-glass-light premium-accent-top hover:shadow-lagoon",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.2em]",
            isDark ? "text-white/55" : "text-muted-foreground"
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              isDark ? "bg-white/10 ring-1 ring-white/15" : "bg-primary/10 ring-1 ring-primary/15"
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-4 flex min-h-[2.5rem] items-center text-3xl font-bold tabular-nums tracking-tight md:text-[2.5rem] md:leading-none",
          isDark ? "text-white" : "text-foreground"
        )}
      >
        {loading ? (
          <Loader2
            className={cn("h-7 w-7 animate-spin", isDark ? "text-white/70" : "text-muted-foreground")}
            aria-label={loadingLabel}
          />
        ) : (
          value
        )}
      </div>
      {!loading && sub ? (
        <div className={cn("mt-2.5 text-sm leading-snug", isDark ? "text-white/70" : "text-muted-foreground")}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function SeoForecastDayCard({
  dateLabel,
  icon,
  temps,
  condition,
  highlight,
}: {
  dateLabel: string;
  icon: ReactNode;
  temps: string;
  condition: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "premium-card-shine premium-accent-top relative flex flex-col items-center rounded-2xl p-4 text-center",
        "premium-glass-light transition-all duration-300 hover:-translate-y-1 hover:shadow-lagoon",
        highlight && "ring-2 ring-primary/30 shadow-lagoon"
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground capitalize">
        {dateLabel}
      </p>
      <div className="my-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
        {icon}
      </div>
      <p className="text-base font-bold tabular-nums tracking-tight">{temps}</p>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground line-clamp-2">{condition}</p>
    </div>
  );
}

export function SeoForecastSkeleton() {
  return (
    <div
      className="flex h-[9.5rem] animate-pulse flex-col items-center justify-center rounded-2xl border border-border/40 bg-muted/20"
      aria-hidden
    />
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
    <section className={cn("mx-auto max-w-4xl px-4 py-12 md:py-14", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <h2 className="premium-section-title text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        </div>
        {hint ? (
          <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-xs sm:text-right">{hint}</p>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
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
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={minWidth ? { minWidth } : undefined}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function SeoTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border/50 bg-gradient-to-r from-muted/50 to-muted/30 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

export function SeoTableTh({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-5 py-4 font-semibold", className)}>{children}</th>;
}

export function SeoTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border/40">{children}</tbody>;
}

export function SeoTableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="transition-colors hover:bg-primary/[0.03]">{children}</tr>
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
    <td colSpan={colSpan} className={cn("px-5 py-4", className)}>
      {children}
    </td>
  );
}

export function SeoTableLoadingRow({ colSpan, label }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary/60" aria-label={label} />
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
    <div
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
      role="tablist"
      aria-label={ariaLabel}
    >
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
              "shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300",
              selected
                ? "bg-gradient-lagoon text-white shadow-lagoon scale-[1.02]"
                : "border border-border/60 bg-card/90 text-foreground hover:border-primary/40 hover:bg-muted/40"
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
  return <section className="mx-auto max-w-4xl px-4 pb-16">{children}</section>;
}

export function SeoFaqSection({
  title,
  items,
}: {
  title: string;
  items: Array<{ q: string; a: string }>;
}) {
  return (
    <div className="mt-14">
      <h2 className="premium-section-title text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
      <Accordion
        type="single"
        collapsible
        className="mt-6 overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]"
      >
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border/40 px-4">
            <AccordionTrigger className="py-4 text-left font-medium hover:no-underline hover:text-primary">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
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
    <div className="premium-cta-panel relative mt-14 overflow-hidden rounded-2xl p-7 md:p-10 text-white">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl" aria-hidden />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Rentanoo</p>
        <h2 className="mt-2 text-xl font-bold md:text-2xl">{title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">{text}</p>
        <div className="mt-6 flex flex-wrap gap-3 [&_a]:shadow-md">{children}</div>
      </div>
    </div>
  );
}

export function SeoDisclaimerAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mt-8 rounded-2xl border border-amber-200/30 bg-amber-50/10 p-5 backdrop-blur-md",
        "ring-1 ring-amber-100/20 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SeoSectionIconTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-3 text-xl font-bold tracking-tight md:text-2xl">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-sm">
        {icon}
      </span>
      {title}
    </h2>
  );
}
