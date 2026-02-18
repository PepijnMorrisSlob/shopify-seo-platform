// Question Discovery Page - Browse and select questions to answer
// Uses shadcn/ui components (NO Polaris)
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Layout components
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/layout/PageHeader';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/ui/dropdown-menu';

// Icons
import {
  Search,
  Filter,
  Plus,
  ChevronDown,
  Loader2,
  X,
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Sparkles,
  Globe,
  Lightbulb,
  BookOpen,
  CheckSquare,
} from 'lucide-react';

// Hooks
import { useQuestions, useQuestionCategories, useAddToQueue } from '../hooks/useQuestions';

// Types
import type { Question, QuestionFilters, QuestionSource } from '../types/qa-content.types';

// Source display configuration
const SOURCE_CONFIG: Record<QuestionSource, { label: string; className: string; icon: React.ElementType }> = {
  paa: {
    label: 'People Also Ask',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Globe,
  },
  competitor: {
    label: 'Competitor',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Users,
  },
  ai_suggestion: {
    label: 'AI Suggested',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Sparkles,
  },
  template: {
    label: 'Template',
    className: 'bg-zinc-50 text-zinc-600 border-zinc-200',
    icon: BookOpen,
  },
  manual: {
    label: 'Manual',
    className: 'bg-zinc-50 text-zinc-600 border-zinc-200',
    icon: FileText,
  },
};

// Priority display configuration
const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high: {
    label: 'High',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  low: {
    label: 'Low',
    className: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  },
};

// Difficulty score color
function getDifficultyColor(score: number): string {
  if (score <= 30) return 'text-emerald-600';
  if (score <= 60) return 'text-amber-600';
  return 'text-red-600';
}

// Difficulty bar color
function getDifficultyBarColor(score: number): string {
  if (score <= 30) return 'bg-emerald-500';
  if (score <= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export function QuestionDiscovery() {
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Data hooks
  const { data, isLoading, isError } = useQuestions(filters);
  const { data: categories } = useQuestionCategories();
  const { mutate: addToQueue, isPending: isAddingToQueue } = useAddToQueue();

  const questions = data?.questions ?? [];

  // Derived state
  const allSelected = questions.length > 0 && selectedIds.size === questions.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < questions.length;
  const selectedCount = selectedIds.size;

  // Active filter count for the filter button badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.source) count++;
    if (filters.category) count++;
    if (filters.priority) count++;
    return count;
  }, [filters]);

  // Handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  }, [allSelected, questions]);

  const handleAddToQueue = useCallback(() => {
    if (selectedIds.size > 0) {
      addToQueue(
        { questionIds: Array.from(selectedIds) },
        {
          onSuccess: () => {
            setSelectedIds(new Set());
            navigate('/content/queue');
          },
        }
      );
    }
  }, [selectedIds, addToQueue, navigate]);

  const handleFilterChange = useCallback((key: keyof QuestionFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleRemoveFilter = useCallback((key: keyof QuestionFilters) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Discover Questions"
          description="Browse AI-suggested questions and select which ones to answer"
        />
        <Card>
          <CardContent className="p-6">
            {/* Filter skeleton */}
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-9 w-28 bg-zinc-200" />
              <Skeleton className="h-9 w-28 bg-zinc-200" />
              <Skeleton className="h-9 w-28 bg-zinc-200" />
            </div>
            {/* List skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-zinc-200 rounded-lg">
                  <Skeleton className="h-5 w-5 rounded bg-zinc-200 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-3/4 bg-zinc-200" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-24 bg-zinc-200 rounded-full" />
                      <Skeleton className="h-5 w-20 bg-zinc-200 rounded-full" />
                    </div>
                    <div className="flex gap-6">
                      <Skeleton className="h-4 w-32 bg-zinc-200" />
                      <Skeleton className="h-4 w-28 bg-zinc-200" />
                    </div>
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
        title="Discover Questions"
        description="Browse AI-suggested questions and select which ones to answer"
      >
        {selectedCount > 0 && (
          <PrimaryButton
            onClick={handleAddToQueue}
            disabled={isAddingToQueue}
            icon={isAddingToQueue ? Loader2 : Plus}
          >
            {isAddingToQueue
              ? 'Adding...'
              : `Add ${selectedCount} to Queue`}
          </PrimaryButton>
        )}
      </PageHeader>

      {/* Selection banner */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckSquare className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">
            {selectedCount} question{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Filters and Content */}
      <Card>
        <CardContent className="p-6">
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Source Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-9 text-sm">
                  <Globe className="h-3.5 w-3.5" />
                  {filters.source
                    ? SOURCE_CONFIG[filters.source]?.label ?? filters.source
                    : 'Source'}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFilterChange('source', undefined)}>
                  All Sources
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('source', 'paa')}>
                  People Also Ask
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('source', 'competitor')}>
                  Competitor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('source', 'ai_suggestion')}>
                  AI Suggestion
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('source', 'template')}>
                  Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-9 text-sm">
                  <FileText className="h-3.5 w-3.5" />
                  {filters.category ?? 'Category'}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-auto">
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFilterChange('category', undefined)}>
                  All Categories
                </DropdownMenuItem>
                {(categories ?? []).map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onClick={() => handleFilterChange('category', cat)}
                  >
                    {cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-9 text-sm">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {filters.priority
                    ? PRIORITY_CONFIG[filters.priority]?.label ?? filters.priority
                    : 'Priority'}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFilterChange('priority', undefined)}>
                  All Priorities
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('priority', 'high')}>
                  High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('priority', 'medium')}>
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('priority', 'low')}>
                  Low
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filters.source && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-full border border-zinc-200">
                  Source: {SOURCE_CONFIG[filters.source]?.label ?? filters.source}
                  <button
                    onClick={() => handleRemoveFilter('source')}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-full border border-zinc-200">
                  Category: {filters.category}
                  <button
                    onClick={() => handleRemoveFilter('category')}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.priority && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-full border border-zinc-200">
                  Priority: {PRIORITY_CONFIG[filters.priority]?.label ?? filters.priority}
                  <button
                    onClick={() => handleRemoveFilter('priority')}
                    className="hover:text-zinc-900 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">
              {data?.total !== undefined
                ? `${data.total} question${data.total !== 1 ? 's' : ''} found`
                : `${questions.length} question${questions.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <Separator className="mb-4" />

          {/* Select all header row */}
          {questions.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <button
                onClick={handleToggleAll}
                className="flex items-center justify-center w-5 h-5 rounded border border-zinc-300 bg-white hover:border-zinc-400 transition-colors flex-shrink-0"
                aria-label={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {someSelected && !allSelected && (
                  <div className="w-2.5 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </div>
          )}

          {/* Question list */}
          {questions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                No questions found
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm mb-6">
                Try adjusting your filters or wait while we discover more questions for your business.
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  isSelected={selectedIds.has(question.id)}
                  onToggle={handleToggleSelect}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {data?.hasMore && (
            <div className="flex justify-center pt-6">
              <Button variant="outline" className="gap-2">
                <Loader2 className="h-4 w-4" />
                Load More Questions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Individual question row component
function QuestionRow({
  question,
  isSelected,
  onToggle,
}: {
  question: Question;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const { id, text, source, category, priority, searchVolume, difficulty, competitorsCovering } = question;
  const sourceConfig = SOURCE_CONFIG[source];
  const priorityConfig = PRIORITY_CONFIG[priority];
  const SourceIcon = sourceConfig?.icon ?? FileText;

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`
        w-full text-left flex items-start gap-4 p-4 rounded-lg border transition-all duration-150
        ${isSelected
          ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'}
      `}
    >
      {/* Checkbox */}
      <div
        className={`
          flex items-center justify-center w-5 h-5 rounded border flex-shrink-0 mt-0.5 transition-colors
          ${isSelected
            ? 'bg-emerald-500 border-emerald-500'
            : 'bg-white border-zinc-300'}
        `}
      >
        {isSelected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Question text */}
        <h3 className="text-sm font-medium text-zinc-900 leading-snug mb-2">
          {text}
        </h3>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Source badge */}
          <Badge
            variant="outline"
            className={`text-xs gap-1 ${sourceConfig?.className ?? ''}`}
          >
            <SourceIcon className="h-3 w-3" />
            {sourceConfig?.label ?? source}
          </Badge>

          {/* Category badge */}
          {category && (
            <Badge variant="outline" className="text-xs border-zinc-200 text-zinc-600">
              {category}
            </Badge>
          )}

          {/* Priority badge */}
          <Badge
            variant="outline"
            className={`text-xs ${priorityConfig?.className ?? ''}`}
          >
            {priorityConfig?.label ?? priority} priority
          </Badge>
        </div>

        {/* Metrics row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          {searchVolume !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-zinc-400" />
              <span className="font-medium text-zinc-700">{searchVolume.toLocaleString()}</span>
              <span>searches/mo</span>
            </span>
          )}

          {difficulty !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getDifficultyBarColor(difficulty)}`}
                  style={{ width: `${difficulty}%` }}
                />
              </div>
              <span className={`font-medium ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </span>
              <span>difficulty</span>
            </span>
          )}

          {competitorsCovering !== undefined && competitorsCovering > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-zinc-400" />
              <span className="font-medium text-zinc-700">{competitorsCovering}</span>
              <span>competitor{competitorsCovering !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default QuestionDiscovery;
