import { useEffect, useState } from "react";
import {
  ExternalLink,
  Globe,
  MessageCircle,
  Monitor,
  MousePointerClick,
  Move,
  Eye,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetGa4Analytics,
  adminGetSiteAnalytics,
  type Ga4Report,
  type SiteAnalyticsSummary,
} from "@/services/adminApi";
import { cn } from "@/lib/utils";

const GA4_URL = "https://analytics.google.com/analytics/web/";

function formatTriggerLabel(trigger: string): string {
  const labels: Record<string, string> = {
    scroll: "Scroll",
    page_views: "2+ pages visitées",
    vehicle_page: "Fiche véhicule (12 s)",
    unknown: "Inconnu",
  };
  return labels[trigger] ?? trigger;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} min ${s} s`;
}

function PeriodButtons({
  days,
  onChange,
}: {
  days: 7 | 30;
  onChange: (d: 7 | 30) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant={days === 7 ? "default" : "outline"} size="sm" onClick={() => onChange(7)}>
        7 jours
      </Button>
      <Button type="button" variant={days === 30 ? "default" : "outline"} size="sm" onClick={() => onChange(30)}>
        30 jours
      </Button>
    </div>
  );
}

function WhatsAppPanel({ days }: { days: 7 | 30 }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SiteAnalyticsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await adminGetSiteAnalytics(days);
        if (!cancelled) setSummary(data);
      } catch (e: unknown) {
        if (!cancelled) {
          toast({
            title: "Statistiques indisponibles",
            description: e instanceof Error ? e.message : "Erreur",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days, toast]);

  if (loading && !summary) return <PageLoader />;

  const totals = summary?.totals ?? {
    whatsapp_fab_click: 0,
    whatsapp_bubble_shown: 0,
    whatsapp_fab_drag: 0,
    page_view: 0,
  };
  const maxDailyClicks = Math.max(1, ...(summary?.daily.map((d) => d.clicks) ?? [1]));

  return (
    <div className="space-y-6">
      {!summary?.firstEventAt ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune donnée WhatsApp pour l’instant. Les stats apparaîtront dès les premières interactions.
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">
          Dernière activité : {formatDate(summary.lastEventAt)}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Clics WhatsApp</CardTitle>
            <MousePointerClick className="h-4 w-4 text-[#25D366]" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.whatsapp_fab_click}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Bulles affichées</CardTitle>
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.whatsapp_bubble_shown}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Taux clic / bulle</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {summary?.conversionRate != null ? `${summary.conversionRate} %` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Pastilles déplacées</CardTitle>
            <Move className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{totals.whatsapp_fab_drag}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Déclenchement des bulles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(summary?.bubbleTriggers.length ?? 0) === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Aucune bulle enregistrée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Déclencheur</TableHead>
                    <TableHead className="text-right">Nombre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.bubbleTriggers.map((row) => (
                    <TableRow key={row.trigger}>
                      <TableCell>{formatTriggerLabel(row.trigger)}</TableCell>
                      <TableCell className="text-right font-medium">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top pages — clics WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(summary?.topClickPages.length ?? 0) === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Aucun clic enregistré.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Clics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.topClickPages.map((row) => (
                    <TableRow key={row.pagePath}>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">{row.pagePath}</TableCell>
                      <TableCell className="text-right font-medium">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clics WhatsApp par jour</CardTitle>
          <CardDescription>Pages vues (collecte Rentanoo) : {totals.page_view}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(summary?.daily.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Pas encore de données journalières.</p>
          ) : (
            summary?.daily.map((row) => (
              <div key={row.date} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-muted-foreground tabular-nums">
                  {new Date(row.date + "T12:00:00").toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#25D366]/70"
                    style={{ width: `${Math.max(4, (row.clicks / maxDailyClicks) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium tabular-nums">{row.clicks}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Ga4Panel({ days }: { days: 7 | 30 }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Ga4Report | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await adminGetGa4Analytics(days);
        if (!cancelled) setReport(data);
      } catch (e: unknown) {
        if (!cancelled) {
          toast({
            title: "Google Analytics indisponible",
            description: e instanceof Error ? e.message : "Erreur",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days, toast]);

  if (loading && !report) return <PageLoader />;

  if (!report?.configured) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Google Analytics non connecté</CardTitle>
          <CardDescription>
            Pour afficher les pages les plus consultées, le trafic, les pays et les appareils directement
            ici, configurez l’API GA4 sur Railway.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Google Cloud → créer un compte de service avec accès à{" "}
              <strong>Google Analytics Data API</strong>
            </li>
            <li>
              GA4 → Administration → Gestion des accès à la propriété → ajouter l’e-mail du compte de
              service en <strong>Lecteur</strong>
            </li>
            <li>
              Noter l’<strong>ID de propriété</strong> (numérique, ex. 123456789) — pas le G-WVKC4DHFL3
            </li>
            <li>
              Railway → variables : <code className="text-xs bg-muted px-1 rounded">GA4_PROPERTY_ID</code>{" "}
              et <code className="text-xs bg-muted px-1 rounded">GA4_SERVICE_ACCOUNT_JSON</code> (JSON complet
              sur une ligne)
            </li>
          </ol>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={GA4_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir Google Analytics
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const overview = report.overview!;
  const maxDailyUsers = Math.max(1, ...report.daily.map((d) => d.activeUsers));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Utilisateurs actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overview.activeUsers}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Sessions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overview.sessions}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Pages vues</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{overview.pageViews}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm text-muted-foreground">Durée moy. session</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatDuration(overview.avgSessionDurationSec)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pages les plus consultées</CardTitle>
          <CardDescription>Source : Google Analytics 4</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Vues</TableHead>
                <TableHead className="text-right">Utilisateurs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.topPages.map((row) => (
                <TableRow key={row.pagePath}>
                  <TableCell className="font-mono text-xs">{row.pagePath}</TableCell>
                  <TableCell className="text-right font-medium">{row.pageViews}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.activeUsers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sources de trafic</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source / Medium</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.trafficSources.map((row) => (
                  <TableRow key={`${row.source}-${row.medium}`}>
                    <TableCell>
                      {row.source} / {row.medium}
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pays & appareils</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Top pays</p>
              <ul className="space-y-1 text-sm">
                {report.countries.map((row) => (
                  <li key={row.country} className="flex justify-between">
                    <span>{row.country}</span>
                    <span className="font-medium tabular-nums">{row.activeUsers}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Appareils</p>
              <ul className="space-y-1 text-sm">
                {report.devices.map((row) => (
                  <li key={row.device} className="flex justify-between capitalize">
                    <span>{row.device}</span>
                    <span className="font-medium tabular-nums">{row.activeUsers}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utilisateurs actifs par jour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.daily.map((row) => (
            <div key={row.date} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground tabular-nums">
                {new Date(row.date + "T12:00:00").toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-primary/60")}
                  style={{ width: `${Math.max(4, (row.activeUsers / maxDailyUsers) * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right font-medium tabular-nums">{row.activeUsers}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSiteAnalytics() {
  const [days, setDays] = useState<7 | 30>(30);
  const [tab, setTab] = useState("ga4");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statistiques site</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trafic Google Analytics et engagement widget WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodButtons days={days} onChange={setDays} />
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={GA4_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              GA4 complet
            </a>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ga4">Google Analytics</TabsTrigger>
          <TabsTrigger value="whatsapp">Widget WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="ga4" className="mt-6">
          <Ga4Panel days={days} />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppPanel days={days} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
