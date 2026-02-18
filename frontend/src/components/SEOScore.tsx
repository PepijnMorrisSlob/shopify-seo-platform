// SEO Score Component
import { Badge, Box } from '@shopify/polaris';

interface SEOScoreProps {
  score: number;
  showLabel?: boolean;
}

export function SEOScore({ score, showLabel = true }: SEOScoreProps) {
  const getScoreColor = (score: number): 'success' | 'warning' | 'critical' => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'critical';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Good';
    return 'Needs Improvement';
  };

  const labelText = showLabel ? ` - ${getScoreLabel(score)}` : '';

  return (
    <Box>
      <Badge tone={getScoreColor(score)}>
        {`Score: ${score}/100${labelText}`}
      </Badge>
    </Box>
  );
}
