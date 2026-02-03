import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/footer";
import { DictionaryService } from "@/services/supabase/dictionary";

export default function DictionaryEntryPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: entry, isLoading, isError } = useQuery({
    queryKey: ["dictionary", "entry", id],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing entry id");
      }
      return DictionaryService.getEntryById(id);
    },
    enabled: Boolean(id),
  });

  const handleBack = () => navigate("/dictionary");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          ← {t("dictionary.back")}
        </Button>

        {isLoading && (
          <p className="text-sm text-muted-foreground">
            {t("common.loading")}
          </p>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            {t("common.error")}
          </p>
        )}

        {!isLoading && !entry && !isError && (
          <p className="text-sm text-muted-foreground">
            {t("dictionary.noResults")}
          </p>
        )}

        {entry && (
          <Card>
            <CardContent className="py-6 space-y-4">
              <div>
                <h1 className="text-3xl font-bold">{entry.word}</h1>
                {entry.pronunciation && (
                  <p className="text-sm text-muted-foreground mt-1">
                    /{entry.pronunciation}/
                  </p>
                )}
                {entry.part_of_speech && (
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                    {entry.part_of_speech}
                  </p>
                )}
              </div>

              {entry.definitions?.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    {t("dictionary.definitionsTitle")}
                  </h2>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {entry.definitions.map((def, index) => (
                      <li key={index}>
                        <span>{def.text}</span>
                        {def.source && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({def.source})
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {entry.etymology && (
                <section className="space-y-1">
                  <h2 className="text-lg font-semibold">
                    {t("dictionary.etymologyTitle")}
                  </h2>
                  {entry.etymology.origin && (
                    <p className="text-sm">
                      <span className="font-medium">{t("dictionary.originLabel")} </span>
                      {entry.etymology.origin}
                    </p>
                  )}
                  {entry.etymology.derivation && (
                    <p className="text-sm">
                      <span className="font-medium">{t("dictionary.derivationLabel")} </span>
                      {entry.etymology.derivation}
                    </p>
                  )}
                  {entry.etymology.related_words &&
                    entry.etymology.related_words.length > 0 && (
                      <p className="text-sm">
                        <span className="font-medium">{t("dictionary.relatedWordsLabel")} </span>
                        {entry.etymology.related_words.join(", ")}
                      </p>
                    )}
                </section>
              )}

              {entry.sources && entry.sources.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    {t("dictionary.sourcesTitle")}
                  </h2>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {entry.sources.map((source, index) => (
                      <li key={index}>
                        {source.name}
                        {source.page && `, p.${source.page}`}
                        {source.year && ` (${source.year})`}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}


