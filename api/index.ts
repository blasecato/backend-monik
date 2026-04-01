import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { json, urlencoded } from 'express';
import serverlessExpress from '@vendia/serverless-express';

let server;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const expressApp = app.getHttpAdapter().getInstance();

  // 🔥 CORS MANUAL (esto arregla tu error)
  expressApp.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // 👈 en producción cambia esto
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    // 👇 manejar preflight (CLAVE)
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