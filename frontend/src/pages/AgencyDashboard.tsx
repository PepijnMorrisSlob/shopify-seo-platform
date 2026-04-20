/**
 * Agency Dashboard
 *
 * Portfolio view for agency team members managing multiple client Shopify
 * stores. Shows a summary row per client with pending review count, traffic,
 * avg SEO score. Click through to a client's review queue or run the full
 * pipeline.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, PrimaryButton, SecondaryButton } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
} from '@/components/ui';
import {
  Building2,
  Users,
  CheckSquare,
  TrendingUp,
  Play,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface ClientSummary {
  organizationId: string;
  shopifyDomain: string;
  storeName: string;
  planTier: string;
  billingStatus: string;
  productCount: number;
  publishedPages: number;
  pendingReview: number;
  draftCount: number;
  monthlyTraffic: number;
  avgSeoScore: number;
  lastSyncAt: string | null;
  installedAt: string;
  gscConnected: boolean;
}

interface OverviewResponse {
  clients: ClientSummary[];
  totalClients: number;
  totalPendingReview: number;
  totalPublishedContent: number;
  totalDrafts: number;
  totalMonthlyTraffic: number;
}

export function AgencyDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/agency/overview`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: OverviewResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load agency overview');
    } finally {
      setLoading(false);
    }
  }

  async function runPipeline(organizationId: string) {
    setRunningPipeline(organizationId);
    try {
      const res = await fetch(`${API_BASE}/agency/run-pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, options: { maxQuestions: 10 } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      alert(
        `Pipeline launched for ${organizationId}\n` +
          `Questions queued: ${result.steps.generate.queuedJobs}\n` +
          `Estimated completion: ${result.estimatedCompletionMinutes} min\n\n` +
          `Content will appear in the Review Queue when ready.`,
      );
      loadOverview();
    } catch (err: any) {
      alert(`Pipeline failed: ${err.message}`);
    } finally {
      setRunningPipeline(null);
    }
  }

  const totalStats = data
    ? [
        {
          icon: Users,
          label: 'Client stores',
          value: data.totalClients,
        },
        {
          icon: CheckSquare,
          label: 'Pending review',
          value: data.totalPendingReview,
          highlight: data.totalPendingReview > 0,
        },
        {
          icon: Building2,
          label: 'Published content',
          value: data.totalPublishedContent,
        },
        {
          icon: TrendingUp,
          label: 'Monthly traffic',
          value: data.totalMonthlyTraffic.toLocaleString(),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agency Dashboard"
        subtitle="All client stores in one view"
        actions={
          <PrimaryButton onClick={() => navigate('/agency/review-queue')}>
            Open Review Queue
            {data && data.totalPendingReview > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                {data.totalPendingReview}
              </Badge>
            )}
          </PrimaryButton>
        }
      />

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {totalStats.map((stat) => (
          <Card key={stat.label} className="bg-white border-zinc-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded">
                  <stat.icon className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500">{stat.label}</div>
                  <div
                    className={`text-2xl font-bold ${stat.highlight ? 'text-amber-600' : 'text-zinc-900'}`}
                  >
                    {stat.value}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <div className="font-medium text-red-900">
                Failed to load overview
              </div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
            <SecondaryButton onClick={loadOverview} className="ml-auto">
              Retry
            </SecondaryButton>
          </CardContent>
        </Card>
      )}

      {/* Clients table */}
      <Card className="bg-white border-zinc-200">
        <CardHeader>
          <CardTitle>Client stores</CardTitle>
          <CardDescription>
            {data
              ? `${data.totalClients} store${data.totalClients === 1 ? '' : 's'} connected`
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data || data.clients.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              No client stores yet. Install the Shopify app on a store to see it here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-200">
                    <th className="py-2 pr-4 font-medium">Store</th>
                    <th className="py-2 pr-4 font-medium">Plan</th>
                    <th className="py-2 pr-4 font-medium">Products</th>
                    <th className="py-2 pr-4 font-medium">Published</th>
                    <th className="py-2 pr-4 font-medium">Pending</th>
                    <th className="py-2 pr-4 font-medium">Avg SEO</th>
                    <th className="py-2 pr-4 font-medium">GSC</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clients.map((client) => (
                    <tr
                      key={client.organizationId}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium text-zinc-900">
                          {client.storeName}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {client.shopifyDomain}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            client.billingStatus === 'ACTIVE'
                              ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                              : 'text-zinc-600 border-zinc-200'
                          }
                        >
                          {client.planTier}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{client.productCount}</td>
                      <td className="py-3 pr-4">{client.publishedPages}</td>
                      <td className="py-3 pr-4">
                        {client.pendingReview > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-200 bg-amber-50"
                          >
                            {client.pendingReview}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {client.avgSeoScore > 0 ? (
                          <span
                            className={
                              client.avgSeoScore >= 80
                                ? 'text-emerald-600'
                                : client.avgSeoScore >= 60
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                            }
                          >
                            {client.avgSeoScore}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {client.gscConnected ? (
                          <Badge
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 bg-emerald-50"
                          >
                            Connected
                          </Badge>
                        ) : (
                          <span className="text-zinc-400 text-xs">Not connected</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => runPipeline(client.organizationId)}
                            disabled={runningPipeline === client.organizationId}
                            className="p-1.5 text-xs rounded bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 flex items-center gap-1"
                            title="Run pipeline"
                          >
                            <Play className="w-3 h-3" />
                            {runningPipeline === client.organizationId
                              ? 'Running…'
                              : 'Pipeline'}
                          </button>
                          <button
                            onClick={() =>
                              navigate(
                                `/agency/review-queue?organizationId=${client.organizationId}`,
                              )
                            }
                            className="p-1.5 text-xs rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex items-center gap-1"
                            title="View review queue"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Queue
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
