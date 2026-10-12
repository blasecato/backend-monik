import { registerEnumType } from '@nestjs/graphql';

/** Estados válidos de una orden. Coincide con la columna `orders.status`. */
export enum OrderStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

registerEnumType(OrderStatus, { name: 'OrderStatus' });
