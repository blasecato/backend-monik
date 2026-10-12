import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DashboardGranularity, DashboardPreset } from './dashboard-filter.input';

/** Cómo se identificó al comprador de un pedido. */
export enum CustomerKind {
  /** Pedido hecho por una persona con rol `cliente`. */
  REGISTERED = 'REGISTERED',
  /** Pedido registrado por un vendedor/administrador a nombre de un establecimiento. */
  ESTABLISHMENT = 'ESTABLISHMENT',
}

registerEnumType(CustomerKind, { name: 'CustomerKind' });

@ObjectType()
export class DashboardRange {
  @Field(() => DashboardPreset)
  preset: DashboardPreset;

  @Field(() => DashboardGranularity)
  granularity: DashboardGranularity;

  /** Inicio inclusivo del rango, en UTC. */
  @Field()
  from: Date;

  /** Fin exclusivo del rango, en UTC. */
  @Field()
  to: Date;

  /** Periodo inmediatamente anterior, de la misma duración (base de los deltas). */
  @Field()
  previousFrom: Date;

  @Field()
  previousTo: Date;

  @Field()
  timezone: string;
}

@ObjectType()
export class DashboardSummary {
  /** Ventas del periodo, excluyendo pedidos cancelados. */
  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  orders: number;

  @Field(() => Int)
  units: number;

  @Field(() => Float)
  averageOrderValue: number;

  @Field(() => Float)
  paidRevenue: number;

  @Field(() => Float)
  unpaidRevenue: number;

  @Field(() => Int)
  deliveredOrders: number;

  @Field(() => Int)
  pendingOrders: number;

  /** Cancelados: contados aquí, excluidos de `revenue`, `orders` y `units`. */
  @Field(() => Int)
  cancelledOrders: number;

  @Field(() => Int)
  activeCustomers: number;

  @Field(() => Int)
  activeSellers: number;

  /** Variación de ventas frente al periodo anterior, en %. `null` si no hubo base. */
  @Field(() => Float, { nullable: true })
  revenueChangePct: number | null;

  @Field(() => Float, { nullable: true })
  ordersChangePct: number | null;

  @Field(() => Float)
  previousRevenue: number;

  @Field(() => Int)
  previousOrders: number;
}

@ObjectType()
export class SalesBucket {
  /** Inicio del bucket, en UTC. */
  @Field()
  bucket: Date;

  /** Etiqueta ya formateada en la zona del reporte, p. ej. `oct 2026`. */
  @Field()
  label: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  orders: number;

  @Field(() => Int)
  units: number;
}

@ObjectType()
export class StatusSlice {
  @Field()
  status: string;

  @Field(() => Int)
  orders: number;

  @Field(() => Float)
  revenue: number;
}

@ObjectType()
export class CategorySlice {
  @Field(() => ID, { nullable: true })
  categoryId: number | null;

  @Field()
  name: string;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  units: number;
}

@ObjectType()
export class SellerStat {
  @Field(() => ID)
  personId: number;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  role: string | null;

  @Field(() => Int)
  orders: number;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  units: number;

  @Field(() => Float)
  averageOrderValue: number;

  @Field(() => Float)
  paidRevenue: number;

  /** Compradores distintos atendidos en el periodo. */
  @Field(() => Int)
  customers: number;

  /** Porción de las ventas totales del periodo, en %. */
  @Field(() => Float)
  revenueShare: number;
}

@ObjectType()
export class CustomerStat {
  /** Clave de agrupación: id de persona, o el nombre del establecimiento normalizado. */
  @Field()
  key: string;

  @Field()
  name: string;

  @Field(() => CustomerKind)
  kind: CustomerKind;

  @Field(() => Int)
  orders: number;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  units: number;

  @Field(() => Float)
  averageOrderValue: number;

  @Field()
  lastOrderDate: Date;

  @Field(() => Float)
  revenueShare: number;
}

@ObjectType()
export class ProductStat {
  @Field(() => ID)
  productId: number;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  category: string | null;

  /** Primera imagen del producto, para la miniatura de la tabla. */
  @Field(() => String, { nullable: true })
  image: string | null;

  @Field(() => Int)
  units: number;

  @Field(() => Float)
  revenue: number;

  @Field(() => Int)
  orders: number;
}

@ObjectType()
export class DashboardStats {
  @Field(() => DashboardRange)
  range: DashboardRange;

  @Field(() => DashboardSummary)
  summary: DashboardSummary;

  /** Serie para la gráfica de barras: ventas y pedidos por bucket. */
  @Field(() => [SalesBucket])
  salesSeries: SalesBucket[];

  /** Torta: pedidos por estado (incluye cancelados). */
  @Field(() => [StatusSlice])
  statusBreakdown: StatusSlice[];

  /** Dona: ventas por categoría de producto. */
  @Field(() => [CategorySlice])
  categoryBreakdown: CategorySlice[];

  @Field(() => [SellerStat])
  topSellers: SellerStat[];

  @Field(() => [CustomerStat])
  topCustomers: CustomerStat[];

  @Field(() => [ProductStat])
  topProducts: ProductStat[];
}
