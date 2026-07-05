import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { serviceConfig } from './config';

export async function bootstrap(module: unknown) {
  const app = await NestFactory.create(module as never);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(serviceConfig().port);
}

