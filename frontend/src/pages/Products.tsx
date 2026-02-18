// Products Page - Shopify product list with sync, search, and SEO score display
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  RefreshCw,
  Search,
  ExternalLink,
  Image as ImageIcon,
  Filter,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';

// Layout
import { PageHeader, PrimaryButton } from '../components/layout/PageHeader';

// UI Components
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/ui/dropdown-menu';

// Hooks
import { useProducts, useSyncProducts } from '../hooks/useProducts';

// Types
import type { Product } from '../types/api.types';

// --- Helper Functions ---

function getStatusBadge(status: Product['status']): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        variant: 'default',
        className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
      };
    case 'draft':
      return {
        label: 'Draft',
        variant: 'secondary',
        className: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100',
      };
    case 'archived':
      return {
        label: 'Archived',
        variant: 'outline',
        className: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-50',
      };
    default:
      return {
        label: status,
        variant: 'outline',
        className: '',
      };
  }
}

function getSeoScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getSeoScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

type SortField = 'title' | 'seoScore' | 'updatedAt' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'draft' | 'archived';

// --- Product Card ---

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const statusBadge = getStatusBadge(product.status);
  const firstImage = product.images?.[0];

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all group"
      onClick={onClick}
    >
      {/* Product Image */}
      <div className="aspect-square bg-zinc-100 relative overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage.src}
            alt={firstImage.altText || product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-zinc-300" />
          </div>
        )}
        {/* Status Badge Overlay */}
        <div className="absolute top-2 right-2">
          <Badge className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-snug">
            {product.title}
          </h3>

          {/* Vendor & Type */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.vendor && (
              <span className="text-xs text-zinc-500">
                {product.vendor}
              </span>
            )}
            {product.vendor && product.productType && (
              <span className="text-zinc-300">|</span>
            )}
            {product.productType && (
              <span className="text-xs text-zinc-400">
                {product.productType}
              </span>
            )}
          </div>

          {/* SEO Score */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">SEO Score</span>
              <span className={`text-xs font-bold ${getSeoScoreColor(product.seoScore)}`}>
                {product.seoScore}/100
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getSeoScoreBarColor(product.seoScore)}`}
                style={{ width: `${Math.min(product.seoScore, 100)}%` }}
              />
            </div>
          </div>

          {/* Price (first variant) */}
          {product.variants?.[0]?.price && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-zinc-900">
                ${parseFloat(product.variants[0].price).toFixed(2)}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Loading Skeleton ---

function ProductsSkeleton() {
  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your synced Shopify products and SEO optimization"
      />

      {/* Search/Filter Bar Skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Empty State ---

function ProductsEmptyState({ onSync, isSyncing }: { onSync: () => void; isSyncing: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        <div className="p-4 rounded-full bg-zinc-100 mb-4">
          <Package className="h-10 w-10 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-2">No products synced</h3>
        <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
          Click Sync Products to import your Shopify products.
          Once synced, you can view SEO scores and generate optimized content.
        </p>
        <PrimaryButton
          onClick={onSync}
          disabled={isSyncing}
          icon={isSyncing ? Loader2 : RefreshCw}
        >
          {isSyncing ? 'Syncing...' : 'Sync Products'}
        </PrimaryButton>
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---

export function Products() {
  const navigate = useNavigate();
  const { data: products, isLoading } = useProducts();
  const { mutate: syncProducts, isPending: isSyncing } = useSyncProducts();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sync
  const handleSync = () => {
    syncProducts({ forceFullSync: false });
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.vendor?.toLowerCase().includes(query) ||
          p.productType?.toLowerCase().includes(query) ||
          p.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'seoScore':
          comparison = a.seoScore - b.seoScore;
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, searchQuery, statusFilter, sortField, sortDirection]);

  // Status counts for filter display
  const statusCounts = useMemo(() => {
    if (!products) return { all: 0, active: 0, draft: 0, archived: 0 };
    return {
      all: products.length,
      active: products.filter((p) => p.status === 'active').length,
      draft: products.filter((p) => p.status === 'draft').length,
      archived: products.filter((p) => p.status === 'archived').length,
    };
  }, [products]);

  // Navigate to content generation for a specific product
  const handleProductClick = (product: Product) => {
    navigate(`/content-generation?productId=${product.id}`);
  };

  // Loading state
  if (isLoading) {
    return <ProductsSkeleton />;
  }

  // Status filter label
  const statusFilterLabel =
    statusFilter === 'all'
      ? `All (${statusCounts.all})`
      : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} (${statusCounts[statusFilter]})`;

  // Sort label
  const sortLabels: Record<SortField, string> = {
    title: 'Name',
    seoScore: 'SEO Score',
    updatedAt: 'Last Updated',
    status: 'Status',
  };

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Products"
        description={`Manage your synced Shopify products and SEO optimization${products ? ` (${products.length} products)` : ''}`}
      >
        <PrimaryButton
          onClick={handleSync}
          disabled={isSyncing}
          icon={isSyncing ? Loader2 : RefreshCw}
        >
          {isSyncing ? 'Syncing...' : 'Sync Products'}
        </PrimaryButton>
      </PageHeader>

      {/* Empty State */}
      {(!products || products.length === 0) && (
        <ProductsEmptyState onSync={handleSync} isSyncing={isSyncing} />
      )}

      {/* Products Content (only show when we have products) */}
      {products && products.length > 0 && (
        <>
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilterLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All ({statusCounts.all})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                  Active ({statusCounts.active})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                  <div className="w-2 h-2 rounded-full bg-zinc-400 mr-2" />
                  Draft ({statusCounts.draft})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('archived')}>
                  <div className="w-2 h-2 rounded-full bg-red-400 mr-2" />
                  Archived ({statusCounts.archived})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  {sortLabels[sortField]}
                  <span className="text-zinc-400">
                    {sortDirection === 'asc' ? '\u2191' : '\u2193'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(sortLabels) as [SortField, string][]).map(([field, label]) => (
                  <DropdownMenuItem
                    key={field}
                    onClick={() => {
                      if (sortField === field) {
                        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortField(field);
                        setSortDirection(field === 'seoScore' ? 'desc' : 'asc');
                      }
                    }}
                  >
                    {label}
                    {sortField === field && (
                      <span className="ml-auto text-emerald-600">
                        {sortDirection === 'asc' ? '\u2191' : '\u2193'}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Results Count */}
          {searchQuery.trim() || statusFilter !== 'all' ? (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-500">
                Showing {filteredProducts.length} of {products.length} products
              </p>
              {(searchQuery.trim() || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : null}

          {/* No Results After Filter */}
          {filteredProducts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <Search className="h-8 w-8 text-zinc-300 mb-3" />
                <h3 className="text-base font-semibold text-zinc-900 mb-1">No products found</h3>
                <p className="text-sm text-zinc-500 text-center max-w-md">
                  No products match your current search or filters. Try adjusting your criteria.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Product Grid */}
          {filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Products;
