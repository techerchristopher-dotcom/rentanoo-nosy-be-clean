import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getOptimizedImageUrl,
  generateSrcSet,
} from "@/utils/imageOptimization";
import { Seo } from "@/components/seo/Seo";

const SUPABASE_BASE =
  "https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/sinistre-caution-page";

function IllustrationPlaceholder({
  title,
  ratio = "16/9",
  comingSoon,
}: {
  title: string;
  ratio?: "16/9" | "4/3" | "1/1";
  comingSoon: string;
}) {
  const ratioClass =
    ratio === "16/9"
      ? "aspect-[16/9]"
      : ratio === "4/3"
        ? "aspect-[4/3]"
        : "aspect-square";

  return (
    <div className={`w-full ${ratioClass} overflow-hidden rounded-2xl border bg-muted/30`}>
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground/80">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{comingSoon}</div>
        </div>
      </div>
    </div>
  );
}

export default function SinistreCaution() {
  const { t } = useTranslation();
  const sinistreMailSubject = t("sinistreCaution.mailSubject");
  const supportEmail = "support@rentanoo.com";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={t("seo.sinistreCaution.title")}
        description={t("seo.sinistreCaution.description")}
        canonical="https://rentanoo.com/sinistre-caution"
        noIndex
      />
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Fond "lagoon / soft" (safe, sans dépendre d'une classe custom) */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/40 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{t("sinistreCaution.hero.subtitle")}</p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                {t("sinistreCaution.hero.title")}
              </h1>

              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {t("sinistreCaution.hero.description")}
              </p>

              <Card className="mt-6 p-5">
                <ul className="space-y-2 text-sm leading-6">
                  <li>💳 <b>{t("sinistreCaution.hero.bullet1")}</b></li>
                  <li>🔒 <b>{t("sinistreCaution.hero.bullet2")}</b></li>
                  <li>💡 {t("sinistreCaution.hero.bullet3")}</li>
                  <li>❗ <b>{t("sinistreCaution.hero.bullet4")}</b></li>
                </ul>
              </Card>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="w-full sm:w-auto">
                  <a href="#process">{t("sinistreCaution.hero.ctaProcess")}</a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="#contact">{t("sinistreCaution.hero.ctaContact")}</a>
                </Button>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                {t("sinistreCaution.hero.tip")}
              </p>
            </div>

            <div className="w-full max-w-xl aspect-[16/9] overflow-hidden rounded-2xl">
              <img
                src={getOptimizedImageUrl(`${SUPABASE_BASE}/couple-serein.webp`, 640, 360)}
                srcSet={generateSrcSet(`${SUPABASE_BASE}/couple-serein.webp`, [400, 640, 960])}
                sizes="(max-width: 640px) 100vw, 576px"
                alt="Location Rentanoo — gestion sereine d'un sinistre"
                className="h-full w-full object-cover"
                fetchPriority="high"
                decoding="async"
                width={640}
                height={360}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("sinistreCaution.process.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("sinistreCaution.process.subtitle")}</p>

            <div className="mt-6 grid gap-4">
              <Card className="p-5">
                <p className="font-semibold">{t("sinistreCaution.process.step1Title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("sinistreCaution.process.step1Desc")}</p>
              </Card>

              <Card className="p-5">
                <p className="font-semibold">{t("sinistreCaution.process.step2Title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("sinistreCaution.process.step2Desc")}</p>
              </Card>

              <Card className="p-5">
                <p className="font-semibold">{t("sinistreCaution.process.step3Title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("sinistreCaution.process.step3Desc")}</p>
              </Card>
            </div>
          </div>

          <div className="w-full max-w-xl mx-auto">
            <img
              src={getOptimizedImageUrl(`${SUPABASE_BASE}/timeline.webp`, 640)}
              srcSet={generateSrcSet(`${SUPABASE_BASE}/timeline.webp`, [400, 640])}
              sizes="(max-width: 640px) 100vw, 576px"
              alt="Étapes de gestion d'un sinistre Rentanoo"
              className="w-full h-auto rounded-2xl"
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
            />
          </div>
        </div>
      </section>

      {/* CAUTION */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1 w-full max-w-xl mx-auto">
            <img
              src={getOptimizedImageUrl(`${SUPABASE_BASE}/justificatif.webp`, 640)}
              srcSet={generateSrcSet(`${SUPABASE_BASE}/justificatif.webp`, [400, 640])}
              sizes="(max-width: 640px) 100vw, 576px"
              alt="La caution sert uniquement à couvrir les frais réellement justifiés"
              className="w-full h-auto rounded-2xl"
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
            />
          </div>

          <div className="order-1 md:order-2">
            <h2 className="text-2xl font-bold tracking-tight">{t("sinistreCaution.caution.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("sinistreCaution.caution.subtitle")}</p>

            <Card className="mt-6 p-5">
              <ul className="space-y-2 text-sm leading-6">
                <li>✅ {t("sinistreCaution.caution.bullet1")}</li>
                <li>✅ {t("sinistreCaution.caution.bullet2")}</li>
                <li>✅ {t("sinistreCaution.caution.bullet3")}</li>
              </ul>
            </Card>

            <p className="mt-3 text-xs text-muted-foreground">{t("sinistreCaution.caution.note")}</p>
          </div>
        </div>
      </section>

      {/* ASSURANCE */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("sinistreCaution.assurance.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("sinistreCaution.assurance.subtitle")}</p>

            <Card className="mt-6 p-5">
              <p className="text-sm leading-6">👉 {t("sinistreCaution.assurance.card")}</p>
            </Card>

            <p className="mt-3 text-xs text-muted-foreground">{t("sinistreCaution.assurance.note")}</p>
          </div>

          <div className="w-full flex justify-center">
            <img
              src={getOptimizedImageUrl(`${SUPABASE_BASE}/assurance.webp`, 520)}
              srcSet={generateSrcSet(`${SUPABASE_BASE}/assurance.webp`, [400, 520])}
              sizes="(max-width: 640px) 100vw, 520px"
              alt="Protection par assurance carte bancaire Rentanoo"
              className="w-full max-w-[520px] rounded-xl mx-auto shadow-sm"
              loading="lazy"
              decoding="async"
              width={520}
              height={340}
            />
          </div>
        </div>
      </section>

      {/* DOCS */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1 w-full max-w-xl mx-auto">
            <img
              src={getOptimizedImageUrl(`${SUPABASE_BASE}/devis-facture.webp`, 640)}
              srcSet={generateSrcSet(`${SUPABASE_BASE}/devis-facture.webp`, [400, 640])}
              sizes="(max-width: 640px) 100vw, 576px"
              alt="Documents de réparation – devis et facture mis à disposition par Rentanoo"
              className="w-full h-auto rounded-2xl"
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
            />
          </div>

          <div className="order-1 md:order-2">
            <h2 className="text-2xl font-bold tracking-tight">{t("sinistreCaution.documents.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("sinistreCaution.documents.subtitle")}</p>

            <Card className="mt-6 p-5">
              <ul className="space-y-2 text-sm leading-6">
                <li>📄 {t("sinistreCaution.documents.bullet1")}</li>
                <li>📸 {t("sinistreCaution.documents.bullet2")}</li>
                <li>🧾 {t("sinistreCaution.documents.bullet3")}</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA RAPPEL DES POINTS CLÉS */}
      <section id="rappel" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-3 md:items-center">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight">{t("sinistreCaution.cta.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("sinistreCaution.cta.subtitle")}</p>

            <Card className="mt-6 p-5">
              <ul className="space-y-2 text-sm leading-6">
                <li>💳 {t("sinistreCaution.cta.bullet1")}</li>
                <li>🔒 {t("sinistreCaution.cta.bullet2")}</li>
                <li>✅ {t("sinistreCaution.cta.bullet3")}</li>
                <li>🧾 {t("sinistreCaution.cta.bullet4")}</li>
                <li>⏱️ {t("sinistreCaution.cta.bullet5")}</li>
              </ul>
            </Card>

            <div className="mt-6">
              <Button asChild>
                <Link to="/contact">{t("sinistreCaution.cta.button")}</Link>
              </Button>
            </div>
          </div>

          <div className="md:col-span-1">
            <img
              src={getOptimizedImageUrl(`${SUPABASE_BASE}/relax.webp`, 400)}
              srcSet={generateSrcSet(`${SUPABASE_BASE}/relax.webp`, [300, 400])}
              sizes="(max-width: 768px) 100vw, 33vw"
              alt="Client rassuré au téléphone avec le service Rentanoo"
              className="w-full h-auto rounded-2xl shadow-sm border border-slate-200/60 object-cover"
              loading="lazy"
              decoding="async"
              width={400}
              height={300}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <p className="text-muted-foreground">{t("sinistreCaution.faq.intro")}</p>

        <Accordion type="single" collapsible className="mt-6 w-full">
          <AccordionItem value="faq-1">
            <AccordionTrigger>{t("sinistreCaution.faq.q1")}</AccordionTrigger>
            <AccordionContent>{t("sinistreCaution.faq.a1")}</AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-2">
            <AccordionTrigger>{t("sinistreCaution.faq.q2")}</AccordionTrigger>
            <AccordionContent>{t("sinistreCaution.faq.a2")}</AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-3">
            <AccordionTrigger>{t("sinistreCaution.faq.q3")}</AccordionTrigger>
            <AccordionContent>{t("sinistreCaution.faq.a3")}</AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-4">
            <AccordionTrigger>{t("sinistreCaution.faq.q4")}</AccordionTrigger>
            <AccordionContent>{t("sinistreCaution.faq.a4")}</AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-5">
            <AccordionTrigger>{t("sinistreCaution.faq.q5")}</AccordionTrigger>
            <AccordionContent>{t("sinistreCaution.faq.a5")}</AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-6">
            <AccordionTrigger>{t("sinistreCaution.faq.q6")}</AccordionTrigger>
            <AccordionContent>{t("sinistreCaution.faq.a6")}</AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-7">
            <AccordionTrigger>{t("sinistreCaution.faq.q7")}</AccordionTrigger>
            <AccordionContent>{t("sinistreCaution.faq.a7")}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* CONTACT */}
      <section id="contact" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-10 md:py-14">
        <Card className="p-6 md:p-8">
          <h2 className="text-xl font-bold">{t("sinistreCaution.contact.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("sinistreCaution.contact.description")}</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(sinistreMailSubject)}`}>
                {t("sinistreCaution.contact.emailCta")}
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/">{t("sinistreCaution.contact.homeCta")}</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{t("sinistreCaution.contact.tip")}</p>
        </Card>
      </section>

      <div className="flex-1 h-10" />
      <Footer />
    </div>
  );
}
