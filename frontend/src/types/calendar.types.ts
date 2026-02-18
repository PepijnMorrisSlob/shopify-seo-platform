// Content Calendar Type Definitions
// Coordinates with backend calendar API

export type ContentType = 'blog_post' | 'custom_page';

export type CalendarContentStatus = 'draft' | 'scheduled' | 'published';

export interface CalendarItem {
  id: string;
  title: string;
  content: string;
  contentType: ContentType;
  status: CalendarContentStatus;
  scheduledAt: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;

  // Optional SEO fields
  metaTitle?: string;
  metaDescription?: string;
  targetKeyword?: string;
  seoScore?: number;

  // Optional linked Q&A page
  qaPageId?: string;
}

export interface CalendarFilters {
  contentType?: ContentType;
  status?: CalendarContentStatus;
}

// API Request/Response Types
export interface GetCalendarItemsRequest {
  start: string; // ISO date string
  end: string;   // ISO date string
  type?: ContentType;
  status?: CalendarContentStatus;
}

export interface GetCalendarItemsResponse {
  items: CalendarItem[];
  total: number;
}

export interface RescheduleRequest {
  scheduledAt: string; // ISO date string
}

export interface RescheduleResponse {
  success: boolean;
  item: CalendarItem;
}

export interface UpdateStatusRequest {
  status: CalendarContentStatus;
}

export interface UpdateStatusResponse {
  success: boolean;
  item: CalendarItem;
}

// FullCalendar event interface (for internal use)
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    content: string;
    contentType: ContentType;
    status: CalendarContentStatus;
    scheduledAt: string;
    publishedAt?: string;
    metaTitle?: string;
    metaDescription?: string;
    seoScore?: number;
  };
}
