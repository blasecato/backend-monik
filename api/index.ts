import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { json, urlencoded } from 'express';
import serverlessExpress from '@vendia/serverless-express';

let server;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();

  return serverlessExpress({
    app: expressApp,
  });
}

export default async function handler(req, res) {
  if (!server) {
    server = await bootstrap();
  }
  return server(req, res);
}
