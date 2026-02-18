// Content Generation Page - AI content creation wizard with product selection and variant review
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
} from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Badge,
  Separator,
  Skeleton,
  ScrollArea,
} from '@/components/ui';
import {
  Package,
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Image as ImageIcon,
  ArrowRight,
  Send,
  Star,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import {
  useGenerateContent,
  usePublishContent,
} from '@/hooks/useContentGeneration';
import type {
  AIModel,
  ContentGeneration as ContentGenerationType,
  ContentVariant,
  Product,
} from '@/types/api.types';

// --- Step Indicator ---
function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { label: string; description: string }[];
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={`hidden sm:block w-12 h-0.5 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-zinc-200'
                }`}
              />
            )}
            <div className="flex items-center gap-3">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                  transition-colors duration-200
                  ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                      : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                  }
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
              </div>
              <div className="hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    isActive ? 'text-zinc-900' : 'text-zinc-500'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-zinc-400">{step.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Product Selection Card ---
function ProductCard({
  product,
  isSelected,
  onToggle,
}: {
  product: Product;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const imageUrl = product.images?.[0]?.src;

  return (
    <button
      onClick={onToggle}
      className={`
        w-full text-left rounded-lg border-2 p-4 transition-all duration-200
        hover:shadow-md cursor-pointer
        ${
          isSelected
            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
            : 'border-zinc-200 bg-white hover:border-zinc-300'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div
          className={`
            flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors duration-200
            ${
              isSelected
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-zinc-300 bg-white'
            }
          `}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        {/* Product Image */}
        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-zinc-300" />
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-900 truncate">
            {product.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {product.vendor || 'No vendor'} &middot;{' '}
            {product.productType || 'General'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={product.status === 'active' ? 'default' : 'secondary'}
              className={`text-xs ${
                product.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : ''
              }`}
            >
              {product.status}
            </Badge>
            <SEOScoreBadge score={product.seoScore} />
          </div>
        </div>
      </div>
    </button>
  );
}

// --- SEO Score Badge ---
function SEOScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 60
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      <Star className="w-3 h-3" />
      SEO {score}
    </span>
  );
}

// --- Quality Score Badge ---
function QualityScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : score >= 70
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200';

  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Fair';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}
    >
      {score >= 85 ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      {score}/100 - {label}
    </span>
  );
}

// --- Content Variant Card ---
function VariantCard({
  variant,
  index,
  onApprove,
  onReject,
  isPublishing,
}: {
  variant: ContentVariant;
  index: number;
  onApprove: (variantId: string) => void;
  onReject: (variantId: string) => void;
  isPublishing: boolean;
}) {
  return (
    <Card className="bg-white border-zinc-200 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Variant {index + 1}
          </CardTitle>
          <QualityScoreBadge score={variant.qualityScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meta Title */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Meta Title
          </label>
          <p className="mt-1 text-sm font-medium text-zinc-900 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
            {variant.metaTitle}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {variant.metaTitle.length}/60 characters
          </p>
        </div>

        {/* Meta Description */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Meta Description
          </label>
          <p className="mt-1 text-sm text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100 leading-relaxed">
            {variant.metaDescription}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {variant.metaDescription.length}/160 characters
          </p>
        </div>

        {/* Reasoning */}
        {variant.reasoning && (
          <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
            <p className="text-xs font-medium text-blue-700 mb-1">
              AI Reasoning
            </p>
            <p className="text-xs text-blue-600 leading-relaxed">
              {variant.reasoning}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-3 pt-3 border-t border-zinc-100">
        <PrimaryButton
          onClick={() => onApprove(variant.id)}
          disabled={isPublishing}
          icon={Check}
        >
          {isPublishing ? 'Publishing...' : 'Approve & Publish'}
        </PrimaryButton>
        <GhostButton
          onClick={() => onReject(variant.id)}
          disabled={isPublishing}
          icon={X}
        >
          Reject
        </GhostButton>
      </CardFooter>
    </Card>
  );
}

// --- AI Model Options ---
const AI_MODEL_OPTIONS: { value: AIModel; label: string; description: string; tier: string }[] = [
  {
    value: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective for most tasks',
    tier: 'Fast',
  },
  {
    value: 'gpt-4',
    label: 'GPT-4',
    description: 'Highest quality OpenAI model',
    tier: 'Premium',
  },
  {
    value: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    description: 'Balanced speed and quality',
    tier: 'Balanced',
  },
  {
    value: 'claude-3-haiku',
    label: 'Claude 3 Haiku',
    description: 'Fast Anthropic model for quick tasks',
    tier: 'Fast',
  },
  {
    value: 'claude-3-sonnet',
    label: 'Claude 3 Sonnet',
    description: 'Balanced Anthropic model',
    tier: 'Balanced',
  },
  {
    value: 'claude-3-opus',
    label: 'Claude 3 Opus',
    description: 'Best quality Anthropic model',
    tier: 'Premium',
  },
];

// --- Steps Configuration ---
const STEPS = [
  { label: 'Select Products', description: 'Choose products to optimize' },
  { label: 'AI Model', description: 'Pick your AI engine' },
  { label: 'Review Variants', description: 'Compare generated content' },
  { label: 'Publish', description: 'Push to Shopify' },
];

// --- Main Page Component ---
export function ContentGeneration() {
  const navigate = useNavigate();

  // Data hooks
  const { data: products, isLoading: isLoadingProducts } = useProducts();
  const {
    mutate: generateContent,
    isPending: isGenerating,
    data: generationResult,
    error: generationError,
    reset: resetGeneration,
  } = useGenerateContent();
  const {
    mutate: publishContent,
    isPending: isPublishing,
  } = usePublishContent();

  // Local state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedModel, setSelectedModel] = useState<AIModel>('gpt-4-turbo');
  const [searchQuery, setSearchQuery] = useState('');
  const [generations, setGenerations] = useState<ContentGenerationType[]>([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);

  // Sync generation results to local state
  useEffect(() => {
    if (generationResult?.contentGenerations) {
      setGenerations(generationResult.contentGenerations);
      setCurrentStep(3);
    }
  }, [generationResult]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.vendor?.toLowerCase().includes(query) ||
        p.productType?.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  // Selected products list
  const selectedProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => selectedProductIds.has(p.id));
  }, [products, selectedProductIds]);

  // Current product being reviewed (for step 3)
  const currentProduct = selectedProducts[currentProductIndex];
  const currentGeneration = generations.find(
    (g) => g.productId === currentProduct?.id
  );

  // Toggle product selection
  const toggleProduct = useCallback((productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  // Select all visible products
  const selectAll = useCallback(() => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      filteredProducts.forEach((p) => next.add(p.id));
      return next;
    });
  }, [filteredProducts]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedProductIds(new Set());
  }, []);

  // Handle generate
  const handleGenerate = useCallback(() => {
    if (selectedProductIds.size === 0) return;
    generateContent({
      productIds: Array.from(selectedProductIds),
      aiModel: selectedModel,
      numberOfVariants: 3,
    });
  }, [selectedProductIds, selectedModel, generateContent]);

  // Handle approve variant
  const handleApprove = useCallback(
    (variantId: string) => {
      if (!currentGeneration) return;
      publishContent(
        {
          contentGenerationId: currentGeneration.id,
          variantId,
        },
        {
          onSuccess: () => {
            const newPublished = publishedCount + 1;
            setPublishedCount(newPublished);

            if (currentProductIndex < selectedProducts.length - 1) {
              setCurrentProductIndex(currentProductIndex + 1);
            } else {
              // All products published
              setCurrentStep(4);
            }
          },
        }
      );
    },
    [
      currentGeneration,
      publishContent,
      publishedCount,
      currentProductIndex,
      selectedProducts.length,
    ]
  );

  // Handle reject - regenerate content for current product
  const handleReject = useCallback(
    (_variantId: string) => {
      if (!currentProduct) return;
      generateContent({
        productIds: [currentProduct.id],
        aiModel: selectedModel,
        numberOfVariants: 3,
      });
    },
    [currentProduct, generateContent, selectedModel]
  );

  // Navigate between steps
  const goToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > 4) return;
      // Only allow going back or moving forward with valid state
      if (step <= currentStep) {
        if (step === 1) {
          resetGeneration();
          setGenerations([]);
          setCurrentProductIndex(0);
          setPublishedCount(0);
        }
        setCurrentStep(step);
      }
    },
    [currentStep, resetGeneration]
  );

  // --- Loading State ---
  if (isLoadingProducts) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <PageHeader
          title="Content Generation"
          description="Generate AI-optimized SEO content for your products"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 bg-zinc-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <PageHeader
        title="Content Generation"
        description="Generate AI-optimized SEO content for your products"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Content Generation' },
        ]}
        onBreadcrumbClick={(path) => navigate(path)}
      />

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {/* === STEP 1: Select Products === */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Search and Controls */}
          <Card className="bg-white border-zinc-200">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, vendor, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>

                {/* Selection controls */}
                <div className="flex items-center gap-2">
                  <GhostButton onClick={selectAll}>Select All</GhostButton>
                  <GhostButton onClick={deselectAll}>Clear</GhostButton>
                </div>
              </div>

              {/* Selection summary */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  {filteredProducts.length} product
                  {filteredProducts.length !== 1 ? 's' : ''} found
                  {selectedProductIds.size > 0 && (
                    <span className="ml-2 text-emerald-600 font-medium">
                      &middot; {selectedProductIds.size} selected
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product Grid */}
          <ScrollArea className="h-[calc(100vh-460px)] min-h-[300px]">
            {filteredProducts.length === 0 ? (
              <Card className="bg-white border-zinc-200">
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-900">
                    No products found
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Sync your products from Shopify first'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedProductIds.has(product.id)}
                    onToggle={() => toggleProduct(product.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Step 1 Footer */}
          <div className="flex items-center justify-end pt-4 border-t border-zinc-200">
            <PrimaryButton
              onClick={() => setCurrentStep(2)}
              disabled={selectedProductIds.size === 0}
              icon={ArrowRight}
            >
              Continue with {selectedProductIds.size} Product
              {selectedProductIds.size !== 1 ? 's' : ''}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* === STEP 2: Select AI Model === */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Choose AI Model</CardTitle>
              <CardDescription>
                Select the AI model to generate SEO content. Higher quality
                models provide better results but take longer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AI_MODEL_OPTIONS.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => setSelectedModel(model.value)}
                    className={`
                      w-full text-left rounded-lg border-2 p-4 transition-all duration-200
                      hover:shadow-md cursor-pointer
                      ${
                        selectedModel === model.value
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {model.label}
                      </h3>
                      <Badge
                        className={`text-xs ${
                          model.tier === 'Premium'
                            ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : model.tier === 'Balanced'
                            ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {model.tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500">{model.description}</p>
                    {selectedModel === model.value && (
                      <div className="mt-3 flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">Selected</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Generation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Products
                  </p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">
                    {selectedProductIds.size}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    AI Model
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {AI_MODEL_OPTIONS.find((m) => m.value === selectedModel)
                      ?.label || selectedModel}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Variants per Product
                  </p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Banner */}
          {generationError && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Generation Failed
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      {generationError.message ||
                        'An error occurred while generating content. Please try again.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
            <SecondaryButton onClick={() => goToStep(1)} icon={ChevronLeft}>
              Back
            </SecondaryButton>
            <PrimaryButton
              onClick={handleGenerate}
              disabled={isGenerating}
              icon={isGenerating ? Loader2 : Sparkles}
            >
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* === Generating Overlay === */}
      {isGenerating && currentStep === 2 && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <Card className="bg-white border-zinc-200 w-full max-w-md mx-4 shadow-xl">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="relative mx-auto w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-50" />
                <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Generating Content
              </h3>
              <p className="text-sm text-zinc-500 mt-2">
                AI is crafting SEO-optimized content for{' '}
                {selectedProductIds.size} product
                {selectedProductIds.size !== 1 ? 's' : ''}...
              </p>
              <p className="text-xs text-zinc-400 mt-4">
                This may take up to 30 seconds per product
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === STEP 3: Review Variants === */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Product navigation */}
          {selectedProducts.length > 1 && (
            <Card className="bg-white border-zinc-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
                      {currentProduct?.images?.[0]?.src ? (
                        <img
                          src={currentProduct.images[0].src}
                          alt={currentProduct?.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-zinc-300" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {currentProduct?.title}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Product {currentProductIndex + 1} of{' '}
                        {selectedProducts.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <SecondaryButton
                      onClick={() =>
                        setCurrentProductIndex(
                          Math.max(0, currentProductIndex - 1)
                        )
                      }
                      disabled={currentProductIndex === 0}
                      icon={ChevronLeft}
                    >
                      Previous
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() =>
                        setCurrentProductIndex(
                          Math.min(
                            selectedProducts.length - 1,
                            currentProductIndex + 1
                          )
                        )
                      }
                      disabled={
                        currentProductIndex === selectedProducts.length - 1
                      }
                      icon={ChevronRight}
                    >
                      Next
                    </SecondaryButton>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mt-4">
                  {selectedProducts.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentProductIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === currentProductIndex
                          ? 'w-6 bg-emerald-500'
                          : i < currentProductIndex
                          ? 'w-1.5 bg-emerald-300'
                          : 'w-1.5 bg-zinc-200'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variants */}
          {currentGeneration &&
          currentGeneration.variants &&
          currentGeneration.variants.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {currentGeneration.variants.map((variant, index) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  index={index}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isPublishing={isPublishing}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-white border-zinc-200">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-zinc-900">
                  No variants generated for this product
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Try regenerating content for this product.
                </p>
                <div className="mt-4">
                  <SecondaryButton
                    onClick={() => {
                      if (currentProduct) {
                        generateContent({
                          productIds: [currentProduct.id],
                          aiModel: selectedModel,
                          numberOfVariants: 3,
                        });
                      }
                    }}
                    icon={RefreshCw}
                  >
                    Regenerate
                  </SecondaryButton>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3 Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
            <SecondaryButton onClick={() => goToStep(1)} icon={ChevronLeft}>
              Start Over
            </SecondaryButton>
            <p className="text-sm text-zinc-500">
              {publishedCount} of {selectedProducts.length} published
            </p>
          </div>
        </div>
      )}

      {/* === STEP 4: Publish Confirmation === */}
      {currentStep === 4 && (
        <div className="max-w-lg mx-auto">
          <Card className="bg-white border-zinc-200 text-center">
            <CardContent className="pt-10 pb-10">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">
                Content Published Successfully
              </h2>
              <p className="text-sm text-zinc-500 mt-3 max-w-sm mx-auto">
                SEO content has been generated and published for{' '}
                {publishedCount} product
                {publishedCount !== 1 ? 's' : ''}. Changes are now live on your
                Shopify store.
              </p>

              <Separator className="my-6" />

              <div className="grid grid-cols-3 gap-4 text-center mb-8">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {publishedCount}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Products Updated</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">
                    {publishedCount * 3}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Variants Reviewed
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">
                    {AI_MODEL_OPTIONS.find((m) => m.value === selectedModel)
                      ?.label || selectedModel}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">AI Model Used</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <PrimaryButton onClick={() => navigate('/')} icon={Send}>
                  Back to Dashboard
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedProductIds(new Set());
                    setGenerations([]);
                    setCurrentProductIndex(0);
                    setPublishedCount(0);
                    resetGeneration();
                  }}
                  icon={RefreshCw}
                >
                  Generate More
                </SecondaryButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ContentGeneration;
