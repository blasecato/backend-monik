import { BadRequestException } from '@nestjs/common';

/** Días completos de Colombia, independientemente de la zona del servidor. */
export function sellerAccountDates(from: string, to: string) {
  for (const value of [from, to]) {
    const date = new Date(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Selecciona fechas válidas (AAAA-MM-DD)');
    }
  }
  if (from > to) {
    throw new BadRequestException(
      'La fecha inicial no puede ser posterior a la final',
    );
  }
  const start = new Date(`${from}T00:00:00-05:00`);
  const end = new Date(new Date(`${to}T00:00:00-05:00`).getTime() + 86400000);
  return { start, end };
}
