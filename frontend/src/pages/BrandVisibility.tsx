// Brand Visibility Tracker Page - GEO Brand Visibility across AI search engines
// Tracks how ChatGPT, Gemini, Perplexity, and Google AI Overview mention the brand
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Eye,
  Bot,
  Sparkles,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Shield,
  Globe,
  Minus,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Lightbulb,
  ArrowUpRight,
  Clock,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

// Layout
import { PageHeader } from '../components/layout/PageHeader';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

// --- Types ---

interface EngineResult {
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  citation: boolean;
  mentionContext: string | null;
  confidence: number;
}

interface CheckResult {
  id: string;
  query: string;
  brandName: string;
  results: {
    chatgpt: EngineResult;
    gemini: EngineResult;
    perplexity: EngineResult;
    googleAI: EngineResult;
  };
  checkedAt: string;
}

interface EngineOverview {
  mentionRate: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  citations: number;
  trend: 'up' | 'down' | 'stable';
  lastChecked: string;
}

interface OverviewData {
  overallScore: number;
  engines: {
    chatgpt: EngineOverview;
    gemini: EngineOverview;
    perplexity: EngineOverview;
    googleAI: EngineOverview;
  };
  totalChecks: number;
  totalMentions: number;
  avgConfidence: number;
  lastChecked: string;
}

interface TrendDataPoint {
  date: string;
  chatgpt: number;
  gemini: number;
  perplexity: number;
  googleAI: number;
  overall: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  actionItems: string[];
}

// --- Helper Functions ---

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// --- Engine Info Config ---

const ENGINE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; chartColor: string }> = {
  chatgpt: {
    label: 'ChatGPT',
    icon: Bot,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    chartColor: '#10b981',
  },
  gemini: {
    label: 'Gemini',
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    chartColor: '#3b82f6',
  },
  perplexity: {
    label: 'Perplexity',
    icon: Search,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    chartColor: '#8b5cf6',
  },
  googleAI: {
    label: 'Google AI',
    icon: Globe,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    chartColor: '#f59e0b',
  },
};

// --- Sentiment Badge ---

function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'neutral' | 'negative' | null }) {
  if (!sentiment) return <Badge variant="outline" className="text-zinc-400 border-zinc-200">N/A</Badge>;

  const config = {
    positive: { label: 'Positive', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    neutral: { label: 'Neutral', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    negative: { label: 'Negative', className: 'bg-red-50 text-red-700 border-red-200' },
  };

  const c = config[sentiment];
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

// --- Trend Arrow ---

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-zinc-400" />;
}

// --- Score Donut ---

function ScoreDonut({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = size / 2;

  const getScoreColor = (s: number) => {
    if (s >= 75) return '#10b981'; // emerald-500
    if (s >= 50) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="12"
        />
        {/* Score arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-zinc-900">{score}</span>
        <span className="text-xs text-zinc-500 font-medium">out of 100</span>
      </div>
    </div>
  );
}

// --- Engine Card ---

function EngineCard({ engineKey, data }: { engineKey: string; data: EngineOverview }) {
  const config = ENGINE_CONFIG[engineKey];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <Card className="bg-white border-zinc-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <TrendIndicator trend={data.trend} />
        </div>

        <h3 className="text-sm font-semibold text-zinc-900 mb-1">{config.label}</h3>

        <div className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Mention Rate</span>
            <span className="text-sm font-bold text-zinc-900">{data.mentionRate}%</span>
          </div>

          {/* Mention rate bar */}
          <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${data.mentionRate}%`,
                backgroundColor: config.chartColor,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Sentiment</span>
            <SentimentBadge sentiment={data.sentiment} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Citations</span>
            <span className="text-sm font-semibold text-zinc-700">{data.citations}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Last Checked</span>
            <span className="text-xs text-zinc-400">{timeAgo(data.lastChecked)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Custom Chart Tooltip ---

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}

function ChartTooltipContent({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-zinc-900 mb-1.5">{label ? formatDate(label) : ''}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-zinc-600">{entry.name}:</span>
            <span className="font-medium text-zinc-900">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Loading Skeleton ---

function BrandVisibilitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="bg-white border-zinc-200 lg:col-span-1">
          <CardContent className="p-6 flex items-center justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </CardContent>
        </Card>
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white border-zinc-200">
              <CardContent className="p-5">
                <Skeleton className="h-10 w-10 rounded-lg mb-4" />
                <Skeleton className="h-4 w-20 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Card className="bg-white border-zinc-200">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Run Check Dialog ---

interface RunCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { query: string; brandName: string; engines: string[] }) => void;
  isLoading: boolean;
}

function RunCheckDialog({ open, onOpenChange, onSubmit, isLoading }: RunCheckDialogProps) {
  const [query, setQuery] = useState('');
  const [brandName, setBrandName] = useState('MyStore');
  const [selectedEngines, setSelectedEngines] = useState<string[]>([
    'chatgpt',
    'gemini',
    'perplexity',
    'googleAI',
  ]);

  const toggleEngine = (engine: string) => {
    setSelectedEngines((prev) =>
      prev.includes(engine)
        ? prev.filter((e) => e !== engine)
        : [...prev, engine]
    );
  };

  const handleSubmit = () => {
    if (!query.trim() || !brandName.trim()) return;
    onSubmit({ query: query.trim(), brandName: brandName.trim(), engines: selectedEngines });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-zinc-900">Run Visibility Check</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Test how your brand appears across AI search engines for a specific query.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Query input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Query / Question to Test
            </label>
            <Input
              placeholder="e.g., What are the best bed sheets for hot sleepers?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
            />
            <p className="text-xs text-zinc-400">
              Enter a question that potential customers might ask AI chatbots.
            </p>
          </div>

          {/* Brand name input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Brand Name
            </label>
            <Input
              placeholder="Your brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
            />
          </div>

          {/* Engine selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              AI Engines to Check
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ENGINE_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = selectedEngines.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleEngine(key)}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium
                      transition-all duration-150
                      ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-200 text-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!query.trim() || !brandName.trim() || selectedEngines.length === 0 || isLoading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Run Check
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Recent Check Row ---

function CheckRow({ check }: { check: CheckResult }) {
  const engines = ['chatgpt', 'gemini', 'perplexity', 'googleAI'] as const;
  const mentionCount = engines.filter(
    (e) => check.results[e]?.mentioned
  ).length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-zinc-100 last:border-0">
      {/* Query */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 truncate">{check.query}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">
            {check.brandName}
          </Badge>
          <span className="text-xs text-zinc-400">
            <Clock className="h-3 w-3 inline mr-1" />
            {timeAgo(check.checkedAt)}
          </span>
        </div>
      </div>

      {/* Engine results */}
      <div className="flex items-center gap-2">
        {engines.map((engine) => {
          const result = check.results[engine];
          const config = ENGINE_CONFIG[engine];
          if (!result || !config) return null;
          const Icon = config.icon;

          return (
            <div
              key={engine}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                ${
                  result.mentioned
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-zinc-50 text-zinc-400'
                }
              `}
              title={`${config.label}: ${result.mentioned ? 'Mentioned' : 'Not mentioned'}`}
            >
              <Icon className="h-3 w-3" />
              {result.mentioned ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
            </div>
          );
        })}

        <Badge
          variant="outline"
          className={`ml-1 ${
            mentionCount >= 3
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : mentionCount >= 2
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-zinc-50 text-zinc-500 border-zinc-200'
          }`}
        >
          {mentionCount}/{engines.length}
        </Badge>
      </div>
    </div>
  );
}

// --- Recommendation Card ---

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);

  const impactConfig = {
    high: { label: 'High Impact', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    medium: { label: 'Medium Impact', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    low: { label: 'Low Impact', className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
  };

  const impact = impactConfig[rec.impact];

  return (
    <Card className="bg-white border-zinc-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <h4 className="text-sm font-semibold text-zinc-900">{rec.title}</h4>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">{rec.description}</p>

            {expanded && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Action Items
                </p>
                <ul className="space-y-1.5">
                  {rec.actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge variant="outline" className={impact.className}>
              {impact.label}
            </Badge>
            <Badge variant="outline" className="text-zinc-500 border-zinc-200 text-xs">
              {rec.category}
            </Badge>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          {expanded ? 'Show less' : 'Show action items'}
        </button>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---

export function BrandVisibility() {
  const queryClient = useQueryClient();
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false);

  // Fetch overview data
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery<OverviewData>({
    queryKey: ['brand-visibility', 'overview'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/brand-visibility/overview`);
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch checks
  const {
    data: checksData,
    isLoading: checksLoading,
  } = useQuery<{ checks: CheckResult[]; total: number }>({
    queryKey: ['brand-visibility', 'checks'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/brand-visibility/checks?limit=10`);
      if (!res.ok) throw new Error('Failed to fetch checks');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch trends
  const {
    data: trendsData,
    isLoading: trendsLoading,
  } = useQuery<{ trends: TrendDataPoint[] }>({
    queryKey: ['brand-visibility', 'trends'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/brand-visibility/trends?days=30`);
      if (!res.ok) throw new Error('Failed to fetch trends');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch recommendations
  const {
    data: recsData,
    isLoading: recsLoading,
  } = useQuery<{ recommendations: Recommendation[] }>({
    queryKey: ['brand-visibility', 'recommendations'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/brand-visibility/recommendations`);
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });

  // Run check mutation
  const runCheckMutation = useMutation({
    mutationFn: async (data: { query: string; brandName: string; engines: string[] }) => {
      const res = await fetch(`${API_BASE}/brand-visibility/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to run check');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-visibility'] });
      setIsCheckDialogOpen(false);
    },
  });

  const isLoading = overviewLoading;
  const trends = trendsData?.trends || [];

  return (
    <div>
      <PageHeader
        title="Brand Visibility Tracker"
        description="Track how AI search engines mention and cite your brand across ChatGPT, Gemini, Perplexity, and Google AI Overviews."
      >
        <Button
          onClick={() => setIsCheckDialogOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Eye className="h-4 w-4 mr-2" />
          Run Check
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && <BrandVisibilitySkeleton />}

        {/* Error State */}
        {!isLoading && overviewError && (
          <Card className="bg-white border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error loading brand visibility</h3>
                  <p className="mt-1 text-sm text-red-600">
                    {(overviewError as Error).message || 'Failed to load data. Make sure the backend is running.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Content */}
        {!isLoading && overview && (
          <>
            {/* Score + Engine Cards Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Overall Score Card */}
              <Card className="bg-white border-zinc-200 lg:col-span-1">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <ScoreDonut score={overview.overallScore} />
                  <h3 className="text-sm font-semibold text-zinc-900 mt-3">GEO Visibility Score</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Based on {overview.totalChecks} checks
                  </p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-100 w-full">
                    <div className="flex-1 text-center">
                      <p className="text-lg font-bold text-zinc-900">{overview.totalMentions}</p>
                      <p className="text-xs text-zinc-500">Mentions</p>
                    </div>
                    <div className="w-px h-8 bg-zinc-100" />
                    <div className="flex-1 text-center">
                      <p className="text-lg font-bold text-zinc-900">
                        {Math.round(overview.avgConfidence * 100)}%
                      </p>
                      <p className="text-xs text-zinc-500">Confidence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Engine Cards */}
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['chatgpt', 'gemini', 'perplexity', 'googleAI'] as const).map((engine) => (
                  <EngineCard
                    key={engine}
                    engineKey={engine}
                    data={overview.engines[engine]}
                  />
                ))}
              </div>
            </div>

            {/* Visibility Trends Chart */}
            <Card className="bg-white border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-zinc-900">
                  Visibility Trends
                </CardTitle>
                <CardDescription className="text-sm text-zinc-500">
                  Brand mention rate across AI engines over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[340px]">
                  {trendsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 text-zinc-300 animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="chatgptGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="geminiGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="perplexityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="googleAIGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 12, fill: '#71717a' }}
                          tickLine={{ stroke: '#d4d4d8' }}
                          axisLine={{ stroke: '#d4d4d8' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12, fill: '#71717a' }}
                          tickLine={{ stroke: '#d4d4d8' }}
                          axisLine={{ stroke: '#d4d4d8' }}
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }} />
                        <Area
                          type="monotone"
                          dataKey="chatgpt"
                          name="ChatGPT"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#chatgptGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="gemini"
                          name="Gemini"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#geminiGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="perplexity"
                          name="Perplexity"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fill="url(#perplexityGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="googleAI"
                          name="Google AI"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#googleAIGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Checks */}
            <Card className="bg-white border-zinc-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-zinc-900">
                      Recent Visibility Checks
                    </CardTitle>
                    <CardDescription className="text-sm text-zinc-500">
                      Latest queries tested across AI search engines
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-zinc-500 border-zinc-200">
                    {checksData?.total || 0} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {checksLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-3">
                        <Skeleton className="h-4 w-full max-w-md" />
                        <Skeleton className="h-6 w-32" />
                      </div>
                    ))}
                  </div>
                ) : checksData?.checks && checksData.checks.length > 0 ? (
                  <div>
                    {checksData.checks.map((check) => (
                      <CheckRow key={check.id} check={check} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="p-3 rounded-full bg-zinc-100 mb-3">
                      <MessageSquare className="h-6 w-6 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900">No checks yet</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Run your first visibility check to see how your brand appears in AI responses.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-semibold text-zinc-900">
                  AI Visibility Recommendations
                </h2>
              </div>
              {recsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="bg-white border-zinc-200">
                      <CardContent className="p-5">
                        <Skeleton className="h-4 w-64 mb-2" />
                        <Skeleton className="h-3 w-full mb-1" />
                        <Skeleton className="h-3 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : recsData?.recommendations && recsData.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recsData.recommendations.map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} />
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Run Check Dialog */}
      <RunCheckDialog
        open={isCheckDialogOpen}
        onOpenChange={setIsCheckDialogOpen}
        onSubmit={(data) => runCheckMutation.mutate(data)}
        isLoading={runCheckMutation.isPending}
      />
    </div>
  );
}

export default BrandVisibility;
