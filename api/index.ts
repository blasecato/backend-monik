import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from '../dist/app.module';

const expressApp = express();
let ready: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

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
      'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  });

  await app.init();
}

export default async function handler(req: any, res: any) {
  if (!ready) {
    ready = bootstrap();
  }
  await ready;
  return expressApp(req, res);
}
