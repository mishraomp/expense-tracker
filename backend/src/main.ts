import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync } from 'fs';

const logger = new Logger('NestApplication');
const staticLogger = new Logger('Static');

async function bootstrap() {
  const app: NestExpressApplication = await NestFactory.create(AppModule);

  // Log static file requests (requests not handled by NestJS controllers)
  // This middleware runs before NestJS routing, so we use res.on('finish') to log
  // only after we know the response was served (and skip API routes logged by interceptor)
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      // Skip API routes - they are logged by LoggingInterceptor
      if (req.originalUrl.startsWith('/api/') || req.originalUrl === '/health') {
        return;
      }
      const duration = Date.now() - startTime;
      const { method, originalUrl } = req;
      const { statusCode } = res;
      const userAgent = req.get('user-agent') || '';
      staticLogger.log(
        `📄 ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        JSON.stringify({ method, url: originalUrl, statusCode, duration, userAgent }),
      );
    });
    next();
  });

  // SPA fallback: serve index.html for non-API, non-asset routes in production
  if (process.env.NODE_ENV === 'production') {
    const publicPath = process.env.FRONTEND_PATH || join(__dirname, '..', 'public');
    const indexPath = join(publicPath, 'index.html');

    // This runs AFTER ServeStaticModule, catching 404s for SPA routes
    app.use((req, res, next) => {
      // Skip API routes, health, docs, and requests with file extensions (assets)
      if (
        req.originalUrl.startsWith('/api/') ||
        req.originalUrl === '/health' ||
        req.originalUrl.startsWith('/docs') ||
        /\.\w+$/.test(req.originalUrl)
      ) {
        return next();
      }

      // Serve index.html for SPA routes
      if (existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      next();
    });
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Global logging interceptor (captures all HTTP requests)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable CORS
  app.enableCors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true });

  // API prefix
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
  const config = new DocumentBuilder()
    .setTitle('Expense Tracker API')
    .setDescription('API documentation for the Expense Tracker application')
    .setVersion('1.0')
    .addTag('expense_tracker')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token from Keycloak',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}

bootstrap()
  .then((app) => {
    logger.log(`Process start up took ${process.uptime()} seconds`);
  })
  .catch((err) => {
    logger.error(err);
  });
