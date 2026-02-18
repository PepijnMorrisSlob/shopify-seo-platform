// Content Preview Modal - Preview generated Q&A content before publishing
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  Divider,
  Card,
  ProgressBar,
} from '@shopify/polaris';
import type { QAPage } from '../types/qa-content.types';
import { SEOScoreCard } from './SEOScoreCard';

interface ContentPreviewModalProps {
  page: QAPage | null;
  open: boolean;
  onClose: () => void;
  onApprove: (pageId: string, publish: boolean) => void;
  isApproving?: boolean;
}

export function ContentPreviewModal({
  page,
  open,
  onClose,
  onApprove,
  isApproving = false,
}: ContentPreviewModalProps) {
  if (!page) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={page.question}
      primaryAction={{
        content: 'Approve & Publish',
        onAction: () => onApprove(page.id, true),
        loading: isApproving,
      }}
      secondaryActions={[
        {
          content: 'Save as Draft',
          onAction: () => onApprove(page.id, false),
        },
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
      large
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* SEO Score */}
          <SEOScoreCard score={page.seoScore} />

          <Divider />

          {/* Meta Tags */}
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Meta Tags
              </Text>
              <BlockStack gap="200">
                <div>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Meta Title ({page.metaTitle.length} characters):
                  </Text>
                  <Text as="p" variant="bodySm">
                    {page.metaTitle}
                  </Text>
                  {page.metaTitle.length > 60 && (
                    <Text as="p" variant="bodySm" tone="caution">
                      Title is too long (recommended: 50-60 characters)
                    </Text>
                  )}
                </div>
                <div>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Meta Description ({page.metaDescription.length} characters):
                  </Text>
                  <Text as="p" variant="bodySm">
                    {page.metaDescription}
                  </Text>
                  {page.metaDescription.length > 160 && (
                    <Text as="p" variant="bodySm" tone="caution">
                      Description is too long (recommended: 150-160 characters)
                    </Text>
                  )}
                </div>
                <div>
                  <Text as="p" variant="bodySm" fontWeight="semibold">
                    Target Keyword:
                  </Text>
                  <Badge>{page.targetKeyword}</Badge>
                </div>
              </BlockStack>
            </BlockStack>
          </Card>

          <Divider />

          {/* Content Preview */}
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h3" variant="headingSm">
                  Content Preview
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {page.answerMarkdown?.length || 0} characters
                </Text>
              </InlineStack>
              <div
                dangerouslySetInnerHTML={{ __html: page.answerContent }}
                style={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  padding: '16px',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E1E3E5',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
              />
            </BlockStack>
          </Card>

          <Divider />

          {/* Internal Links */}
          {page.internalLinks && page.internalLinks.length > 0 && (
            <>
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm">
                      Internal Links
                    </Text>
                    <Badge>{page.internalLinks.length} links</Badge>
                  </InlineStack>
                  <BlockStack gap="200">
                    {page.internalLinks.map((link, index) => (
                      <div key={index} style={{ paddingLeft: '12px', borderLeft: '2px solid #E1E3E5' }}>
                        <Text as="p" variant="bodySm" fontWeight="semibold">
                          {link.anchorText}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          → {link.targetUrl}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Relevance: {(link.relevanceScore * 100).toFixed(0)}%
                        </Text>
                      </div>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
              <Divider />
            </>
          )}

          {/* Schema Markup */}
          {page.schemaMarkup && (
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  Schema Markup
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Type: {page.schemaMarkup['@type']}
                </Text>
                <div
                  style={{
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E1E3E5',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace' }}>
                    {JSON.stringify(page.schemaMarkup, null, 2)}
                  </pre>
                </div>
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
