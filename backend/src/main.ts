/**
 * Shopify SEO Automation Platform - Backend Entry Point
 *
 * NestJS application bootstrap with:
 * - CORS enabled for frontend
 * - Validation pipes
 * - Rate limiting
 * - Logging
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable CORS for frontend (allow multiple dev ports)
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:4175',
    'http://localhost:4173',
    'http://localhost:4174',
    'http://localhost:4175',
    'http://localhost:4176',
    'http://localhost:4177',
    'http://localhost:4178',
    'http://localhost:5173', // Vite default
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in development
      }
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Start server
  const port = process.env.PORT || 3003;
  await app.listen(port);

  console.log(`
    ========================================
    🚀 Shopify SEO Backend is running!
    ========================================

    Environment: ${process.env.NODE_ENV || 'development'}
    Port: ${port}
    API: http://localhost:${port}/api
    Health: http://localhost:${port}/api/health

    ========================================
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
