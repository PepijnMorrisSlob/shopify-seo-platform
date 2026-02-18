// DashboardNew Page - Modern dashboard using bento-style components
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, FileText, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';

// Layout components
import { PageHeader, PrimaryButton } from '@/components/layout';

// Dashboard components
import {
  StatCard,
  ActivityFeed,
  QuickActions,
  ContentStats,
  SEOHealthCard,
  UpcomingContent,
  type ActivityItem,
  type QuickAction,
  type ContentStat,
  type SEOMetric,
  type ScheduledContent,
} from '@/components/dashboard';

// UI components
import { Skeleton } from '@/components/ui';

// Hooks
import { useQAAnalytics } from '@/hooks/usePerformance';
import { useProducts, useSyncProducts } from '@/hooks/useProducts';
import { useCalendarItems } from '@/hooks/useCalendar';

// Types for the dashboard stats
interface DashboardStat {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}

export function DashboardNew() {
  const navigate = useNavigate();

  // Fetch real data
  const { data: qaAnalytics, isLoading: isLoadingAnalytics } = useQAAnalytics();
  const { data: products, isLoading: isLoadingProducts } = useProducts();
  const { mutate: syncProducts, isPending: isSyncing } = useSyncProducts();

  // Get upcoming content for next 30 days
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysLater = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }, []);

  const { data: calendarData, isLoading: isLoadingCalendar } = useCalendarItems(
    today,
    thirtyDaysLater
  );

  // Handle sync products
  const handleSyncProducts = () => {
    syncProducts({ forceFullSync: false });
  };

  // Calculate stats from real data with fallbacks
  const stats: DashboardStat[] = useMemo(() => {
    const seoScore = qaAnalytics?.avgSeoScore ?? 87;
    const contentReady = qaAnalytics?.publishedPages ?? 12;
    const published = products?.length ?? 48;
    const traffic = qaAnalytics?.totalTraffic ?? 2400;

    return [
      {
        icon: <Target className="w-5 h-5" />,
        label: 'SEO Score',
        value: `${seoScore}%`,
        trend: '+5%',
        trendUp: true,
      },
      {
        icon: <FileText className="w-5 h-5" />,
        label: 'Content Ready',
        value: String(contentReady),
        trend: '+3',
        trendUp: true,
      },
      {
        icon: <CheckCircle className="w-5 h-5" />,
        label: 'Published',
        value: String(published),
        trend: '+8',
        trendUp: true,
      },
      {
        icon: <TrendingUp className="w-5 h-5" />,
        label: 'Traffic',
        value: traffic >= 1000 ? `${(traffic / 1000).toFixed(1)}K` : String(traffic),
        trend: '+12%',
        trendUp: true,
      },
    ];
  }, [qaAnalytics, products]);

  // Mock activity data (replace with real data when available)
  const mockActivities: ActivityItem[] = useMemo(() => [
    {
      id: '1',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      title: 'Blog post created',
      description: '10 Tips for Better Product Photography',
      timestamp: '5 minutes ago',
      actionLabel: 'View',
      onAction: () => navigate('/content/review'),
    },
    {
      id: '2',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      title: 'Content published',
      description: 'Summer Collection Landing Page is now live',
      timestamp: '23 minutes ago',
      actionLabel: 'Open',
      onAction: () => navigate('/content/published'),
    },
    {
      id: '3',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      title: 'Products synced',
      description: `${products?.length ?? 47} products updated from Shopify`,
      timestamp: '1 hour ago',
    },
    {
      id: '4',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      title: 'SEO analysis completed',
      description: `Product descriptions optimized - Score: ${qaAnalytics?.avgSeoScore ?? 92}/100`,
      timestamp: '3 hours ago',
      actionLabel: 'View Report',
      onAction: () => navigate('/content/analytics'),
    },
  ], [navigate, products, qaAnalytics]);

  // Quick actions configuration
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'new-blog',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      label: 'New Blog Post',
      onClick: () => navigate('/content-generation'),
    },
    {
      id: 'discover',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      label: 'Discover Questions',
      onClick: () => navigate('/content/discover'),
    },
    {
      id: 'sync-products',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      ),
      label: 'Sync Products',
      onClick: handleSyncProducts,
      disabled: isSyncing,
    },
    {
      id: 'view-calendar',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: 'View Calendar',
      onClick: () => navigate('/calendar'),
    },
  ], [navigate, handleSyncProducts, isSyncing]);

  // Content stats
  const contentStatsData: ContentStat[] = useMemo(() => [
    {
      id: 'drafts',
      label: 'Drafts',
      count: 12,
      total: 50,
      color: '#f59e0b', // amber-500
      onClick: () => navigate('/content/queue'),
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      count: calendarData?.items?.length ?? 8,
      total: 50,
      color: '#3b82f6', // blue-500
      onClick: () => navigate('/calendar'),
    },
    {
      id: 'published',
      label: 'Published',
      count: qaAnalytics?.publishedPages ?? 156,
      total: 200,
      color: '#10b981', // emerald-500
      onClick: () => navigate('/content/published'),
    },
  ], [navigate, calendarData, qaAnalytics]);

  // SEO Health metrics
  const seoMetrics: SEOMetric[] = useMemo(() => [
    { id: 'products', label: 'Products Optimized', value: products?.length ?? 42, maxValue: 50 },
    { id: 'content', label: 'Content Score', value: qaAnalytics?.avgSeoScore ?? 78, maxValue: 100 },
    { id: 'meta', label: 'Meta Tags Complete', value: 45, maxValue: 50 },
    { id: 'images', label: 'Image Alt Text', value: 38, maxValue: 50 },
  ], [products, qaAnalytics]);

  // Transform calendar items to ScheduledContent format
  const upcomingItems: ScheduledContent[] = useMemo(() => {
    if (!calendarData?.items) {
      // Return mock data if no real data
      return [
        {
          id: '1',
          title: 'Holiday Gift Guide 2024',
          date: 'Jan 18',
          time: '9:00 AM',
          type: 'blog' as const,
          onEdit: () => navigate('/content/review'),
        },
        {
          id: '2',
          title: 'New Year Sale Landing Page',
          date: 'Jan 20',
          time: '12:00 PM',
          type: 'page' as const,
          onEdit: () => navigate('/content/review'),
        },
        {
          id: '3',
          title: 'Winter Collection - Product Descriptions',
          date: 'Jan 22',
          time: '10:00 AM',
          type: 'product' as const,
          onEdit: () => navigate('/content/review'),
        },
      ];
    }

    return calendarData.items.slice(0, 5).map((item) => {
      const date = new Date(item.scheduledAt);
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();
      const time = date.toLocaleString('default', { hour: 'numeric', minute: '2-digit', hour12: true });

      return {
        id: item.id,
        title: item.title,
        date: `${month} ${day}`,
        time,
        type: (item.contentType as 'blog' | 'page' | 'product' | 'faq') || 'blog',
        onEdit: () => navigate(`/content/review?id=${item.id}`),
        onReschedule: () => navigate('/calendar'),
      };
    });
  }, [calendarData, navigate]);

  // Loading state
  const isLoading = isLoadingAnalytics || isLoadingProducts || isLoadingCalendar;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Overview of your SEO performance and content pipeline"
      >
        <PrimaryButton
          onClick={handleSyncProducts}
          disabled={isSyncing}
          icon={RefreshCw}
        >
          {isSyncing ? 'Syncing...' : 'Sync Products'}
        </PrimaryButton>
      </PageHeader>

      {/* Stats Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-zinc-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              trend={stat.trend}
              trendUp={stat.trendUp}
              gradient={index === 0}
            />
          ))}
        </div>
      )}

      {/* Main Content Area - 2 columns on desktop (2:1 ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (wider - spans 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            <>
              <Skeleton className="h-96 bg-zinc-200" />
              <Skeleton className="h-64 bg-zinc-200" />
            </>
          ) : (
            <>
              <ActivityFeed
                items={mockActivities}
                title="Recent Activity"
                maxItems={5}
                onViewAll={() => navigate('/content/published')}
              />
              <ContentStats
                stats={contentStatsData}
                title="Content Overview"
              />
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {isLoading ? (
            <>
              <Skeleton className="h-48 bg-zinc-200" />
              <Skeleton className="h-72 bg-zinc-200" />
              <Skeleton className="h-80 bg-zinc-200" />
            </>
          ) : (
            <>
              <QuickActions
                actions={quickActions}
                title="Quick Actions"
              />
              <UpcomingContent
                items={upcomingItems}
                title="Upcoming Content"
                maxItems={4}
                onViewAll={() => navigate('/calendar')}
              />
              <SEOHealthCard
                score={qaAnalytics?.avgSeoScore ?? 82}
                metrics={seoMetrics}
                title="SEO Health"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardNew;
