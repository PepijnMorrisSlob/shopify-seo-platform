/**
 * Business Profile Controller
 * Manages organization business profile and customization
 */

import { Controller, Get, Post, Put, Body, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('business-profile')
export class BusinessProfileController {
  private prisma = new PrismaClient();

  @Get()
  async getProfile(@Query('organizationId') organizationId?: string) {
    // TODO: Add authentication guard
    // TODO: Get organizationId from session

    if (!organizationId) {
      return null;
    }

    const profile = await this.prisma.businessProfile.findUnique({
      where: { organizationId },
    });

    return profile;
  }

  @Post()
  async createProfile(@Body() body: any) {
    // TODO: Add authentication guard
    // TODO: Validate input with class-validator

    // Get organizationId from body or find the first active organization
    let organizationId = body.organizationId;

    if (!organizationId) {
      const organization = await this.prisma.organization.findFirst({
        where: { isActive: true },
        select: { id: true },
      });

      if (!organization) {
        throw new Error('No active organization found');
      }

      organizationId = organization.id;
    }

    const profile = await this.prisma.businessProfile.create({
      data: {
        businessName: body.businessName,
        industry: body.industry,
        productTypes: body.productTypes || [],
        targetAudience: body.targetAudience as any,
        brandVoice: body.brandVoice as any,
        contentStrategy: body.contentStrategy as any,
        seoStrategy: body.seoStrategy as any,
        productStrategy: body.productStrategy as any,
        advancedSettings: body.advancedSettings as any,
        organization: {
          connect: { id: organizationId },
        },
      },
    });

    return profile;
  }

  @Put()
  async updateProfile(@Body() body: any) {
    // TODO: Add authentication guard
    // TODO: Validate input

    const profile = await this.prisma.businessProfile.update({
      where: { organizationId: body.organizationId },
      data: body as any,
    });

    return profile;
  }
}
