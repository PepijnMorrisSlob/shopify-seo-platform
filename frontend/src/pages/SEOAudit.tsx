// SEO Audit & Content Health Dashboard
// Full site health analysis: issues, content pruning, keyword conflicts, content health
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Search,
  Trash2,
  ArrowRight,
  Link,
  FileText,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Archive,
  Filter,
  TrendingUp,
} from 'lucide-react';

// Layout
import { PageHeader } from '../components/layout/PageHeader';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

// API
import { APIClient } from '../utils/api-client';

// --- Types ---

interface AuditOverview {
  healthScore: number;
  lastScanAt: string;
  totalPages: number;
  issues: {
    critical: number;
    warnings: number;
    opportunities: number;
    passed: number;
  };
  categories: {
    technicalSEO: { score: number; issues: number };
    onPageSEO: { score: number; issues: number };
    contentQuality: { score: number; issues: number };
    performance: { score: number; issues: number };
  };
}

interface SEOIssue {
  id: string;
  severity: 'critical' | 'warning' | 'opportunity';
  category: string;
  title: string;
  description: string;
  affectedPages: string[];
  suggestedFix: string;
}

interface PruningCandidate {
  id: string;
  title: string;
  url: string;
  monthlyTraffic: number;
  age: number;
  seoScore: number;
  recommendation: 'redirect' | 'update' | 'remove';
  lastUpdated: string;
  wordCount: number;
}

interface KeywordConflict {
  id: string;
  keyword: string;
  page1: { title: string; url: string; position: number; impressions: number };
  page2: { title: string; url: string; position: number; impressions: number };
  totalImpressions: number;
  recommendation: string;
}

interface ContentHealthItem {
  id: string;
  title: string;
  url: string;
  seoScore: number;
  wordCount: number;
  internalLinks: number;
  hasSchema: boolean;
  status: 'healthy' | 'needs-improvement' | 'poor';
  lastUpdated: string;
  missingElements: string[];
}

// --- API Hooks ---

function useSEOAuditOverview() {
  return useQuery<AuditOverview>({
    queryKey: ['seoAuditOverview'],
    queryFn: () => APIClient.get<AuditOverview>(null, '/seo-audit/overview'),
  });
}

function useSEOAuditIssues(severity?: string, category?: string) {
  const params = new URLSearchParams();
  if (severity && severity !== 'all') params.append('severity', severity);
  if (category && category !== 'all') params.append('category', category);
  const qs = params.toString();

  return useQuery<SEOIssue[]>({
    queryKey: ['seoAuditIssues', severity, category],
    queryFn: () => APIClient.get<SEOIssue[]>(null, `/seo-audit/issues${qs ? `?${qs}` : ''}`),
  });
}

function useContentPruning() {
  return useQuery<PruningCandidate[]>({
    queryKey: ['contentPruning'],
    queryFn: () => APIClient.get<PruningCandidate[]>(null, '/seo-audit/content-pruning'),
  });
}

function useKeywordConflicts() {
  return useQuery<KeywordConflict[]>({
    queryKey: ['keywordConflicts'],
    queryFn: () => APIClient.get<KeywordConflict[]>(null, '/seo-audit/keyword-conflicts'),
  });
}

function useContentHealth() {
  return useQuery<ContentHealthItem[]>({
    queryKey: ['contentHealth'],
    queryFn: () => APIClient.get<ContentHealthItem[]>(null, '/seo-audit/content-health'),
  });
}

function useRunAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => APIClient.post(null, '/seo-audit/run'),
    onSuccess: () => {
      // Refetch all audit data after scan completes
      queryClient.invalidateQueries({ queryKey: ['seoAuditOverview'] });
      queryClient.invalidateQueries({ queryKey: ['seoAuditIssues'] });
      queryClient.invalidateQueries({ queryKey: ['contentPruning'] });
      queryClient.invalidateQueries({ queryKey: ['keywordConflicts'] });
      queryClient.invalidateQueries({ queryKey: ['contentHealth'] });
    },
  });
}

// --- Helper Functions ---

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Poor';
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'critical':
      return { className: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle };
    case 'warning':
      return { className: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle };
    case 'opportunity':
      return { className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Zap };
    default:
      return { className: 'bg-zinc-100 text-zinc-700 border-zinc-200', icon: CheckCircle };
  }
}

function getRecommendationBadge(rec: string) {
  switch (rec) {
    case 'redirect':
      return { className: 'bg-amber-100 text-amber-700', label: '301 Redirect', icon: ArrowRight };
    case 'update':
      return { className: 'bg-blue-100 text-blue-700', label: 'Refresh Content', icon: RefreshCw };
    case 'remove':
      return { className: 'bg-red-100 text-red-700', label: 'Archive / Remove', icon: Trash2 };
    default:
      return { className: 'bg-zinc-100 text-zinc-700', label: rec, icon: FileText };
  }
}

function getHealthStatusBadge(status: string) {
  switch (status) {
    case 'healthy':
      return { className: 'bg-emerald-100 text-emerald-700', label: 'Healthy' };
    case 'needs-improvement':
      return { className: 'bg-amber-100 text-amber-700', label: 'Needs Work' };
    case 'poor':
      return { className: 'bg-red-100 text-red-700', label: 'Poor' };
    default:
      return { className: 'bg-zinc-100 text-zinc-700', label: status };
  }
}

// --- Radial Score Gauge Component ---

function ScoreGauge({ score }: { score: number }) {
  const color = getScoreRingColor(score);
  const data = [
    { name: 'score', value: score, fill: color },
  ];

  return (
    <div className="relative w-48 h-48 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="90%"
          startAngle={210}
          endAngle={-30}
          data={data}
          barSize={12}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={6}
            background={{ fill: '#e4e4e7' }}
            max={100}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
        <span className="text-sm text-zinc-500">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

// --- Category Bar Chart Component ---

function CategoryBreakdown({ categories }: { categories: AuditOverview['categories'] }) {
  const data = [
    { name: 'Technical', score: categories.technicalSEO.score, issues: categories.technicalSEO.issues },
    { name: 'On-Page', score: categories.onPageSEO.score, issues: categories.onPageSEO.issues },
    { name: 'Content', score: categories.contentQuality.score, issues: categories.contentQuality.issues },
    { name: 'Speed', score: categories.performance.score, issues: categories.performance.issues },
  ];

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#3f3f46' }} tickLine={false} axisLine={false} width={70} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2">
                  <p className="text-xs font-medium text-zinc-500">{d.name}</p>
                  <p className="text-sm font-semibold text-zinc-900">Score: {d.score}/100</p>
                  <p className="text-xs text-zinc-500">{d.issues} issues found</p>
                </div>
              );
            }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getScoreRingColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Issue Card Component ---

function IssueCard({ issue }: { issue: SEOIssue }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getSeverityBadge(issue.severity);
  const Icon = badge.icon;

  return (
    <div className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors bg-white">
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-md ${badge.className} flex-shrink-0 mt-0.5`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold text-zinc-900">{issue.title}</h4>
            <Badge variant="outline" className="text-xs capitalize">
              {issue.category}
            </Badge>
          </div>
          <p className="text-sm text-zinc-600">{issue.description}</p>

          {expanded && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1.5">Affected Pages</p>
                <div className="space-y-1">
                  {issue.affectedPages.map((page, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <ExternalLink className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                      <span className="truncate">{page}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-xs font-medium text-emerald-800 mb-1">Suggested Fix</p>
                <p className="text-xs text-emerald-700">{issue.suggestedFix}</p>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-zinc-100 rounded-md transition-colors flex-shrink-0"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </button>
      </div>
    </div>
  );
}

// --- Impression Split Bar Component ---

function ImpressionSplitBar({
  impressions1,
  impressions2,
  total,
}: {
  impressions1: number;
  impressions2: number;
  total: number;
}) {
  const pct1 = total > 0 ? Math.round((impressions1 / total) * 100) : 50;
  const pct2 = 100 - pct1;

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs text-zinc-500 w-8 text-right">{pct1}%</span>
      <div className="flex-1 h-2.5 bg-zinc-100 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-blue-500 rounded-l-full transition-all"
          style={{ width: `${pct1}%` }}
        />
        <div
          className="h-full bg-amber-500 rounded-r-full transition-all"
          style={{ width: `${pct2}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 w-8">{pct2}%</span>
    </div>
  );
}

// --- Issues Tab ---

function IssuesTab() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { data: issues, isLoading } = useSEOAuditIssues(severityFilter, categoryFilter);

  const severityOptions = ['all', 'critical', 'warning', 'opportunity'];
  const categoryOptions = ['all', 'Technical SEO', 'On-Page SEO', 'Content Quality', 'Performance'];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-zinc-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-zinc-200 rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 rounded w-1/3" />
                <div className="h-3 bg-zinc-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-500">Severity:</span>
        </div>
        <div className="flex gap-1.5">
          {severityOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setSeverityFilter(opt)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                severityFilter === opt
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-zinc-500">Category:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categoryOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setCategoryFilter(opt)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                categoryFilter === opt
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {opt === 'all' ? 'All Categories' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* Issue List */}
      <div className="space-y-3">
        {issues && issues.length > 0 ? (
          issues.map(issue => <IssueCard key={issue.id} issue={issue} />)
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-900">No issues found</p>
            <p className="text-xs text-zinc-500 mt-1">All checks passed for the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Content Pruning Tab ---

function ContentPruningTab() {
  const { data: candidates, isLoading } = useContentPruning();
  const [sortBy, setSortBy] = useState<'traffic' | 'age' | 'score'>('traffic');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!candidates) return [];
    const copy = [...candidates];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'traffic') cmp = a.monthlyTraffic - b.monthlyTraffic;
      else if (sortBy === 'age') cmp = a.age - b.age;
      else cmp = a.seoScore - b.seoScore;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [candidates, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700 transition-colors"
    >
      {label}
      {sortBy === col && (
        sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-zinc-200 rounded w-1/3" />
              <div className="h-4 bg-zinc-200 rounded w-16" />
              <div className="h-4 bg-zinc-200 rounded w-16" />
              <div className="h-4 bg-zinc-200 rounded w-16" />
              <div className="h-6 bg-zinc-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-zinc-500">
          Pages with low traffic, low SEO scores, and outdated content that may be hurting your overall site health.
          Consider redirecting, updating, or removing these pages.
        </p>
      </div>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-50 border-b border-zinc-200 items-center">
          <div className="col-span-4 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Page</div>
          <div className="col-span-1"><SortHeader col="traffic" label="Traffic" /></div>
          <div className="col-span-1"><SortHeader col="age" label="Age" /></div>
          <div className="col-span-1"><SortHeader col="score" label="Score" /></div>
          <div className="col-span-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Words</div>
          <div className="col-span-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Recommendation</div>
          <div className="col-span-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide text-right">Actions</div>
        </div>

        {/* Table Rows */}
        {sorted.length > 0 ? (
          sorted.map(candidate => {
            const rec = getRecommendationBadge(candidate.recommendation);
            const RecIcon = rec.icon;

            return (
              <div
                key={candidate.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-100 last:border-b-0 items-center hover:bg-zinc-50 transition-colors"
              >
                <div className="col-span-4">
                  <p className="text-sm font-medium text-zinc-900 truncate">{candidate.title}</p>
                  <p className="text-xs text-zinc-400 truncate">{candidate.url}</p>
                </div>
                <div className="col-span-1">
                  <span className="text-sm text-zinc-900 font-medium">{candidate.monthlyTraffic}</span>
                  <span className="text-xs text-zinc-400">/mo</span>
                </div>
                <div className="col-span-1">
                  <span className="text-sm text-zinc-600">{candidate.age}d</span>
                </div>
                <div className="col-span-1">
                  <span className={`text-sm font-semibold ${getScoreColor(candidate.seoScore)}`}>
                    {candidate.seoScore}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className="text-sm text-zinc-600">{candidate.wordCount}</span>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${rec.className}`}>
                    <RecIcon className="h-3 w-3" />
                    {rec.label}
                  </span>
                </div>
                <div className="col-span-2 flex justify-end gap-1.5">
                  {candidate.recommendation === 'redirect' && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      301 Redirect
                    </Button>
                  )}
                  {candidate.recommendation === 'update' && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  )}
                  {candidate.recommendation === 'remove' && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50">
                      <Archive className="h-3 w-3 mr-1" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-900">No pruning candidates</p>
            <p className="text-xs text-zinc-500 mt-1">All your content is performing well</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Keyword Conflicts Tab ---

function KeywordConflictsTab() {
  const { data: conflicts, isLoading } = useKeywordConflicts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-zinc-200 rounded-lg p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-zinc-200 rounded w-1/4" />
              <div className="h-3 bg-zinc-200 rounded w-full" />
              <div className="h-3 bg-zinc-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-zinc-500">
          Keyword cannibalization occurs when multiple pages compete for the same search term,
          diluting your ranking potential. Consolidate or differentiate these pages.
        </p>
      </div>

      <div className="space-y-3">
        {conflicts && conflicts.length > 0 ? (
          conflicts.map(conflict => (
            <div key={conflict.id} className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-zinc-300 transition-colors">
              {/* Keyword header */}
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-semibold text-zinc-900">"{conflict.keyword}"</span>
                <Badge variant="outline" className="text-xs">
                  {formatNumber(conflict.totalImpressions)} impressions
                </Badge>
              </div>

              {/* Two competing pages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-blue-800">Page 1</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 truncate">{conflict.page1.title}</p>
                  <p className="text-xs text-zinc-500 truncate mb-1.5">{conflict.page1.url}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">
                      Position: <span className="font-semibold">#{conflict.page1.position}</span>
                    </span>
                    <span className="text-xs text-zinc-600">
                      Impressions: <span className="font-semibold">{formatNumber(conflict.page1.impressions)}</span>
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-medium text-amber-800">Page 2</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 truncate">{conflict.page2.title}</p>
                  <p className="text-xs text-zinc-500 truncate mb-1.5">{conflict.page2.url}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">
                      Position: <span className="font-semibold">#{conflict.page2.position}</span>
                    </span>
                    <span className="text-xs text-zinc-600">
                      Impressions: <span className="font-semibold">{formatNumber(conflict.page2.impressions)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Impression split visualization */}
              <div className="mb-3">
                <p className="text-xs text-zinc-500 mb-1.5">Impression Split</p>
                <ImpressionSplitBar
                  impressions1={conflict.page1.impressions}
                  impressions2={conflict.page2.impressions}
                  total={conflict.totalImpressions}
                />
              </div>

              {/* Recommendation */}
              <div className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-lg">
                <div className="flex items-start gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-600">{conflict.recommendation}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-900">No keyword conflicts</p>
            <p className="text-xs text-zinc-500 mt-1">Your pages target distinct keywords effectively</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Content Health Tab ---

function ContentHealthTab() {
  const { data: healthItems, isLoading } = useContentHealth();
  const [sortBy, setSortBy] = useState<'score' | 'wordCount' | 'links'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!healthItems) return [];
    const copy = [...healthItems];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'score') cmp = a.seoScore - b.seoScore;
      else if (sortBy === 'wordCount') cmp = a.wordCount - b.wordCount;
      else cmp = a.internalLinks - b.internalLinks;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [healthItems, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-700 transition-colors"
    >
      {label}
      {sortBy === col && (
        sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-zinc-200 rounded w-1/3" />
              <div className="h-4 bg-zinc-200 rounded w-12" />
              <div className="h-4 bg-zinc-200 rounded w-12" />
              <div className="h-4 bg-zinc-200 rounded w-12" />
              <div className="h-4 bg-zinc-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-zinc-500">
          Health scores for all published pages based on SEO completeness, content quality, and technical factors.
          Focus on improving pages with the lowest scores first.
        </p>
      </div>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-50 border-b border-zinc-200 items-center">
          <div className="col-span-4 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Page Title</div>
          <div className="col-span-1"><SortHeader col="score" label="SEO" /></div>
          <div className="col-span-1"><SortHeader col="wordCount" label="Words" /></div>
          <div className="col-span-1"><SortHeader col="links" label="Links" /></div>
          <div className="col-span-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Schema</div>
          <div className="col-span-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</div>
          <div className="col-span-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Missing</div>
        </div>

        {/* Table Rows */}
        {sorted.length > 0 ? (
          sorted.map(item => {
            const statusBadge = getHealthStatusBadge(item.status);

            return (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-100 last:border-b-0 items-center hover:bg-zinc-50 transition-colors"
              >
                <div className="col-span-4">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-400 truncate">{item.url}</p>
                </div>
                <div className="col-span-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getScoreBgColor(item.seoScore)}`} />
                    <span className={`text-sm font-semibold ${getScoreColor(item.seoScore)}`}>
                      {item.seoScore}
                    </span>
                  </div>
                </div>
                <div className="col-span-1">
                  <span className="text-sm text-zinc-600">{formatNumber(item.wordCount)}</span>
                </div>
                <div className="col-span-1">
                  <span className="text-sm text-zinc-600">{item.internalLinks}</span>
                </div>
                <div className="col-span-1">
                  {item.hasSchema ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-zinc-300" />
                  )}
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <div className="col-span-2">
                  {item.missingElements.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.missingElements.slice(0, 2).map((el, idx) => (
                        <span key={idx} className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                          {el}
                        </span>
                      ))}
                      {item.missingElements.length > 2 && (
                        <span className="text-xs text-zinc-400">+{item.missingElements.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-600">All complete</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-900">No published content</p>
            <p className="text-xs text-zinc-500 mt-1">Publish content to see health scores</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main SEO Audit Page ---

export function SEOAudit() {
  const { data: overview, isLoading: overviewLoading } = useSEOAuditOverview();
  const runAudit = useRunAudit();

  const handleRunAudit = () => {
    runAudit.mutate();
  };

  // Loading state
  if (overviewLoading) {
    return (
      <div>
        <PageHeader
          title="SEO Audit"
          description="Comprehensive site health analysis and content optimization recommendations"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-48 bg-zinc-200 rounded-full w-48 mx-auto" />
                <div className="h-4 bg-zinc-200 rounded w-32 mx-auto" />
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-zinc-200 rounded w-48" />
                <div className="h-52 bg-zinc-200 rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div>
        <PageHeader
          title="SEO Audit"
          description="Comprehensive site health analysis and content optimization recommendations"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="p-4 rounded-full bg-zinc-100 mb-4">
              <Shield className="h-10 w-10 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">No audit data available</h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
              Run your first SEO audit to get a complete health assessment of your site.
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={handleRunAudit}
              disabled={runAudit.isPending}
            >
              {runAudit.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Run First Audit
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="SEO Audit"
        description="Comprehensive site health analysis and content optimization recommendations"
      >
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-zinc-500">Last scanned</p>
            <p className="text-sm font-medium text-zinc-700">{formatRelativeDate(overview.lastScanAt)}</p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={handleRunAudit}
            disabled={runAudit.isPending}
          >
            {runAudit.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Audit
              </>
            )}
          </Button>
        </div>
      </PageHeader>

      {/* Top Section: Score Gauge + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Health Score Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall Health Score</CardTitle>
            <CardDescription>{overview.totalPages} pages analyzed</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreGauge score={overview.healthScore} />
            <div className="mt-4 text-center">
              <p className="text-sm text-zinc-600">
                {overview.healthScore >= 80
                  ? 'Your site SEO is in great shape!'
                  : overview.healthScore >= 60
                    ? 'Room for improvement - address critical issues first.'
                    : 'Significant SEO issues detected - immediate action recommended.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category Breakdown</CardTitle>
            <CardDescription>Scores by SEO category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown categories={overview.categories} />
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Technical', score: overview.categories.technicalSEO.score, issues: overview.categories.technicalSEO.issues },
                { label: 'On-Page', score: overview.categories.onPageSEO.score, issues: overview.categories.onPageSEO.issues },
                { label: 'Content', score: overview.categories.contentQuality.score, issues: overview.categories.contentQuality.issues },
                { label: 'Performance', score: overview.categories.performance.score, issues: overview.categories.performance.issues },
              ].map(cat => (
                <div key={cat.label} className="text-center">
                  <p className={`text-lg font-bold ${getScoreColor(cat.score)}`}>{cat.score}</p>
                  <p className="text-xs text-zinc-500">{cat.issues} issue{cat.issues !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{overview.issues.critical}</p>
                <p className="text-xs text-zinc-500">Critical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{overview.issues.warnings}</p>
                <p className="text-xs text-zinc-500">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{overview.issues.opportunities}</p>
                <p className="text-xs text-zinc-500">Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{overview.issues.passed}</p>
                <p className="text-xs text-zinc-500">Passed Checks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="issues" className="w-full">
            <div className="px-4 pt-4 border-b border-zinc-200">
              <TabsList className="bg-zinc-100">
                <TabsTrigger value="issues" className="gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Issues
                </TabsTrigger>
                <TabsTrigger value="pruning" className="gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  Content Pruning
                </TabsTrigger>
                <TabsTrigger value="conflicts" className="gap-1.5">
                  <Search className="h-4 w-4" />
                  Keyword Conflicts
                </TabsTrigger>
                <TabsTrigger value="health" className="gap-1.5">
                  <Shield className="h-4 w-4" />
                  Content Health
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              <TabsContent value="issues" className="mt-0">
                <IssuesTab />
              </TabsContent>

              <TabsContent value="pruning" className="mt-0">
                <ContentPruningTab />
              </TabsContent>

              <TabsContent value="conflicts" className="mt-0">
                <KeywordConflictsTab />
              </TabsContent>

              <TabsContent value="health" className="mt-0">
                <ContentHealthTab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default SEOAudit;
