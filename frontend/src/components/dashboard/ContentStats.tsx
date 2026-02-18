// ContentStats Component - Content overview widget with counts and progress bars
import { CSSProperties } from 'react';

export interface ContentStat {
  id: string;
  label: string;
  count: number;
  total?: number;
  color: string;
  onClick?: () => void;
}

export interface ContentStatsProps {
  stats?: ContentStat[];
  title?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: '#ffffff', // white
    borderRadius: '12px',
    border: '1px solid #e4e4e7', // zinc-200
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  header: {
    marginBottom: '20px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#18181b', // zinc-900
    margin: 0,
  },
  statsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  statItem: {
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#3f3f46', // zinc-700
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statCount: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#18181b', // zinc-900
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e4e4e7', // zinc-200
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  totalRow: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e4e4e7',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#71717a', // zinc-500
  },
  totalValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#10b981', // emerald-500
  },
};

// Mock data for standalone demo
const mockStats: ContentStat[] = [
  {
    id: 'drafts',
    label: 'Drafts',
    count: 12,
    total: 50,
    color: '#f59e0b', // amber-500
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    count: 8,
    total: 50,
    color: '#3b82f6', // blue-500
  },
  {
    id: 'published',
    label: 'Published',
    count: 156,
    total: 200,
    color: '#10b981', // emerald-500
  },
];

export function ContentStats({ stats = mockStats, title = 'Content Overview' }: ContentStatsProps) {
  const totalContent = stats.reduce((sum, stat) => sum + stat.count, 0);

  const handleItemHover = (e: React.MouseEvent<HTMLDivElement>, isEntering: boolean) => {
    e.currentTarget.style.transform = isEntering ? 'translateX(4px)' : 'translateX(0)';
  };

  return (
    <div style={styles.container}>
      {title && (
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>{title}</h3>
        </div>
      )}
      <div style={styles.statsList}>
        {stats.map((stat) => {
          const percentage = stat.total ? (stat.count / stat.total) * 100 : 0;

          return (
            <div
              key={stat.id}
              style={styles.statItem}
              onClick={stat.onClick}
              onMouseEnter={(e) => handleItemHover(e, true)}
              onMouseLeave={(e) => handleItemHover(e, false)}
              role={stat.onClick ? 'button' : undefined}
              tabIndex={stat.onClick ? 0 : undefined}
            >
              <div style={styles.statHeader}>
                <span style={styles.statLabel}>
                  <span style={{ ...styles.statDot, backgroundColor: stat.color }} />
                  {stat.label}
                </span>
                <span style={styles.statCount}>{stat.count}</span>
              </div>
              {stat.total && (
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${percentage}%`,
                      backgroundColor: stat.color,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={styles.totalRow}>
        <span style={styles.totalLabel}>Total Content</span>
        <span style={styles.totalValue}>{totalContent}</span>
      </div>
    </div>
  );
}

export default ContentStats;
