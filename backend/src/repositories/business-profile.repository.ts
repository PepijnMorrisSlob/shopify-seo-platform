/**
 * Business Profile Repository
 * Database operations for business customization profiles
 */

import { PrismaClient, BusinessProfile } from '@prisma/client';
import {
  TargetAudience,
  BrandVoice,
  ContentStrategy,
  SEOStrategy,
  ProductStrategy,
  AdvancedSettings,
} from '../types/database.types';

export class BusinessProfileRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new business profile for an organization
   */
  async create(data: {
    organizationId: string;
    businessName: string;
    industry: string;
    productTypes: string[];
    targetAudience: TargetAudience;
    brandVoice: BrandVoice;
    contentStrategy: ContentStrategy;
    seoStrategy: SEOStrategy;
    productStrategy: ProductStrategy;
    advancedSettings: AdvancedSettings;
  }): Promise<BusinessProfile> {
    return this.prisma.businessProfile.create({
      data: {
        organizationId: data.organizationId,
        businessName: data.businessName,
        industry: data.industry,
        productTypes: data.productTypes,
        targetAudience: data.targetAudience as any,
        brandVoice: data.brandVoice as any,
        contentStrategy: data.contentStrategy as any,
        seoStrategy: data.seoStrategy as any,
        productStrategy: data.productStrategy as any,
        advancedSettings: data.advancedSettings as any,
      },
    });
  }

  /**
   * Get business profile by organization ID
   */
  async getByOrganizationId(organizationId: string): Promise<BusinessProfile | null> {
    return this.prisma.businessProfile.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Update business profile
   */
  async update(
    organizationId: string,
    data: Partial<{
      businessName: string;
      industry: string;
      productTypes: string[];
      targetAudience: TargetAudience;
      brandVoice: BrandVoice;
      contentStrategy: ContentStrategy;
      seoStrategy: SEOStrategy;
      productStrategy: ProductStrategy;
      advancedSettings: AdvancedSettings;
    }>
  ): Promise<BusinessProfile> {
    return this.prisma.businessProfile.update({
      where: { organizationId },
      data: data as any,
    });
  }

  /**
   * Update brand voice from example content
   */
  async updateBrandVoice(
    organizationId: string,
    brandVoice: BrandVoice
  ): Promise<BusinessProfile> {
    return this.prisma.businessProfile.update({
      where: { organizationId },
      data: { brandVoice: brandVoice as any },
    });
  }

  /**
   * Update content strategy
   */
  async updateContentStrategy(
    organizationId: string,
    contentStrategy: ContentStrategy
  ): Promise<BusinessProfile> {
    return this.prisma.businessProfile.update({
      where: { organizationId },
      data: { contentStrategy: contentStrategy as any },
    });
  }

  /**
   * Get profiles by industry (for benchmarking)
   */
  async getByIndustry(industry: string, limit: number = 10): Promise<BusinessProfile[]> {
    return this.prisma.businessProfile.findMany({
      where: { industry },
      take: limit,
    });
  }

  /**
   * Delete business profile
   */
  async delete(organizationId: string): Promise<void> {
    await this.prisma.businessProfile.delete({
      where: { organizationId },
    });
  }

  /**
   * Check if organization has a business profile
   */
  async exists(organizationId: string): Promise<boolean> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { organizationId },
      select: { id: true },
    });
    return profile !== null;
  }

  /**
   * Get profile with custom question templates
   */
  async getWithTemplates(organizationId: string) {
    return this.prisma.businessProfile.findUnique({
      where: { organizationId },
      include: {
        customQuestionTemplates: {
          orderBy: { priority: 'desc' },
        },
      },
    });
  }

  /**
   * Get profile with automation rules
   */
  async getWithAutomationRules(organizationId: string) {
    return this.prisma.businessProfile.findUnique({
      where: { organizationId },
      include: {
        automationRules: {
          where: { enabled: true },
        },
      },
    });
  }
}
