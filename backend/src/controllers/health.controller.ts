/**
 * Health Check Controller
 * Returns server status for monitoring and load balancers
 */

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'shopify-seo-backend',
      version: '1.0.0',
    };
  }
}
