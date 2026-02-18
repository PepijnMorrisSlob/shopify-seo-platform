// Content Queue Page - Track Q&A content generation progress
// Uses shadcn/ui components (NO Polaris)
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Layout components
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/layout/PageHeader';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';

// Icons
import {
  Loader2,
  Search,
  Clock,
  FileText,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Eye,
  Zap,
} from 'lucide-react';

// Hooks
import { useQAPages } from '../hooks/useQAPages';

// Types
import type { QAPage } from '../types/qa-content.types';

// Format relative time since creation
function formatTimeSince(dateString: string): string {
  const created = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return created.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ContentQueue() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQAPages('generating');

  const pages = data?.pages ?? [];
  const totalCount = data?.total ?? pages.length;

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Content Queue"
          description="Track the progress of Q&A pages being generated"
        />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 border border-zinc-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-2/3 bg-zinc-200" />
                    <Skeleton className="h-5 w-20 bg-zinc-200 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full bg-zinc-200 rounded-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-28 bg-zinc-200" />
                    <Skeleton className="h-4 w-36 bg-zinc-200" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <PageHeader
        title="Content Queue"
        description="Track the progress of Q&A pages being generated"
      >
        <SecondaryButton onClick={() => refetch()} icon={RefreshCw}>
          Refresh
        </SecondaryButton>
        <PrimaryButton onClick={() => navigate('/content/discover')} icon={Search}>
          Discover Questions
        </PrimaryButton>
      </PageHeader>

      {/* Stats summary */}
      {pages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{totalCount}</p>
                <p className="text-xs text-zinc-500">Generating</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">AI</p>
                <p className="text-xs text-zinc-500">Processing</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <button
                  onClick={() => navigate('/content/review')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Review Ready
                </button>
                <p className="text-xs text-zinc-500">View completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Generation Queue
            </CardTitle>
            {pages.length > 0 && (
              <span className="text-sm text-zinc-500">
                {totalCount} item{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                No content is being generated
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm mb-6">
                Discover questions to get started. Once you add questions to the queue,
                AI-generated content will appear here.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate('/content/review')}
                >
                  <Eye className="h-4 w-4" />
                  View Reviews
                </Button>
                <PrimaryButton
                  onClick={() => navigate('/content/discover')}
                  icon={Search}
                >
                  Discover Questions
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((page) => (
                <QueueItem key={page.id} page={page} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation links */}
      {pages.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            className="gap-2 text-zinc-500 hover:text-zinc-700"
            onClick={() => navigate('/content/discover')}
          >
            <Search className="h-4 w-4" />
            Discover more questions
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="gap-2 text-zinc-500 hover:text-zinc-700"
            onClick={() => navigate('/content/review')}
          >
            <Eye className="h-4 w-4" />
            Review completed content
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual queue item component
function QueueItem({ page }: { page: QAPage }) {
  const { question, status, createdAt } = page;
  const timeSince = formatTimeSince(createdAt);

  return (
    <div className="p-4 border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 transition-colors">
      {/* Header: question + status badge */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-sm font-medium text-zinc-900 leading-snug flex-1">
          {question}
        </h3>
        <Badge
          variant="outline"
          className="flex-shrink-0 gap-1.5 border-amber-200 bg-amber-50 text-amber-700"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating
        </Badge>
      </div>

      {/* Progress indicator */}
      <div className="mb-3">
        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full animate-pulse w-3/5" />
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          Started {timeSince}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
          Research, writing, SEO optimization
        </span>
      </div>
    </div>
  );
}

export default ContentQueue;
