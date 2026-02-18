// ActivityFeed Component - Recent activity list with actions
import { ReactNode, CSSProperties } from 'react';

export interface ActivityItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  timestamp: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ActivityFeedProps {
  items?: ActivityItem[];
  title?: string;
  onViewAll?: () => void;
  maxItems?: number;
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
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 20px',
    borderBottom: '1px solid #f4f4f5',
    transition: 'background-color 0.15s ease',
    cursor: 'default',
  },
  itemHover: {
    backgroundColor: '#f4f4f5',
  },
  iconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald with opacity
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#10b981', // emerald-500
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#18181b', // zinc-900
    margin: 0,
    marginBottom: '2px',
  },
  description: {
    fontSize: '13px',
    color: '#71717a', // zinc-500
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  timestamp: {
    fontSize: '12px',
    color: '#71717a', // zinc-500
    marginTop: '4px',
  },
  actionButton: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#10b981', // emerald-500
    backgroundColor: 'transparent',
    border: '1px solid #10b981',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
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
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
};

// Mock data for standalone demo
const mockItems: ActivityItem[] = [
  {
    id: '1',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    title: 'Blog post created',
    description: '10 Tips for Better Product Photography',
    timestamp: '5 minutes ago',
    actionLabel: 'View',
  },
  {
    id: '2',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    title: 'Content published',
    description: 'Summer Collection Landing Page is now live',
    timestamp: '23 minutes ago',
    actionLabel: 'Open',
  },
  {
    id: '3',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: 'Products synced',
    description: '47 products updated from Shopify',
    timestamp: '1 hour ago',
  },
  {
    id: '4',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Content scheduled',
    description: 'FAQ Page scheduled for Dec 20, 2024',
    timestamp: '2 hours ago',
    actionLabel: 'Edit',
  },
  {
    id: '5',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: 'SEO analysis completed',
    description: 'Product descriptions optimized - Score: 92/100',
    timestamp: '3 hours ago',
    actionLabel: 'View Report',
  },
];

export function ActivityFeed({
  items = mockItems,
  title = 'Recent Activity',
  onViewAll,
  maxItems = 5,
}: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  const handleItemHover = (e: React.MouseEvent<HTMLLIElement>, isEntering: boolean) => {
    e.currentTarget.style.backgroundColor = isEntering ? '#f4f4f5' : 'transparent';
  };

  const handleActionHover = (e: React.MouseEvent<HTMLButtonElement>, isEntering: boolean) => {
    if (isEntering) {
      e.currentTarget.style.backgroundColor = '#10b981';
      e.currentTarget.style.color = '#18181b';
    } else {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.color = '#10b981';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>{title}</h3>
      </div>
      <ul style={styles.list}>
        {displayItems.map((item, index) => (
          <li
            key={item.id}
            style={{
              ...styles.item,
              borderBottom: index === displayItems.length - 1 ? 'none' : '1px solid #f4f4f5',
            }}
            onMouseEnter={(e) => handleItemHover(e, true)}
            onMouseLeave={(e) => handleItemHover(e, false)}
          >
            <div style={styles.iconWrapper}>{item.icon}</div>
            <div style={styles.content}>
              <p style={styles.title}>{item.title}</p>
              <p style={styles.description}>{item.description}</p>
              <span style={styles.timestamp}>{item.timestamp}</span>
            </div>
            {item.actionLabel && (
              <button
                style={styles.actionButton}
                onClick={item.onAction}
                onMouseEnter={(e) => handleActionHover(e, true)}
                onMouseLeave={(e) => handleActionHover(e, false)}
              >
                {item.actionLabel}
              </button>
            )}
          </li>
        ))}
      </ul>
      {onViewAll && (
        <div style={styles.footer}>
          <button style={styles.viewAllLink} onClick={onViewAll}>
            View all activity
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
