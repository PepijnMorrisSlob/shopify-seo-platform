// Calendar Page - New design system with FullCalendar, Tailwind, and shadcn components
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';

import { PageHeader, PrimaryButton } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../components/ui/dropdown-menu';

import { useCalendar } from '../hooks/useCalendar';
import type {
  CalendarItem,
  CalendarFilters as CalendarFiltersType,
  CalendarContentStatus,
  ContentType,
  CalendarEvent,
} from '../types/calendar.types';

import {
  Plus,
  Filter,
  FileText,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Trash2,
  Send,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Get initial date range (current month with buffer)
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

// Status colors for events
const STATUS_COLORS: Record<CalendarContentStatus, { bg: string; border: string; text: string }> = {
  draft: { bg: '#52525b', border: '#71717a', text: '#fafafa' }, // zinc-600/500
  scheduled: { bg: '#10b981', border: '#34d399', text: '#ffffff' }, // emerald-500/400
  published: { bg: '#3b82f6', border: '#60a5fa', text: '#ffffff' }, // blue-500/400
};

// Default fallback color for unknown statuses
const DEFAULT_STATUS_COLOR = { bg: '#71717a', border: '#a1a1aa', text: '#ffffff' };

// Convert CalendarItem to FullCalendar event
function toCalendarEvent(item: CalendarItem): CalendarEvent {
  const colors = STATUS_COLORS[item.status] || DEFAULT_STATUS_COLOR;
  return {
    id: item.id,
    title: item.title,
    start: item.scheduledAt,
    allDay: true,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    textColor: colors.text,
    extendedProps: {
      content: item.content,
      contentType: item.contentType,
      status: item.status,
      scheduledAt: item.scheduledAt,
      publishedAt: item.publishedAt,
      metaTitle: item.metaTitle,
      metaDescription: item.metaDescription,
      seoScore: item.seoScore,
    },
  };
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 14) return 'Next week';
  return formatDate(dateString);
}

// Content type labels
const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog_post: 'Blog Post',
  custom_page: 'Custom Page',
};

// Filter options
type FilterValue = 'all' | ContentType;

export function CalendarPageNew() {
  const navigate = useNavigate();
  const initialRange = useMemo(() => getInitialDateRange(), []);

  // State
  const [dateRange, setDateRange] = useState(initialRange);
  const [filters, setFilters] = useState<CalendarFiltersType>({});
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterValue, setFilterValue] = useState<FilterValue>('all');

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

  // Convert items to calendar events
  const events = useMemo(() => items.map(toCalendarEvent), [items]);

  // Calculate stats
  const stats = useMemo(() => {
    const drafts = items.filter((i) => i.status === 'draft').length;
    const scheduled = items.filter((i) => i.status === 'scheduled').length;
    const published = items.filter((i) => i.status === 'published').length;
    return { drafts, scheduled, published, total: items.length };
  }, [items]);

  // Get upcoming items (next 5 scheduled or draft items)
  const upcomingItems = useMemo(() => {
    const now = new Date();
    return items
      .filter((item) => new Date(item.scheduledAt) >= now && item.status !== 'published')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  }, [items]);

  // Handlers
  const handleDatesChange = useCallback((arg: DatesSetArg) => {
    setDateRange({
      start: arg.start.toISOString(),
      end: arg.end.toISOString(),
    });
  }, []);

  const handleFilterChange = useCallback((value: FilterValue) => {
    setFilterValue(value);
    if (value === 'all') {
      setFilters({});
    } else {
      setFilters({ contentType: value });
    }
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const item = items.find((i) => i.id === info.event.id);
    if (item) {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  }, [items]);

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const newDate = info.event.start?.toISOString();
      if (newDate) {
        try {
          await reschedule(info.event.id, newDate);
        } catch (err) {
          console.error('Failed to reschedule:', err);
          info.revert();
        }
      }
    },
    [reschedule]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedItem) {
      navigate(`/content/edit/${selectedItem.id}`);
      handleModalClose();
    }
  }, [selectedItem, navigate, handleModalClose]);

  const handleStatusChange = useCallback(
    async (status: CalendarContentStatus) => {
      if (selectedItem) {
        try {
          await updateStatus(selectedItem.id, status);
          setSelectedItem({
            ...selectedItem,
            status,
            publishedAt: status === 'published' ? new Date().toISOString() : selectedItem.publishedAt,
          });
        } catch (err) {
          console.error('Failed to update status:', err);
        }
      }
    },
    [selectedItem, updateStatus]
  );

  const handleDelete = useCallback(() => {
    // TODO: Implement delete functionality
    console.log('Delete:', selectedItem?.id);
    handleModalClose();
  }, [selectedItem, handleModalClose]);

  // Error state
  if (isError) {
    return (
      <div className="p-6">
        <PageHeader title="Content Calendar" description="Schedule and manage your content publishing" />
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="flex items-center gap-4 p-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400">Error loading calendar</h3>
              <p className="text-sm text-red-300/80">
                {error?.message || 'An unexpected error occurred while loading the calendar.'}
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <PageHeader title="Content Calendar" description="Schedule and manage your content publishing">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {filterValue === 'all' ? 'All Types' : CONTENT_TYPE_LABELS[filterValue]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Content Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleFilterChange('all')}>
              All Types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange('blog_post')}>
              Blog Post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterChange('custom_page')}>
              Custom Page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <PrimaryButton onClick={() => navigate('/content/discover')} icon={Plus}>
          New Content
        </PrimaryButton>
      </PageHeader>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Calendar Area */}
        <div className="flex-1 min-w-0">
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              {isLoading && items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                  <p className="mt-4 text-sm text-zinc-400">Loading calendar...</p>
                </div>
              ) : (
                <div className="fullcalendar-dark">
                  <style>{fullCalendarDarkStyles}</style>
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek',
                    }}
                    events={events}
                    editable={true}
                    droppable={true}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    datesSet={handleDatesChange}
                    height="auto"
                    dayMaxEvents={3}
                    eventDisplay="block"
                    eventTimeFormat={{
                      hour: 'numeric',
                      minute: '2-digit',
                      meridiem: 'short',
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
          {/* Stats Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatRow
                label="Drafts"
                value={stats.drafts}
                color="bg-zinc-600"
              />
              <StatRow
                label="Scheduled"
                value={stats.scheduled}
                color="bg-emerald-500"
              />
              <StatRow
                label="Published"
                value={stats.published}
                color="bg-blue-500"
              />
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Total Items</span>
                <span className="font-semibold text-zinc-900">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Items Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingItems.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">
                  No upcoming content scheduled
                </p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3 pr-4">
                    {upcomingItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsModalOpen(true);
                        }}
                        className="w-full text-left p-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-800 line-clamp-2">
                            {item.title}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-0.5" />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              item.status === 'scheduled'
                                ? 'border-emerald-500/50 text-emerald-400'
                                : 'border-zinc-600 text-zinc-400'
                            }`}
                          >
                            {item.status}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {formatRelativeTime(item.scheduledAt)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => navigate('/content/discover')}
              >
                <Plus className="h-4 w-4" />
                Discover Questions
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => navigate('/content/queue')}
              >
                <FileText className="h-4 w-4" />
                View Content Queue
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => navigate('/content/published')}
              >
                <CalendarIcon className="h-4 w-4" />
                Published Content
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <DialogTitle className="text-lg leading-tight">
                  {selectedItem?.title}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`
                        ${selectedItem?.contentType === 'blog_post'
                          ? 'border-purple-500/50 text-purple-400'
                          : 'border-amber-500/50 text-amber-400'}
                      `}
                    >
                      {selectedItem?.contentType && CONTENT_TYPE_LABELS[selectedItem.contentType]}
                    </Badge>
                    <Badge
                      className={`
                        ${selectedItem?.status === 'draft' && 'bg-zinc-600 hover:bg-zinc-600'}
                        ${selectedItem?.status === 'scheduled' && 'bg-emerald-500 hover:bg-emerald-500'}
                        ${selectedItem?.status === 'published' && 'bg-blue-500 hover:bg-blue-500'}
                      `}
                    >
                      {selectedItem?.status}
                    </Badge>
                  </div>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Scheduled Date */}
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-500">Scheduled:</span>
              <span className="text-zinc-900">
                {selectedItem?.scheduledAt && formatDate(selectedItem.scheduledAt)}
              </span>
            </div>

            {/* Content Preview */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-700">Content Preview</h4>
              <div className="p-3 rounded-lg bg-zinc-100 border border-zinc-200">
                <p className="text-sm text-zinc-600 line-clamp-4">
                  {selectedItem?.content || 'No content preview available.'}
                </p>
              </div>
            </div>

            {/* SEO Score if available */}
            {selectedItem?.seoScore !== undefined && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-zinc-600">SEO Score:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedItem.seoScore >= 80
                          ? 'bg-emerald-500'
                          : selectedItem.seoScore >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedItem.seoScore}%` }}
                    />
                  </div>
                  <span className="text-zinc-900 font-medium">
                    {selectedItem.seoScore}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none gap-2"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none gap-2"
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleStatusChange('draft')}
                    disabled={selectedItem?.status === 'draft'}
                  >
                    <div className="w-2 h-2 rounded-full bg-zinc-600 mr-2" />
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange('scheduled')}
                    disabled={selectedItem?.status === 'scheduled'}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                    Scheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange('published')}
                    disabled={selectedItem?.status === 'published'}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                    Published
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {selectedItem?.status === 'scheduled' && (
                <Button
                  className="flex-1 sm:flex-none gap-2 bg-emerald-600 hover:bg-emerald-500"
                  onClick={() => handleStatusChange('published')}
                  disabled={isUpdatingStatus}
                >
                  <Send className="h-4 w-4" />
                  Publish Now
                </Button>
              )}
              <Button
                variant="destructive"
                className="flex-1 sm:flex-none gap-2"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading overlay for reschedule */}
      {isRescheduling && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-xl border border-zinc-200">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            <span className="text-sm text-zinc-700">Updating schedule...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat row component for sidebar
function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm text-zinc-500">{label}</span>
      </div>
      <span className="text-sm font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

// FullCalendar light theme CSS overrides
const fullCalendarDarkStyles = `
  .fullcalendar-dark {
    --fc-border-color: #e4e4e7;
    --fc-button-text-color: #3f3f46;
    --fc-button-bg-color: #ffffff;
    --fc-button-border-color: #e4e4e7;
    --fc-button-hover-bg-color: #f4f4f5;
    --fc-button-hover-border-color: #d4d4d8;
    --fc-button-active-bg-color: #e4e4e7;
    --fc-button-active-border-color: #d4d4d8;
    --fc-today-bg-color: rgba(16, 185, 129, 0.06);
    --fc-neutral-bg-color: #fafafa;
    --fc-page-bg-color: #ffffff;
    --fc-neutral-text-color: #71717a;
    --fc-event-border-color: transparent;
  }

  .fullcalendar-dark .fc {
    font-family: inherit;
  }

  .fullcalendar-dark .fc-theme-standard td,
  .fullcalendar-dark .fc-theme-standard th {
    border-color: var(--fc-border-color);
  }

  .fullcalendar-dark .fc-theme-standard .fc-scrollgrid {
    border-color: var(--fc-border-color);
  }

  .fullcalendar-dark .fc-col-header-cell {
    background-color: #fafafa;
    padding: 12px 0;
  }

  .fullcalendar-dark .fc-col-header-cell-cushion {
    color: #71717a;
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .fullcalendar-dark .fc-daygrid-day {
    background-color: #ffffff;
  }

  .fullcalendar-dark .fc-daygrid-day:hover {
    background-color: #fafafa;
  }

  .fullcalendar-dark .fc-daygrid-day-number {
    color: #3f3f46;
    font-size: 0.875rem;
    padding: 8px;
  }

  .fullcalendar-dark .fc-day-today {
    background-color: var(--fc-today-bg-color) !important;
  }

  .fullcalendar-dark .fc-day-today .fc-daygrid-day-number {
    background-color: #10b981;
    color: white;
    border-radius: 9999px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 4px;
  }

  .fullcalendar-dark .fc-day-other .fc-daygrid-day-number {
    color: #a1a1aa;
  }

  .fullcalendar-dark .fc-button-primary {
    background-color: var(--fc-button-bg-color);
    border-color: var(--fc-button-border-color);
    color: var(--fc-button-text-color);
    font-weight: 500;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
  }

  .fullcalendar-dark .fc-button-primary:hover {
    background-color: var(--fc-button-hover-bg-color);
    border-color: var(--fc-button-hover-border-color);
    color: #18181b;
  }

  .fullcalendar-dark .fc-button-primary:not(:disabled).fc-button-active,
  .fullcalendar-dark .fc-button-primary:not(:disabled):active {
    background-color: var(--fc-button-active-bg-color);
    border-color: var(--fc-button-active-border-color);
    color: #18181b;
  }

  .fullcalendar-dark .fc-button-primary:focus {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  }

  .fullcalendar-dark .fc-toolbar-title {
    color: #18181b;
    font-weight: 600;
    font-size: 1.25rem;
  }

  .fullcalendar-dark .fc-event {
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    border-width: 0;
    border-left-width: 3px;
  }

  .fullcalendar-dark .fc-event:hover {
    filter: brightness(0.95);
  }

  .fullcalendar-dark .fc-daygrid-event-dot {
    display: none;
  }

  .fullcalendar-dark .fc-daygrid-more-link {
    color: #10b981;
    font-weight: 500;
  }

  .fullcalendar-dark .fc-daygrid-more-link:hover {
    color: #059669;
    text-decoration: underline;
  }

  .fullcalendar-dark .fc-popover {
    background-color: #ffffff;
    border-color: #e4e4e7;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .fullcalendar-dark .fc-popover-header {
    background-color: #f4f4f5;
    color: #18181b;
    padding: 8px 12px;
  }

  .fullcalendar-dark .fc-popover-body {
    padding: 8px;
  }

  .fullcalendar-dark .fc-timegrid-slot {
    height: 3rem;
  }

  .fullcalendar-dark .fc-timegrid-slot-label {
    color: #71717a;
    font-size: 0.75rem;
  }

  .fullcalendar-dark .fc-timegrid-now-indicator-line {
    border-color: #10b981;
  }

  .fullcalendar-dark .fc-timegrid-now-indicator-arrow {
    border-color: #10b981;
    border-top-color: transparent;
    border-bottom-color: transparent;
  }

  .fullcalendar-dark .fc-highlight {
    background-color: rgba(16, 185, 129, 0.1);
  }

  .fullcalendar-dark .fc-button-group .fc-button {
    border-radius: 0;
  }

  .fullcalendar-dark .fc-button-group .fc-button:first-child {
    border-top-left-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
  }

  .fullcalendar-dark .fc-button-group .fc-button:last-child {
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }
`;

export default CalendarPageNew;
