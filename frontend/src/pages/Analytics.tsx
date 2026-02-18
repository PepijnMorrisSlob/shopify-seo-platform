// Analytics Page - Google Search Console data with charts
// Rebuilt with shadcn/ui + Tailwind CSS + recharts (no Shopify Polaris)
import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  Percent,
  Hash,
  CalendarDays,
  Filter,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Info,
} from 'lucide-react';

// Layout
import { PageHeader } from '../components/layout/PageHeader';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';

// Hooks
import { useAnalytics } from '../hooks/useAnalytics';
import { useProducts } from '../hooks/useProducts';

// Types
import type { AnalyticsData, TimeSeriesDataPoint, Product } from '../types/api.types';

// --- Helper Functions ---

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCtrPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCtrAxis(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// --- Date Range Helpers ---

type DateRangeKey = '7' | '30' | '90';

const DATE_RANGE_OPTIONS: Array<{ label: string; value: DateRangeKey }> = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
];

function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// --- Metric Card Component ---

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
}

function MetricCard({ title, value, icon: Icon, iconColor, iconBg, subtitle }: MetricCardProps) {
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

// --- Chart Wrapper Component ---

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <Card className="bg-white border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-zinc-900">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-zinc-500">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="w-full h-[360px]">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Loading Skeleton ---

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter skeleton */}
      <Card className="bg-white border-zinc-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-56" />
          </div>
        </CardContent>
      </Card>

      {/* Metric cards skeleton */}
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

      {/* Chart skeletons */}
      <Card className="bg-white border-zinc-200">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-60 mb-4" />
          <Skeleton className="h-[360px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <Card className="bg-white border-zinc-200">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[360px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Error State ---

function AnalyticsError({ message }: { message: string }) {
  return (
    <Card className="bg-white border-red-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-800">Error loading analytics</h3>
            <p className="mt-1 text-sm text-red-600">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Empty State ---

function AnalyticsEmpty() {
  return (
    <Card className="bg-white border-zinc-200">
      <CardContent className="py-16">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 rounded-full bg-zinc-100 mb-4">
            <BarChart3 className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-1">No analytics data available</h3>
          <p className="text-sm text-zinc-500 max-w-md">
            No data found for the selected period. Connect your Google Search Console
            account to start tracking SEO performance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Custom Recharts Tooltip ---

interface CustomTooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadEntry[];
  label?: string;
  formatValue?: (key: string, value: number) => string;
}

function CustomChartTooltip({ active, payload, label, formatValue }: CustomTooltipProps) {
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
            <span className="font-medium text-zinc-900">
              {formatValue ? formatValue(entry.dataKey, entry.value) : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Analytics Component ---

export function Analytics() {
  const [dateRange, setDateRange] = useState<DateRangeKey>('30');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  const { data: products } = useProducts();

  // Calculate date range from selected option
  const { startDate, endDate } = useMemo(
    () => getDateRange(parseInt(dateRange)),
    [dateRange]
  );

  const { data: analyticsData, isLoading, error } = useAnalytics({
    productIds: selectedProductId === 'all' ? undefined : [selectedProductId],
    startDate,
    endDate,
  });

  // Aggregate time series data from first product (or all combined)
  const timeSeriesData = useMemo<TimeSeriesDataPoint[]>(() => {
    if (!analyticsData || analyticsData.length === 0) return [];
    return analyticsData[0].timeSeriesData || [];
  }, [analyticsData]);

  // Calculate total/average metrics across all products
  const totalMetrics = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) return null;

    const totals = analyticsData.reduce(
      (acc, data) => ({
        impressions: acc.impressions + data.metrics.impressions,
        clicks: acc.clicks + data.metrics.clicks,
        ctr: 0,
        avgPosition: 0,
      }),
      { impressions: 0, clicks: 0, ctr: 0, avgPosition: 0 }
    );

    totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
    totals.avgPosition =
      analyticsData.reduce((sum, d) => sum + d.metrics.avgPosition, 0) /
      analyticsData.length;

    return totals;
  }, [analyticsData]);

  const hasData = !isLoading && !error && analyticsData && analyticsData.length > 0 && totalMetrics;

  return (
    <div>
      <PageHeader
        title="SEO Analytics"
        description="Track your Google Search Console performance metrics and search visibility."
      >
        <Badge variant="outline" className="text-zinc-500 border-zinc-200">
          <CalendarDays className="h-3 w-3 mr-1" />
          {DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label}
        </Badge>
      </PageHeader>

      <div className="space-y-6">
        {/* Filters Bar */}
        <Card className="bg-white border-zinc-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-700">Filters</span>
              </div>
              <Separator orientation="vertical" className="hidden sm:block h-6" />

              {/* Date Range Toggle Group */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-zinc-500 mr-1">Period:</span>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={dateRange === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange(option.value)}
                    className={
                      dateRange === option.value
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500'
                        : 'text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <Separator orientation="vertical" className="hidden sm:block h-6" />

              {/* Product Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Product:</span>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="text-sm h-9 px-3 rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[200px]"
                >
                  <option value="all">All Products</option>
                  {products?.map((p: Product) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && <AnalyticsSkeleton />}

        {/* Error State */}
        {!isLoading && error && (
          <AnalyticsError message={(error as Error).message || 'Failed to load analytics data.'} />
        )}

        {/* Empty State */}
        {!isLoading && !error && (!analyticsData || analyticsData.length === 0) && (
          <AnalyticsEmpty />
        )}

        {/* Data Content */}
        {hasData && (
          <>
            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Impressions"
                value={formatNumber(totalMetrics.impressions)}
                subtitle={`Over the last ${dateRange} days`}
                icon={Eye}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
              <MetricCard
                title="Total Clicks"
                value={formatNumber(totalMetrics.clicks)}
                subtitle={`Over the last ${dateRange} days`}
                icon={MousePointerClick}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
              <MetricCard
                title="Average CTR"
                value={formatCtrPercent(totalMetrics.ctr)}
                subtitle="Click-through rate"
                icon={Percent}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
              />
              <MetricCard
                title="Avg Position"
                value={totalMetrics.avgPosition.toFixed(1)}
                subtitle="Lower is better"
                icon={Hash}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
              />
            </div>

            {/* Impressions & Clicks Line Chart */}
            <ChartCard
              title="Impressions & Clicks Over Time"
              description="Daily search impressions and click volume from Google Search Console"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
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
                    content={
                      <CustomChartTooltip
                        formatValue={(_key: string, value: number) => formatNumber(value)}
                      />
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    name="Impressions"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    name="Clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* CTR Bar Chart */}
            <ChartCard
              title="Click-Through Rate (CTR)"
              description="Daily CTR percentage for your search listings"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#71717a' }}
                    tickLine={{ stroke: '#d4d4d8' }}
                    axisLine={{ stroke: '#d4d4d8' }}
                  />
                  <YAxis
                    tickFormatter={formatCtrAxis}
                    tick={{ fontSize: 12, fill: '#71717a' }}
                    tickLine={{ stroke: '#d4d4d8' }}
                    axisLine={{ stroke: '#d4d4d8' }}
                  />
                  <RechartsTooltip
                    content={
                      <CustomChartTooltip
                        formatValue={(_key: string, value: number) => formatCtrPercent(value)}
                      />
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
                  />
                  <Bar
                    dataKey="ctr"
                    fill="#f59e0b"
                    name="CTR"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Average Position Line Chart (reversed Y axis) */}
            <ChartCard
              title="Average Search Position"
              description="Lower numbers indicate better ranking positions (1 = top result)"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#71717a' }}
                    tickLine={{ stroke: '#d4d4d8' }}
                    axisLine={{ stroke: '#d4d4d8' }}
                  />
                  <YAxis
                    reversed
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#71717a' }}
                    tickLine={{ stroke: '#d4d4d8' }}
                    axisLine={{ stroke: '#d4d4d8' }}
                  />
                  <RechartsTooltip
                    content={
                      <CustomChartTooltip
                        formatValue={(_key: string, value: number) => value.toFixed(1)}
                      />
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPosition"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                    name="Avg Position"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Position Context Note */}
            <div className="flex items-start gap-2 p-4 rounded-lg bg-zinc-100 border border-zinc-200">
              <Info className="h-4 w-4 text-zinc-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-zinc-600">
                Position data is sourced from Google Search Console. A lower average position
                number means your pages appear higher in search results. Position 1 is the very
                first organic result.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;
