/**
 * Gemini Service
 *
 * Google's Gemini API handles two roles in the platform:
 *
 *   1. Research — using Gemini 2.5 Flash with Google Search grounding, we get
 *      live web data, current trends, People-Also-Ask-style questions, and
 *      fact-checking. Replaces Perplexity for the research step in content
 *      generation and auto-optimization.
 *
 *   2. Image generation — using Gemini 2.5 Flash Image ("Nano Banana") for
 *      featured images on QA/blog pages. Supports character consistency and
 *      image editing, which beats OpenAI gpt-image-1 for product imagery.
 *
 * Env vars: GEMINI_API_KEY (from Google AI Studio)
 */

import { GoogleGenAI } from '@google/genai';
import {
  ResearchResult,
  Statistic,
  Citation,
} from '../types/qa-content.types';

// Re-export so callers can import from the gemini-service module
export type { ResearchResult, Statistic, Citation };

export interface ResearchOptions {
  depth?: 'basic' | 'thorough' | 'expert';
  dateFilter?: 'last_month' | 'last_6_months' | 'last_year';
}

// ============================================================================
// IMAGE GENERATION TYPES
// ============================================================================

export interface GeneratedImage {
  imageBytes: Buffer;
  mimeType: string;
  prompt: string;
  model: string;
}

export interface ImageGenOptions {
  style?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

// ============================================================================
// SERVICE
// ============================================================================

const RESEARCH_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export class GeminiService {
  private readonly client: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error(
        'GEMINI_API_KEY (or GOOGLE_API_KEY) env var is required for Gemini service',
      );
    }
    this.client = new GoogleGenAI({ apiKey: key });
  }

  /**
   * Research a topic using Gemini with Google Search grounding enabled.
   * Returns a ResearchResult shaped to match the legacy Perplexity interface.
   */
  async research(
    question: string,
    options: ResearchOptions = {},
  ): Promise<ResearchResult> {
    const depth = options.depth || 'thorough';
    const dateHint = this.describeDate(options.dateFilter);

    const prompt = `Research the following for a Shopify SEO content team. ${dateHint}

Topic: ${question}

Required output as STRICT JSON (no markdown fences, no commentary before or after):
{
  "factualInformation": ["fact 1", "fact 2", ...],
  "statistics": [{"claim": "...", "value": "42%", "source": "Source name", "date": "2025", "verified": true}],
  "citations": [{"text": "snippet", "url": "https://...", "title": "Source title", "publishDate": "2025-03", "author": "Author name"}],
  "recentUpdates": ["recent update 1", ...],
  "relatedTopics": ["related topic 1", ...],
  "keyTakeaways": ["takeaway 1", "takeaway 2", ...]
}

Use ${depth === 'expert' ? '8-12' : depth === 'thorough' ? '5-8' : '3-5'} items per array. Citations must be real URLs from the grounded search results.`;

    try {
      const response = await this.client.models.generateContent({
        model: RESEARCH_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.2,
          maxOutputTokens: 4000,
        },
      });

      const rawText = this.extractText(response);
      const parsed = this.parseResearchJSON(rawText);

      // Pull grounding metadata (URLs used by Google Search)
      const sources = this.extractGroundingSources(response);

      // Normalize statistics (defensively handle string-only entries from a
      // less-structured response)
      const statistics: Statistic[] = (parsed.statistics || []).map((s: any) => {
        if (typeof s === 'string') {
          return {
            claim: s,
            value: '',
            source: '',
            date: '',
            verified: false,
          };
        }
        return {
          claim: s.claim || '',
          value: s.value || '',
          source: s.source || '',
          date: s.date || '',
          verified: !!s.verified,
        };
      });

      const citations: Citation[] = (parsed.citations || []).map((c: any) => ({
        text: c.text || c.title || '',
        url: c.url || '',
        title: c.title || c.text || '',
        publishDate: c.publishDate,
        author: c.author,
      }));

      return {
        query: question,
        factualInformation: parsed.factualInformation || [],
        statistics,
        citations,
        recentUpdates: parsed.recentUpdates || [],
        relatedTopics: parsed.relatedTopics || [],
        keyTakeaways: parsed.keyTakeaways || [],
        sources,
      };
    } catch (error: any) {
      throw new Error(
        `Gemini research failed for "${question}": ${error.message}`,
      );
    }
  }

  /**
   * Generate an image using Gemini 2.5 Flash Image. Returns raw image bytes
   * plus mime type. Caller is responsible for persisting to disk/CDN/etc.
   */
  async generateImage(
    prompt: string,
    options: ImageGenOptions = {},
  ): Promise<GeneratedImage> {
    const stylePrefix = options.style
      ? `Style: ${options.style}. `
      : 'Style: clean, professional, photorealistic, well-lit. ';
    const aspectHint = options.aspectRatio
      ? ` Aspect ratio: ${options.aspectRatio}.`
      : '';

    const fullPrompt = `${stylePrefix}${prompt}${aspectHint}`;

    try {
      const response = await this.client.models.generateContent({
        model: IMAGE_MODEL,
        contents: fullPrompt,
        config: {
          responseModalities: ['Image' as any, 'Text' as any],
        },
      });

      const imagePart = this.extractImagePart(response);
      if (!imagePart) {
        throw new Error('No image returned in Gemini response');
      }

      return {
        imageBytes: Buffer.from(imagePart.data, 'base64'),
        mimeType: imagePart.mimeType,
        prompt: fullPrompt,
        model: IMAGE_MODEL,
      };
    } catch (error: any) {
      throw new Error(
        `Gemini image generation failed: ${error.message}`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Response parsing helpers
  // --------------------------------------------------------------------------

  private extractText(response: any): string {
    // Candidates → content.parts → text
    const candidates = response?.candidates;
    if (!candidates || candidates.length === 0) return '';
    const parts = candidates[0]?.content?.parts || [];
    return parts
      .map((p: any) => p.text || '')
      .filter(Boolean)
      .join('\n');
  }

  private extractImagePart(
    response: any,
  ): { data: string; mimeType: string } | null {
    const candidates = response?.candidates;
    if (!candidates || candidates.length === 0) return null;

    const parts = candidates[0]?.content?.parts || [];
    for (const part of parts) {
      const inlineData = part.inlineData || part.inline_data;
      if (
        inlineData?.mimeType?.startsWith('image/') &&
        inlineData?.data
      ) {
        return {
          data: inlineData.data,
          mimeType: inlineData.mimeType,
        };
      }
    }
    return null;
  }

  private extractGroundingSources(response: any): string[] {
    const candidates = response?.candidates || [];
    if (candidates.length === 0) return [];
    const grounding = candidates[0]?.groundingMetadata;
    if (!grounding?.groundingChunks) return [];

    const urls: string[] = [];
    for (const chunk of grounding.groundingChunks) {
      const url = chunk?.web?.uri;
      if (url && !urls.includes(url)) urls.push(url);
    }
    return urls;
  }

  private parseResearchJSON(raw: string): any {
    if (!raw) return {};
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return {};
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return {};
    }
  }

  private describeDate(filter?: ResearchOptions['dateFilter']): string {
    switch (filter) {
      case 'last_month':
        return 'Focus on information published in the last 30 days.';
      case 'last_6_months':
        return 'Focus on information published in the last 6 months.';
      case 'last_year':
        return 'Focus on information published in the last 12 months.';
      default:
        return 'Prefer recent, authoritative sources.';
    }
  }
}

let instance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!instance) instance = new GeminiService();
  return instance;
}
