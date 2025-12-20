import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Page de diagnostic i18n - DEV ONLY
 * 
 * Cette page permet d'observer l'état runtime d'i18next :
 * - Les namespaces chargés
 * - Le contenu des bundles
 * - La résolution réelle des clés
 * 
 * ⚠️ Accessible uniquement en développement
 */
export default function I18nDebug() {
  const { t } = useTranslation();
  const lang = i18n.language;

  // État i18n
  const i18nState = useMemo(() => {
    return {
      language: i18n.language,
      defaultNS: i18n.options.defaultNS,
      ns: i18n.options.ns,
      loadedNamespaces: Object.keys(i18n.store.data[lang] || {}),
    };
  }, [lang]);

  // Bundles chargés
  const bundles = useMemo(() => {
    const namespaces = ["translation", "common"];
    const result: Record<string, any> = {};

    for (const ns of namespaces) {
      try {
        const bundle = i18n.getResourceBundle(lang, ns);
        const bundleKeys = bundle ? Object.keys(bundle) : [];
        
        result[ns] = {
          exists: !!bundle,
          size: bundleKeys.length,
          keys: bundleKeys.slice(0, 30), // 30 premières clés
          fullBundle: bundle,
        };
      } catch (error) {
        result[ns] = {
          exists: false,
          error: String(error),
        };
      }
    }

    return result;
  }, [lang]);

  // Vérifications structurelles
  const structureChecks = useMemo(() => {
    const translationBundle = bundles.translation?.fullBundle;
    const commonBundle = bundles.common?.fullBundle;

    const checks: Record<string, any> = {};

    // Vérifications pour searchBar
    checks.searchBar = {
      "translation.searchBar": translationBundle?.searchBar,
      "translation.common?.searchBar": translationBundle?.common?.searchBar,
      "common.searchBar": commonBundle?.searchBar,
      "common.common?.searchBar": commonBundle?.common?.searchBar,
      "translation.searchBar.departure": translationBundle?.searchBar?.departure,
      "common.searchBar.departure": commonBundle?.searchBar?.departure,
    };

    // Vérifications pour duration
    checks.duration = {
      "translation.duration": translationBundle?.duration,
      "translation.common?.duration": translationBundle?.common?.duration,
      "common.duration": commonBundle?.duration,
      "common.common?.duration": commonBundle?.common?.duration,
      "translation.duration.day": translationBundle?.duration?.day,
      "common.duration.day": commonBundle?.duration?.day,
    };

    // Vérifications pour booking
    checks.booking = {
      "translation.booking": translationBundle?.booking,
      "translation.common?.booking": translationBundle?.common?.booking,
      "common.booking": commonBundle?.booking,
      "common.common?.booking": commonBundle?.common?.booking,
    };

    return checks;
  }, [bundles]);

  // Résolution réelle des clés
  const keyResolutions = useMemo(() => {
    return {
      "searchBar.departure": t("searchBar.departure"),
      "searchBar.return": t("searchBar.return"),
      "duration.day (count=4)": t("duration.day", { count: 4 }),
      "duration.hour (count=6)": t("duration.hour", { count: 6 }),
      "duration.day_one (count=1)": t("duration.day_one", { count: 1 }),
      "duration.day_other (count=4)": t("duration.day_other", { count: 4 }),
    };
  }, [t]);

  // Vérifications exists()
  const existsChecks = useMemo(() => {
    return {
      "searchBar.departure": i18n.exists("searchBar.departure"),
      "searchBar.return": i18n.exists("searchBar.return"),
      "duration.day": i18n.exists("duration.day"),
      "duration.day_one": i18n.exists("duration.day_one"),
      "duration.hour": i18n.exists("duration.hour"),
    };
  }, [lang]);

  // Logs console (exécution immédiate) - DEV ONLY
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.group("🔍 I18N DEBUG - État Runtime");
      console.log("=== ÉTAT I18N ===");
      console.log("Language:", i18nState.language);
      console.log("Default NS:", i18nState.defaultNS);
      console.log("NS configurés:", i18nState.ns);
      console.log("Namespaces chargés:", i18nState.loadedNamespaces);
      
      console.log("\n=== BUNDLES ===");
      for (const [ns, data] of Object.entries(bundles)) {
        console.log(`\n[${ns}]`, {
          exists: data.exists,
          size: data.size,
          firstKeys: data.keys,
          error: data.error,
        });
        if (data.fullBundle) {
          console.log(`[${ns}] Full bundle (preview):`, data.fullBundle);
        }
      }
      
      console.log("\n=== VÉRIFICATIONS STRUCTURELLES ===");
      console.log("Structure checks:", structureChecks);
      
      console.log("\n=== RÉSOLUTION RÉELLE ===");
      console.log("Key resolutions:", keyResolutions);
      
      console.log("\n=== EXISTS() CHECKS ===");
      console.log("Exists checks:", existsChecks);
      
      console.groupEnd();
    }
  }, [i18nState, bundles, structureChecks, keyResolutions, existsChecks]);

  // Vérifier que nous sommes en développement
  if (import.meta.env.PROD) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Cette page n'est disponible qu'en mode développement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            🔍 Diagnostic I18n - Runtime
          </h1>
          <p className="text-muted-foreground">
            Observation de l'état d'i18next au runtime (DEV ONLY)
          </p>
        </div>

        {/* État i18n */}
        <Card>
          <CardHeader>
            <CardTitle>1️⃣ État i18n</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="font-semibold">language:</span>{" "}
                <code className="bg-muted px-2 py-1 rounded">
                  {i18nState.language}
                </code>
              </div>
              <div>
                <span className="font-semibold">defaultNS:</span>{" "}
                <code className="bg-muted px-2 py-1 rounded">
                  {String(i18nState.defaultNS)}
                </code>
              </div>
              <div>
                <span className="font-semibold">ns (configurés):</span>{" "}
                <code className="bg-muted px-2 py-1 rounded">
                  {JSON.stringify(i18nState.ns)}
                </code>
              </div>
              <div>
                <span className="font-semibold">loadedNamespaces:</span>{" "}
                <code className="bg-muted px-2 py-1 rounded">
                  {JSON.stringify(i18nState.loadedNamespaces)}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bundles chargés */}
        <Card>
          <CardHeader>
            <CardTitle>2️⃣ Bundles chargés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(bundles).map(([ns, data]) => (
                <div key={ns} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">
                    Namespace: <code>{ns}</code>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">Existe:</span>{" "}
                      <code className="bg-muted px-2 py-1 rounded">
                        {String(data.exists)}
                      </code>
                    </div>
                    {data.size !== undefined && (
                      <div>
                        <span className="font-semibold">Taille:</span>{" "}
                        <code className="bg-muted px-2 py-1 rounded">
                          {data.size} clés
                        </code>
                      </div>
                    )}
                    {data.keys && data.keys.length > 0 && (
                      <div>
                        <span className="font-semibold">30 premières clés:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {data.keys.map((key) => (
                            <code
                              key={key}
                              className="bg-muted px-2 py-1 rounded text-xs"
                            >
                              {key}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.error && (
                      <div className="text-destructive">
                        <span className="font-semibold">Erreur:</span>{" "}
                        {data.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vérifications structurelles */}
        <Card>
          <CardHeader>
            <CardTitle>3️⃣ Vérifications structurelles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(structureChecks).map(([key, checks]) => (
                <div key={key} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Clé: {key}</h3>
                  <div className="space-y-1 text-sm font-mono">
                    {Object.entries(checks).map(([path, value]) => (
                      <div key={path} className="flex items-start gap-2">
                        <code className="bg-muted px-2 py-1 rounded flex-1 min-w-0">
                          {path}
                        </code>
                        <code className="bg-muted px-2 py-1 rounded">
                          {value === undefined
                            ? "undefined"
                            : value === null
                            ? "null"
                            : typeof value === "object"
                            ? JSON.stringify(value).slice(0, 100) + "..."
                            : String(value)}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Résolution réelle */}
        <Card>
          <CardHeader>
            <CardTitle>4️⃣ Résolution réelle des clés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono">
              {Object.entries(keyResolutions).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <code className="bg-muted px-2 py-1 rounded w-64">
                    {key}
                  </code>
                  <span className="font-semibold">→</span>
                  <code
                    className={`px-2 py-1 rounded ${
                      value === key ? "bg-destructive text-destructive-foreground" : "bg-green-500/20 text-green-700 dark:text-green-400"
                    }`}
                  >
                    {value}
                  </code>
                  {value === key && (
                    <span className="text-destructive text-xs">
                      ⚠️ Clé brute (non traduite)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vérifications exists() */}
        <Card>
          <CardHeader>
            <CardTitle>5️⃣ Vérifications exists()</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono">
              {Object.entries(existsChecks).map(([key, exists]) => (
                <div key={key} className="flex items-center gap-4">
                  <code className="bg-muted px-2 py-1 rounded w-48">
                    {key}
                  </code>
                  <span className="font-semibold">→</span>
                  <code
                    className={`px-2 py-1 rounded ${
                      exists
                        ? "bg-green-500/20 text-green-700 dark:text-green-400"
                        : "bg-destructive text-destructive-foreground"
                    }`}
                  >
                    {String(exists)}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-amber-500 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400">
              📋 Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Vérifiez la console du navigateur pour les logs détaillés.
              <br />
              Les clés affichées en rouge indiquent un problème de résolution.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

