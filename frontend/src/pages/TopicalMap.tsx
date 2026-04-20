// Topical Authority Map - Content clustering with hub-and-spoke model
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Network,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Zap,
  ArrowUpRight,
  Eye,
  X,
} from 'lucide-react';

// Layout
import { PageHeader, PrimaryButton, SecondaryButton, GhostButton } from '@/components/layout';

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Input,
  Separator,
  Skeleton,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003/api';

async function fetchClusters() {
  const res = await fetch(`${API_BASE}/topical-map/clusters`);
  if (!res.ok) throw new Error('Failed to fetch clusters');
  return res.json();
}

async function fetchGaps() {
  const res = await fetch(`${API_BASE}/topical-map/gaps`);
  if (!res.ok) throw new Error('Failed to fetch gaps');
  return res.json();
}

async function generateMap(seedKeyword: string, aiModel: string) {
  const res = await fetch(`${API_BASE}/topical-map/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seedKeyword, aiModel }),
  });
  if (!res.ok) throw new Error('Failed to generate topical map');
  return res.json();
}

async function deleteCluster(id: string) {
  const res = await fetch(`${API_BASE}/topical-map/clusters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete cluster');
  return res.json();
}

async function autoCategorize() {
  const res = await fetch(`${API_BASE}/topical-map/auto-categorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to auto-categorize');
  return res.json();
}

async function addTopicToCluster(
  clusterId: string,
  topic: { title: string; keyword: string; searchVolume?: number; difficulty?: number },
) {
  const res = await fetch(`${API_BASE}/topical-map/clusters/${clusterId}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(topic),
  });
  if (!res.ok) throw new Error('Failed to add topic');
  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopicItem {
  id: string;
  title: string;
  keyword: string;
  searchVolume: number;
  difficulty: number;
  searchIntent: string;
  status: 'published' | 'draft' | 'gap' | 'planned' | 'in_progress';
  qaPageId?: string;
  url?: string;
  position?: number;
  monthlyTraffic?: number;
}

interface TopicCluster {
  id: string;
  name: string;
  pillarTopic: string;
  pillarKeyword: string;
  searchVolume: number;
  topics: TopicItem[];
  coverage: number;
  totalTopics: number;
  publishedTopics: number;
  status: 'strong' | 'growing' | 'weak';
  createdAt: string;
  updatedAt: string;
}

interface ContentGap {
  clusterId: string;
  clusterName: string;
  topic: TopicItem;
  priority: 'high' | 'medium' | 'low';
  opportunityScore: number;
  reason: string;
}

interface ClusterStats {
  totalClusters: number;
  totalTopics: number;
  publishedTopics: number;
  coveragePercent: number;
  gapsFound: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function getStatusConfig(status: TopicItem['status']): {
  label: string;
  bg: string;
  text: string;
  dot: string;
} {
  switch (status) {
    case 'published':
      return { label: 'Published', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'draft':
      return { label: 'Draft', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'in_progress':
      return { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'planned':
      return { label: 'Planned', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' };
    case 'gap':
    default:
      return { label: 'Gap', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
  }
}

function getClusterStatusConfig(status: TopicCluster['status']): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'strong':
      return { label: 'Strong', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'growing':
      return { label: 'Growing', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'weak':
    default:
      return { label: 'Weak', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  }
}

function getDifficultyColor(difficulty: number): string {
  if (difficulty >= 60) return 'text-red-600';
  if (difficulty >= 35) return 'text-amber-600';
  return 'text-emerald-600';
}

function getIntentBadge(intent: string): { label: string; className: string } {
  switch (intent) {
    case 'commercial':
      return { label: 'Commercial', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'transactional':
      return { label: 'Transactional', className: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'navigational':
      return { label: 'Navigational', className: 'bg-zinc-50 text-zinc-700 border-zinc-200' };
    case 'informational':
    default:
      return { label: 'Informational', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  subtitle,
  iconBg = 'bg-zinc-100',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  iconBg?: string;
}) {
  return (
    <Card className="bg-white border-zinc-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
            {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${iconBg}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Coverage progress bar */
function CoverageBar({ coverage }: { coverage: number }) {
  const barColor =
    coverage >= 70
      ? 'bg-emerald-500'
      : coverage >= 40
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500">Coverage</span>
        <span className="text-xs font-semibold text-zinc-700">{coverage}%</span>
      </div>
      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(coverage, 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Single topic row in the cluster detail */
function TopicRow({ topic }: { topic: TopicItem }) {
  const statusConfig = getStatusConfig(topic.status);
  const intentConfig = getIntentBadge(topic.searchIntent);

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-zinc-50 transition-colors group">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusConfig.dot}`} />

      {/* Title and keyword */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{topic.title}</p>
        <p className="text-xs text-zinc-400 mt-0.5 truncate">{topic.keyword}</p>
      </div>

      {/* Search Intent */}
      <Badge variant="outline" className={`text-xs hidden md:inline-flex ${intentConfig.className}`}>
        {intentConfig.label}
      </Badge>

      {/* Search volume */}
      <div className="text-right hidden sm:block w-16">
        <p className="text-xs font-medium text-zinc-700">{formatNumber(topic.searchVolume)}</p>
        <p className="text-xs text-zinc-400">vol</p>
      </div>

      {/* Difficulty */}
      <div className="text-right hidden sm:block w-12">
        <p className={`text-xs font-bold ${getDifficultyColor(topic.difficulty)}`}>
          {topic.difficulty}
        </p>
        <p className="text-xs text-zinc-400">KD</p>
      </div>

      {/* Position (if published) */}
      <div className="text-right w-12 hidden lg:block">
        {topic.position ? (
          <>
            <p className="text-xs font-medium text-zinc-700">#{topic.position}</p>
            <p className="text-xs text-zinc-400">pos</p>
          </>
        ) : (
          <span className="text-xs text-zinc-300">--</span>
        )}
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className={`text-xs ${statusConfig.bg} ${statusConfig.text} border-transparent`}
      >
        {statusConfig.label}
      </Badge>
    </div>
  );
}

/** Cluster card component */
function ClusterCard({
  cluster,
  isExpanded,
  onToggle,
  onDelete,
}: {
  cluster: TopicCluster;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
}) {
  const clusterStatus = getClusterStatusConfig(cluster.status);
  const gapCount = cluster.topics.filter((t) => t.status === 'gap').length;
  const plannedCount = cluster.topics.filter((t) => t.status === 'planned').length;

  return (
    <Card className="bg-white border-zinc-200 hover:shadow-sm transition-shadow">
      {/* Cluster header - always visible */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Network className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <CardTitle className="text-base font-semibold text-zinc-900 truncate">
                {cluster.name}
              </CardTitle>
            </div>
            <CardDescription className="text-sm text-zinc-500 truncate">
              {cluster.pillarTopic}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <Badge
              variant="outline"
              className={`text-xs ${clusterStatus.bg} ${clusterStatus.text} ${clusterStatus.border}`}
            >
              {clusterStatus.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(cluster.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-900">{cluster.totalTopics}</p>
            <p className="text-xs text-zinc-500">Topics</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{cluster.publishedTopics}</p>
            <p className="text-xs text-zinc-500">Published</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{gapCount}</p>
            <p className="text-xs text-zinc-500">Gaps</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-zinc-700">{formatNumber(cluster.searchVolume)}</p>
            <p className="text-xs text-zinc-500">Volume</p>
          </div>
        </div>

        {/* Coverage bar */}
        <CoverageBar coverage={cluster.coverage} />

        {/* Pillar keyword */}
        <div className="mt-3 flex items-center gap-2">
          <Target className="w-3 h-3 text-zinc-400 flex-shrink-0" />
          <span className="text-xs text-zinc-500">Pillar:</span>
          <span className="text-xs font-medium text-zinc-700 truncate">
            {cluster.pillarKeyword}
          </span>
        </div>
      </CardContent>

      {/* Expand/Collapse toggle */}
      <CardFooter className="pt-0 pb-3 px-6">
        <Button
          variant="ghost"
          className="w-full h-8 text-xs text-zinc-500 hover:text-zinc-700 gap-1"
          onClick={onToggle}
        >
          {isExpanded ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Hide {cluster.totalTopics} Topics
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              View {cluster.totalTopics} Topics
            </>
          )}
        </Button>
      </CardFooter>

      {/* Expanded topic list */}
      {isExpanded && (
        <div className="border-t border-zinc-100 px-2 py-2">
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-0.5">
              {cluster.topics.map((topic) => (
                <TopicRow key={topic.id} topic={topic} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}

/** Content gap row */
function GapRow({ gap }: { gap: ContentGap }) {
  const priorityConfig = {
    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    low: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200' },
  }[gap.priority];

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-zinc-50 transition-colors">
      {/* Priority indicator */}
      <div
        className={`w-1.5 h-10 rounded-full flex-shrink-0 ${
          gap.priority === 'high'
            ? 'bg-red-500'
            : gap.priority === 'medium'
              ? 'bg-amber-500'
              : 'bg-zinc-300'
        }`}
      />

      {/* Topic info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{gap.topic.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-zinc-400">{gap.clusterName}</span>
          <span className="text-xs text-zinc-300">|</span>
          <span className="text-xs text-zinc-500">{gap.reason}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="text-right hidden sm:block w-16">
        <p className="text-xs font-medium text-zinc-700">{formatNumber(gap.topic.searchVolume)}</p>
        <p className="text-xs text-zinc-400">vol</p>
      </div>

      <div className="text-right hidden sm:block w-12">
        <p className={`text-xs font-bold ${getDifficultyColor(gap.topic.difficulty)}`}>
          {gap.topic.difficulty}
        </p>
        <p className="text-xs text-zinc-400">KD</p>
      </div>

      {/* Priority badge */}
      <Badge
        variant="outline"
        className={`text-xs capitalize ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border}`}
      >
        {gap.priority}
      </Badge>

      {/* Opportunity score */}
      <div className="text-right w-12">
        <p className="text-xs font-bold text-emerald-600">{gap.opportunityScore}</p>
        <p className="text-xs text-zinc-400">score</p>
      </div>
    </div>
  );
}

/** Generate Map Dialog */
function GenerateMapDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (seedKeyword: string, aiModel: string) => void;
  isGenerating: boolean;
}) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');

  const handleSubmit = () => {
    if (seedKeyword.trim()) {
      onGenerate(seedKeyword.trim(), aiModel);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            Generate Topical Map
          </DialogTitle>
          <DialogDescription>
            Enter a seed keyword and AI will generate a complete topical authority map
            with pillar content and supporting topics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Seed keyword input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Seed Keyword</label>
            <Input
              placeholder="e.g., organic skincare, home office setup, yoga mats..."
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && seedKeyword.trim()) handleSubmit();
              }}
              className="bg-zinc-50 border-zinc-200 focus:border-emerald-300 focus:ring-emerald-500/20"
            />
            <p className="text-xs text-zinc-400">
              Enter a broad topic keyword. AI will generate 8-15 subtopics for a complete
              cluster.
            </p>
          </div>

          {/* AI Model selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">AI Model</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Fast & efficient' },
                { value: 'gpt-4o', label: 'GPT-4o', desc: 'Higher quality' },
              ].map((model) => (
                <button
                  key={model.value}
                  onClick={() => setAiModel(model.value)}
                  className={`
                    text-left rounded-lg border-2 p-3 transition-all duration-200 cursor-pointer
                    ${
                      aiModel === model.value
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }
                  `}
                >
                  <p className="text-sm font-medium text-zinc-900">{model.label}</p>
                  <p className="text-xs text-zinc-500">{model.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="text-zinc-600">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!seedKeyword.trim() || isGenerating}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Map
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Loading skeleton */
function TopicalMapSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border-zinc-200">
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border-zinc-200">
            <CardHeader>
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function TopicalMap() {
  const queryClient = useQueryClient();

  // State
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('clusters');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const {
    data: clustersData,
    isLoading: isLoadingClusters,
  } = useQuery({
    queryKey: ['topical-map-clusters'],
    queryFn: fetchClusters,
    staleTime: 60_000,
  });

  const {
    data: gapsData,
    isLoading: isLoadingGaps,
  } = useQuery({
    queryKey: ['topical-map-gaps'],
    queryFn: fetchGaps,
    staleTime: 60_000,
  });

  // Mutations
  const generateMutation = useMutation({
    mutationFn: ({ seedKeyword, aiModel }: { seedKeyword: string; aiModel: string }) =>
      generateMap(seedKeyword, aiModel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topical-map-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['topical-map-gaps'] });
      setGenerateDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topical-map-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['topical-map-gaps'] });
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: autoCategorize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topical-map-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['topical-map-gaps'] });
    },
  });

  // Derived data
  const clusters: TopicCluster[] = clustersData?.clusters || [];
  const stats: ClusterStats = clustersData?.stats || {
    totalClusters: 0,
    totalTopics: 0,
    publishedTopics: 0,
    coveragePercent: 0,
    gapsFound: 0,
  };
  const gaps: ContentGap[] = gapsData?.gaps || [];
  const gapsSummary = gapsData?.summary || {};

  // Filter clusters by search
  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;
    const q = searchQuery.toLowerCase();
    return clusters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.pillarTopic.toLowerCase().includes(q) ||
        c.pillarKeyword.toLowerCase().includes(q) ||
        c.topics.some(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.keyword.toLowerCase().includes(q),
        ),
    );
  }, [clusters, searchQuery]);

  // Filter gaps by search
  const filteredGaps = useMemo(() => {
    if (!searchQuery.trim()) return gaps;
    const q = searchQuery.toLowerCase();
    return gaps.filter(
      (g) =>
        g.topic.title.toLowerCase().includes(q) ||
        g.topic.keyword.toLowerCase().includes(q) ||
        g.clusterName.toLowerCase().includes(q),
    );
  }, [gaps, searchQuery]);

  // Handlers
  const toggleCluster = useCallback((clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  }, []);

  const handleGenerate = useCallback(
    (seedKeyword: string, aiModel: string) => {
      generateMutation.mutate({ seedKeyword, aiModel });
    },
    [generateMutation],
  );

  const handleDelete = useCallback(
    (clusterId: string) => {
      deleteMutation.mutate(clusterId);
    },
    [deleteMutation],
  );

  // Loading
  if (isLoadingClusters) {
    return <TopicalMapSkeleton />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      {/* Page Header */}
      <PageHeader
        title="Topical Authority Map"
        description="Organize content into topic clusters with a hub-and-spoke model for maximum SEO authority"
      >
        <div className="flex items-center gap-2">
          <SecondaryButton
            onClick={() => categorizeMutation.mutate()}
            disabled={categorizeMutation.isPending}
            icon={categorizeMutation.isPending ? Loader2 : Zap}
          >
            {categorizeMutation.isPending ? 'Categorizing...' : 'Auto-Categorize'}
          </SecondaryButton>
          <PrimaryButton
            onClick={() => setGenerateDialogOpen(true)}
            icon={Sparkles}
          >
            Generate Map
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<Network className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Total Clusters"
          value={String(stats.totalClusters)}
          subtitle={`${filteredClusters.length} shown`}
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Total Topics"
          value={String(stats.totalTopics)}
          subtitle={`${stats.publishedTopics} published`}
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50"
          label="Content Coverage"
          value={`${stats.coveragePercent}%`}
          subtitle={`${stats.totalTopics - stats.publishedTopics} remaining`}
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
          label="Gaps Found"
          value={String(stats.gapsFound)}
          subtitle="content opportunities"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
          label="Traffic Potential"
          value={formatNumber(gapsSummary.estimatedTrafficPotential || 0)}
          subtitle="monthly est."
        />
      </div>

      {/* Search + Tabs */}
      <div className="mb-6 space-y-4">
        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search clusters, topics, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-zinc-200 bg-white focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-100">
            <TabsTrigger value="clusters" className="gap-1.5 data-[state=active]:bg-white">
              <Network className="w-3.5 h-3.5" />
              Clusters ({filteredClusters.length})
            </TabsTrigger>
            <TabsTrigger value="gaps" className="gap-1.5 data-[state=active]:bg-white">
              <AlertCircle className="w-3.5 h-3.5" />
              Content Gaps ({filteredGaps.length})
            </TabsTrigger>
          </TabsList>

          {/* ---- Clusters Tab ---- */}
          <TabsContent value="clusters" className="mt-4">
            {filteredClusters.length === 0 ? (
              <Card className="bg-white border-zinc-200">
                <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="p-4 rounded-full bg-zinc-100 mb-4">
                    <Network className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    {searchQuery ? 'No clusters match your search' : 'No topic clusters yet'}
                  </h3>
                  <p className="text-sm text-zinc-500 text-center max-w-md mb-6">
                    {searchQuery
                      ? 'Try adjusting your search query to find clusters.'
                      : 'Generate your first topical map to start building authority clusters for your content strategy.'}
                  </p>
                  {!searchQuery && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                      onClick={() => setGenerateDialogOpen(true)}
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Your First Map
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredClusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    isExpanded={expandedClusters.has(cluster.id)}
                    onToggle={() => toggleCluster(cluster.id)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---- Content Gaps Tab ---- */}
          <TabsContent value="gaps" className="mt-4">
            {filteredGaps.length === 0 ? (
              <Card className="bg-white border-zinc-200">
                <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="p-4 rounded-full bg-zinc-100 mb-4">
                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    {searchQuery ? 'No gaps match your search' : 'No content gaps found'}
                  </h3>
                  <p className="text-sm text-zinc-500 text-center max-w-md">
                    {searchQuery
                      ? 'Try adjusting your search query.'
                      : 'All topic clusters have full content coverage. Great work!'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Gap summary */}
                <Card className="bg-white border-zinc-200">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-xs text-zinc-500">Total Gaps</span>
                          <p className="text-lg font-bold text-zinc-900">
                            {gapsSummary.totalGaps || 0}
                          </p>
                        </div>
                        <Separator orientation="vertical" className="h-10" />
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-xs text-zinc-600">
                              {gapsSummary.highPriority || 0} High
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs text-zinc-600">
                              {gapsSummary.mediumPriority || 0} Medium
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-zinc-300" />
                            <span className="text-xs text-zinc-600">
                              {gapsSummary.lowPriority || 0} Low
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500">
                          Est. search volume potential
                        </span>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatNumber(gapsSummary.totalSearchVolume || 0)}/mo
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gap list */}
                <Card className="bg-white border-zinc-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Content Opportunities</CardTitle>
                    <CardDescription>
                      Topics with no published content, sorted by opportunity score
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ScrollArea className="max-h-[600px]">
                      <div className="space-y-0.5">
                        {filteredGaps.map((gap, idx) => (
                          <GapRow key={`${gap.topic.id}-${idx}`} gap={gap} />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Auto-categorize result notification */}
      {categorizeMutation.isSuccess && categorizeMutation.data && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <Card className="bg-white border-emerald-200 shadow-lg max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    Auto-categorization complete
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {categorizeMutation.data.categorized} of{' '}
                    {categorizeMutation.data.totalPages} pages categorized into
                    clusters.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate Map Dialog */}
      <GenerateMapDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onGenerate={handleGenerate}
        isGenerating={generateMutation.isPending}
      />
    </div>
  );
}

export default TopicalMap;
