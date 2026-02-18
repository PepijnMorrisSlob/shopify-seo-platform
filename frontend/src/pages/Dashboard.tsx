// Dashboard Page - Product list with SEO scores and Q&A Content Overview
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Banner,
  Badge,
  Button,
  Spinner,
} from '@shopify/polaris';
import { ProductList } from '../components/ProductList';
import { useSyncProducts } from '../hooks/useProducts';
import { useAppStore } from '../store/app-store';
import { useQAAnalytics } from '../hooks/usePerformance';
import { useBusinessProfile } from '../hooks/useBusinessProfile';
import type { Product } from '../types/api.types';

export function Dashboard() {
  const navigate = useNavigate();
  const { selectedProducts, clearSelection } = useAppStore();
  const { mutate: syncProducts, isPending: isSyncing } = useSyncProducts();
  const { data: qaAnalytics, isLoading: isLoadingAnalytics } = useQAAnalytics();
  const { data: businessProfile, isLoading: isLoadingProfile } = useBusinessProfile();
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleSyncProducts = () => {
    syncProducts(
      { forceFullSync: false },
      {
        onSuccess: () => {
          setSyncSuccess(true);
          setTimeout(() => setSyncSuccess(false), 5000);
        },
        onError: (error) => {
          console.error('Sync failed:', error);
        },
      }
    );
  };

  const handleOptimizeSelected = () => {
    if (selectedProducts.length > 0) {
      navigate('/content-generation', {
        state: { productIds: selectedProducts },
      });
    }
  };

  const handleOptimizeProduct = (productId: string) => {
    navigate('/content-generation', {
      state: { productIds: [productId] },
    });
  };

  const handleSelectProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  return (
    <Page
      title="SEO Dashboard"
      primaryAction={{
        content: 'Sync Products',
        onAction: handleSyncProducts,
        loading: isSyncing,
      }}
      secondaryActions={
        selectedProducts.length > 0
          ? [
              {
                content: `Optimize ${selectedProducts.length} Product${selectedProducts.length > 1 ? 's' : ''}`,
                onAction: handleOptimizeSelected,
              },
              {
                content: 'Clear Selection',
                onAction: clearSelection,
              },
            ]
          : []
      }
    >
      <Layout>
        {syncSuccess && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSyncSuccess(false)}>
              Products synced successfully!
            </Banner>
          </Layout.Section>
        )}

        {/* Business Profile Check - Prompt onboarding if not completed */}
        {!isLoadingProfile && !businessProfile && (
          <Layout.Section>
            <Banner
              tone="warning"
              action={{
                content: 'Start Onboarding',
                onAction: () => navigate('/onboarding'),
              }}
            >
              <Text as="p" fontWeight="semibold">
                Complete your business profile to unlock Q&A content generation
              </Text>
              <Text as="p">
                Tell us about your business, target audience, and brand voice so we can generate
                personalized SEO content for you.
              </Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Q&A Content Overview */}
        {businessProfile && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Q&A Content Performance
                  </Text>
                  <Button onClick={() => navigate('/content/analytics')} variant="plain">
                    View Full Analytics
                  </Button>
                </InlineStack>

                {isLoadingAnalytics ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <Spinner size="small" />
                  </div>
                ) : qaAnalytics ? (
                  <InlineStack gap="400">
                    <Card>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Published Pages
                        </Text>
                        <Text as="h3" variant="headingLg">
                          {qaAnalytics.publishedPages}
                        </Text>
                      </BlockStack>
                    </Card>

                    <Card>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Avg SEO Score
                        </Text>
                        <Text as="h3" variant="headingLg">
                          {qaAnalytics.avgSeoScore}/100
                        </Text>
                      </BlockStack>
                    </Card>

                    <Card>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Monthly Traffic
                        </Text>
                        <Text as="h3" variant="headingLg">
                          {qaAnalytics.totalTraffic.toLocaleString()}
                        </Text>
                      </BlockStack>
                    </Card>

                    <Card>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Revenue
                        </Text>
                        <Text as="h3" variant="headingLg">
                          ${qaAnalytics.totalRevenue.toLocaleString()}
                        </Text>
                      </BlockStack>
                    </Card>
                  </InlineStack>
                ) : (
                  <Banner
                    tone="info"
                    action={{
                      content: 'Discover Questions',
                      onAction: () => navigate('/content/discover'),
                    }}
                  >
                    <Text as="p">
                      Start generating Q&A content to drive organic traffic and conversions
                    </Text>
                  </Banner>
                )}

                {qaAnalytics && qaAnalytics.contentGaps && qaAnalytics.contentGaps.length > 0 && (
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingSm">
                        Content Opportunities
                      </Text>
                      <Badge tone="success">{qaAnalytics.contentGaps.length}</Badge>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      High-potential questions to answer
                    </Text>
                    <Button onClick={() => navigate('/content/discover')}>
                      View Opportunities
                    </Button>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Your Products
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Select products to optimize their SEO metadata with AI
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <ProductList
            onSelectProduct={handleSelectProduct}
            onOptimizeClick={handleOptimizeProduct}
          />
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                Quick Stats
              </Text>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm">
                    Selected Products
                  </Text>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    {selectedProducts.length}
                  </Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                Quick Actions
              </Text>
              <BlockStack gap="200">
                {!businessProfile ? (
                  <>
                    <Button onClick={() => navigate('/onboarding')} fullWidth>
                      Complete Business Setup
                    </Button>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Unlock Q&A content generation
                    </Text>
                  </>
                ) : (
                  <>
                    <Button onClick={() => navigate('/content/discover')} fullWidth>
                      Discover Questions
                    </Button>
                    <Button onClick={() => navigate('/content/review')} fullWidth>
                      Review Content
                    </Button>
                    <Button onClick={() => navigate('/content/published')} fullWidth>
                      Published Content
                    </Button>
                  </>
                )}
              </BlockStack>
            </BlockStack>
          </Card>

          {qaAnalytics && qaAnalytics.topPerformers && qaAnalytics.topPerformers.length > 0 && (
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Top Q&A Pages
                </Text>
                <BlockStack gap="200">
                  {qaAnalytics.topPerformers.slice(0, 3).map((page: any) => (
                    <div key={page.id}>
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        {page.question}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {page.monthlyTraffic.toLocaleString()} monthly visitors
                      </Text>
                    </div>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
