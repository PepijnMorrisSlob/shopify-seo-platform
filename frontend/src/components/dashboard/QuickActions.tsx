// QuickActions Component - Quick action buttons in a 2x2 grid layout
import { ReactNode, CSSProperties } from 'react';

export interface QuickAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface QuickActionsProps {
  actions?: QuickAction[];
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
    marginBottom: '16px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#18181b', // zinc-900
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  button: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px 16px',
    backgroundColor: '#f4f4f5', // zinc-100
    border: '1px solid #e4e4e7', // zinc-200
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '90px',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald with opacity
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#10b981', // emerald-500
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#3f3f46', // zinc-700
    textAlign: 'center' as const,
  },
};

// Mock data for standalone demo
const mockActions: QuickAction[] = [
  {
    id: 'new-blog',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    label: 'New Blog Post',
  },
  {
    id: 'new-page',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
    label: 'New Page',
  },
  {
    id: 'sync-products',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    label: 'Sync Products',
  },
  {
    id: 'view-calendar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    label: 'View Calendar',
  },
];

export function QuickActions({ actions = mockActions, title = 'Quick Actions' }: QuickActionsProps) {
  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEntering: boolean) => {
    const button = e.currentTarget;
    if (button.disabled) return;

    if (isEntering) {
      button.style.borderColor = '#10b981';
      button.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
      button.style.transform = 'translateY(-2px)';
    } else {
      button.style.borderColor = '#e4e4e7';
      button.style.backgroundColor = '#f4f4f5';
      button.style.transform = 'translateY(0)';
    }
  };

  return (
    <div style={styles.container}>
      {title && (
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>{title}</h3>
        </div>
      )}
      <div style={styles.grid}>
        {actions.map((action) => (
          <button
            key={action.id}
            style={{
              ...styles.button,
              ...(action.disabled ? styles.buttonDisabled : {}),
            }}
            onClick={action.onClick}
            disabled={action.disabled}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            <div style={styles.iconWrapper}>{action.icon}</div>
            <span style={styles.label}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
