// StatCard Component - Bento-style stat card with icon, label, value, and trend indicator
import { ReactNode, CSSProperties } from 'react';

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

const styles: Record<string, CSSProperties> = {
  card: {
    backgroundColor: '#ffffff', // white
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e4e4e7', // zinc-200
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  cardGradient: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f4f4f5 100%)',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald-500 with opacity
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    color: '#10b981', // emerald-500
  },
  label: {
    fontSize: '14px',
    color: '#71717a', // zinc-500
    marginBottom: '4px',
    fontWeight: 500,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  value: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#18181b', // zinc-900
    lineHeight: 1.2,
  },
  trendUp: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#10b981', // emerald-500
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  trendDown: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#ef4444', // red-500
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
};

// Mock data for standalone demo
const mockData: StatCardProps = {
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  label: 'Total Revenue',
  value: '$24,500',
  trend: '+12.5%',
  trendUp: true,
  gradient: true,
};

export function StatCard({
  icon = mockData.icon,
  label = mockData.label,
  value = mockData.value,
  trend = mockData.trend,
  trendUp = mockData.trendUp,
  gradient = false,
  onClick,
}: StatCardProps) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.borderColor = '#10b981';
    e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(16, 185, 129, 0.15)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = '#e4e4e7';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
  };

  return (
    <div
      style={{
        ...styles.card,
        ...(gradient ? styles.cardGradient : {}),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div style={styles.iconWrapper}>{icon}</div>
      <div style={styles.label}>{label}</div>
      <div style={styles.valueRow}>
        <span style={styles.value}>{value}</span>
        {trend && (
          <span style={trendUp ? styles.trendUp : styles.trendDown}>
            {trendUp ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            )}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
