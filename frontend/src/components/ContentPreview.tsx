// Content Preview Component - Shows 3 AI-generated variants
import { useState } from 'react';
import {
  Card,
  BlockStack,
  Text,
  Badge,
  Button,
  InlineStack,
  Divider,
  Banner,
} from '@shopify/polaris';
import type { ContentVariant } from '../types/api.types';

interface ContentPreviewProps {
  variants: ContentVariant[];
  onApprove: (variantId: string) => void;
  onReject: () => void;
  isPublishing?: boolean;
}

export function ContentPreview({
  variants,
  onApprove,
  onReject,
  isPublishing = false,
}: ContentPreviewProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null
  );

  if (!variants || variants.length === 0) {
    return (
      <Card>
        <Banner tone="warning">No content variants available.</Banner>
      </Card>
    );
  }

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  return (
    <BlockStack gap="400">
      {/* Variant Selector */}
      <Card>
        <BlockStack gap="300">
          <Text as="h3" variant="headingMd">
            Select Content Variant
          </Text>
          <InlineStack gap="200">
            {variants.map((variant, index) => (
              <Button
                key={variant.id}
                variant={selectedVariantId === variant.id ? 'primary' : 'secondary'}
                onClick={() => setSelectedVariantId(variant.id)}
              >
                Variant {(index + 1).toString()} ({variant.qualityScore.toString()}/100)
              </Button>
            ))}
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Selected Variant Preview */}
      {selectedVariant && (
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h3" variant="headingMd">
                Content Preview
              </Text>
              <Badge tone={selectedVariant.qualityScore >= 80 ? 'success' : 'warning'}>
                {`Quality Score: ${selectedVariant.qualityScore}/100`}
              </Badge>
            </InlineStack>

            <Divider />

            {/* Meta Title */}
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Meta Title ({selectedVariant.metaTitle.length.toString()} characters)
              </Text>
              <Card background="bg-surface-secondary">
                <Text as="p" variant="bodyMd">
                  {selectedVariant.metaTitle}
                </Text>
              </Card>
              {selectedVariant.metaTitle.length > 60 && (
                <Banner tone="warning">
                  Meta title is longer than recommended 60 characters.
                </Banner>
              )}
            </BlockStack>

            {/* Meta Description */}
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Meta Description ({selectedVariant.metaDescription.length.toString()} characters)
              </Text>
              <Card background="bg-surface-secondary">
                <Text as="p" variant="bodyMd">
                  {selectedVariant.metaDescription}
                </Text>
              </Card>
              {selectedVariant.metaDescription.length > 160 && (
                <Banner tone="warning">
                  Meta description is longer than recommended 160 characters.
                </Banner>
              )}
            </BlockStack>

            {/* AI Reasoning */}
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                AI Reasoning
              </Text>
              <Card background="bg-surface-secondary">
                <Text as="p" variant="bodySm" tone="subdued">
                  {selectedVariant.reasoning}
                </Text>
              </Card>
            </BlockStack>

            <Divider />

            {/* Action Buttons */}
            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={() => onApprove(selectedVariant.id)}
                loading={isPublishing}
                disabled={isPublishing}
              >
                Approve & Publish to Shopify
              </Button>
              <Button
                onClick={onReject}
                disabled={isPublishing}
              >
                Reject & Generate New
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
