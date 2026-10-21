import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/** Turn a missing preorder migration into a useful error without hiding other failures. */
export function preOrderDatabaseError(error: unknown): never {
  const databaseError =
    error instanceof QueryFailedError
      ? (error.driverError as { code?: string; message?: string })
      : null;

  if (
    databaseError?.code === '42P01' &&
    /relation "(?:[^".]+\.)?pre_order(?:_product)?" does not exist/.test(
      databaseError.message ?? '',
    )
  ) {
    Logger.error(
      'Faltan las tablas de prepedidos. Ejecuta sql/2026-10-21-prepedidos-neon.sql en la base de datos a la que se conecta este backend.',
      'PreOrderService',
    );
    throw new ServiceUnavailableException(
      'Los prepedidos todavía no están habilitados. Falta completar la configuración de esta sección.',
    );
  }

  throw error;
}
