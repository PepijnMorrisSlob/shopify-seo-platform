// Product List Component with Polaris ResourceList
import { useState } from 'react';
import {
  ResourceList,
  ResourceItem,
  Text,
  Thumbnail,
  Badge,
  InlineStack,
  BlockStack,
  Button,
  Card,
  EmptyState,
  Banner,
  Spinner,
  TextField,
} from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { useProducts } from '../hooks/useProducts';
import { useAppStore } from '../store/app-store';
import { SEOScore } from './SEOScore';
import type { Product } from '../types/api.types';

interface ProductListProps {
  onSelectProduct?: (product: Product) => void;
  onOptimizeClick?: (productId: string) => void;
}

export function ProductList({ onSelectProduct, onOptimizeClick }: ProductListProps) {
  const { data: products, isLoading, error } = useProducts();
  const { selectedProducts } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <Card>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Spinner size="large" />
          <Text as="p" variant="bodyMd">
            Loading products...
          </Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Banner tone="critical" title="Error loading products">
        {error.message}
      </Banner>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        heading="No products found"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
      >
        <p>Sync your Shopify products to get started with SEO optimization.</p>
      </EmptyState>
    );
  }

  // Filter products based on search query
  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card padding="0">
      <div style={{ maxHeight: '600px', overflow: 'auto' }}>
        <ResourceList
          resourceName={{ singular: 'product', plural: 'products' }}
          items={filteredProducts}
          selectedItems={selectedProducts}
          onSelectionChange={(selection) => {
            // Handle selection change
            if (selection === 'All') {
              useAppStore.getState().setSelectedProducts(
                filteredProducts.map((p) => p.id)
              );
            } else {
              useAppStore.getState().setSelectedProducts(selection as string[]);
            }
          }}
          selectable
        renderItem={(product) => {
          const { id, title, seoScore, status } = product;
          const currentImageUrl = (product as any).currentImageUrl;
          const currentImageAlt = (product as any).currentImageAlt;
          const variants = (product as any).variants;

          const media = currentImageUrl ? (
            <Thumbnail
              source={currentImageUrl}
              alt={currentImageAlt || title}
              size="medium"
            />
          ) : (
            <Thumbnail source={ImageIcon} alt={title} size="medium" />
          );

          return (
            <ResourceItem
              id={id}
              media={media}
              onClick={() => onSelectProduct?.(product)}
            >
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="bodyMd" fontWeight="bold">
                    {title}
                  </Text>
                  <SEOScore score={seoScore || 0} showLabel={false} />
                </InlineStack>

                <InlineStack gap="200">
                  <Badge tone={status === 'ACTIVE' ? 'success' : 'info'}>
                    {status || 'draft'}
                  </Badge>
                  {variants && variants.length > 0 && (
                    <Text as="span" variant="bodySm" tone="subdued">
                      {variants.length} variant{variants.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </InlineStack>

                {onOptimizeClick && (
                  <div>
                    <Button
                      variant="primary"
                      size="slim"
                      onClick={() => onOptimizeClick(id)}
                    >
                      Optimize SEO
                    </Button>
                  </div>
                )}
              </BlockStack>
            </ResourceItem>
          );
        }}
        filterControl={
          <TextField
            label="Search products"
            value={searchQuery}
            onChange={setSearchQuery}
            autoComplete="off"
            placeholder="Search by product name..."
            clearButton
            onClearButtonClick={() => setSearchQuery('')}
          />
        }
      />
      </div>
    </Card>
  );
}
