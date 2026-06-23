import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module';
import { json, urlencoded } from 'express';
import serverlessExpress from '@vendia/serverless-express';

let server;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const expressApp = app.getHttpAdapter().getInstance();

  // CORS. ALLOWED_ORIGINS = lista separada por comas. Sin env => "*".
  const allowed = (process.env.ALLOWED_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  expressApp.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (allowed.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  });

  await app.init();

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