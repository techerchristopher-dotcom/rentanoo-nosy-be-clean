import { Calendar, Send, ShieldCheck, MessageCircle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: <Calendar className="h-4 w-4" aria-hidden />,
    title: "Choisissez votre logement",
    detail: "Sélectionnez vos dates et options",
  },
  {
    icon: <Send className="h-4 w-4" aria-hidden />,
    title: "Envoyez votre demande",
    detail: "Aucun engagement à cette étape",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" aria-hidden />,
    title: "Nous vérifions la disponibilité",
    detail: "Notre équipe contacte directement le propriétaire",
  },
  {
    icon: <MessageCircle className="h-4 w-4" aria-hidden />,
    title: "Vous recevez notre réponse",
    detail: "Par email ou WhatsApp, sous 24h",
  },
  {
    icon: <CreditCard className="h-4 w-4" aria-hidden />,
    title: "Réglez votre acompte",
    detail: "50% via Orange Money ou CB, le reste sur place",
  },
];

export function HowItWorksTimeline({ className }: { className?: string }) {
  return (
    <section className={cn("mt-14", className)} aria-label="Comment ça marche ?">
      <h2 className="premium-section-title text-xl font-bold tracking-tight md:text-2xl mb-8">
        Comment ça marche ?
      </h2>

      {/* ── DESKTOP : timeline horizontale ──────────────────────────────── */}
      <div className="hidden sm:block">
        <div className="relative flex items-start justify-between gap-2">
          {/* Ligne de connexion */}
          <div
            className="absolute top-5 left-[calc(10%+1rem)] right-[calc(10%+1rem)] h-px bg-primary-soft"
            aria-hidden
          />

          {STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center flex-1 text-center px-1">
              {/* Cercle numéroté */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-lagoon text-white shadow-lagoon ring-2 ring-background">
                <span className="text-xs font-bold tabular-nums">{i + 1}</span>
              </div>
              {/* Icône */}
              <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                {step.icon}
              </div>
              {/* Texte */}
              <p className="mt-2 text-xs font-semibold text-foreground leading-snug">{step.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MOBILE : timeline verticale ─────────────────────────────────── */}
      <div className="sm:hidden flex flex-col gap-0">
        {STEPS.map((step, i) => (
          <div key={i} className="flex gap-4">
            {/* Colonne gauche : cercle + ligne verticale */}
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-lagoon text-white shadow-lagoon ring-2 ring-background z-10">
                <span className="text-xs font-bold tabular-nums">{i + 1}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-px flex-1 bg-primary-soft my-1" style={{ minHeight: "2rem" }} aria-hidden />
              )}
            </div>
            {/* Colonne droite : icône + texte */}
            <div className="pb-5 pt-1 flex gap-3 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 mt-0.5">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{step.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
