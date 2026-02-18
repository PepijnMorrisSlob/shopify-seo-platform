/**
 * Perplexity Service
 *
 * Research and fact-checking service using Perplexity AI Sonar Pro.
 * Provides up-to-date, factually accurate information with citations.
 */

import { ResearchResult, Statistic, Citation, FactCheckingLevel } from '../types/qa-content.types';

export class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
  }

  async research(
    question: string,
    options?: {
      depth?: FactCheckingLevel;
      dateFilter?: 'last_month' | 'last_6_months' | 'last_year';
    }
  ): Promise<ResearchResult> {
    const prompt = `Research: "${question}"\n\nProvide factual information with citations, statistics, and recent updates.`;

    const response = await this.callAPI(prompt);
    return this.parseResponse(response, question);
  }

  async verifyClaims(claims: string[]): Promise<{ claim: string; verified: boolean }[]> {
    return Promise.all(
      claims.map(async (claim) => {
        const response = await this.callAPI(`Verify: "${claim}". True or false with evidence.`);
        return { claim, verified: response.toLowerCase().includes('true') };
      })
    );
  }

  private async callAPI(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private parseResponse(response: string, question: string): ResearchResult {
    return {
      query: question,
      factualInformation: this.extractBullets(response),
      statistics: [],
      citations: [],
      recentUpdates: [],
      relatedTopics: [],
      keyTakeaways: [],
      sources: [],
    };
  }

  private extractBullets(text: string): string[] {
    return text
      .split('\n')
      .filter((l) => l.trim().startsWith('-'))
      .map((l) => l.replace(/^[-•]\s*/, '').trim());
  }
}

export default PerplexityService;
