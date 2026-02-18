// Content Calendar Component - FullCalendar integration with drag-and-drop
import { useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import { Card, Box } from '@shopify/polaris';
import type { CalendarItem, CalendarEvent, CalendarContentStatus } from '../../types/calendar.types';

interface ContentCalendarProps {
  items: CalendarItem[];
  onEventClick: (item: CalendarItem) => void;
  onEventDrop: (itemId: string, newDate: string) => void;
  onDatesChange: (start: string, end: string) => void;
  isLoading?: boolean;
}

// Status to color mapping
function getStatusColor(status: CalendarContentStatus): { background: string; border: string; text: string } {
  switch (status) {
    case 'draft':
      return {
        background: '#E4E5E7', // Polaris gray
        border: '#8C9196',
        text: '#202223',
      };
    case 'scheduled':
      return {
        background: '#E3F1FC', // Polaris blue light
        border: '#0070F3',
        text: '#002E66',
      };
    case 'published':
      return {
        background: '#D8F0DE', // Polaris green light
        border: '#008060',
        text: '#0D542E',
      };
    default:
      return {
        background: '#E4E5E7',
        border: '#8C9196',
        text: '#202223',
      };
  }
}

// Convert CalendarItem to FullCalendar event
function itemToEvent(item: CalendarItem): CalendarEvent {
  const colors = getStatusColor(item.status);

  return {
    id: item.id,
    title: item.title,
    start: item.scheduledAt,
    allDay: true,
    backgroundColor: colors.background,
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

export function ContentCalendar({
  items,
  onEventClick,
  onEventDrop,
  onDatesChange,
  isLoading = false,
}: ContentCalendarProps) {
  // Convert items to FullCalendar events
  const events = useMemo(() => items.map(itemToEvent), [items]);

  // Handle event click
  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const item = items.find((i) => i.id === info.event.id);
      if (item) {
        onEventClick(item);
      }
    },
    [items, onEventClick]
  );

  // Handle event drop (drag-and-drop reschedule)
  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      const newDate = info.event.start;
      if (newDate) {
        // Convert to ISO string in UTC
        const isoDate = newDate.toISOString();
        onEventDrop(info.event.id, isoDate);
      }
    },
    [onEventDrop]
  );

  // Handle date range change (month navigation)
  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const start = arg.start.toISOString();
      const end = arg.end.toISOString();
      onDatesChange(start, end);
    },
    [onDatesChange]
  );

  return (
    <Card>
      <Box padding="400">
        <div
          style={{
            opacity: isLoading ? 0.6 : 1,
            transition: 'opacity 0.2s ease-in-out',
          }}
        >
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            editable={true}
            droppable={true}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            datesSet={handleDatesSet}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek',
            }}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            moreLinkClick="popover"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: 'short',
            }}
            eventContent={(eventInfo) => (
              <div
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                title={eventInfo.event.title}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: eventInfo.event.borderColor,
                    marginRight: '6px',
                  }}
                />
                {eventInfo.event.title}
              </div>
            )}
          />
        </div>
      </Box>

      {/* Legend */}
      <Box padding="400" borderBlockStartWidth="025" borderColor="border">
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#8C9196',
              }}
            />
            <span style={{ fontSize: '12px', color: '#6D7175' }}>Draft</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#0070F3',
              }}
            />
            <span style={{ fontSize: '12px', color: '#6D7175' }}>Scheduled</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#008060',
              }}
            />
            <span style={{ fontSize: '12px', color: '#6D7175' }}>Published</span>
          </div>
        </div>
      </Box>
    </Card>
  );
}
