// UpcomingContent Component - Next scheduled content items list
import { CSSProperties } from 'react';

export type ContentType = 'blog' | 'page' | 'product' | 'faq';

export interface ScheduledContent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: ContentType;
  onEdit?: () => void;
  onReschedule?: () => void;
}

export interface UpcomingContentProps {
  items?: ScheduledContent[];
  title?: string;
  maxItems?: number;
  onViewAll?: () => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: '#ffffff', // white
    borderRadius: '12px',
    border: '1px solid #e4e4e7', // zinc-200
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e4e4e7',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#18181b', // zinc-900
    margin: 0,
  },
  list: {
    padding: 0,
    margin: 0,
    listStyle: 'none',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    borderBottom: '1px solid #f4f4f5',
    transition: 'background-color 0.15s ease',
  },
  dateBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: '#f4f4f5', // zinc-100
    borderRadius: '8px',
    flexShrink: 0,
  },
  dateDay: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#10b981', // emerald-500
    lineHeight: 1,
  },
  dateMonth: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#71717a', // zinc-500
    textTransform: 'uppercase' as const,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#18181b', // zinc-900
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  itemTime: {
    fontSize: '12px',
    color: '#71717a', // zinc-500
  },
  badge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '4px',
    textTransform: 'capitalize' as const,
  },
  badgeBlog: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue
    color: '#3b82f6',
  },
  badgePage: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)', // purple
    color: '#a855f7',
  },
  badgeProduct: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald
    color: '#10b981',
  },
  badgeFaq: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // amber
    color: '#f59e0b',
  },
  actions: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: '1px solid #e4e4e7',
    borderRadius: '6px',
    color: '#a1a1aa',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  footer: {
    padding: '12px 20px',
    textAlign: 'center' as const,
  },
  viewAllLink: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#10b981', // emerald-500
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto 12px',
    color: '#52525b', // zinc-600
  },
  emptyText: {
    fontSize: '14px',
    color: '#71717a', // zinc-500
  },
};

const getBadgeStyle = (type: ContentType): CSSProperties => {
  const badgeStyles: Record<ContentType, CSSProperties> = {
    blog: styles.badgeBlog,
    page: styles.badgePage,
    product: styles.badgeProduct,
    faq: styles.badgeFaq,
  };
  return { ...styles.badge, ...badgeStyles[type] };
};

// Mock data for standalone demo
const mockItems: ScheduledContent[] = [
  {
    id: '1',
    title: 'Holiday Gift Guide 2024: Best Tech Gadgets',
    date: 'Dec 18',
    time: '9:00 AM',
    type: 'blog',
  },
  {
    id: '2',
    title: 'New Year Sale Landing Page',
    date: 'Dec 20',
    time: '12:00 PM',
    type: 'page',
  },
  {
    id: '3',
    title: 'Winter Collection - Product Descriptions',
    date: 'Dec 22',
    time: '10:00 AM',
    type: 'product',
  },
  {
    id: '4',
    title: 'Shipping & Returns FAQ Update',
    date: 'Dec 24',
    time: '8:00 AM',
    type: 'faq',
  },
  {
    id: '5',
    title: 'Year in Review: Our Best Sellers',
    date: 'Dec 28',
    time: '9:00 AM',
    type: 'blog',
  },
];

export function UpcomingContent({
  items = mockItems,
  title = 'Upcoming Content',
  maxItems = 5,
  onViewAll,
}: UpcomingContentProps) {
  const displayItems = items.slice(0, maxItems);

  const handleItemHover = (e: React.MouseEvent<HTMLLIElement>, isEntering: boolean) => {
    e.currentTarget.style.backgroundColor = isEntering ? '#f4f4f5' : 'transparent';
  };

  const handleActionHover = (e: React.MouseEvent<HTMLButtonElement>, isEntering: boolean) => {
    if (isEntering) {
      e.currentTarget.style.borderColor = '#10b981';
      e.currentTarget.style.color = '#10b981';
    } else {
      e.currentTarget.style.borderColor = '#e4e4e7';
      e.currentTarget.style.color = '#a1a1aa';
    }
  };

  // Parse date to extract day and month
  const parseDate = (dateStr: string) => {
    const parts = dateStr.split(' ');
    return {
      day: parts[1] || dateStr,
      month: parts[0] || '',
    };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>{title}</h3>
      </div>

      {displayItems.length === 0 ? (
        <div style={styles.emptyState}>
          <svg
            style={styles.emptyIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p style={styles.emptyText}>No upcoming content scheduled</p>
        </div>
      ) : (
        <ul style={styles.list}>
          {displayItems.map((item, index) => {
            const { day, month } = parseDate(item.date);

            return (
              <li
                key={item.id}
                style={{
                  ...styles.item,
                  borderBottom:
                    index === displayItems.length - 1 ? 'none' : '1px solid #f4f4f5',
                }}
                onMouseEnter={(e) => handleItemHover(e, true)}
                onMouseLeave={(e) => handleItemHover(e, false)}
              >
                <div style={styles.dateBox}>
                  <span style={styles.dateDay}>{day}</span>
                  <span style={styles.dateMonth}>{month}</span>
                </div>
                <div style={styles.content}>
                  <p style={styles.itemTitle}>{item.title}</p>
                  <div style={styles.itemMeta}>
                    <span style={getBadgeStyle(item.type)}>{item.type}</span>
                    {item.time && <span style={styles.itemTime}>{item.time}</span>}
                  </div>
                </div>
                <div style={styles.actions}>
                  <button
                    style={styles.actionButton}
                    onClick={item.onEdit}
                    onMouseEnter={(e) => handleActionHover(e, true)}
                    onMouseLeave={(e) => handleActionHover(e, false)}
                    title="Edit"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={item.onReschedule}
                    onMouseEnter={(e) => handleActionHover(e, true)}
                    onMouseLeave={(e) => handleActionHover(e, false)}
                    title="Reschedule"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {onViewAll && displayItems.length > 0 && (
        <div style={styles.footer}>
          <button style={styles.viewAllLink} onClick={onViewAll}>
            View full calendar
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default UpcomingContent;
