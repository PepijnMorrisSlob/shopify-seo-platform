/**
 * Agency Review Queue
 *
 * Unified queue of content pending review across all client stores.
 * Agency team members select items and bulk approve (optionally publishing
 * immediately) or bulk reject (optionally regenerating).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, PrimaryButton, SecondaryButton } from '@/components/layout';
import {
  Card,
  CardContent,
  Badge,
  Skeleton,
} from '@/components/ui';
import {
  Check,
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface ReviewItem {
  id: string;
  organizationId: string;
  storeName: string;
  shopifyDomain: string;
  question: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string | null;
  seoScore: number;
  featuredImageUrl: string | null;
  status: string;
  createdAt: string;
  type: 'qa_page';
}

export function AgencyReviewQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgFilter = searchParams.get('organizationId') || undefined;

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    loadQueue();
  }, [orgFilter]);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_BASE}/agency/review-queue`);
      url.searchParams.set('status', 'pending_review');
      url.searchParams.set('limit', '100');
      if (orgFilter) url.searchParams.set('organizationId', orgFilter);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(json.items);
      setTotal(json.total);
      setSelected(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  async function bulkApprove(publish: boolean) {
    if (selected.size === 0) return;
    setWorking(true);
    try {
      const res = await fetch(`${API_BASE}/agency/review-queue/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), publish }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      alert(
        `Approved: ${result.approved}\n` +
          (publish ? `Published: ${result.published}\n` : '') +
          (result.failed.length ? `Failed: ${result.failed.length}` : ''),
      );
      await loadQueue();
    } catch (err: any) {
      alert(`Bulk approve failed: ${err.message}`);
    } finally {
      setWorking(false);
    }
  }

  async function bulkReject(regenerate: boolean) {
    if (selected.size === 0) return;
    const reason = prompt(
      regenerate
        ? 'Reason for regeneration (will be sent to AI as feedback):'
        : 'Reason for rejection:',
    );
    if (reason === null) return;

    setWorking(true);
    try {
      const res = await fetch(`${API_BASE}/agency/review-queue/bulk-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selected),
          reason,
          regenerate,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      alert(
        `Rejected: ${result.rejected}\n` +
          (regenerate ? `Regenerating: ${result.regenerating}\n` : '') +
          (result.failed.length ? `Failed: ${result.failed.length}` : ''),
      );
      await loadQueue();
    } catch (err: any) {
      alert(`Bulk reject failed: ${err.message}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Queue"
        subtitle={
          orgFilter
            ? `Filtered to one store • ${total} pending`
            : `All clients • ${total} pending`
        }
        actions={
          orgFilter ? (
            <SecondaryButton onClick={() => navigate('/agency/review-queue')}>
              Clear filter
            </SecondaryButton>
          ) : (
            <SecondaryButton onClick={() => navigate('/agency')}>
              Back to dashboard
            </SecondaryButton>
          )
        }
      />

      {/* Error state */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <div className="font-medium text-red-900">
                Failed to load queue
              </div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
            <SecondaryButton onClick={loadQueue}>Retry</SecondaryButton>
          </CardContent>
        </Card>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Card className="bg-zinc-50 border-zinc-300 sticky top-4 z-10">
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">
              {selected.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={() => bulkApprove(true)}
              disabled={working}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Approve & publish
            </button>
            <button
              onClick={() => bulkApprove(false)}
              disabled={working}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Approve only
            </button>
            <button
              onClick={() => bulkReject(true)}
              disabled={working}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
            <button
              onClick={() => bulkReject(false)}
              disabled={working}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </CardContent>
        </Card>
      )}

      {/* Queue */}
      <Card className="bg-white border-zinc-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <Check className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
              <div className="font-medium text-zinc-700">
                No content awaiting review
              </div>
              <div className="text-sm mt-1">
                Generated content scoring 70-84 lands here for team approval.
              </div>
            </div>
          ) : (
            <div>
              <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    items.length > 0 && selected.size === items.length
                  }
                  onChange={toggleAll}
                  className="w-4 h-4"
                />
                <span className="text-xs text-zinc-600 font-medium">
                  Select all ({items.length})
                </span>
              </div>
              <div className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 flex gap-3 ${selected.has(item.id) ? 'bg-blue-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                      className="w-4 h-4 mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs">
                          {item.storeName}
                        </Badge>
                        {item.targetKeyword && (
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-600 border-blue-200 bg-blue-50"
                          >
                            {item.targetKeyword}
                          </Badge>
                        )}
                        <span
                          className={`text-xs font-mono ${
                            item.seoScore >= 80
                              ? 'text-emerald-600'
                              : item.seoScore >= 60
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          SEO {item.seoScore}
                        </span>
                      </div>
                      <div className="font-medium text-zinc-900 truncate">
                        {item.metaTitle}
                      </div>
                      <div className="text-sm text-zinc-600 mt-1 line-clamp-2">
                        {item.metaDescription}
                      </div>
                      <div className="text-xs text-zinc-400 mt-2">
                        Question: {item.question}
                      </div>
                    </div>
                    {item.featuredImageUrl && (
                      <img
                        src={item.featuredImageUrl}
                        alt=""
                        className="w-20 h-20 object-cover rounded border border-zinc-200"
                      />
                    )}
                    <a
                      href={`/content/review/${item.id}`}
                      className="self-center p-1.5 text-zinc-500 hover:text-zinc-900"
                      title="Open detail view"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
