import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
const logger = new Logger('NestApplication');
async function bootstrap() {
  const app: NestExpressApplication = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

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
