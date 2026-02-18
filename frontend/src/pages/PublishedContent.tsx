// Published Content Page - View all published Q&A pages with performance metrics
// Rebuilt with shadcn/ui + Tailwind (no Polaris)
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader, PrimaryButton } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { ScrollArea } from '../components/ui/scroll-area';

import {
  useQAPages,
  useUpdateQAPage,
} from '../hooks/useQAPages';
import type { QAPage } from '../types/qa-content.types';

import {
  FileText,
  Eye,
  Edit,
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  MousePointerClick,
  BarChart3,
  Hash,
  Calendar,
  AlertCircle,
  Loader2,
  Link2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Sort option labels
const SORT_LABELS: Record<string, string> = {
  createdAt: 'Date Published',
  seoScore: 'SEO Score',
  traffic: 'Monthly Traffic',
  position: 'Search Position',
};

// SEO score badge classes
function getSeoScoreBadgeClasses(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function getSeoScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

// Format number with locale
function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Position badge color
function getPositionBadgeClasses(position: number | undefined): string {
  if (!position) return 'bg-zinc-50 text-zinc-500 border-zinc-200';
  if (position <= 3) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (position <= 10) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

type SortByOption = 'createdAt' | 'seoScore' | 'traffic' | 'position';
type SortOrderOption = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export function PublishedContent() {
  const navigate = useNavigate();

  // Sort and pagination state
  const [sortBy, setSortBy] = useState<SortByOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrderOption>('desc');
  const [currentPage, setCurrentPage] = useState(0);

  // Data hooks
  const offset = currentPage * ITEMS_PER_PAGE;
  const { data, isLoading, isError, error } = useQAPages(
    'published',
    ITEMS_PER_PAGE,
    offset,
    sortBy,
    sortOrder
  );
  const { mutate: updateQAPage, isPending: isUpdating } = useUpdateQAPage();

  // Preview dialog state
  const [selectedPage, setSelectedPage] = useState<QAPage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pages = data?.pages || [];
  const totalPages = data?.total || 0;
  const hasMore = data?.hasMore || false;
  const totalPageCount = Math.ceil(totalPages / ITEMS_PER_PAGE);

  // Handlers
  const handleSortChange = useCallback((newSortBy: SortByOption) => {
    setSortBy((prev) => {
      if (prev === newSortBy) {
        // Toggle order if same sort field
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      // Default to desc for new sort field
      setSortOrder('desc');
      return newSortBy;
    });
    setCurrentPage(0);
  }, []);

  const handleOpenPreview = useCallback((page: QAPage) => {
    setSelectedPage(page);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedPage(null);
  }, []);

  const handleUnpublish = useCallback(() => {
    if (!selectedPage) return;
    updateQAPage(
      { pageId: selectedPage.id, updates: { status: 'draft' } },
      { onSuccess: handleCloseDialog }
    );
  }, [selectedPage, updateQAPage, handleCloseDialog]);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(0, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (hasMore) {
      setCurrentPage((p) => p + 1);
    }
  }, [hasMore]);

  // Sort icon
  const SortIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown;

  // Error state
  if (isError) {
    return (
      <div className="p-6">
        <PageHeader
          title="Published Content"
          description="View and manage your published Q&A pages"
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 p-6">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Error loading content</h3>
              <p className="text-sm text-red-600 mt-1">
                {(error as Error)?.message || 'An unexpected error occurred while loading published content.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Published Content"
          description="View and manage your published Q&A pages"
        />
        {/* Sort controls skeleton */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-32 bg-zinc-200" />
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-6 w-2/3 bg-zinc-200" />
                    <Skeleton className="h-8 w-20 bg-zinc-200" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-24 bg-zinc-200" />
                    <Skeleton className="h-5 w-20 bg-zinc-200" />
                    <Skeleton className="h-5 w-28 bg-zinc-200" />
                  </div>
                  <div className="flex gap-6">
                    <Skeleton className="h-4 w-24 bg-zinc-200" />
                    <Skeleton className="h-4 w-24 bg-zinc-200" />
                    <Skeleton className="h-4 w-20 bg-zinc-200" />
                    <Skeleton className="h-4 w-24 bg-zinc-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <PageHeader
        title="Published Content"
        description={`${totalPages} published ${totalPages === 1 ? 'page' : 'pages'}`}
      >
        <PrimaryButton onClick={() => navigate('/content/discover')} icon={Search}>
          Discover Questions
        </PrimaryButton>
      </PageHeader>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-zinc-500 mr-1">Sort by:</span>
        {(['createdAt', 'seoScore', 'traffic', 'position'] as SortByOption[]).map((option) => (
          <Button
            key={option}
            variant={sortBy === option ? 'default' : 'outline'}
            size="sm"
            className={`gap-1.5 text-xs ${
              sortBy === option
                ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            onClick={() => handleSortChange(option)}
          >
            {SORT_LABELS[option]}
            {sortBy === option && <SortIcon className="h-3 w-3" />}
          </Button>
        ))}
      </div>

      {/* Empty State */}
      {pages.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              No published content yet
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
              No published content yet. Review and publish your generated content.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/content/review')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Review Content
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Published Content Cards */}
          <div className="grid gap-4">
            {pages.map((page) => (
              <Card
                key={page.id}
                className="hover:border-zinc-300 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content info */}
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start gap-3 mb-3">
                        <h3 className="text-base font-semibold text-zinc-900 line-clamp-2 flex-1">
                          {page.question}
                        </h3>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {page.publishedAt && (
                          <Badge variant="outline" className="text-xs gap-1 border-zinc-200 text-zinc-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(page.publishedAt)}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getSeoScoreBadgeClasses(page.seoScore)}`}
                        >
                          SEO: {page.seoScore}/100
                        </Badge>
                        {page.currentPosition && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPositionBadgeClasses(page.currentPosition)}`}
                          >
                            Position: #{page.currentPosition}
                          </Badge>
                        )}
                      </div>

                      {/* Performance metrics row */}
                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-zinc-500">Traffic:</span>
                          <span className="font-medium text-zinc-700">
                            {formatNumber(page.monthlyTraffic)}/mo
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <MousePointerClick className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-zinc-500">Clicks:</span>
                          <span className="font-medium text-zinc-700">
                            {formatNumber(page.monthlyClicks)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <BarChart3 className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-zinc-500">CTR:</span>
                          <span className="font-medium text-zinc-700">
                            {page.ctr.toFixed(1)}%
                          </span>
                        </div>
                        {page.currentPosition && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Hash className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="text-zinc-500">Avg Position:</span>
                            <span className="font-medium text-zinc-700">
                              {page.currentPosition}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Shopify URL */}
                      {page.shopifyUrl && (
                        <a
                          href={page.shopifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 mt-3 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Shopify
                        </a>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleOpenPreview(page)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">More actions</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenPreview(page)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/content/edit/${page.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {page.shopifyUrl && (
                            <DropdownMenuItem
                              onClick={() => window.open(page.shopifyUrl!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open on Shopify
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              setSelectedPage(page);
                              setDialogOpen(true);
                            }}
                          >
                            <ArrowDown className="h-4 w-4 mr-2" />
                            Unpublish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPageCount > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-zinc-500">
                Showing {offset + 1}-{Math.min(offset + ITEMS_PER_PAGE, totalPages)} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-zinc-500 px-2">
                  Page {currentPage + 1} of {totalPageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail/Unpublish Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg leading-tight pr-8">
              {selectedPage?.question}
            </DialogTitle>
            <DialogDescription className="mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  Published
                </Badge>
                {selectedPage?.publishedAt && (
                  <span className="text-xs text-zinc-500">
                    Published {formatDate(selectedPage.publishedAt)}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedPage && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-5 py-2">
                {/* SEO Score */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-700">SEO Score</h4>
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-600">Overall Score</span>
                      <span className={`text-sm font-semibold ${
                        selectedPage.seoScore >= 80
                          ? 'text-emerald-600'
                          : selectedPage.seoScore >= 60
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {selectedPage.seoScore}/100
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getSeoScoreColor(selectedPage.seoScore)}`}
                        style={{ width: `${selectedPage.seoScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Performance Metrics */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-700">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs text-zinc-500">Monthly Traffic</span>
                      </div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {formatNumber(selectedPage.monthlyTraffic)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-2 mb-1">
                        <MousePointerClick className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs text-zinc-500">Monthly Clicks</span>
                      </div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {formatNumber(selectedPage.monthlyClicks)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs text-zinc-500">Click-Through Rate</span>
                      </div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {selectedPage.ctr.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs text-zinc-500">Search Position</span>
                      </div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {selectedPage.currentPosition
                          ? `#${selectedPage.currentPosition}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Content Preview */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-700">Content Preview</h4>
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 max-h-48 overflow-y-auto">
                    <div className="prose prose-sm prose-zinc max-w-none">
                      {selectedPage.answerContent ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: selectedPage.answerContent }}
                        />
                      ) : selectedPage.answerMarkdown ? (
                        <pre className="whitespace-pre-wrap text-sm text-zinc-700 font-sans">
                          {selectedPage.answerMarkdown}
                        </pre>
                      ) : (
                        <p className="text-zinc-400 italic">No content preview available.</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Meta Tags */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-700">Meta Tags</h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                        Meta Title
                      </p>
                      <p className="text-sm text-zinc-900">{selectedPage.metaTitle}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                        Meta Description
                      </p>
                      <p className="text-sm text-zinc-900">{selectedPage.metaDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Internal Links */}
                {selectedPage.internalLinks && selectedPage.internalLinks.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-700">
                        Internal Links ({selectedPage.internalLinks.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedPage.internalLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200"
                          >
                            <Link2 className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-800">
                                {link.anchorText}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">
                                {link.targetUrl}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Shopify URL */}
                {selectedPage.shopifyUrl && (
                  <>
                    <Separator />
                    <div>
                      <a
                        href={selectedPage.shopifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Shopify Store
                      </a>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-zinc-200">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleUnpublish}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                Unpublish
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              {selectedPage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      navigate(`/content/edit/${selectedPage.id}`);
                      handleCloseDialog();
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      navigate(`/content/analytics/${selectedPage.id}`);
                      handleCloseDialog();
                    }}
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublishedContent;
