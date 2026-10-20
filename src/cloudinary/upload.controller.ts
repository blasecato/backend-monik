import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from './cloudinary.service';

const MAX_FILES = 10;

/**
 * Vercel corta las peticiones a funciones serverless alrededor de 4,5 MB, así
 * que aceptar más solo cambiaría un error claro por uno de la plataforma.
 * Nest convierte el exceso en 413 y el resto de errores de multer en 400.
 */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('images')
  @UseInterceptors(
    FilesInterceptor('images', MAX_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          return cb(
            new BadRequestException('Solo se permiten imágenes'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se enviaron imágenes');
    }
    const urls = await this.cloudinaryService.uploadImages(files);
    return { urls };
  }
}
