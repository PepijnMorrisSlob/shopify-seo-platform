/**
 * Reports Controller
 *
 * Exposes monthly PDF reports for client organizations.
 *   GET /api/reports/monthly?organizationId=...&month=YYYY-MM — download PDF
 *   GET /api/reports/monthly/preview?organizationId=... — JSON preview of metrics
 */

import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { getReportGenerationService } from '../services/report-generation-service';

@Controller('reports')
export class ReportsController {
  @Get('monthly')
  async downloadMonthlyReport(
    @Query('organizationId') organizationId: string,
    @Query('month') monthStr: string | undefined,
    @Res() res: Response,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const month = monthStr ? this.parseMonth(monthStr) : undefined;

    try {
      const service = getReportGenerationService();
      const { buffer, filename } = await service.generateMonthlyPDF({
        organizationId,
        month,
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      });
      res.send(buffer);
    } catch (error: any) {
      throw new HttpException(
        `Report generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('monthly/preview')
  async previewMonthlyReport(
    @Query('organizationId') organizationId: string,
    @Query('month') monthStr: string | undefined,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const month = monthStr
      ? this.parseMonth(monthStr)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

    const service = getReportGenerationService();
    const metrics = await service.collectMetrics(organizationId, month);

    return {
      organizationId,
      month: month.toISOString().slice(0, 7),
      metrics,
    };
  }

  private parseMonth(monthStr: string): Date {
    // Accept YYYY-MM or YYYY-MM-DD
    const parsed = new Date(
      monthStr.length === 7 ? `${monthStr}-01` : monthStr,
    );
    if (isNaN(parsed.getTime())) {
      throw new HttpException(
        `Invalid month format: ${monthStr}. Use YYYY-MM.`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return parsed;
  }
}
