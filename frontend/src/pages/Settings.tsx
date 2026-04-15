// Settings Page - Tabbed configuration using shadcn/ui
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, PrimaryButton, SecondaryButton, GhostButton } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  Label,
  Separator,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import {
  Settings2,
  Bot,
  Search,
  User,
  Save,
  Loader2,
  Check,
  CheckCircle,
  AlertCircle,
  X,
  Trash2,
  Globe,
  CreditCard,
  Shield,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  useBusinessProfile,
  useUpdateBusinessProfile,
} from '@/hooks/useBusinessProfile';
import type {
  BusinessProfile,
  Industry,
  BrandVoice,
  SEOStrategy,
  AdvancedSettings,
  ContentStrategy,
} from '@/types/qa-content.types';
import type { AIModel } from '@/types/api.types';

// --- Notification Banner ---
function NotificationBanner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`
        flex items-center justify-between gap-3 px-4 py-3 rounded-lg border mb-6 animate-in fade-in slide-in-from-top-2 duration-300
        ${
          type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }
      `}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
        )}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Tag Input Component ---
function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[42px] rounded-md border border-zinc-200 bg-white focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-sm border border-zinc-200"
        >
          {tag}
          <button
            onClick={() => removeTag(index)}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-zinc-400"
      />
    </div>
  );
}

// --- Styled Select (native) ---
function StyledSelect({
  label,
  value,
  onChange,
  options,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  helpText?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-700">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helpText && (
        <p className="text-xs text-zinc-400">{helpText}</p>
      )}
    </div>
  );
}

// --- Field Group ---
function FieldGroup({
  label,
  helpText,
  children,
}: {
  label: string;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-700">{label}</Label>
      {children}
      {helpText && <p className="text-xs text-zinc-400">{helpText}</p>}
    </div>
  );
}

// --- AI Model Options ---
const AI_MODEL_OPTIONS: { value: AIModel; label: string }[] = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
];

// --- Industry Options ---
const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'services', label: 'Services' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'home_garden', label: 'Home & Garden' },
  { value: 'b2b', label: 'B2B' },
];

// --- Tone Options ---
const TONE_OPTIONS: { value: BrandVoice['tone']; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'technical', label: 'Technical' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'conversational', label: 'Conversational' },
];

// --- Language Options ---
const LANGUAGE_OPTIONS: { value: SEOStrategy['languagePreference']; label: string }[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

// --- Post Length Options ---
const POST_LENGTH_OPTIONS: { value: ContentStrategy['postLength']; label: string }[] = [
  { value: 'short', label: 'Short (500-800 words)' },
  { value: 'medium', label: 'Medium (800-1500 words)' },
  { value: 'long', label: 'Long (1500+ words)' },
];

// --- Primary Goal Options ---
const PRIMARY_GOAL_OPTIONS: { value: ContentStrategy['primaryGoal']; label: string }[] = [
  { value: 'traffic', label: 'Drive Traffic' },
  { value: 'conversions', label: 'Increase Conversions' },
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'education', label: 'Customer Education' },
];

// --- Fact-Checking Level Options ---
const FACT_CHECK_OPTIONS: { value: AdvancedSettings['factCheckingLevel']; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'thorough', label: 'Thorough' },
  { value: 'expert', label: 'Expert' },
];

// --- Schema Preference Options ---
const SCHEMA_OPTIONS = [
  'FAQPage',
  'HowTo',
  'Product',
  'Article',
  'BreadcrumbList',
  'Organization',
  'LocalBusiness',
  'Review',
];

// --- Default Settings State ---
function getDefaultSettings(): Partial<BusinessProfile> {
  return {
    businessName: '',
    industry: 'ecommerce',
    productTypes: ['physical'],
    brandVoice: {
      tone: 'professional',
      personality: [],
      avoidWords: [],
      preferredWords: [],
      exampleContent: '',
    },
    contentStrategy: {
      primaryGoal: 'traffic',
      contentTypes: ['how-to', 'educational'],
      postLength: 'medium',
      publishingFrequency: 3,
      competitorUrls: [],
    },
    seoStrategy: {
      targetKeywords: [],
      avoidKeywords: [],
      targetLocations: [],
      languagePreference: 'en-US',
    },
    advancedSettings: {
      factCheckingLevel: 'thorough',
      externalLinkingPolicy: 'moderate',
      imageStyle: 'realistic',
      schemaPreferences: ['FAQPage', 'Product'],
    },
  };
}

// --- Main Page Component ---
export function Settings() {
  const navigate = useNavigate();

  // Data hooks
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
  } = useBusinessProfile();
  const {
    mutate: updateProfile,
    isPending: isSaving,
  } = useUpdateBusinessProfile();

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Local AI model preference (not stored in BusinessProfile, stored separately)
  const [defaultAIModel, setDefaultAIModel] = useState<AIModel>('gpt-4-turbo');

  // Form state
  const [formData, setFormData] = useState<Partial<BusinessProfile>>(
    getDefaultSettings()
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form from profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        businessName: profile.businessName || '',
        industry: profile.industry || 'ecommerce',
        productTypes: profile.productTypes || ['physical'],
        brandVoice: profile.brandVoice || getDefaultSettings().brandVoice!,
        contentStrategy:
          profile.contentStrategy || getDefaultSettings().contentStrategy!,
        seoStrategy: profile.seoStrategy || getDefaultSettings().seoStrategy!,
        advancedSettings:
          profile.advancedSettings || getDefaultSettings().advancedSettings!,
      });
      setHasChanges(false);
    }
  }, [profile]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Generic updater helper
  const updateField = useCallback(
    <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
    },
    []
  );

  // Nested object updater helper
  const updateNestedField = useCallback(
    <K extends keyof BusinessProfile>(
      parentKey: K,
      childKey: string,
      value: unknown
    ) => {
      setFormData((prev) => ({
        ...prev,
        [parentKey]: {
          ...(prev[parentKey] as unknown as Record<string, unknown>),
          [childKey]: value,
        },
      }));
      setHasChanges(true);
    },
    []
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (!profile?.id) {
      setNotification({
        type: 'error',
        message:
          'No business profile found. Complete onboarding first.',
      });
      return;
    }

    updateProfile(
      { id: profile.id, ...formData },
      {
        onSuccess: () => {
          setNotification({
            type: 'success',
            message: 'Settings saved successfully.',
          });
          setHasChanges(false);
        },
        onError: (error) => {
          setNotification({
            type: 'error',
            message:
              error.message || 'Failed to save settings. Please try again.',
          });
        },
      }
    );
  }, [profile?.id, formData, updateProfile]);

  // Toggle schema preference
  const toggleSchema = useCallback(
    (schema: string) => {
      const current = formData.advancedSettings?.schemaPreferences || [];
      const updated = current.includes(schema)
        ? current.filter((s) => s !== schema)
        : [...current, schema];
      updateNestedField('advancedSettings', 'schemaPreferences', updated);
    },
    [formData.advancedSettings?.schemaPreferences, updateNestedField]
  );

  // --- Loading State ---
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <PageHeader
          title="Settings"
          description="Configure your store and AI preferences"
        />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full max-w-md bg-zinc-200" />
          <Skeleton className="h-64 bg-zinc-200" />
          <Skeleton className="h-48 bg-zinc-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <PageHeader
        title="Settings"
        description="Configure your store, AI preferences, and SEO strategy"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Settings' },
        ]}
        onBreadcrumbClick={(path) => navigate(path)}
      >
        <PrimaryButton
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          icon={isSaving ? Loader2 : Save}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </PrimaryButton>
      </PageHeader>

      {/* Notification */}
      {notification && (
        <NotificationBanner
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Profile error state */}
      {isProfileError && (
        <Card className="bg-amber-50 border-amber-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Could not load business profile
                </p>
                <p className="text-sm text-amber-600 mt-1">
                  Using default settings. Complete the{' '}
                  <button
                    onClick={() => navigate('/onboarding')}
                    className="underline hover:no-underline font-medium"
                  >
                    onboarding wizard
                  </button>{' '}
                  to create your profile.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Layout */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-zinc-100 border border-zinc-200">
          <TabsTrigger value="general" className="gap-1.5 data-[state=active]:bg-white">
            <Settings2 className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 data-[state=active]:bg-white">
            <Bot className="w-4 h-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5 data-[state=active]:bg-white">
            <Search className="w-4 h-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5 data-[state=active]:bg-white">
            <User className="w-4 h-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* ==================== GENERAL TAB ==================== */}
        <TabsContent value="general" className="space-y-6">
          {/* Store Information (Read-Only) */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-zinc-400" />
                <div>
                  <CardTitle className="text-lg">Store Information</CardTitle>
                  <CardDescription>
                    Connected Shopify store details. These are read-only from
                    your session.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Store Name
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {profile?.businessName || 'My Shopify Store'}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Industry
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 capitalize">
                    {profile?.industry?.replace('_', ' ') || 'E-Commerce'}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Organization ID
                  </p>
                  <p className="mt-1 text-xs font-mono text-zinc-600">
                    {profile?.organizationId || 'Not connected'}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Product Types
                  </p>
                  <div className="flex gap-1.5 mt-1.5">
                    {(profile?.productTypes || ['physical']).map((type) => (
                      <Badge
                        key={type}
                        variant="secondary"
                        className="capitalize text-xs"
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Configuration */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Business Configuration</CardTitle>
              <CardDescription>
                Update your business name and industry settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup label="Business Name" helpText="Used in generated content headers and footers">
                <Input
                  value={formData.businessName || ''}
                  onChange={(e) =>
                    updateField(
                      'businessName',
                      e.target.value as BusinessProfile['businessName']
                    )
                  }
                  placeholder="Your Store Name"
                />
              </FieldGroup>

              <StyledSelect
                label="Industry"
                value={formData.industry || 'ecommerce'}
                onChange={(value) =>
                  updateField('industry', value as Industry)
                }
                options={INDUSTRY_OPTIONS}
                helpText="Helps the AI generate industry-specific content"
              />
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-zinc-400" />
                <div>
                  <CardTitle className="text-lg">API Configuration</CardTitle>
                  <CardDescription>
                    Connect external services for enhanced analytics.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup
                label="Google Search Console"
                helpText="Connect to view organic search performance data"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-200 bg-amber-50"
                  >
                    Not Connected
                  </Badge>
                  <SecondaryButton
                    onClick={() => {
                      // In production, this would initiate OAuth flow
                      setNotification({
                        type: 'error',
                        message:
                          'Google Search Console integration requires OAuth setup. Configure in your Google Cloud Console.',
                      });
                    }}
                    icon={ExternalLink}
                  >
                    Connect
                  </SecondaryButton>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== AI SETTINGS TAB ==================== */}
        <TabsContent value="ai" className="space-y-6">
          {/* Default AI Model */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-zinc-400" />
                <div>
                  <CardTitle className="text-lg">Default AI Model</CardTitle>
                  <CardDescription>
                    Choose the default model for content generation. This can be
                    overridden per generation.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AI_MODEL_OPTIONS.map((model) => {
                  const tier =
                    model.value.includes('opus') || model.value === 'gpt-4'
                      ? 'Premium'
                      : model.value.includes('sonnet') ||
                        model.value.includes('turbo')
                      ? 'Balanced'
                      : 'Fast';
                  const isSelected = defaultAIModel === model.value;

                  return (
                    <button
                      key={model.value}
                      onClick={() => {
                        setDefaultAIModel(model.value);
                        setHasChanges(true);
                      }}
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
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {model.label}
                        </h3>
                        <Badge
                          className={`text-xs ${
                            tier === 'Premium'
                              ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : tier === 'Balanced'
                              ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {tier}
                        </Badge>
                      </div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">
                            Default Model
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Brand Voice Settings */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Brand Voice</CardTitle>
              <CardDescription>
                Configure how the AI writes content for your brand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StyledSelect
                label="Tone of Voice"
                value={formData.brandVoice?.tone || 'professional'}
                onChange={(value) =>
                  updateNestedField(
                    'brandVoice',
                    'tone',
                    value
                  )
                }
                options={TONE_OPTIONS}
                helpText="Sets the overall voice for all AI-generated content"
              />

              <FieldGroup
                label="Brand Personality Traits"
                helpText="Press Enter to add traits (e.g., innovative, trustworthy)"
              >
                <TagInput
                  tags={formData.brandVoice?.personality || []}
                  onChange={(tags) =>
                    updateNestedField('brandVoice', 'personality', tags)
                  }
                  placeholder="Type a trait and press Enter..."
                />
              </FieldGroup>

              <FieldGroup
                label="Preferred Words"
                helpText="Words the AI should favor in generated content"
              >
                <TagInput
                  tags={formData.brandVoice?.preferredWords || []}
                  onChange={(tags) =>
                    updateNestedField('brandVoice', 'preferredWords', tags)
                  }
                  placeholder="Add preferred words..."
                />
              </FieldGroup>

              <FieldGroup
                label="Words to Avoid"
                helpText="Words the AI should not use in generated content"
              >
                <TagInput
                  tags={formData.brandVoice?.avoidWords || []}
                  onChange={(tags) =>
                    updateNestedField('brandVoice', 'avoidWords', tags)
                  }
                  placeholder="Add words to avoid..."
                />
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Content Preferences */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Content Preferences</CardTitle>
              <CardDescription>
                Control how the AI generates and structures content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StyledSelect
                label="Primary Goal"
                value={formData.contentStrategy?.primaryGoal || 'traffic'}
                onChange={(value) =>
                  updateNestedField('contentStrategy', 'primaryGoal', value)
                }
                options={PRIMARY_GOAL_OPTIONS}
                helpText="The main objective for generated content"
              />

              <StyledSelect
                label="Post Length"
                value={formData.contentStrategy?.postLength || 'medium'}
                onChange={(value) =>
                  updateNestedField('contentStrategy', 'postLength', value)
                }
                options={POST_LENGTH_OPTIONS}
                helpText="Default length for generated articles and pages"
              />

              <StyledSelect
                label="Fact-Checking Level"
                value={
                  formData.advancedSettings?.factCheckingLevel || 'thorough'
                }
                onChange={(value) =>
                  updateNestedField(
                    'advancedSettings',
                    'factCheckingLevel',
                    value
                  )
                }
                options={FACT_CHECK_OPTIONS}
                helpText="How rigorously the AI verifies claims in generated content"
              />

              <FieldGroup label="Publishing Frequency" helpText="Target number of posts per week">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.contentStrategy?.publishingFrequency || 3}
                  onChange={(e) =>
                    updateNestedField(
                      'contentStrategy',
                      'publishingFrequency',
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== SEO TAB ==================== */}
        <TabsContent value="seo" className="space-y-6">
          {/* Target Keywords */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Target Keywords</CardTitle>
              <CardDescription>
                Define keywords the AI should target in meta titles and
                descriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup
                label="Primary Keywords"
                helpText="Main keywords to include in SEO content. Press Enter to add."
              >
                <TagInput
                  tags={formData.seoStrategy?.targetKeywords || []}
                  onChange={(tags) =>
                    updateNestedField('seoStrategy', 'targetKeywords', tags)
                  }
                  placeholder="e.g., organic skincare, natural products..."
                />
              </FieldGroup>

              <FieldGroup
                label="Keywords to Avoid"
                helpText="Keywords that should not appear in generated content"
              >
                <TagInput
                  tags={formData.seoStrategy?.avoidKeywords || []}
                  onChange={(tags) =>
                    updateNestedField('seoStrategy', 'avoidKeywords', tags)
                  }
                  placeholder="e.g., cheap, discount..."
                />
              </FieldGroup>

              <FieldGroup
                label="Target Locations"
                helpText="Geographic locations to optimize for in local SEO"
              >
                <TagInput
                  tags={formData.seoStrategy?.targetLocations || []}
                  onChange={(tags) =>
                    updateNestedField('seoStrategy', 'targetLocations', tags)
                  }
                  placeholder="e.g., New York, London..."
                />
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Language Preference */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Language & Locale</CardTitle>
              <CardDescription>
                Configure the primary language for content generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StyledSelect
                label="Language Preference"
                value={formData.seoStrategy?.languagePreference || 'en-US'}
                onChange={(value) =>
                  updateNestedField(
                    'seoStrategy',
                    'languagePreference',
                    value
                  )
                }
                options={LANGUAGE_OPTIONS}
                helpText="AI will generate content in this language"
              />
            </CardContent>
          </Card>

          {/* Schema Preferences */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Schema Markup Preferences</CardTitle>
              <CardDescription>
                Select which structured data schemas to include in generated
                content for rich search results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SCHEMA_OPTIONS.map((schema) => {
                  const isActive =
                    formData.advancedSettings?.schemaPreferences?.includes(
                      schema
                    ) || false;
                  return (
                    <button
                      key={schema}
                      onClick={() => toggleSchema(schema)}
                      className={`
                        flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium
                        transition-all duration-200 cursor-pointer
                        ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                        }
                      `}
                    >
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      {schema}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Competitor URLs */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Competitor Analysis</CardTitle>
              <CardDescription>
                Add competitor URLs to analyze their content strategy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup
                label="Competitor URLs"
                helpText="Press Enter to add competitor website URLs"
              >
                <TagInput
                  tags={formData.contentStrategy?.competitorUrls || []}
                  onChange={(tags) =>
                    updateNestedField(
                      'contentStrategy',
                      'competitorUrls',
                      tags
                    )
                  }
                  placeholder="e.g., https://competitor.com..."
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== ACCOUNT TAB ==================== */}
        <TabsContent value="account" className="space-y-6">
          {/* Plan Information */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-zinc-400" />
                <div>
                  <CardTitle className="text-lg">Plan Information</CardTitle>
                  <CardDescription>
                    Your current subscription and usage details.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-zinc-900">
                      Trial Plan
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">
                    14 days remaining in your free trial
                  </p>
                </div>
                <PrimaryButton
                  onClick={() => {
                    setNotification({
                      type: 'success',
                      message:
                        'Upgrade flow coming soon. Contact support for early access to premium plans.',
                    });
                  }}
                  icon={Sparkles}
                >
                  Upgrade Plan
                </PrimaryButton>
              </div>

              {/* Usage Stats */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-700 mb-3">
                  Usage This Month
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <UsageMeter
                    label="Content Generations"
                    used={50}
                    total={100}
                  />
                  <UsageMeter
                    label="Products Optimized"
                    used={12}
                    total={50}
                  />
                  <UsageMeter
                    label="API Calls"
                    used={2400}
                    total={10000}
                  />
                </div>
              </div>

              <Separator />

              {/* Billing Information */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-700 mb-3">
                  Billing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Next Billing Date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      Free during trial
                    </p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Payment Method
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      Not required (trial)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Card className="bg-white border-zinc-200">
            <CardHeader>
              <CardTitle className="text-lg">Available Plans</CardTitle>
              <CardDescription>
                Compare plans and choose the right one for your store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PlanCard
                  name="Starter"
                  price="$29"
                  period="/month"
                  features={[
                    '50 generations/month',
                    '25 products',
                    'GPT-3.5 & Claude Haiku',
                    'Basic analytics',
                  ]}
                  isCurrent={false}
                />
                <PlanCard
                  name="Professional"
                  price="$79"
                  period="/month"
                  features={[
                    '200 generations/month',
                    '100 products',
                    'All AI models',
                    'Advanced analytics',
                    'A/B testing',
                    'Priority support',
                  ]}
                  isCurrent={false}
                  isPopular
                />
                <PlanCard
                  name="Enterprise"
                  price="$199"
                  period="/month"
                  features={[
                    'Unlimited generations',
                    'Unlimited products',
                    'All AI models',
                    'Custom AI training',
                    'Dedicated support',
                    'API access',
                  ]}
                  isCurrent={false}
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-white border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-600">
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that affect your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-red-100 bg-red-50/50">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    Disconnect Store
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Remove the connection to your Shopify store. This will not
                    delete published content.
                  </p>
                </div>
                <SecondaryButton
                  onClick={() => {
                    setNotification({
                      type: 'error',
                      message:
                        'Store disconnection requires confirmation. This feature is under development.',
                    });
                  }}
                  icon={Trash2}
                >
                  Disconnect
                </SecondaryButton>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 shadow-lg">
          <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
            <p className="text-sm text-zinc-600">
              You have unsaved changes
            </p>
            <div className="flex items-center gap-3">
              <GhostButton
                onClick={() => {
                  if (profile) {
                    setFormData({
                      businessName: profile.businessName || '',
                      industry: profile.industry || 'ecommerce',
                      productTypes: profile.productTypes || ['physical'],
                      brandVoice:
                        profile.brandVoice || getDefaultSettings().brandVoice!,
                      contentStrategy:
                        profile.contentStrategy ||
                        getDefaultSettings().contentStrategy!,
                      seoStrategy:
                        profile.seoStrategy ||
                        getDefaultSettings().seoStrategy!,
                      advancedSettings:
                        profile.advancedSettings ||
                        getDefaultSettings().advancedSettings!,
                    });
                    setHasChanges(false);
                  }
                }}
              >
                Discard
              </GhostButton>
              <PrimaryButton
                onClick={handleSave}
                disabled={isSaving}
                icon={isSaving ? Loader2 : Save}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Usage Meter Component ---
function UsageMeter({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const percentage = Math.min((used / total) * 100, 100);
  const color =
    percentage >= 90
      ? 'bg-red-500'
      : percentage >= 70
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="text-xs font-semibold text-zinc-700">
          {used.toLocaleString()} / {total.toLocaleString()}
        </p>
      </div>
      <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// --- Plan Card Component ---
function PlanCard({
  name,
  price,
  period,
  features,
  isCurrent,
  isPopular,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
}) {
  return (
    <div
      className={`
        relative rounded-lg border-2 p-5 transition-all duration-200
        ${
          isPopular
            ? 'border-emerald-500 bg-emerald-50/30 shadow-md'
            : 'border-zinc-200 bg-white hover:border-zinc-300'
        }
      `}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 shadow-sm">
            Most Popular
          </Badge>
        </div>
      )}

      <div className="text-center mb-4 pt-1">
        <h3 className="text-lg font-bold text-zinc-900">{name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-bold text-zinc-900">{price}</span>
          <span className="text-sm text-zinc-500">{period}</span>
        </div>
      </div>

      <Separator className="mb-4" />

      <ul className="space-y-2.5">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isCurrent ? (
          <div className="w-full text-center py-2 text-sm font-medium text-zinc-500 bg-zinc-100 rounded-lg">
            Current Plan
          </div>
        ) : (
          <button
            className={`
              w-full py-2.5 text-sm font-medium rounded-lg transition-all duration-200
              ${
                isPopular
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm hover:shadow-md'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
              }
            `}
          >
            Choose {name}
          </button>
        )}
      </div>
    </div>
  );
}

export default Settings;
