// Main App Component with New AppShell Layout
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout Components
import { AppShell } from '@/components/layout';
import { TooltipProvider } from '@/components/ui';

// Pages - Product SEO (New Design)
import DashboardNew from './pages/DashboardNew';
import { ContentGeneration } from './pages/ContentGeneration';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Products } from './pages/Products';

// Pages - Q&A Content Engine
import { Onboarding } from './pages/Onboarding';
import { QuestionDiscovery } from './pages/QuestionDiscovery';
import { ContentQueue } from './pages/ContentQueue';
import { ContentReview } from './pages/ContentReview';
import { PublishedContent } from './pages/PublishedContent';
import { QAAnalytics } from './pages/QAAnalytics';
import CalendarPageNew from './pages/CalendarPageNew';
import { TopicalMap } from './pages/TopicalMap';
import { BrandVisibility } from './pages/BrandVisibility';
import { CompetitorTracking } from './pages/CompetitorTracking';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { SEOAudit } from './pages/SEOAudit';

// Pages - Agency Console
import { AgencyDashboard } from './pages/AgencyDashboard';
import { AgencyReviewQueue } from './pages/AgencyReviewQueue';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active nav item based on current path
  const getActiveNavItem = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/content/discover')) return 'discover';
    if (path.startsWith('/content/queue')) return 'queue';
    if (path.startsWith('/content/review')) return 'review';
    if (path.startsWith('/content/published')) return 'published';
    if (path.startsWith('/content/analytics')) return 'qa-analytics';
    if (path.startsWith('/content/calendar')) return 'calendar';
    if (path.startsWith('/topical-map')) return 'topical-map';
    if (path === '/brand-visibility') return 'brand-visibility';
    if (path === '/competitors') return 'competitors';
    if (path === '/knowledge-base') return 'knowledge-base';
    if (path === '/seo-audit') return 'seo-audit';
    if (path === '/products') return 'products';
    if (path === '/content-generation') return 'content-generation';
    if (path === '/analytics') return 'analytics';
    if (path === '/settings') return 'settings';
    if (path === '/onboarding') return 'onboarding';
    if (path.startsWith('/agency')) return 'agency';
    return '';
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <AppShell
      activeNavItem={getActiveNavItem()}
      storeName="My Store"
      notificationCount={0}
      onNavigate={handleNavigate}
    >
      <Routes>
        {/* Main Dashboard - New Design */}
        <Route path="/" element={<DashboardNew />} />

        {/* Business Onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Q&A Content Routes */}
        <Route path="/content/discover" element={<QuestionDiscovery />} />
        <Route path="/content/queue" element={<ContentQueue />} />
        <Route path="/content/review" element={<ContentReview />} />
        <Route path="/content/published" element={<PublishedContent />} />
        <Route path="/content/analytics" element={<QAAnalytics />} />
        <Route path="/content/analytics/:pageId" element={<QAAnalytics />} />
        <Route path="/content/calendar" element={<CalendarPageNew />} />
        <Route path="/topical-map" element={<TopicalMap />} />

        {/* Products */}
        <Route path="/products" element={<Products />} />

        {/* Product SEO Routes */}
        <Route path="/content-generation" element={<ContentGeneration />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* Brand Visibility - GEO Tracker */}
        <Route path="/brand-visibility" element={<BrandVisibility />} />

        {/* Competitor Intelligence */}
        <Route path="/competitors" element={<CompetitorTracking />} />

        {/* Knowledge Base */}
        <Route path="/knowledge-base" element={<KnowledgeBase />} />

        {/* SEO Audit & Content Health */}
        <Route path="/seo-audit" element={<SEOAudit />} />

        {/* Agency Console */}
        <Route path="/agency" element={<AgencyDashboard />} />
        <Route path="/agency/review-queue" element={<AgencyReviewQueue />} />

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
