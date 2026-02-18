// Content Review Page - Review and approve generated Q&A content
// Rebuilt with shadcn/ui + Tailwind (no Polaris)
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader, PrimaryButton } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
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
  useQAPages,
  useApproveQAPage,
  useUpdateQAPage,
  useRegenerateQAPage,
  useDeleteQAPage,
} from '../hooks/useQAPages';
import type { QAPage } from '../types/qa-content.types';

import {
  FileText,
  Eye,
  Check,
  RefreshCw,
  Trash2,
  Save,
  ExternalLink,
  Link2,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';

// SEO score color utilities
function getSeoScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getSeoScoreBadgeClasses(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function getSeoScoreLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs Work';
  return 'Poor';
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ContentReview() {
  const navigate = useNavigate();

  // Data hooks
  const { data, isLoading, isError, error } = useQAPages('pending_review');
  const { mutate: approveQAPage, isPending: isApproving } = useApproveQAPage();
  const { mutate: updateQAPage, isPending: isUpdating } = useUpdateQAPage();
  const { mutate: regenerateQAPage, isPending: isRegenerating } = useRegenerateQAPage();
  const { mutate: deleteQAPage, isPending: isDeleting } = useDeleteQAPage();

  // State
  const [selectedPage, setSelectedPage] = useState<QAPage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pages = data?.pages || [];

  // Handlers
  const handleOpenPreview = useCallback((page: QAPage) => {
    setSelectedPage(page);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedPage(null);
  }, []);

  const handleApprovePublish = useCallback(() => {
    if (!selectedPage) return;
    approveQAPage(
      { pageId: selectedPage.id, publish: true },
      { onSuccess: handleCloseDialog }
    );
  }, [selectedPage, approveQAPage, handleCloseDialog]);

  const handleSaveDraft = useCallback(() => {
    if (!selectedPage) return;
    updateQAPage(
      { pageId: selectedPage.id, updates: { status: 'draft' } },
      { onSuccess: handleCloseDialog }
    );
  }, [selectedPage, updateQAPage, handleCloseDialog]);

  const handleRegenerate = useCallback(() => {
    if (!selectedPage) return;
    regenerateQAPage(selectedPage.id, { onSuccess: handleCloseDialog });
  }, [selectedPage, regenerateQAPage, handleCloseDialog]);

  const handleDelete = useCallback(() => {
    if (!selectedPage) return;
    deleteQAPage(selectedPage.id, { onSuccess: handleCloseDialog });
  }, [selectedPage, deleteQAPage, handleCloseDialog]);

  const isMutating = isApproving || isUpdating || isRegenerating || isDeleting;

  // Error state
  if (isError) {
    return (
      <div className="p-6">
        <PageHeader
          title="Review Content"
          description="Review and approve Q&A pages before publishing"
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 p-6">
            <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Error loading content</h3>
              <p className="text-sm text-red-600 mt-1">
                {(error as Error)?.message || 'An unexpected error occurred while loading content for review.'}
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
          title="Review Content"
          description="Review and approve Q&A pages before publishing"
        />
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4 bg-zinc-200" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 bg-zinc-200" />
                    <Skeleton className="h-5 w-24 bg-zinc-200" />
                  </div>
                  <Skeleton className="h-4 w-full bg-zinc-200" />
                  <Skeleton className="h-4 w-2/3 bg-zinc-200" />
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
        title="Review Content"
        description="Review and approve Q&A pages before publishing"
      >
        <PrimaryButton onClick={() => navigate('/content/discover')} icon={Search}>
          Discover Questions
        </PrimaryButton>
      </PageHeader>

      {/* Empty State */}
      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              No content pending review
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
              No content pending review. Check the queue for generating content.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/content/queue')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              View Content Queue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Review count */}
          <div className="mb-4">
            <p className="text-sm text-zinc-500">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} pending review
            </p>
          </div>

          {/* Content Cards */}
          <div className="grid gap-4">
            {pages.map((page) => (
              <Card
                key={page.id}
                className="hover:border-zinc-300 transition-colors cursor-pointer"
                onClick={() => handleOpenPreview(page)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-zinc-900 mb-2 line-clamp-2">
                        {page.question}
                      </h3>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <Badge
                          variant="outline"
                          className={getSeoScoreBadgeClasses(page.seoScore)}
                        >
                          SEO: {page.seoScore}/100
                        </Badge>
                        {page.targetKeyword && (
                          <Badge variant="secondary" className="text-xs">
                            {page.targetKeyword}
                          </Badge>
                        )}
                      </div>

                      {/* Meta preview */}
                      <div className="space-y-1">
                        <p className="text-sm text-zinc-700 font-medium truncate">
                          {page.metaTitle}
                        </p>
                        <p className="text-xs text-zinc-500 line-clamp-2">
                          {page.metaDescription}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-zinc-400 mt-3">
                        Generated {formatDate(page.createdAt)}
                      </p>
                    </div>

                    {/* Review button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(page);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Content Preview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg leading-tight pr-8">
              {selectedPage?.question}
            </DialogTitle>
            <DialogDescription className="mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                  Pending Review
                </Badge>
                {selectedPage?.targetKeyword && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedPage.targetKeyword}
                  </Badge>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedPage && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-5 py-2">
                {/* SEO Score Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-700">SEO Analysis</h4>
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
                        {selectedPage.seoScore}/100 - {getSeoScoreLabel(selectedPage.seoScore)}
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

                {/* Content Preview */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-zinc-700">Content Preview</h4>
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 max-h-64 overflow-y-auto">
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
                      <p className="text-xs text-zinc-400 mt-1">
                        {selectedPage.metaTitle?.length || 0} characters
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                        Meta Description
                      </p>
                      <p className="text-sm text-zinc-900">{selectedPage.metaDescription}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {selectedPage.metaDescription?.length || 0} characters
                      </p>
                    </div>
                    {selectedPage.h1 && (
                      <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                          H1 Tag
                        </p>
                        <p className="text-sm text-zinc-900">{selectedPage.h1}</p>
                      </div>
                    )}
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
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {link.targetPageType.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-zinc-400">
                                  Relevance: {Math.round(link.relevanceScore * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-zinc-200">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleDelete}
                disabled={isMutating}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRegenerate}
                disabled={isMutating}
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleSaveDraft}
                disabled={isMutating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save as Draft
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={handleApprovePublish}
                disabled={isMutating}
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve & Publish
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContentReview;
