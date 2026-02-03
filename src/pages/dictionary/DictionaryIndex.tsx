import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/footer";
import { DictionaryService } from "@/services/supabase/dictionary";

export default function DictionaryIndex() {
  const { t, i18n } = useTranslation("common");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const {
    data: entries,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dictionary", "search", i18n.language, query],
    queryFn: () => DictionaryService.searchEntries({ q: query }),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // React Query relance automatiquement la recherche quand queryKey change
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("dictionary.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("common.search")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dictionary.searchPlaceholder")}
          />
          <Button type="submit">
            {t("common.search")}
          </Button>
        </form>

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

        {!isLoading && !isError && (entries?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("dictionary.noResults")}
          </p>
        )}

        <div className="space-y-3">
          {entries?.map((entry) => (
            <Card
              key={entry.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/dictionary/${entry.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    {entry.word}
                  </h2>
                  {entry.part_of_speech && (
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {entry.part_of_speech}
                    </span>
                  )}
                </div>
                {entry.definitions?.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {entry.definitions[0]?.text}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}


