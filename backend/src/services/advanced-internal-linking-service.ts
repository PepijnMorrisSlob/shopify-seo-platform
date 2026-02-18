/**
 * Advanced Internal Linking Service
 *
 * AI-powered contextual internal linking using semantic similarity.
 * Optimizes link graph for SEO and user experience.
 *
 * Features:
 * - Semantic similarity-based linking (embeddings)
 * - Contextual anchor text generation
 * - Link graph optimization
 * - Orphan page detection and linking
 * - Hub page identification
 */

import OpenAI from 'openai';
import { InternalLink, LinkOpportunity, LinkGraphMetrics, QAContent } from '../types/qa-content.types';

export class AdvancedInternalLinkingService {
  private openai: OpenAI;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ==========================================================================
  // CONTEXTUAL LINK GENERATION
  // ==========================================================================

  /**
   * Generate contextual internal links for content
   * Uses embeddings to find semantically related pages
   */
  async generateContextualLinks(
    content: string,
    currentPageId: string,
    availablePages: { id: string; url: string; title: string; content: string; type: string }[],
    maxLinks: number = 5
  ): Promise<InternalLink[]> {
    console.log(`[InternalLinking] Generating contextual links for page ${currentPageId}...`);

    // Get embedding for current content
    const contentEmbedding = await this.getEmbedding(content);

    // Calculate similarity with all available pages
    const similarities = await Promise.all(
      availablePages.map(async (page) => {
        const pageEmbedding = await this.getEmbedding(page.content.substring(0, 1000));
        const similarity = this.cosineSimilarity(contentEmbedding, pageEmbedding);

        return {
          page,
          similarity,
        };
      })
    );

    // Filter by relevance threshold and sort
    const relevant = similarities
      .filter((s) => s.similarity > 0.7) // Only highly relevant
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxLinks);

    // Generate links with AI-powered anchor text
    const links = await Promise.all(
      relevant.map(async ({ page, similarity }) => {
        const anchorText = await this.generateAnchorText(content, page.title);

        return {
          id: `link-${currentPageId}-${page.id}`,
          sourcePageId: currentPageId,
          sourceUrl: '', // Will be set by caller
          targetUrl: page.url,
          targetPageType: page.type as any,
          anchorText,
          context: this.extractContext(content, anchorText),
          relevanceScore: similarity,
          linkType: 'contextual' as const,
          metadata: {
            createdAt: new Date(),
            generatedBy: 'ai' as const,
          },
        };
      })
    );

    console.log(`[InternalLinking] Generated ${links.length} contextual links`);
    return links;
  }

  // ==========================================================================
  // ANCHOR TEXT GENERATION
  // ==========================================================================

  /**
   * Generate natural anchor text using GPT-4
   */
  private async generateAnchorText(sourceContent: string, targetPageTitle: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate natural, contextual anchor text for internal links. 2-5 words, descriptive, not generic.',
        },
        {
          role: 'user',
          content: `Source content: "${sourceContent.substring(0, 500)}"\n\nTarget page: "${targetPageTitle}"\n\nGenerate anchor text:`,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || targetPageTitle;
  }

  // ==========================================================================
  // LINK GRAPH OPTIMIZATION
  // ==========================================================================

  /**
   * Optimize link graph for entire organization
   * Finds orphans, adds strategic links, balances link distribution
   */
  async optimizeLinkGraph(
    organizationId: string,
    allPages: { id: string; url: string; title: string; content: string; inboundLinks: number }[]
  ): Promise<LinkOpportunity[]> {
    console.log(`[InternalLinking] Optimizing link graph for org ${organizationId}...`);

    const opportunities: LinkOpportunity[] = [];

    // 1. Find orphan pages (no inbound links)
    const orphans = allPages.filter((p) => p.inboundLinks === 0);

    for (const orphan of orphans) {
      // Find best hub pages to link from
      const hubs = allPages
        .filter((p) => p.inboundLinks > 5) // High authority pages
        .slice(0, 3);

      for (const hub of hubs) {
        const anchorText = await this.generateAnchorText(hub.content, orphan.title);

        opportunities.push({
          sourcePage: { id: hub.id, url: hub.url, title: hub.title },
          targetPage: { id: orphan.id, url: orphan.url, title: orphan.title, type: 'qa_page' },
          suggestedAnchorText: anchorText,
          suggestedPosition: 500, // Middle of content
          relevanceScore: 0.8,
          reasoning: `Link orphan page "${orphan.title}" from high-authority page "${hub.title}"`,
        });
      }
    }

    // 2. Balance link distribution
    // Pages with too few inbound links get boosted
    const underlinked = allPages.filter((p) => p.inboundLinks > 0 && p.inboundLinks < 3);

    for (const page of underlinked.slice(0, 10)) {
      // Find related pages that could link to it
      const embedding = await this.getEmbedding(page.content);

      const relatedPages = await this.findRelatedPages(embedding, allPages, page.id);

      for (const related of relatedPages.slice(0, 2)) {
        const anchorText = await this.generateAnchorText(related.content, page.title);

        opportunities.push({
          sourcePage: { id: related.id, url: related.url, title: related.title },
          targetPage: { id: page.id, url: page.url, title: page.title, type: 'qa_page' },
          suggestedAnchorText: anchorText,
          suggestedPosition: 300,
          relevanceScore: 0.75,
          reasoning: `Boost underlinked page "${page.title}" from related page "${related.title}"`,
        });
      }
    }

    console.log(`[InternalLinking] Found ${opportunities.length} link opportunities`);
    return opportunities;
  }

  /**
   * Calculate link graph metrics
   */
  async calculateLinkGraphMetrics(
    pages: { id: string; inboundLinks: number; outboundLinks: number }[]
  ): Promise<LinkGraphMetrics> {
    const totalPages = pages.length;
    const totalLinks = pages.reduce((sum, p) => sum + p.outboundLinks, 0);

    const avgInbound = pages.reduce((sum, p) => sum + p.inboundLinks, 0) / totalPages;
    const avgOutbound = totalLinks / totalPages;

    const orphans = pages.filter((p) => p.inboundLinks === 0).length;
    const hubs = pages
      .filter((p) => p.outboundLinks > avgOutbound * 1.5)
      .map((p) => p.id)
      .slice(0, 10);
    const authorities = pages
      .filter((p) => p.inboundLinks > avgInbound * 1.5)
      .map((p) => p.id)
      .slice(0, 10);

    return {
      totalPages,
      totalLinks,
      averageInboundLinks: Math.round(avgInbound * 10) / 10,
      averageOutboundLinks: Math.round(avgOutbound * 10) / 10,
      orphanPages: orphans,
      hubPages: hubs,
      authorities,
    };
  }

  // ==========================================================================
  // EMBEDDING & SIMILARITY
  // ==========================================================================

  /**
   * Get OpenAI embedding for text (with caching)
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = text.substring(0, 100); // Cache by first 100 chars

    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit to avoid token limits
    });

    const embedding = response.data[0].embedding;
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Find pages related to given embedding
   */
  private async findRelatedPages(
    embedding: number[],
    allPages: any[],
    excludeId: string
  ): Promise<any[]> {
    const similarities = await Promise.all(
      allPages
        .filter((p) => p.id !== excludeId)
        .map(async (page) => {
          const pageEmbedding = await this.getEmbedding(page.content);
          return {
            page,
            similarity: this.cosineSimilarity(embedding, pageEmbedding),
          };
        })
    );

    return similarities
      .filter((s) => s.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map((s) => s.page);
  }

  /**
   * Extract context around potential anchor text
   */
  private extractContext(content: string, anchorText: string): string {
    const index = content.toLowerCase().indexOf(anchorText.toLowerCase());
    if (index === -1) return content.substring(0, 200);

    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + anchorText.length + 100);

    return content.substring(start, end);
  }
}

export default AdvancedInternalLinkingService;
