// Content Preview Modal for Calendar - Preview and manage calendar content items
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  Divider,
  Card,
  Select,
  Box,
} from '@shopify/polaris';
import { useState } from 'react';
import type { CalendarItem, CalendarContentStatus } from '../../types/calendar.types';

interface ContentPreviewModalProps {
  item: CalendarItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (itemId: string) => void;
  onStatusChange: (itemId: string, status: CalendarContentStatus) => void;
  isUpdating?: boolean;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
];

function getStatusBadgeTone(status: CalendarContentStatus): 'new' | 'info' | 'success' {
  switch (status) {
    case 'draft':
      return 'new';
    case 'scheduled':
      return 'info';
    case 'published':
      return 'success';
    default:
      return 'new';
  }
}

function getContentTypeBadge(contentType: string): string {
  switch (contentType) {
    case 'blog_post':
      return 'Blog Post';
    case 'custom_page':
      return 'Custom Page';
    default:
      return contentType;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateContent(content: string, maxLength: number = 300): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

export function ContentPreviewModal({
  item,
  open,
  onClose,
  onEdit,
  onStatusChange,
  isUpdating = false,
}: ContentPreviewModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<CalendarContentStatus | null>(null);

  if (!item) return null;

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value as CalendarContentStatus);
  };

  const handleApplyStatusChange = () => {
    if (selectedStatus && selectedStatus !== item.status) {
      onStatusChange(item.id, selectedStatus);
      setSelectedStatus(null);
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={item.title}
      primaryAction={{
        content: 'Edit Content',
        onAction: () => onEdit(item.id),
      }}
      secondaryActions={[
        {
          content: 'Close',
          onAction: handleClose,
        },
      ]}
      large
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Status and Type Badges */}
          <InlineStack gap="300">
            <Badge tone={getStatusBadgeTone(item.status)}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Badge>
            <Badge>
              {getContentTypeBadge(item.contentType)}
            </Badge>
            {item.seoScore !== undefined && (
              <Badge tone={item.seoScore >= 70 ? 'success' : item.seoScore >= 50 ? 'attention' : 'critical'}>
                SEO: {item.seoScore}/100
              </Badge>
            )}
          </InlineStack>

          <Divider />

          {/* Scheduled Date */}
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Scheduled Date
              </Text>
              <Text as="p" variant="bodyMd">
                {formatDate(item.scheduledAt)}
              </Text>
              {item.publishedAt && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Published: {formatDate(item.publishedAt)}
                </Text>
              )}
            </BlockStack>
          </Card>

          {/* Content Preview */}
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h3" variant="headingSm">
                  Content Preview
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {item.content.length} characters
                </Text>
              </InlineStack>
              <Box
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
                borderColor="border"
                borderWidth="025"
              >
                <Text as="p" variant="bodyMd">
                  {truncateContent(item.content)}
                </Text>
              </Box>
            </BlockStack>
          </Card>

          {/* Meta Information */}
          {(item.metaTitle || item.metaDescription || item.targetKeyword) && (
            <>
              <Divider />
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    SEO Information
                  </Text>
                  {item.metaTitle && (
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        Meta Title:
                      </Text>
                      <Text as="p" variant="bodySm">
                        {item.metaTitle}
                      </Text>
                    </BlockStack>
                  )}
                  {item.metaDescription && (
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        Meta Description:
                      </Text>
                      <Text as="p" variant="bodySm">
                        {item.metaDescription}
                      </Text>
                    </BlockStack>
                  )}
                  {item.targetKeyword && (
                    <BlockStack gap="100">
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        Target Keyword:
                      </Text>
                      <Badge>{item.targetKeyword}</Badge>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </>
          )}

          <Divider />

          {/* Change Status */}
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Change Status
              </Text>
              <InlineStack gap="300" blockAlign="end">
                <div style={{ minWidth: '200px' }}>
                  <Select
                    label="Status"
                    labelHidden
                    options={STATUS_OPTIONS}
                    value={selectedStatus || item.status}
                    onChange={handleStatusChange}
                  />
                </div>
                <Button
                  onClick={handleApplyStatusChange}
                  disabled={!selectedStatus || selectedStatus === item.status}
                  loading={isUpdating}
                >
                  Apply
                </Button>
              </InlineStack>
              {item.status === 'draft' && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Change to "Scheduled" to add to your publishing queue, or "Published" to mark as live.
                </Text>
              )}
            </BlockStack>
          </Card>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
