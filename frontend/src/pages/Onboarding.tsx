// Business Onboarding Flow - 6 Step Wizard
// Uses shadcn/ui + Tailwind CSS (NO Shopify Polaris)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Layout components
import { PageHeader } from '../components/layout/PageHeader';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';

// Icons
import {
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Plus,
  Loader2,
  AlertCircle,
  Building2,
  Users,
  MessageSquare,
  Target,
  Globe,
  ClipboardCheck,
  Trash2,
} from 'lucide-react';

// Hooks
import { useCreateBusinessProfile } from '../hooks/useBusinessProfile';

// Types
import type {
  BusinessProfile,
  Industry,
  ProductType,
} from '../types/qa-content.types';

// ─── Constants ───────────────────────────────────────────────────────────────

const INDUSTRIES: { label: string; value: Industry }[] = [
  { label: 'E-commerce (Physical Products)', value: 'ecommerce' },
  { label: 'SaaS / Software', value: 'saas' },
  { label: 'Services', value: 'services' },
  { label: 'Health & Wellness', value: 'health' },
  { label: 'Fashion & Apparel', value: 'fashion' },
  { label: 'Food & Beverage', value: 'food' },
  { label: 'Home & Garden', value: 'home_garden' },
  { label: 'B2B', value: 'b2b' },
];

const PRODUCT_TYPES: { label: string; value: ProductType }[] = [
  { label: 'Physical Products', value: 'physical' },
  { label: 'Digital Products', value: 'digital' },
  { label: 'Services', value: 'services' },
];

const EXPERTISE_LEVELS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Expert', value: 'expert' },
] as const;

const TONE_OPTIONS = [
  { label: 'Professional', value: 'professional' },
  { label: 'Casual', value: 'casual' },
  { label: 'Technical', value: 'technical' },
  { label: 'Friendly', value: 'friendly' },
  { label: 'Authoritative', value: 'authoritative' },
  { label: 'Conversational', value: 'conversational' },
] as const;

const PRIMARY_GOALS = [
  { label: 'Traffic Growth', value: 'traffic' },
  { label: 'Conversions', value: 'conversions' },
  { label: 'Brand Awareness', value: 'brand_awareness' },
  { label: 'Education', value: 'education' },
] as const;

const CONTENT_TYPES = [
  { label: 'How-To Guides', value: 'how-to' },
  { label: 'Comparisons', value: 'comparison' },
  { label: 'Educational', value: 'educational' },
  { label: 'Troubleshooting', value: 'troubleshooting' },
  { label: 'Buyer Guides', value: 'guide' },
] as const;

const POST_LENGTHS = [
  { label: 'Short (600-800 words)', value: 'short' },
  { label: 'Medium (1000-1500 words)', value: 'medium' },
  { label: 'Long (2000+ words)', value: 'long' },
] as const;

const STEP_META = [
  { icon: Building2, title: 'Basic Info', description: 'Tell us about your business' },
  { icon: Users, title: 'Target Audience', description: 'Who are your customers?' },
  { icon: MessageSquare, title: 'Brand Voice', description: 'How do you communicate?' },
  { icon: Target, title: 'Content Strategy', description: 'What are your content goals?' },
  { icon: Globe, title: 'Competitors', description: 'Who do you compete with?' },
  { icon: ClipboardCheck, title: 'Review', description: 'Confirm your settings' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function Onboarding() {
  const navigate = useNavigate();
  const { mutate: createProfile, isPending } = useCreateBusinessProfile();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);

  // Form state - matches BusinessProfile shape for mutation compatibility
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({
    businessName: '',
    industry: 'ecommerce' as Industry,
    productTypes: [],
    targetAudience: {
      demographics: '',
      expertiseLevel: 'beginner',
      painPoints: [],
      searchBehavior: '',
    },
    brandVoice: {
      tone: 'professional',
      personality: [],
      avoidWords: [],
      preferredWords: [],
      exampleContent: '',
    },
    contentStrategy: {
      primaryGoal: 'traffic',
      contentTypes: [],
      postLength: 'medium',
      publishingFrequency: 2,
      competitorUrls: [],
    },
    seoStrategy: {
      targetKeywords: [],
      avoidKeywords: [],
      targetLocations: ['United States'],
      languagePreference: 'en-US',
    },
    productStrategy: {
      productMentionFrequency: 'moderate',
      ctaStyle: 'soft',
      preferredCTAs: [],
    },
    advancedSettings: {
      factCheckingLevel: 'thorough',
      externalLinkingPolicy: 'moderate',
      imageStyle: 'realistic',
      schemaPreferences: ['FAQ', 'Article'],
    },
  });

  const validateStep = (step: number): boolean => {
    const newErrors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.businessName) newErrors.push('Business name is required');
        if (!formData.industry) newErrors.push('Industry is required');
        if (formData.productTypes?.length === 0) newErrors.push('Select at least one product type');
        break;
      case 2:
        if (!formData.targetAudience?.demographics) newErrors.push('Target demographics is required');
        if (formData.targetAudience?.painPoints?.length === 0) newErrors.push('Add at least one pain point');
        break;
      case 3:
        if (!formData.brandVoice?.tone) newErrors.push('Brand tone is required');
        break;
      case 4:
        if (!formData.contentStrategy?.primaryGoal) newErrors.push('Primary goal is required');
        break;
      case 5:
        // Competitors step is optional - no validation required
        break;
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
        setErrors([]);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors([]);
    }
  };

  const handleSubmit = () => {
    createProfile(formData as Parameters<typeof createProfile>[0], {
      onSuccess: () => {
        navigate('/content/discover');
      },
      onError: (error: Error) => {
        setErrors([error.message || 'Failed to create business profile']);
      },
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo formData={formData} setFormData={setFormData} />;
      case 2:
        return <Step2TargetAudience formData={formData} setFormData={setFormData} />;
      case 3:
        return <Step3BrandVoice formData={formData} setFormData={setFormData} />;
      case 4:
        return <Step4ContentStrategy formData={formData} setFormData={setFormData} />;
      case 5:
        return <Step5Competitors formData={formData} setFormData={setFormData} />;
      case 6:
        return <Step6Review formData={formData} />;
      default:
        return null;
    }
  };

  const progressPercent = (currentStep / 6) * 100;

  return (
    <div>
      <PageHeader
        title="Customize Your SEO Strategy"
        description="Tell us about your business so we can generate personalized Q&A content"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress Indicator */}
        <Card className="bg-white border-zinc-200">
          <CardContent className="pt-6">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-700">
                Step {currentStep} of 6
              </span>
              <span className="text-sm text-zinc-500">
                {STEP_META[currentStep - 1].title}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-between mt-4">
              {STEP_META.map((step, index) => {
                const stepNum = index + 1;
                const StepIcon = step.icon;
                const isCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;

                return (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => {
                      if (stepNum < currentStep) {
                        setCurrentStep(stepNum);
                        setErrors([]);
                      }
                    }}
                    className={`
                      flex flex-col items-center gap-1 group transition-colors
                      ${stepNum < currentStep ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    disabled={stepNum > currentStep}
                  >
                    <div
                      className={`
                        w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
                        ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                        ${isCurrent ? 'bg-emerald-500/10 text-emerald-600 ring-2 ring-emerald-500' : ''}
                        ${!isCompleted && !isCurrent ? 'bg-zinc-100 text-zinc-400' : ''}
                      `}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`
                        text-xs font-medium hidden sm:block
                        ${isCurrent ? 'text-emerald-600' : ''}
                        ${isCompleted ? 'text-zinc-600' : ''}
                        ${!isCompleted && !isCurrent ? 'text-zinc-400' : ''}
                      `}
                    >
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Error Banner */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  Please fix the following errors:
                </p>
                <ul className="mt-1 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setErrors([])}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step Content */}
        <Card className="bg-white border-zinc-200">
          <CardContent className="pt-6">
            {renderStep()}

            {/* Navigation Buttons */}
            <Separator className="my-6" />
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isPending}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}
              </div>
              <Button
                onClick={handleNext}
                disabled={isPending}
                className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : currentStep === 6 ? (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Setup
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Shared Types for Step Components ────────────────────────────────────────

interface StepProps {
  formData: Partial<BusinessProfile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<BusinessProfile>>>;
}

interface ReviewStepProps {
  formData: Partial<BusinessProfile>;
}

// ─── Tag Input Helper Component ──────────────────────────────────────────────

function TagInput({
  label,
  description,
  placeholder,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  description?: string;
  placeholder: string;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium text-zinc-900">{label}</Label>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 border-zinc-200"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="flex-shrink-0 gap-1"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="ml-1 hover:text-emerald-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Basic Info ──────────────────────────────────────────────────────

function Step1BasicInfo({ formData, setFormData }: StepProps) {
  const toggleProductType = (value: ProductType) => {
    const current = formData.productTypes || [];
    const updated = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value];
    setFormData({ ...formData, productTypes: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Basic Information</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Tell us the fundamentals about your business
        </p>
      </div>

      <Separator />

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName" className="text-sm font-medium text-zinc-900">
          Business Name
        </Label>
        <Input
          id="businessName"
          value={formData.businessName || ''}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          placeholder="My Awesome Store"
          className="border-zinc-200"
        />
      </div>

      {/* Industry */}
      <div className="space-y-2">
        <Label htmlFor="industry" className="text-sm font-medium text-zinc-900">
          Industry
        </Label>
        <select
          id="industry"
          value={formData.industry || 'ecommerce'}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value as Industry })}
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {INDUSTRIES.map((industry) => (
            <option key={industry.value} value={industry.value}>
              {industry.label}
            </option>
          ))}
        </select>
      </div>

      {/* Product Types */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-zinc-900">Product Types</Label>
        <div className="space-y-2">
          {PRODUCT_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={formData.productTypes?.includes(type.value) || false}
                onChange={() => toggleProductType(type.value)}
                className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
              />
              <span className="text-sm text-zinc-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Target Audience ─────────────────────────────────────────────────

function Step2TargetAudience({ formData, setFormData }: StepProps) {
  const addPainPoint = (value: string) => {
    setFormData({
      ...formData,
      targetAudience: {
        ...formData.targetAudience!,
        painPoints: [...(formData.targetAudience?.painPoints || []), value],
      },
    });
  };

  const removePainPoint = (index: number) => {
    const newPainPoints = [...(formData.targetAudience?.painPoints || [])];
    newPainPoints.splice(index, 1);
    setFormData({
      ...formData,
      targetAudience: { ...formData.targetAudience!, painPoints: newPainPoints },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Target Audience</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Help us understand who your customers are
        </p>
      </div>

      <Separator />

      {/* Demographics */}
      <div className="space-y-2">
        <Label htmlFor="demographics" className="text-sm font-medium text-zinc-900">
          Demographics
        </Label>
        <textarea
          id="demographics"
          value={formData.targetAudience?.demographics || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              targetAudience: { ...formData.targetAudience!, demographics: e.target.value },
            })
          }
          placeholder="e.g., 25-45 year old professionals, small business owners"
          rows={2}
          className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 resize-none"
        />
      </div>

      {/* Expertise Level */}
      <div className="space-y-2">
        <Label htmlFor="expertiseLevel" className="text-sm font-medium text-zinc-900">
          Expertise Level
        </Label>
        <select
          id="expertiseLevel"
          value={formData.targetAudience?.expertiseLevel || 'beginner'}
          onChange={(e) =>
            setFormData({
              ...formData,
              targetAudience: {
                ...formData.targetAudience!,
                expertiseLevel: e.target.value as 'beginner' | 'intermediate' | 'expert',
              },
            })
          }
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {EXPERTISE_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pain Points */}
      <TagInput
        label="Customer Pain Points"
        placeholder="e.g., finding quality products"
        tags={formData.targetAudience?.painPoints || []}
        onAdd={addPainPoint}
        onRemove={removePainPoint}
      />

      {/* Search Behavior */}
      <div className="space-y-2">
        <Label htmlFor="searchBehavior" className="text-sm font-medium text-zinc-900">
          Search Behavior
        </Label>
        <textarea
          id="searchBehavior"
          value={formData.targetAudience?.searchBehavior || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              targetAudience: { ...formData.targetAudience!, searchBehavior: e.target.value },
            })
          }
          placeholder="e.g., asking questions on Google, reading reviews"
          rows={2}
          className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 3: Brand Voice ─────────────────────────────────────────────────────

function Step3BrandVoice({ formData, setFormData }: StepProps) {
  const addPreferredWord = (value: string) => {
    setFormData({
      ...formData,
      brandVoice: {
        ...formData.brandVoice!,
        preferredWords: [...(formData.brandVoice?.preferredWords || []), value],
      },
    });
  };

  const removePreferredWord = (index: number) => {
    const newWords = [...(formData.brandVoice?.preferredWords || [])];
    newWords.splice(index, 1);
    setFormData({
      ...formData,
      brandVoice: { ...formData.brandVoice!, preferredWords: newWords },
    });
  };

  const addAvoidWord = (value: string) => {
    setFormData({
      ...formData,
      brandVoice: {
        ...formData.brandVoice!,
        avoidWords: [...(formData.brandVoice?.avoidWords || []), value],
      },
    });
  };

  const removeAvoidWord = (index: number) => {
    const newWords = [...(formData.brandVoice?.avoidWords || [])];
    newWords.splice(index, 1);
    setFormData({
      ...formData,
      brandVoice: { ...formData.brandVoice!, avoidWords: newWords },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Brand Voice</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Define how your content should sound
        </p>
      </div>

      <Separator />

      {/* Tone */}
      <div className="space-y-2">
        <Label htmlFor="tone" className="text-sm font-medium text-zinc-900">
          Tone
        </Label>
        <select
          id="tone"
          value={formData.brandVoice?.tone || 'professional'}
          onChange={(e) =>
            setFormData({
              ...formData,
              brandVoice: {
                ...formData.brandVoice!,
                tone: e.target.value as typeof formData.brandVoice extends { tone: infer T } ? T : string,
              },
            })
          }
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {TONE_OPTIONS.map((tone) => (
            <option key={tone.value} value={tone.value}>
              {tone.label}
            </option>
          ))}
        </select>
      </div>

      {/* Preferred Words */}
      <TagInput
        label="Preferred Words"
        description="Words you want us to use in content"
        placeholder="e.g., premium, quality, artisan"
        tags={formData.brandVoice?.preferredWords || []}
        onAdd={addPreferredWord}
        onRemove={removePreferredWord}
      />

      {/* Avoid Words */}
      <TagInput
        label="Words to Avoid"
        description="Words you don't want in content"
        placeholder="e.g., cheap, discount"
        tags={formData.brandVoice?.avoidWords || []}
        onAdd={addAvoidWord}
        onRemove={removeAvoidWord}
      />

      {/* Example Content */}
      <div className="space-y-2">
        <Label htmlFor="exampleContent" className="text-sm font-medium text-zinc-900">
          Example Content (Optional)
        </Label>
        <textarea
          id="exampleContent"
          value={formData.brandVoice?.exampleContent || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              brandVoice: { ...formData.brandVoice!, exampleContent: e.target.value },
            })
          }
          placeholder="Paste an example of your existing content so AI can learn your writing style"
          rows={6}
          className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 resize-none"
        />
        <p className="text-xs text-zinc-400">
          AI will analyze this to match your brand voice
        </p>
      </div>
    </div>
  );
}

// ─── Step 4: Content Strategy ────────────────────────────────────────────────

function Step4ContentStrategy({ formData, setFormData }: StepProps) {
  const toggleContentType = (value: string) => {
    const current = formData.contentStrategy?.contentTypes || [];
    const updated = current.includes(value as typeof current[number])
      ? current.filter((t) => t !== value)
      : [...current, value as typeof current[number]];
    setFormData({
      ...formData,
      contentStrategy: { ...formData.contentStrategy!, contentTypes: updated },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Content Strategy</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Define your content goals and preferences
        </p>
      </div>

      <Separator />

      {/* Primary Goal */}
      <div className="space-y-2">
        <Label htmlFor="primaryGoal" className="text-sm font-medium text-zinc-900">
          Primary Goal
        </Label>
        <select
          id="primaryGoal"
          value={formData.contentStrategy?.primaryGoal || 'traffic'}
          onChange={(e) =>
            setFormData({
              ...formData,
              contentStrategy: {
                ...formData.contentStrategy!,
                primaryGoal: e.target.value as 'traffic' | 'conversions' | 'brand_awareness' | 'education',
              },
            })
          }
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {PRIMARY_GOALS.map((goal) => (
            <option key={goal.value} value={goal.value}>
              {goal.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content Types */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-zinc-900">Content Types</Label>
        <div className="space-y-2">
          {CONTENT_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={formData.contentStrategy?.contentTypes?.includes(type.value as typeof formData.contentStrategy.contentTypes[number]) || false}
                onChange={() => toggleContentType(type.value)}
                className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
              />
              <span className="text-sm text-zinc-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Post Length */}
      <div className="space-y-2">
        <Label htmlFor="postLength" className="text-sm font-medium text-zinc-900">
          Post Length
        </Label>
        <select
          id="postLength"
          value={formData.contentStrategy?.postLength || 'medium'}
          onChange={(e) =>
            setFormData({
              ...formData,
              contentStrategy: {
                ...formData.contentStrategy!,
                postLength: e.target.value as 'short' | 'medium' | 'long',
              },
            })
          }
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {POST_LENGTHS.map((length) => (
            <option key={length.value} value={length.value}>
              {length.label}
            </option>
          ))}
        </select>
      </div>

      {/* Publishing Frequency */}
      <div className="space-y-2">
        <Label htmlFor="publishingFrequency" className="text-sm font-medium text-zinc-900">
          Publishing Frequency (posts per week)
        </Label>
        <Input
          id="publishingFrequency"
          type="number"
          min={1}
          max={20}
          value={formData.contentStrategy?.publishingFrequency || 2}
          onChange={(e) =>
            setFormData({
              ...formData,
              contentStrategy: {
                ...formData.contentStrategy!,
                publishingFrequency: parseInt(e.target.value) || 2,
              },
            })
          }
          className="border-zinc-200 w-32"
        />
      </div>
    </div>
  );
}

// ─── Step 5: Competitors ─────────────────────────────────────────────────────

function Step5Competitors({ formData, setFormData }: StepProps) {
  const [competitorUrl, setCompetitorUrl] = useState('');
  const competitorUrls = formData.contentStrategy?.competitorUrls || [];

  const addCompetitor = () => {
    const trimmed = competitorUrl.trim();
    if (trimmed && competitorUrls.length < 5) {
      setFormData({
        ...formData,
        contentStrategy: {
          ...formData.contentStrategy!,
          competitorUrls: [...competitorUrls, trimmed],
        },
      });
      setCompetitorUrl('');
    }
  };

  const removeCompetitor = (index: number) => {
    const newUrls = [...competitorUrls];
    newUrls.splice(index, 1);
    setFormData({
      ...formData,
      contentStrategy: { ...formData.contentStrategy!, competitorUrls: newUrls },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCompetitor();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Competitor Analysis</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Add up to 5 competitor websites. We'll analyze their content to find gaps and opportunities.
        </p>
      </div>

      <Separator />

      {/* Add Competitor Input */}
      <div className="space-y-2">
        <Label htmlFor="competitorUrl" className="text-sm font-medium text-zinc-900">
          Competitor Website URL
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="competitorUrl"
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            type="url"
            className="flex-1 border-zinc-200"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCompetitor}
            disabled={competitorUrls.length >= 5}
            className="flex-shrink-0 gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
        <p className="text-xs text-zinc-400">
          {competitorUrls.length}/5 competitors added
        </p>
      </div>

      {/* Competitor List */}
      {competitorUrls.length > 0 && (
        <div className="space-y-2">
          {competitorUrls.map((url, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 bg-zinc-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-700 truncate">{url}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCompetitor(index)}
                className="text-zinc-400 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {competitorUrls.length === 0 && (
        <div className="text-center py-8 text-zinc-400">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No competitors added yet</p>
          <p className="text-xs mt-1">This step is optional - you can skip it</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 6: Review ──────────────────────────────────────────────────────────

function Step6Review({ formData }: ReviewStepProps) {
  const industryLabel = INDUSTRIES.find((i) => i.value === formData.industry)?.label || formData.industry;
  const toneLabel = TONE_OPTIONS.find((t) => t.value === formData.brandVoice?.tone)?.label || formData.brandVoice?.tone;
  const goalLabel = PRIMARY_GOALS.find((g) => g.value === formData.contentStrategy?.primaryGoal)?.label || formData.contentStrategy?.primaryGoal;
  const lengthLabel = POST_LENGTHS.find((l) => l.value === formData.contentStrategy?.postLength)?.label || formData.contentStrategy?.postLength;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Review Your Setup</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Confirm everything looks correct before completing setup
        </p>
      </div>

      <Separator />

      {/* Basic Information */}
      <ReviewSection title="Basic Information" icon={Building2}>
        <ReviewField label="Business Name" value={formData.businessName} />
        <ReviewField label="Industry" value={industryLabel} />
        <ReviewField
          label="Product Types"
          value={formData.productTypes?.map((t) => PRODUCT_TYPES.find((pt) => pt.value === t)?.label || t).join(', ')}
        />
      </ReviewSection>

      {/* Target Audience */}
      <ReviewSection title="Target Audience" icon={Users}>
        <ReviewField label="Demographics" value={formData.targetAudience?.demographics} />
        <ReviewField
          label="Expertise Level"
          value={EXPERTISE_LEVELS.find((l) => l.value === formData.targetAudience?.expertiseLevel)?.label}
        />
        {(formData.targetAudience?.painPoints?.length ?? 0) > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pain Points</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {formData.targetAudience?.painPoints?.map((point, index) => (
                <Badge key={index} variant="secondary" className="bg-zinc-100 text-zinc-700">
                  {point}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {formData.targetAudience?.searchBehavior && (
          <ReviewField label="Search Behavior" value={formData.targetAudience.searchBehavior} />
        )}
      </ReviewSection>

      {/* Brand Voice */}
      <ReviewSection title="Brand Voice" icon={MessageSquare}>
        <ReviewField label="Tone" value={toneLabel} />
        {(formData.brandVoice?.preferredWords?.length ?? 0) > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Preferred Words</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {formData.brandVoice?.preferredWords?.map((word, index) => (
                <Badge key={index} variant="secondary" className="bg-emerald-50 text-emerald-700">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {(formData.brandVoice?.avoidWords?.length ?? 0) > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Words to Avoid</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {formData.brandVoice?.avoidWords?.map((word, index) => (
                <Badge key={index} variant="secondary" className="bg-red-50 text-red-700">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </ReviewSection>

      {/* Content Strategy */}
      <ReviewSection title="Content Strategy" icon={Target}>
        <ReviewField label="Primary Goal" value={goalLabel} />
        {(formData.contentStrategy?.contentTypes?.length ?? 0) > 0 && (
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Content Types</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {formData.contentStrategy?.contentTypes?.map((type, index) => (
                <Badge key={index} variant="secondary" className="bg-zinc-100 text-zinc-700">
                  {CONTENT_TYPES.find((ct) => ct.value === type)?.label || type}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <ReviewField label="Post Length" value={lengthLabel} />
        <ReviewField
          label="Publishing Frequency"
          value={`${formData.contentStrategy?.publishingFrequency || 2} posts/week`}
        />
      </ReviewSection>

      {/* Competitors */}
      {(formData.contentStrategy?.competitorUrls?.length ?? 0) > 0 && (
        <ReviewSection title="Competitors" icon={Globe}>
          <div className="space-y-1.5">
            {formData.contentStrategy?.competitorUrls?.map((url, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-zinc-700">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                {url}
              </div>
            ))}
          </div>
        </ReviewSection>
      )}
    </div>
  );
}

// ─── Review Helper Components ────────────────────────────────────────────────

function ReviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="space-y-2 pl-6">{children}</div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      <p className="text-sm text-zinc-800 mt-0.5">{value}</p>
    </div>
  );
}

export default Onboarding;
