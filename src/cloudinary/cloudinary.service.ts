import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

const REQUIRED_KEYS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Sin credenciales, Cloudinary falla dentro del callback y Nest lo convierte
   * en un 500 sin texto. Se comprueba antes para devolver algo accionable.
   */
  private assertConfigured(): void {
    const missing = REQUIRED_KEYS.filter(
      (key) => !this.configService.get<string>(key)?.trim(),
    );

    if (missing.length > 0) {
      this.logger.error(
        `Cloudinary sin configurar. Variables de entorno faltantes: ${missing.join(', ')}`,
      );
      throw new ServiceUnavailableException(
        `El servicio de imágenes no está configurado. Faltan las variables: ${missing.join(', ')}`,
      );
    }
  }

  uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'products', resource_type: 'image' },
        (error, result) => {
          if (error) {
            // Cloudinary responde con su propio objeto, no con un Error.
            const detail = error.http_code
              ? `${error.message} (HTTP ${error.http_code})`
              : error.message;
            return reject(new Error(detail || 'Cloudinary rechazó la subida'));
          }
          if (!result) {
            return reject(new Error('Cloudinary no devolvió un resultado'));
          }
          resolve(result);
        },
      );

      // Un fallo de red del stream no llega al callback de arriba.
      upload.on('error', (error: Error) => reject(error));
      Readable.from(file.buffer).pipe(upload);
    });
  }

  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    this.assertConfigured();

    try {
      const results = await Promise.all(
        files.map((file) => this.uploadImage(file)),
      );
      return results.map((result) => result.secure_url);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falló la subida a Cloudinary: ${detail}`);
      throw new InternalServerErrorException(
        `No se pudieron subir las imágenes: ${detail}`,
      );
    }
  }
}
