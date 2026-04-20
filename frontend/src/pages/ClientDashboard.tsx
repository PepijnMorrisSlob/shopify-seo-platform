/**
 * Client Dashboard
 *
 * Read-only view for client users (CLIENT_VIEWER role). Shows SEO performance
 * metrics, published content, keyword rankings — sourced from real GSC data
 * synced daily. Clients can download monthly PDF reports from this page.
 */

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
} from '@/components/ui';
import { PageHeader, SecondaryButton, PrimaryButton } from '@/components/layout';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  Target,
  FileText,
  Download,
  AlertCircle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

interface ReportMetrics {
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgPosition: number;
  monthlyTraffic: number;
  publishedThisMonth: number;
  totalPublished: number;
  avgSeoScore: number;
  topKeywords: Array<{ keyword: string; position: number; clicks: number }>;
  topPages: Array<{ title: string; url: string | null; traffic: number; seoScore: number }>;
  newContent: Array<{ title: string; publishedAt: string; seoScore: number }>;
  positionChanges: Array<{ keyword: string; from: number; to: number; delta: number }>;
}

interface PreviewResponse {
  organizationId: string;
  month: string;
  metrics: ReportMetrics;
}

export function ClientDashboard() {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    void fetchMetrics();
  }, []);

  async function fetchMetrics() {
    setLoading(true);
    setError(null);
    try {
      // In production the orgId comes from the authenticated session. For now
      // pick the first active org.
      const orgRes = await fetch(`${API_BASE}/agency/overview`);
      if (!orgRes.ok) throw new Error(`HTTP ${orgRes.status}`);
      const orgData = await orgRes.json();
      const firstClient = orgData.clients?.[0];
      if (!firstClient) {
        setError('No client organizations found. Install the Shopify app first.');
        setLoading(false);
        return;
      }
      setOrganizationId(firstClient.organizationId);

      const res = await fetch(
        `${API_BASE}/reports/monthly/preview?organizationId=${firstClient.organizationId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadReport() {
    if (!organizationId) return;
    window.open(
      `${API_BASE}/reports/monthly?organizationId=${organizationId}`,
      '_blank',
    );
  }

  const m = data?.metrics;

  const stats = m
    ? [
        {
          label: 'Impressions',
          value: m.totalImpressions.toLocaleString(),
          icon: Eye,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
        },
        {
          label: 'Clicks',
          value: m.totalClicks.toLocaleString(),
          icon: MousePointerClick,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        },
        {
          label: 'Avg position',
          value: m.avgPosition > 0 ? m.avgPosition.toFixed(1) : '—',
          icon: Target,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        },
        {
          label: 'Pages published',
          value: m.totalPublished.toString(),
          subtitle: `+${m.publishedThisMonth} this month`,
          icon: FileText,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Dashboard"
        subtitle={data ? `Performance for ${data.month}` : undefined}
        actions={
          <PrimaryButton
            onClick={handleDownloadReport}
            disabled={!organizationId || loading}
            icon={Download}
          >
            Download monthly PDF
          </PrimaryButton>
        }
      />

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <div className="font-medium text-red-900">Error loading dashboard</div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
            <SecondaryButton onClick={fetchMetrics}>Retry</SecondaryButton>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          : stats.map((stat) => (
              <Card key={stat.label} className="bg-white border-zinc-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${stat.bg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-500">{stat.label}</div>
                      <div className="text-2xl font-bold text-zinc-900 truncate">
                        {stat.value}
                      </div>
                      {(stat as any).subtitle && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {(stat as any).subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top pages */}
        <Card className="bg-white border-zinc-200">
          <CardHeader>
            <CardTitle>Top performing pages</CardTitle>
            <CardDescription>By traffic this month</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : m && m.topPages.length > 0 ? (
              <ul className="divide-y divide-zinc-100">
                {m.topPages.map((p, i) => (
                  <li key={i} className="py-3 flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-400 w-5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 truncate">
                        {p.title}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-2">
                        <span>{p.traffic.toLocaleString()} visits</span>
                        <span>•</span>
                        <span>SEO {p.seoScore}</span>
                      </div>
                    </div>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 py-2">
                No page traffic yet this month.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top keywords */}
        <Card className="bg-white border-zinc-200">
          <CardHeader>
            <CardTitle>Top keywords</CardTitle>
            <CardDescription>Driving the most clicks</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : m && m.topKeywords.length > 0 ? (
              <ul className="divide-y divide-zinc-100">
                {m.topKeywords.map((k, i) => (
                  <li
                    key={i}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 truncate">
                        {k.keyword}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {k.clicks.toLocaleString()} clicks
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        k.position <= 3
                          ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                          : k.position <= 10
                            ? 'text-blue-600 border-blue-200 bg-blue-50'
                            : 'text-zinc-600 border-zinc-200 bg-zinc-50'
                      }
                    >
                      #{k.position}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 py-2">
                No keyword data yet. Connect Google Search Console to populate.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Position changes */}
      <Card className="bg-white border-zinc-200">
        <CardHeader>
          <CardTitle>Ranking movements</CardTitle>
          <CardDescription>
            Biggest keyword position changes since last sync
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : m && m.positionChanges.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {m.positionChanges.map((c, i) => (
                <li
                  key={i}
                  className="py-2 flex items-center justify-between gap-3"
                >
                  <span className="font-medium text-zinc-900 flex-1 min-w-0 truncate">
                    {c.keyword}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {c.from} → {c.to}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-sm font-medium ${c.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {c.delta > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {Math.abs(c.delta)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 py-2">
              No ranking movements tracked yet. Changes appear after 2+ GSC
              sync cycles.
            </p>
          )}
        </CardContent>
      </Card>

      {/* New content */}
      <Card className="bg-white border-zinc-200">
        <CardHeader>
          <CardTitle>Content published this month</CardTitle>
          <CardDescription>
            {m?.publishedThisMonth || 0} posts published •{' '}
            {m?.totalPublished || 0} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : m && m.newContent.length > 0 ? (
            <ul className="divide-y divide-zinc-100">
              {m.newContent.map((item, i) => (
                <li key={i} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      item.seoScore >= 80
                        ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                        : item.seoScore >= 60
                          ? 'text-amber-600 border-amber-200 bg-amber-50'
                          : 'text-red-600 border-red-200 bg-red-50'
                    }
                  >
                    SEO {item.seoScore}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 py-2">
              No new content published this month.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
