// Calendar Filters Component - Filter content by type and status
import {
  Card,
  InlineStack,
  ChoiceList,
  Button,
  BlockStack,
  Text,
  Collapsible,
  Icon,
} from '@shopify/polaris';
import { useState } from 'react';
import type { CalendarFilters as CalendarFiltersType, ContentType, CalendarContentStatus } from '../../types/calendar.types';

interface CalendarFiltersProps {
  filters: CalendarFiltersType;
  onFiltersChange: (filters: CalendarFiltersType) => void;
}

const CONTENT_TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Blog Post', value: 'blog_post' },
  { label: 'Custom Page', value: 'custom_page' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
];

export function CalendarFilters({ filters, onFiltersChange }: CalendarFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleContentTypeChange = (selected: string[]) => {
    const value = selected[0] || '';
    onFiltersChange({
      ...filters,
      contentType: value ? (value as ContentType) : undefined,
    });
  };

  const handleStatusChange = (selected: string[]) => {
    const value = selected[0] || '';
    onFiltersChange({
      ...filters,
      status: value ? (value as CalendarContentStatus) : undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.contentType || filters.status;

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between">
          <InlineStack gap="200" blockAlign="center">
            <Text as="h3" variant="headingSm">
              Filters
            </Text>
            {hasActiveFilters && (
              <Text as="span" variant="bodySm" tone="subdued">
                ({[filters.contentType, filters.status].filter(Boolean).length} active)
              </Text>
            )}
          </InlineStack>
          <InlineStack gap="200">
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} variant="plain" tone="critical">
                Clear all
              </Button>
            )}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="plain"
              ariaExpanded={isExpanded}
              ariaControls="calendar-filters"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </InlineStack>
        </InlineStack>

        <Collapsible
          open={isExpanded}
          id="calendar-filters"
          transition={{ duration: '150ms', timingFunction: 'ease-in-out' }}
        >
          <InlineStack gap="600" wrap={false}>
            <div style={{ minWidth: '180px' }}>
              <ChoiceList
                title="Content Type"
                titleHidden
                choices={CONTENT_TYPE_OPTIONS}
                selected={[filters.contentType || '']}
                onChange={handleContentTypeChange}
              />
            </div>
            <div style={{ minWidth: '180px' }}>
              <ChoiceList
                title="Status"
                titleHidden
                choices={STATUS_OPTIONS}
                selected={[filters.status || '']}
                onChange={handleStatusChange}
              />
            </div>
          </InlineStack>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}
