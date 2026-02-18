/**
 * Schema Markup Service
 *
 * Generates structured data (Schema.org) for SEO.
 * Supports FAQ, Article, Product, and HowTo schemas.
 */

import { FAQSchema, ArticleSchema, FAQItem } from '../types/qa-content.types';

export class SchemaService {
  /**
   * Generate FAQ schema for Q&A content
   */
  generateFAQSchema(question: string, answer: string, relatedFAQs: FAQItem[] = []): FAQSchema {
    const mainEntity = [
      {
        '@type': 'Question' as const,
        name: question,
        acceptedAnswer: {
          '@type': 'Answer' as const,
          text: this.stripHTML(answer),
        },
      },
    ];

    // Add related FAQs
    for (const faq of relatedFAQs.slice(0, 5)) {
      mainEntity.push({
        '@type': 'Question' as const,
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer' as const,
          text: this.stripHTML(faq.answer),
        },
      });
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity,
    };
  }

  /**
   * Generate Article schema for blog content
   */
  generateArticleSchema(
    headline: string,
    description: string,
    author: string,
    publisher: string,
    logoUrl: string,
    publishDate: Date,
    modifiedDate: Date,
    url: string
  ): ArticleSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline,
      description,
      author: {
        '@type': 'Organization',
        name: author,
      },
      publisher: {
        '@type': 'Organization',
        name: publisher,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
        },
      },
      datePublished: publishDate.toISOString(),
      dateModified: modifiedDate.toISOString(),
      mainEntityOfPage: url,
    };
  }

  /**
   * Validate schema markup
   */
  validateSchema(schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema['@context']) errors.push('Missing @context');
    if (!schema['@type']) errors.push('Missing @type');

    if (schema['@type'] === 'FAQPage') {
      if (!schema.mainEntity || !Array.isArray(schema.mainEntity)) {
        errors.push('FAQPage requires mainEntity array');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

export default SchemaService;
