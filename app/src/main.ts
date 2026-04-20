import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ConsoleLogger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'nest-prisma-lab',
    }),
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe());

  const swagger_server_path = process.env.SWAGGER_SERVER_PATH;

  const document_builder = new DocumentBuilder()
    .setTitle('Hotel Booking System API')
    .setDescription(
      [
        'API for managing rooms within Hotel Booking System.',
        '',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addTag('rooms')
    .addTag('bookings')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Use: Authorization: Bearer <access_token>',
        in: 'header',
      },
      'access-token',
    );

  if (swagger_server_path) {
    document_builder.addServer(swagger_server_path);
  }

  const config = document_builder.build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();