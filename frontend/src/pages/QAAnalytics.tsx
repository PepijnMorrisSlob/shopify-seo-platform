// Q&A Analytics Dashboard - shadcn/ui + recharts implementation
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  CheckCircle,
  Target,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Search,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';

// Layout
import { PageHeader } from '../components/layout/PageHeader';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';

// Hooks
import { useQAAnalytics } from '../hooks/usePerformance';

// Types
import type { QAPage, ContentGap, TrendData } from '../types/qa-content.types';

// --- Helper Functions ---

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSeoScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getSeoScoreBadge(score: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (score >= 80) return { label: 'Excellent', variant: 'default' };
  if (score >= 60) return { label: 'Good', variant: 'secondary' };
  return { label: 'Needs Work', variant: 'destructive' };
}

function getDifficultyColor(difficulty: number): string {
  if (difficulty >= 70) return 'text-red-600';
  if (difficulty >= 40) return 'text-amber-600';
  return 'text-emerald-600';
}

function getPriorityBadgeVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
}

// --- Stat Card Component ---

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  iconBg?: string;
}

function StatCard({ icon, label, value, subtitle, iconBg = 'bg-zinc-100' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-zinc-400">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Custom Recharts Tooltip ---

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

function CustomChartTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm font-semibold text-zinc-900">
          {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// --- Top Performers List Item ---

function TopPerformerItem({ page, onClick }: { page: QAPage; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {page.question}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-zinc-500">
              Traffic: {formatNumber(page.monthlyTraffic)}
            </span>
            <span className="text-xs text-zinc-500">
              CTR: {(page.ctr * 100).toFixed(1)}%
            </span>
            {page.currentPosition && (
              <span className="text-xs text-zinc-500">
                Position: #{page.currentPosition}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-bold ${getSeoScoreColor(page.seoScore)}`}>
            {page.seoScore}
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  );
}

// --- Needs Optimization List Item ---

function NeedsOptimizationItem({ page, onClick }: { page: QAPage; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 line-clamp-1 group-hover:text-amber-600 transition-colors">
            {page.question}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-zinc-500">
              SEO: {page.seoScore}/100
            </span>
            <span className="text-xs text-zinc-500">
              Traffic: {formatNumber(page.monthlyTraffic)}
            </span>
            {page.currentPosition && (
              <span className="text-xs text-zinc-500">
                Pos: #{page.currentPosition}
              </span>
            )}
          </div>
        </div>
        <Badge variant={getSeoScoreBadge(page.seoScore).variant} className="flex-shrink-0">
          {getSeoScoreBadge(page.seoScore).label}
        </Badge>
      </div>
    </button>
  );
}

// --- Content Gap List Item ---

function ContentGapItem({ gap, onAdd }: { gap: ContentGap; onAdd: () => void }) {
  return (
    <div className="p-3 rounded-lg hover:bg-zinc-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 line-clamp-1">
            {gap.question}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              <Search className="h-3 w-3 mr-1" />
              {formatNumber(gap.searchVolume)}/mo
            </Badge>
            <Badge variant="outline" className="text-xs">
              <span className={`mr-1 ${getDifficultyColor(gap.difficulty)}`}>
                {gap.difficulty}
              </span>
              difficulty
            </Badge>
            <Badge variant={getPriorityBadgeVariant(gap.priority)} className="text-xs capitalize">
              {gap.priority}
            </Badge>
            <span className="text-xs text-zinc-400">
              {gap.competitorsCovering} competitors
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 text-xs"
          onClick={onAdd}
        >
          Add to Queue
        </Button>
      </div>
    </div>
  );
}

// --- Loading Skeleton ---

function AnalyticsSkeleton() {
  return (
    <div>
      <PageHeader
        title="Content Analytics"
        description="Performance metrics and insights for your Q&A content"
      />

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Empty State ---

function AnalyticsEmptyState() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader
        title="Content Analytics"
        description="Performance metrics and insights for your Q&A content"
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 px-6">
          <div className="p-4 rounded-full bg-zinc-100 mb-4">
            <BarChart3 className="h-10 w-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">No analytics data yet</h3>
          <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
            Publish Q&A content to start seeing performance analytics, traffic trends,
            and conversion data.
          </p>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => navigate('/content/discover')}
          >
            Discover Questions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Page Component ---

export function QAAnalytics() {
  const navigate = useNavigate();
  const { data: analytics, isLoading } = useQAAnalytics();

  // Format chart data with readable dates
  const trafficChartData = useMemo(() => {
    if (!analytics?.trafficTrend) return [];
    return analytics.trafficTrend.map((d: TrendData) => ({
      ...d,
      dateLabel: formatDate(d.date),
    }));
  }, [analytics?.trafficTrend]);

  const conversionChartData = useMemo(() => {
    if (!analytics?.conversionTrend) return [];
    return analytics.conversionTrend.map((d: TrendData) => ({
      ...d,
      dateLabel: formatDate(d.date),
    }));
  }, [analytics?.conversionTrend]);

  // Loading state
  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  // Empty state
  if (!analytics) {
    return <AnalyticsEmptyState />;
  }

  const seoBadge = getSeoScoreBadge(analytics.avgSeoScore);

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Content Analytics"
        description="Performance metrics and insights for your Q&A content"
      >
        <Button
          variant="outline"
          onClick={() => navigate('/content/discover')}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Discover Questions
        </Button>
      </PageHeader>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Total Pages"
          value={String(analytics.totalPages)}
          subtitle={`${analytics.publishedPages} published`}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Published"
          value={String(analytics.publishedPages)}
          subtitle={`${analytics.totalPages > 0 ? Math.round((analytics.publishedPages / analytics.totalPages) * 100) : 0}% of total`}
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          label="Avg SEO Score"
          value={`${analytics.avgSeoScore}/100`}
          subtitle={seoBadge.label}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-sky-600" />}
          iconBg="bg-sky-50"
          label="Total Traffic"
          value={formatNumber(analytics.totalTraffic)}
          subtitle="this month"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          label="Conversions"
          value={formatNumber(analytics.totalConversions)}
          subtitle={`${analytics.totalTraffic > 0 ? ((analytics.totalConversions / analytics.totalTraffic) * 100).toFixed(1) : 0}% rate`}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          subtitle={`$${analytics.totalConversions > 0 ? (analytics.totalRevenue / analytics.totalConversions).toFixed(0) : 0} avg`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Traffic Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Traffic Trend</CardTitle>
                <CardDescription>Last 30 days of organic traffic</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="font-medium">
                  {trafficChartData.length >= 2
                    ? `${(
                        ((trafficChartData[trafficChartData.length - 1].value -
                          trafficChartData[0].value) /
                          Math.max(trafficChartData[0].value, 1)) *
                        100
                      ).toFixed(1)}%`
                    : '--'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {trafficChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficChartData}>
                    <defs>
                      <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e4e4e7' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatNumber(v)}
                    />
                    <RechartsTooltip
                      content={<CustomChartTooltip formatter={(v: number) => `${v.toLocaleString()} visits`} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#trafficGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-zinc-400">
                  No traffic data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Conversion Trend</CardTitle>
                <CardDescription>Last 30 days of conversions</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-sky-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="font-medium">
                  {conversionChartData.length >= 2
                    ? `${(
                        ((conversionChartData[conversionChartData.length - 1].value -
                          conversionChartData[0].value) /
                          Math.max(conversionChartData[0].value, 1)) *
                        100
                      ).toFixed(1)}%`
                    : '--'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {conversionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={conversionChartData}>
                    <defs>
                      <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e4e4e7' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatNumber(v)}
                    />
                    <RechartsTooltip
                      content={<CustomChartTooltip formatter={(v: number) => `${v.toLocaleString()} conversions`} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#conversionGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-zinc-400">
                  No conversion data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Top Performers | Needs Optimization | Content Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Performers</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                {analytics.topPerformers?.length || 0}
              </Badge>
            </div>
            <CardDescription>Highest performing Q&A pages</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {analytics.topPerformers && analytics.topPerformers.length > 0 ? (
              <ScrollArea className="h-80">
                <div className="space-y-1 pr-4">
                  {analytics.topPerformers.map((page: QAPage) => (
                    <TopPerformerItem
                      key={page.id}
                      page={page}
                      onClick={() => navigate(`/content/analytics/${page.id}`)}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-8 w-8 text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No top performers yet</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Publish content to see performance data
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Optimization */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Needs Optimization</CardTitle>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                {analytics.needsOptimization?.length || 0}
              </Badge>
            </div>
            <CardDescription>Pages that could perform better</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {analytics.needsOptimization && analytics.needsOptimization.length > 0 ? (
              <ScrollArea className="h-80">
                <div className="space-y-1 pr-4">
                  {analytics.needsOptimization.map((page: QAPage) => (
                    <NeedsOptimizationItem
                      key={page.id}
                      page={page}
                      onClick={() => navigate(`/content/review?id=${page.id}`)}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-8 w-8 text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">All pages are optimized</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Great work - all content meets SEO standards
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Gaps */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Content Gaps</CardTitle>
              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                {analytics.contentGaps?.length || 0}
              </Badge>
            </div>
            <CardDescription>
              Opportunities your competitors are covering
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {analytics.contentGaps && analytics.contentGaps.length > 0 ? (
              <ScrollArea className="h-80">
                <div className="space-y-1 pr-4">
                  {analytics.contentGaps.slice(0, 10).map((gap: ContentGap, idx: number) => (
                    <ContentGapItem
                      key={`${gap.question}-${idx}`}
                      gap={gap}
                      onAdd={() => navigate('/content/discover')}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No content gaps found</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Your content coverage looks comprehensive
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default QAAnalytics;
