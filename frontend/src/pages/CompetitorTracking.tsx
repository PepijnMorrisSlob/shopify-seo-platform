/**
 * Competitor Intelligence Page
 * Shopify SEO Platform
 *
 * Tracks competitor domains, monitors their keywords, traffic, content strategy,
 * and identifies gaps to outrank them. Inspired by WP SEO AI's Competitor Tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import {
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
  Globe,
  Plus,
  Search,
  Target,
  TrendingUp,
  ExternalLink,
  Trash2,
  RefreshCw,
  Eye,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  FileText,
  Zap,
  Filter,
  Trophy,
} from 'lucide-react';

// Layout
import { PageHeader } from '../components/layout/PageHeader';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';

// API
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Competitor {
  id: string;
  competitorUrl: string;
  competitorName: string;
  estimatedTraffic: number;
  keywordCount: number;
  overlapPercentage: number;
  contentTopics: string[];
  topKeywords: string[];
  lastAnalyzedAt: string | null;
  status: string;
}

interface KeywordGap {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  competitorPosition: number;
  competitor: string;
  opportunityScore: number;
}

interface ContentGap {
  topic: string;
  competitor: string;
  competitorUrl: string;
  estTraffic: number;
  priority: string;
}

interface OverviewData {
  ourTraffic: number;
  avgCompetitorTraffic: number;
  keywordOverlapPercent: number;
  contentGapsFound: number;
  keywordGapsFound: number;
  competitiveScore: number;
  competitorsTracked: number;
  trafficComparison: Array<{
    name: string;
    traffic: number;
    keywords: number;
    overlap: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 30) return 'text-emerald-600 bg-emerald-50';
  if (difficulty <= 50) return 'text-amber-600 bg-amber-50';
  if (difficulty <= 70) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

function getOpportunityColor(score: number): string {
  if (score >= 85) return 'text-emerald-700 bg-emerald-100';
  if (score >= 70) return 'text-blue-700 bg-blue-100';
  if (score >= 55) return 'text-amber-700 bg-amber-100';
  return 'text-zinc-700 bg-zinc-100';
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return <Badge className="bg-red-100 text-red-700 border-red-200">High</Badge>;
    case 'medium':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Medium</Badge>;
    case 'low':
      return <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">Low</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
}

const BAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="bg-white border-zinc-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-500">{title}</p>
            <p className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-zinc-400">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Traffic Comparison Chart
// ---------------------------------------------------------------------------

function TrafficComparisonChart({ data }: { data: OverviewData['trafficComparison'] }) {
  const chartData = [
    { name: 'Our Store', traffic: 185000 },
    ...data.map(d => ({ name: d.name, traffic: d.traffic })),
  ];

  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-zinc-900">
          Monthly Traffic Comparison
        </CardTitle>
        <CardDescription className="text-sm text-zinc-500">
          Estimated monthly organic traffic vs. competitors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#71717a' }}
                tickLine={{ stroke: '#d4d4d8' }}
                axisLine={{ stroke: '#d4d4d8' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#71717a' }}
                tickLine={{ stroke: '#d4d4d8' }}
                axisLine={{ stroke: '#d4d4d8' }}
                tickFormatter={(v: number) => formatNumber(v)}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [formatNumber(value), 'Traffic']}
              />
              <Bar dataKey="traffic" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={index === 0 ? '#10b981' : BAR_COLORS[(index) % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitor Card
// ---------------------------------------------------------------------------

function CompetitorCard({
  competitor,
  onAnalyze,
  onRemove,
  isAnalyzing,
}: {
  competitor: Competitor;
  onAnalyze: (id: string) => void;
  onRemove: (id: string) => void;
  isAnalyzing: boolean;
}) {
  return (
    <Card className="bg-white border-zinc-200 hover:border-zinc-300 transition-colors">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{competitor.competitorName}</h3>
              <a
                href={competitor.competitorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:text-blue-500 flex items-center gap-1"
              >
                {competitor.competitorUrl.replace('https://', '')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Badge
            className={
              competitor.status === 'analyzing'
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
            }
          >
            {competitor.status === 'analyzing' ? 'Analyzing' : 'Tracked'}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-zinc-50">
            <p className="text-lg font-bold text-zinc-900">{formatNumber(competitor.estimatedTraffic)}</p>
            <p className="text-[11px] text-zinc-500">Monthly Traffic</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-50">
            <p className="text-lg font-bold text-zinc-900">{formatNumber(competitor.keywordCount)}</p>
            <p className="text-[11px] text-zinc-500">Keywords</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-50">
            <p className="text-lg font-bold text-zinc-900">{competitor.overlapPercentage}%</p>
            <p className="text-[11px] text-zinc-500">Overlap</p>
          </div>
        </div>

        {/* Top Keywords */}
        {competitor.topKeywords && competitor.topKeywords.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-zinc-500 mb-1.5">Top Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {competitor.topKeywords.slice(0, 3).map((kw, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Last Analyzed */}
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-4">
          <span>Last analyzed: {formatDate(competitor.lastAnalyzedAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            onClick={() => onAnalyze(competitor.id)}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 border-zinc-200 hover:bg-red-50 hover:border-red-200"
            onClick={() => onRemove(competitor.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add Competitor Dialog
// ---------------------------------------------------------------------------

function AddCompetitorDialog({
  open,
  onOpenChange,
  onAdd,
  isAdding,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string, name: string) => void;
  isAdding: boolean;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAdd(url.trim(), name.trim());
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setUrl('');
      setName('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-zinc-900">Add Competitor</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Enter the URL of a competitor domain to start tracking their SEO performance,
            keywords, and content strategy.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Competitor URL <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="https://competitor.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Display Name <span className="text-zinc-400">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Brooklinen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-zinc-600 border-zinc-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!url.trim() || isAdding}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Keyword Gap Table
// ---------------------------------------------------------------------------

function KeywordGapTable({
  gaps,
  competitorFilter,
  onFilterChange,
  competitors,
}: {
  gaps: KeywordGap[];
  competitorFilter: string;
  onFilterChange: (val: string) => void;
  competitors: Competitor[];
}) {
  const uniqueCompetitors = [...new Set(competitors.map(c => c.competitorName))];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-zinc-400" />
        <select
          value={competitorFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="text-sm h-9 px-3 rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
        >
          <option value="all">All Competitors</option>
          {uniqueCompetitors.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <span className="text-sm text-zinc-400">{gaps.length} keyword gaps found</span>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Keyword</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Search Volume</th>
              <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Difficulty</th>
              <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Their Position</th>
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Competitor</th>
              <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Opportunity</th>
              <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((gap, index) => (
              <tr
                key={index}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-zinc-900">{gap.keyword}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-zinc-700">{formatNumber(gap.searchVolume)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDifficultyColor(gap.difficulty)}`}>
                    {gap.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-medium text-zinc-700">#{gap.competitorPosition}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-600">{gap.competitor}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getOpportunityColor(gap.opportunityScore)}`}>
                    {gap.opportunityScore}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Create Content
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {gaps.length === 0 && (
          <div className="p-8 text-center">
            <Search className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No keyword gaps found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Gap Table
// ---------------------------------------------------------------------------

function ContentGapTable({
  gaps,
  competitorFilter,
  onFilterChange,
  competitors,
}: {
  gaps: ContentGap[];
  competitorFilter: string;
  onFilterChange: (val: string) => void;
  competitors: Competitor[];
}) {
  const uniqueCompetitors = [...new Set(competitors.map(c => c.competitorName))];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-zinc-400" />
        <select
          value={competitorFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="text-sm h-9 px-3 rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
        >
          <option value="all">All Competitors</option>
          {uniqueCompetitors.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <span className="text-sm text-zinc-400">{gaps.length} content gaps found</span>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Topic</th>
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Competitor</th>
              <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Their URL</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Est. Traffic</th>
              <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Priority</th>
              <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((gap, index) => (
              <tr
                key={index}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-zinc-900">{gap.topic}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-600">{gap.competitor}</span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={gap.competitorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 max-w-[200px] truncate"
                  >
                    {gap.competitorUrl.replace(/^https?:\/\//, '').slice(0, 35)}...
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-zinc-700">{formatNumber(gap.estTraffic)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {getPriorityBadge(gap.priority)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add to Queue
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {gaps.length === 0 && (
          <div className="p-8 text-center">
            <FileText className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No content gaps found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function CompetitorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-white border-zinc-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-white border-zinc-200">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CompetitorTracking() {
  // State
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [keywordGaps, setKeywordGaps] = useState<KeywordGap[]>([]);
  const [contentGaps, setContentGaps] = useState<ContentGap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState('all');
  const [contentFilter, setContentFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('competitors');

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [competitorsRes, overviewRes, keywordGapsRes, contentGapsRes] = await Promise.all([
        fetch(`${API_BASE}/competitors`).then(r => r.json()),
        fetch(`${API_BASE}/competitors/overview`).then(r => r.json()),
        fetch(`${API_BASE}/competitors/keyword-gaps`).then(r => r.json()),
        fetch(`${API_BASE}/competitors/content-gaps`).then(r => r.json()),
      ]);

      setCompetitors(competitorsRes.competitors || []);
      setOverview(overviewRes);
      setKeywordGaps(keywordGapsRes.keywordGaps || []);
      setContentGaps(contentGapsRes.contentGaps || []);
    } catch (err: any) {
      console.error('Failed to fetch competitor data:', err);
      setError(err.message || 'Failed to load competitor data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add competitor handler
  const handleAddCompetitor = async (url: string, name: string) => {
    setIsAdding(true);
    try {
      const response = await fetch(`${API_BASE}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorUrl: url, competitorName: name || undefined }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to add competitor');
      }

      setAddDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to add competitor:', err);
      alert(err.message || 'Failed to add competitor');
    } finally {
      setIsAdding(false);
    }
  };

  // Analyze competitor handler
  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try {
      const response = await fetch(`${API_BASE}/competitors/${id}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to analyze competitor');
      }

      await fetchData();
    } catch (err: any) {
      console.error('Failed to analyze competitor:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Remove competitor handler
  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this competitor?')) return;

    try {
      const response = await fetch(`${API_BASE}/competitors/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove competitor');
      }

      await fetchData();
    } catch (err: any) {
      console.error('Failed to remove competitor:', err);
    }
  };

  // Filter keyword gaps when filter changes
  const filteredKeywordGaps = keywordFilter === 'all'
    ? keywordGaps
    : keywordGaps.filter(g => g.competitor === keywordFilter);

  const filteredContentGaps = contentFilter === 'all'
    ? contentGaps
    : contentGaps.filter(g => g.competitor === contentFilter);

  return (
    <div>
      <PageHeader
        title="Competitor Intelligence"
        description="Monitor competitor domains, track their keywords & content strategy, and identify gaps to outrank them."
      >
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Competitor
        </Button>
      </PageHeader>

      {/* Loading State */}
      {isLoading && <CompetitorSkeleton />}

      {/* Error State */}
      {!isLoading && error && (
        <Card className="bg-white border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-800">Error loading competitor data</h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={fetchData}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Overview Stats */}
          {overview && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Our Monthly Traffic"
                value={formatNumber(overview.ourTraffic)}
                subtitle={`vs ${formatNumber(overview.avgCompetitorTraffic)} avg competitor`}
                icon={TrendingUp}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
              <StatCard
                title="Keyword Overlap"
                value={`${overview.keywordOverlapPercent}%`}
                subtitle="Average across competitors"
                icon={Target}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
              <StatCard
                title="Content Gaps Found"
                value={overview.contentGapsFound.toString()}
                subtitle={`${overview.keywordGapsFound} keyword gaps`}
                icon={Eye}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
              />
              <StatCard
                title="Competitive Score"
                value={`${overview.competitiveScore}/100`}
                subtitle={`Tracking ${overview.competitorsTracked} competitors`}
                icon={Trophy}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
              />
            </div>
          )}

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-zinc-100 border border-zinc-200">
              <TabsTrigger
                value="competitors"
                className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500"
              >
                <Globe className="h-4 w-4 mr-2" />
                Competitors ({competitors.length})
              </TabsTrigger>
              <TabsTrigger
                value="keyword-gaps"
                className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500"
              >
                <Search className="h-4 w-4 mr-2" />
                Keyword Gaps ({keywordGaps.length})
              </TabsTrigger>
              <TabsTrigger
                value="content-gaps"
                className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                Content Gaps ({contentGaps.length})
              </TabsTrigger>
            </TabsList>

            {/* Competitors Tab */}
            <TabsContent value="competitors" className="space-y-6">
              {/* Competitor Cards Grid */}
              {competitors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {competitors.map(comp => (
                    <CompetitorCard
                      key={comp.id}
                      competitor={comp}
                      onAnalyze={handleAnalyze}
                      onRemove={handleRemove}
                      isAnalyzing={analyzingId === comp.id}
                    />
                  ))}
                </div>
              ) : (
                <Card className="bg-white border-zinc-200">
                  <CardContent className="py-16">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-3 rounded-full bg-zinc-100 mb-4">
                        <Globe className="h-8 w-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                        No competitors tracked yet
                      </h3>
                      <p className="text-sm text-zinc-500 max-w-md mb-4">
                        Add competitor domains to start monitoring their SEO performance,
                        keywords, and content strategy.
                      </p>
                      <Button
                        onClick={() => setAddDialogOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Competitor
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Traffic Comparison Chart */}
              {overview && overview.trafficComparison.length > 0 && (
                <TrafficComparisonChart data={overview.trafficComparison} />
              )}
            </TabsContent>

            {/* Keyword Gaps Tab */}
            <TabsContent value="keyword-gaps">
              <Card className="bg-white border-zinc-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-zinc-900">
                        Keyword Gap Analysis
                      </CardTitle>
                      <CardDescription className="text-sm text-zinc-500">
                        Keywords your competitors rank for that you do not. Higher opportunity score = easier to capture.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-200">
                      <Zap className="h-3 w-3 mr-1" />
                      {filteredKeywordGaps.filter(g => g.opportunityScore >= 80).length} high opportunity
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <KeywordGapTable
                    gaps={filteredKeywordGaps}
                    competitorFilter={keywordFilter}
                    onFilterChange={setKeywordFilter}
                    competitors={competitors}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Gaps Tab */}
            <TabsContent value="content-gaps">
              <Card className="bg-white border-zinc-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-zinc-900">
                        Content Gap Analysis
                      </CardTitle>
                      <CardDescription className="text-sm text-zinc-500">
                        Topics and questions your competitors cover that you have not addressed yet.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-zinc-500 border-zinc-200">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      {filteredContentGaps.filter(g => g.priority === 'high').length} high priority
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ContentGapTable
                    gaps={filteredContentGaps}
                    competitorFilter={contentFilter}
                    onFilterChange={setContentFilter}
                    competitors={competitors}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Add Competitor Dialog */}
      <AddCompetitorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddCompetitor}
        isAdding={isAdding}
      />
    </div>
  );
}

export default CompetitorTracking;
