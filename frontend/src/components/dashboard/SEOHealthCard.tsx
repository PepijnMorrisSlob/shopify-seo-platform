// SEOHealthCard Component - Overall SEO health with circular progress and breakdown
import { CSSProperties } from 'react';

export interface SEOMetric {
  id: string;
  label: string;
  value: number;
  maxValue: number;
}

export interface SEOHealthCardProps {
  score?: number;
  metrics?: SEOMetric[];
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
  scoreSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  circleContainer: {
    position: 'relative' as const,
    width: '140px',
    height: '140px',
  },
  circleSvg: {
    transform: 'rotate(-90deg)',
    width: '100%',
    height: '100%',
  },
  scoreValue: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center' as const,
  },
  scoreNumber: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#18181b', // zinc-900
    display: 'block',
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#71717a', // zinc-500
    marginTop: '4px',
  },
  metricsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  metricItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    backgroundColor: '#f4f4f5', // zinc-100
    borderRadius: '8px',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#3f3f46', // zinc-700
    fontWeight: 500,
  },
  metricValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metricScore: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#18181b', // zinc-900
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};

// Helper function to get color based on score
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // emerald-500 (green)
  if (score >= 60) return '#f59e0b'; // amber-500 (yellow)
  return '#ef4444'; // red-500
};

// Mock data for standalone demo
const mockMetrics: SEOMetric[] = [
  { id: 'products', label: 'Products Optimized', value: 42, maxValue: 50 },
  { id: 'content', label: 'Content Score', value: 78, maxValue: 100 },
  { id: 'meta', label: 'Meta Tags Complete', value: 45, maxValue: 50 },
  { id: 'images', label: 'Image Alt Text', value: 38, maxValue: 50 },
];

export function SEOHealthCard({
  score = 82,
  metrics = mockMetrics,
  title = 'SEO Health',
}: SEOHealthCardProps) {
  const scoreColor = getScoreColor(score);

  // SVG circle parameters
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div style={styles.container}>
      {title && (
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>{title}</h3>
        </div>
      )}

      <div style={styles.scoreSection}>
        <div style={styles.circleContainer}>
          <svg style={styles.circleSvg} viewBox="0 0 140 140">
            {/* Background circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#e4e4e7"
              strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={styles.scoreValue}>
            <span style={{ ...styles.scoreNumber, color: scoreColor }}>{score}</span>
            <span style={styles.scoreLabel}>out of 100</span>
          </div>
        </div>
      </div>

      <div style={styles.metricsSection}>
        {metrics.map((metric) => {
          const percentage = (metric.value / metric.maxValue) * 100;
          const metricColor = getScoreColor(percentage);

          return (
            <div key={metric.id} style={styles.metricItem}>
              <span style={styles.metricLabel}>{metric.label}</span>
              <div style={styles.metricValue}>
                <span style={styles.metricScore}>
                  {metric.value}/{metric.maxValue}
                </span>
                <span style={{ ...styles.statusDot, backgroundColor: metricColor }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SEOHealthCard;
