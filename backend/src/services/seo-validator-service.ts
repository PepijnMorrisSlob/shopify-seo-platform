/**
 * SEO Validator Service
 *
 * Validates content against SEO best practices.
 * Checks keyword density, readability, meta tags, structure, and more.
 */

import { SEOValidationResult, SEOCheck, SEOError, SEOWarning } from '../types/qa-content.types';

export class SEOValidatorService {
  /**
   * Validate content for SEO compliance
   */
  async validate(
    content: string,
    options: {
      targetKeyword: string;
      metaTitle?: string;
      metaDescription?: string;
      url?: string;
    }
  ): Promise<SEOValidationResult> {
    const checks: SEOCheck[] = [];
    const errors: SEOError[] = [];
    const warnings: SEOWarning[] = [];

    // 1. Keyword density check
    const keywordDensity = this.calculateKeywordDensity(content, options.targetKeyword);
    checks.push({
      name: 'Keyword Density',
      passed: keywordDensity >= 1 && keywordDensity <= 3,
      score: keywordDensity >= 1 && keywordDensity <= 3 ? 100 : 50,
      message: `Keyword density: ${keywordDensity.toFixed(2)}% (ideal: 1-3%)`,
      category: 'important',
    });

    if (keywordDensity === 0) {
      errors.push({
        type: 'missing_keyword',
        message: `Target keyword "${options.targetKeyword}" not found in content`,
        severity: 'critical',
        fix: 'Add target keyword naturally throughout the content',
      });
    }

    // 2. Word count check
    const wordCount = content.split(/\s+/).length;
    checks.push({
      name: 'Word Count',
      passed: wordCount >= 300,
      score: wordCount >= 1000 ? 100 : wordCount >= 300 ? 70 : 30,
      message: `Word count: ${wordCount} (recommended: 1000+)`,
      category: 'important',
    });

    // 3. Heading structure
    const hasH1 = /<h1[^>]*>/i.test(content);
    const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;

    checks.push({
      name: 'Heading Structure',
      passed: hasH1 && h2Count >= 2,
      score: hasH1 && h2Count >= 2 ? 100 : 60,
      message: `H1: ${hasH1 ? 'Yes' : 'No'}, H2s: ${h2Count}`,
      category: 'critical',
    });

    if (!hasH1) {
      errors.push({
        type: 'missing_h1',
        message: 'Missing H1 heading',
        severity: 'critical',
        fix: 'Add a single H1 heading at the beginning of the content',
      });
    }

    // 4. Meta title check
    if (options.metaTitle) {
      const titleLength = options.metaTitle.length;
      checks.push({
        name: 'Meta Title Length',
        passed: titleLength >= 30 && titleLength <= 60,
        score: titleLength >= 30 && titleLength <= 60 ? 100 : 70,
        message: `Title length: ${titleLength} characters (ideal: 30-60)`,
        category: 'critical',
      });

      const keywordInTitle = options.metaTitle.toLowerCase().includes(options.targetKeyword.toLowerCase());
      checks.push({
        name: 'Keyword in Title',
        passed: keywordInTitle,
        score: keywordInTitle ? 100 : 50,
        message: keywordInTitle ? 'Keyword found in title' : 'Keyword missing from title',
        category: 'critical',
      });
    }

    // 5. Meta description check
    if (options.metaDescription) {
      const descLength = options.metaDescription.length;
      checks.push({
        name: 'Meta Description Length',
        passed: descLength >= 120 && descLength <= 160,
        score: descLength >= 120 && descLength <= 160 ? 100 : 70,
        message: `Description length: ${descLength} characters (ideal: 120-160)`,
        category: 'important',
      });
    }

    // 6. Internal links check
    const internalLinks = (content.match(/<a[^>]*href/gi) || []).length;
    checks.push({
      name: 'Internal Links',
      passed: internalLinks >= 2,
      score: internalLinks >= 3 ? 100 : internalLinks >= 1 ? 70 : 40,
      message: `Internal links: ${internalLinks} (recommended: 3+)`,
      category: 'optional',
    });

    if (internalLinks === 0) {
      warnings.push({
        type: 'no_internal_links',
        message: 'No internal links found',
        recommendation: 'Add 2-5 contextual internal links to related content',
      });
    }

    // Calculate overall score
    const overallScore = Math.round(
      checks.reduce((sum, check) => sum + check.score, 0) / checks.length
    );

    const passed = errors.length === 0 && overallScore >= 70;

    return {
      overallScore,
      checks,
      errors,
      warnings,
      recommendations: this.generateRecommendations(checks, errors, warnings),
      passed,
    };
  }

  /**
   * Calculate keyword density
   */
  private calculateKeywordDensity(content: string, keyword: string): number {
    const words = content.toLowerCase().split(/\s+/);
    const keywordLower = keyword.toLowerCase();
    const occurrences = words.filter((w) => w.includes(keywordLower)).length;

    return (occurrences / words.length) * 100;
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    checks: SEOCheck[],
    errors: SEOError[],
    warnings: SEOWarning[]
  ): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push(`Fix ${errors.length} critical errors first`);
    }

    const failedChecks = checks.filter((c) => !c.passed && c.category === 'critical');
    if (failedChecks.length > 0) {
      failedChecks.forEach((check) => {
        recommendations.push(check.message);
      });
    }

    if (warnings.length > 0) {
      warnings.forEach((warning) => {
        recommendations.push(warning.recommendation);
      });
    }

    return recommendations;
  }
}

export default SEOValidatorService;
