import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

const logger = new Logger('CloudinaryProvider');

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const cloudName = configService
      .get<string>('CLOUDINARY_CLOUD_NAME')
      ?.trim();
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = configService
      .get<string>('CLOUDINARY_API_SECRET')
      ?.trim();

    // Se avisa al arrancar en vez de esperar al primer 500 en una subida.
    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn(
        'Cloudinary no tiene credenciales completas: las subidas de imágenes fallarán hasta configurarlas.',
      );
    }

    return cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  },
};
