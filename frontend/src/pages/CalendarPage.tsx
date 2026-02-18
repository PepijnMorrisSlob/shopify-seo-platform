// Calendar Page - Main page combining calendar, filters, and preview modal
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Banner,
  Spinner,
  EmptyState,
  Text,
} from '@shopify/polaris';
import { ContentCalendar, CalendarFilters, ContentPreviewModal } from '../components/Calendar';
import { useCalendar } from '../hooks/useCalendar';
import type { CalendarItem, CalendarFilters as CalendarFiltersType, CalendarContentStatus } from '../types/calendar.types';

// Get initial date range (current month)
function getInitialDateRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  // Add buffer days for calendar display
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 7);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function CalendarPage() {
  const navigate = useNavigate();
  const initialRange = useMemo(() => getInitialDateRange(), []);

  // State
  const [dateRange, setDateRange] = useState(initialRange);
  const [filters, setFilters] = useState<CalendarFiltersType>({});
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch calendar data
  const {
    items,
    isLoading,
    isError,
    error,
    reschedule,
    isRescheduling,
    updateStatus,
    isUpdatingStatus,
    refetch,
  } = useCalendar(dateRange.start, dateRange.end, filters);

  // Handlers
  const handleDatesChange = useCallback((start: string, end: string) => {
    setDateRange({ start, end });
  }, []);

  const handleFiltersChange = useCallback((newFilters: CalendarFiltersType) => {
    setFilters(newFilters);
  }, []);

  const handleEventClick = useCallback((item: CalendarItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleEventDrop = useCallback(
    async (itemId: string, newDate: string) => {
      try {
        await reschedule(itemId, newDate);
      } catch (err) {
        console.error('Failed to reschedule:', err);
        // Could show a toast notification here
      }
    },
    [reschedule]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleEdit = useCallback(
    (itemId: string) => {
      // Navigate to content editor - adjust path as needed for your app
      navigate(`/content/edit/${itemId}`);
    },
    [navigate]
  );

  const handleStatusChange = useCallback(
    async (itemId: string, status: CalendarContentStatus) => {
      try {
        await updateStatus(itemId, status);
        // Update local selected item state if it's the one being updated
        if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem({
            ...selectedItem,
            status,
            publishedAt: status === 'published' ? new Date().toISOString() : selectedItem.publishedAt,
          });
        }
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    },
    [updateStatus, selectedItem]
  );

  // Error state
  if (isError) {
    return (
      <Page title="Content Calendar">
        <Layout>
          <Layout.Section>
            <Banner
              title="Error loading calendar"
              tone="critical"
              action={{ content: 'Retry', onAction: () => refetch() }}
            >
              <Text as="p">
                {error?.message || 'An unexpected error occurred while loading the calendar.'}
              </Text>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Content Calendar"
      subtitle="Schedule and manage your content publishing"
      primaryAction={{
        content: 'Create Content',
        onAction: () => navigate('/content/discover'),
      }}
    >
      <Layout>
        {/* Filters Section */}
        <Layout.Section>
          <CalendarFilters filters={filters} onFiltersChange={handleFiltersChange} />
        </Layout.Section>

        {/* Calendar Section */}
        <Layout.Section>
          {isLoading && items.length === 0 ? (
            <div style={{ padding: '100px', textAlign: 'center' }}>
              <Spinner size="large" />
              <div style={{ marginTop: '16px' }}>
                <Text as="p" tone="subdued">
                  Loading calendar...
                </Text>
              </div>
            </div>
          ) : items.length === 0 && !isLoading ? (
            <EmptyState
              heading="No content scheduled"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              action={{
                content: 'Discover Questions',
                onAction: () => navigate('/content/discover'),
              }}
              secondaryAction={{
                content: 'Clear Filters',
                onAction: () => setFilters({}),
                disabled: !filters.contentType && !filters.status,
              }}
            >
              <Text as="p">
                Start creating content to populate your calendar. Discover questions your customers
                are asking and generate SEO-optimized answers.
              </Text>
            </EmptyState>
          ) : (
            <ContentCalendar
              items={items}
              onEventClick={handleEventClick}
              onEventDrop={handleEventDrop}
              onDatesChange={handleDatesChange}
              isLoading={isLoading || isRescheduling}
            />
          )}
        </Layout.Section>

        {/* Stats Section */}
        {items.length > 0 && (
          <Layout.Section variant="oneThird">
            <CalendarStats items={items} />
          </Layout.Section>
        )}
      </Layout>

      {/* Preview Modal */}
      <ContentPreviewModal
        item={selectedItem}
        open={isModalOpen}
        onClose={handleModalClose}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdatingStatus}
      />
    </Page>
  );
}

// Helper component for calendar statistics
function CalendarStats({ items }: { items: CalendarItem[] }) {
  const stats = useMemo(() => {
    const drafts = items.filter((i) => i.status === 'draft').length;
    const scheduled = items.filter((i) => i.status === 'scheduled').length;
    const published = items.filter((i) => i.status === 'published').length;
    const blogPosts = items.filter((i) => i.contentType === 'blog_post').length;
    const customPages = items.filter((i) => i.contentType === 'custom_page').length;

    return { drafts, scheduled, published, blogPosts, customPages, total: items.length };
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          padding: '16px',
          background: 'var(--p-color-bg-surface)',
          borderRadius: '8px',
          border: '1px solid var(--p-color-border)',
        }}
      >
        <Text as="h3" variant="headingSm">
          Calendar Overview
        </Text>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <StatRow label="Total Items" value={stats.total} />
          <StatRow label="Drafts" value={stats.drafts} color="#8C9196" />
          <StatRow label="Scheduled" value={stats.scheduled} color="#0070F3" />
          <StatRow label="Published" value={stats.published} color="#008060" />
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          background: 'var(--p-color-bg-surface)',
          borderRadius: '8px',
          border: '1px solid var(--p-color-border)',
        }}
      >
        <Text as="h3" variant="headingSm">
          Content Types
        </Text>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <StatRow label="Blog Posts" value={stats.blogPosts} />
          <StatRow label="Custom Pages" value={stats.customPages} />
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {color && (
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        )}
        <Text as="span" variant="bodySm" tone="subdued">
          {label}
        </Text>
      </div>
      <Text as="span" variant="bodySm" fontWeight="semibold">
        {value}
      </Text>
    </div>
  );
}
