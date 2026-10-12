import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  DashboardFilterInput,
  DashboardGranularity,
  DashboardPreset,
} from './dto/dashboard-filter.input';
import {
  CategorySlice,
  CustomerKind,
  CustomerStat,
  DashboardRange,
  DashboardStats,
  DashboardSummary,
  ProductStat,
  SalesBucket,
  SellerStat,
  StatusSlice,
} from './dto/dashboard-stats.output';

/**
 * Zona en la que se agrupan los días/meses del reporte. Los `order_date` son
 * `timestamptz`, así que sin esto un pedido de las 8 p.m. caería en el día
 * siguiente (UTC) y descuadraría los totales diarios y mensuales.
 */
const REPORT_TIMEZONE = process.env.REPORT_TIMEZONE ?? 'America/Bogota';

const CANCELLED = 'cancelled';
const SELLER_ROLES = ['vendedor', 'administrador'];
const DEFAULT_TOP_LIMIT = 10;
const MAX_TOP_LIMIT = 50;

/** Unidad de `date_trunc` y paso de `generate_series` por granularidad. */
const BUCKET: Record<DashboardGranularity, { unit: string; step: string }> = {
  [DashboardGranularity.DAY]: { unit: 'day', step: '1 day' },
  [DashboardGranularity.WEEK]: { unit: 'week', step: '1 week' },
  [DashboardGranularity.MONTH]: { unit: 'month', step: '1 month' },
  [DashboardGranularity.YEAR]: { unit: 'year', step: '1 year' },
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

interface ResolvedRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getStats(input: DashboardFilterInput = {}): Promise<DashboardStats> {
    const preset = input.preset ?? DashboardPreset.LAST_12_MONTHS;
    const sellerId = input.sellerId ? Number(input.sellerId) : null;
    const topLimit = Math.min(Math.max(input.topLimit ?? DEFAULT_TOP_LIMIT, 1), MAX_TOP_LIMIT);

    const range = await this.resolveRange(preset, input.from, input.to);
    const granularity = input.granularity ?? autoGranularity(range.from, range.to);

    const [summary, salesSeries, statusBreakdown, categoryBreakdown, topSellers, topCustomers, topProducts] =
      await Promise.all([
        this.getSummary(range, sellerId),
        this.getSalesSeries(range, granularity, sellerId),
        this.getStatusBreakdown(range, sellerId),
        this.getCategoryBreakdown(range, sellerId),
        this.getTopSellers(range, sellerId, topLimit),
        this.getTopCustomers(range, sellerId, topLimit),
        this.getTopProducts(range, sellerId, topLimit),
      ]);

    // Las cuotas se calculan contra el total del periodo, no contra la suma de
    // las filas devueltas: con `topLimit` el ranking está truncado.
    withShare(topSellers, summary.revenue);
    withShare(topCustomers, summary.revenue);

    return {
      range: {
        preset,
        granularity,
        from: range.from,
        to: range.to,
        previousFrom: range.previousFrom,
        previousTo: range.previousTo,
        timezone: REPORT_TIMEZONE,
      } satisfies DashboardRange,
      summary,
      salesSeries,
      statusBreakdown,
      categoryBreakdown,
      topSellers,
      topCustomers,
      topProducts,
    };
  }

  /**
   * Traduce el preset a un rango `[from, to)` en UTC. El cálculo se hace en
   * Postgres para que los límites de día/semana/mes caigan donde los espera el
   * usuario en `REPORT_TIMEZONE`, sin depender del reloj del proceso Node.
   */
  private async resolveRange(
    preset: DashboardPreset,
    from?: string,
    to?: string,
  ): Promise<ResolvedRange> {
    if (preset === DashboardPreset.CUSTOM) {
      if (!from || !to) {
        throw new BadRequestException('Con preset CUSTOM debes enviar `from` y `to`');
      }
      if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to)) {
        throw new BadRequestException('`from` y `to` deben tener formato YYYY-MM-DD');
      }
      if (from > to) {
        throw new BadRequestException('`from` no puede ser posterior a `to`');
      }
    }

    const [row] = await this.dataSource.query(
      `
      WITH local AS (SELECT (now() AT TIME ZONE $2) AS ts),
      bounds AS (
        SELECT
          CASE $1
            WHEN 'TODAY'          THEN date_trunc('day', local.ts)
            WHEN 'THIS_WEEK'      THEN date_trunc('week', local.ts)
            WHEN 'THIS_MONTH'     THEN date_trunc('month', local.ts)
            WHEN 'THIS_YEAR'      THEN date_trunc('year', local.ts)
            WHEN 'LAST_7_DAYS'    THEN date_trunc('day', local.ts) - interval '6 days'
            WHEN 'LAST_30_DAYS'   THEN date_trunc('day', local.ts) - interval '29 days'
            WHEN 'LAST_12_MONTHS' THEN date_trunc('month', local.ts) - interval '11 months'
            ELSE $3::date::timestamp
          END AS from_local,
          CASE $1
            WHEN 'CUSTOM' THEN $4::date::timestamp + interval '1 day'
            ELSE date_trunc('day', local.ts) + interval '1 day'
          END AS to_local
        FROM local
      ),
      shifted AS (
        SELECT
          from_local,
          to_local,
          -- El periodo anterior se desplaza una unidad del propio preset, no la
          -- duración cruda: así THIS_MONTH compara mes-a-la-fecha contra el
          -- mismo tramo del mes pasado, y LAST_12_MONTHS cae en meses enteros.
          CASE $1
            WHEN 'TODAY'          THEN interval '1 day'
            WHEN 'THIS_WEEK'      THEN interval '1 week'
            WHEN 'THIS_MONTH'     THEN interval '1 month'
            WHEN 'THIS_YEAR'      THEN interval '1 year'
            WHEN 'LAST_7_DAYS'    THEN interval '7 days'
            WHEN 'LAST_30_DAYS'   THEN interval '30 days'
            WHEN 'LAST_12_MONTHS' THEN interval '12 months'
            ELSE to_local - from_local
          END AS shift
        FROM bounds
      )
      SELECT
        (from_local AT TIME ZONE $2) AS "from",
        (to_local   AT TIME ZONE $2) AS "to",
        ((from_local - shift) AT TIME ZONE $2) AS "previousFrom",
        ((to_local   - shift) AT TIME ZONE $2) AS "previousTo"
      FROM shifted
      `,
      [preset, REPORT_TIMEZONE, from ?? null, to ?? null],
    );

    return {
      from: row.from,
      to: row.to,
      previousFrom: row.previousFrom,
      previousTo: row.previousTo,
    };
  }

  private async getSummary(range: ResolvedRange, sellerId: number | null): Promise<DashboardSummary> {
    const [row] = await this.dataSource.query(
      `
      WITH scoped AS (
        SELECT o.id, o.total_value, o.status, o.is_paid, o.person_id, o.establishment_name,
               r.role_name,
               COALESCE(it.units, 0) AS units,
               COALESCE(pay.paid, 0) AS paid_amount,
               CASE
                 WHEN r.role_name = 'cliente' THEN 'p:' || o.person_id::text
                 ELSE 'e:' || lower(COALESCE(NULLIF(btrim(o.establishment_name), ''), '(sin nombre)'))
               END AS customer_key
        FROM orders o
        LEFT JOIN person p ON p.id = o.person_id
        LEFT JOIN role r ON r.id = p.role_id
        LEFT JOIN (SELECT order_id, SUM(quantity) AS units FROM order_product GROUP BY order_id) it
               ON it.order_id = o.id
        LEFT JOIN (SELECT order_id, SUM(amount) AS paid FROM order_payment GROUP BY order_id) pay
               ON pay.order_id = o.id
        WHERE o.order_date >= $1 AND o.order_date < $2
          AND ($3::bigint IS NULL OR o.person_id = $3)
      ),
      previous AS (
        SELECT COALESCE(SUM(o.total_value), 0)::float8 AS revenue, COUNT(*)::int AS orders
        FROM orders o
        WHERE o.order_date >= $4 AND o.order_date < $5
          AND o.status <> $6
          AND ($3::bigint IS NULL OR o.person_id = $3)
      )
      SELECT
        COALESCE(SUM(s.total_value) FILTER (WHERE s.status <> $6), 0)::float8 AS revenue,
        COUNT(*) FILTER (WHERE s.status <> $6)::int AS orders,
        COALESCE(SUM(s.units) FILTER (WHERE s.status <> $6), 0)::int AS units,
        COALESCE(SUM(s.paid_amount) FILTER (WHERE s.status <> $6), 0)::float8 AS "paidRevenue",
        COALESCE(SUM(s.total_value - s.paid_amount) FILTER (WHERE s.status <> $6), 0)::float8 AS "unpaidRevenue",
        COUNT(*) FILTER (WHERE s.status = 'delivered')::int AS "deliveredOrders",
        COUNT(*) FILTER (WHERE s.status = 'pending')::int AS "pendingOrders",
        COUNT(*) FILTER (WHERE s.status = $6)::int AS "cancelledOrders",
        COUNT(DISTINCT s.customer_key) FILTER (WHERE s.status <> $6)::int AS "activeCustomers",
        COUNT(DISTINCT s.person_id) FILTER (WHERE s.status <> $6 AND s.role_name = ANY($7))::int AS "activeSellers",
        (SELECT revenue FROM previous) AS "previousRevenue",
        (SELECT orders FROM previous) AS "previousOrders"
      FROM scoped s
      `,
      [range.from, range.to, sellerId, range.previousFrom, range.previousTo, CANCELLED, SELLER_ROLES],
    );

    const revenue = Number(row.revenue);
    const orders = Number(row.orders);
    const previousRevenue = Number(row.previousRevenue);
    const previousOrders = Number(row.previousOrders);

    return {
      revenue,
      orders,
      units: Number(row.units),
      averageOrderValue: orders > 0 ? revenue / orders : 0,
      paidRevenue: Number(row.paidRevenue),
      unpaidRevenue: Number(row.unpaidRevenue),
      deliveredOrders: Number(row.deliveredOrders),
      pendingOrders: Number(row.pendingOrders),
      cancelledOrders: Number(row.cancelledOrders),
      activeCustomers: Number(row.activeCustomers),
      activeSellers: Number(row.activeSellers),
      previousRevenue,
      previousOrders,
      revenueChangePct: changePct(revenue, previousRevenue),
      ordersChangePct: changePct(orders, previousOrders),
    };
  }

  private async getSalesSeries(
    range: ResolvedRange,
    granularity: DashboardGranularity,
    sellerId: number | null,
  ): Promise<SalesBucket[]> {
    const { unit, step } = BUCKET[granularity];

    // `generate_series` rellena los buckets sin pedidos: la gráfica necesita el
    // eje completo, no solo los periodos con ventas.
    const rows = await this.dataSource.query(
      `
      WITH axis AS (
        SELECT generate_series(
          date_trunc($3, $1::timestamptz AT TIME ZONE $5),
          date_trunc($3, ($2::timestamptz - interval '1 microsecond') AT TIME ZONE $5),
          $4::interval
        ) AS bucket_local
      ),
      agg AS (
        SELECT date_trunc($3, o.order_date AT TIME ZONE $5) AS bucket_local,
               COUNT(*)::int AS orders,
               SUM(o.total_value)::float8 AS revenue,
               COALESCE(SUM(it.units), 0)::int AS units
        FROM orders o
        LEFT JOIN (SELECT order_id, SUM(quantity) AS units FROM order_product GROUP BY order_id) it
               ON it.order_id = o.id
        WHERE o.order_date >= $1 AND o.order_date < $2
          AND o.status <> $6
          AND ($7::bigint IS NULL OR o.person_id = $7)
        GROUP BY 1
      )
      SELECT (axis.bucket_local AT TIME ZONE $5) AS bucket,
             COALESCE(agg.orders, 0)::int AS orders,
             COALESCE(agg.revenue, 0)::float8 AS revenue,
             COALESCE(agg.units, 0)::int AS units
      FROM axis
      LEFT JOIN agg ON agg.bucket_local = axis.bucket_local
      ORDER BY axis.bucket_local
      `,
      [range.from, range.to, unit, step, REPORT_TIMEZONE, CANCELLED, sellerId],
    );

    return rows.map((row: any) => ({
      bucket: row.bucket,
      label: bucketLabel(row.bucket, granularity),
      revenue: Number(row.revenue),
      orders: Number(row.orders),
      units: Number(row.units),
    }));
  }

  private async getStatusBreakdown(
    range: ResolvedRange,
    sellerId: number | null,
  ): Promise<StatusSlice[]> {
    const rows = await this.dataSource.query(
      `
      SELECT o.status,
             COUNT(*)::int AS orders,
             COALESCE(SUM(o.total_value), 0)::float8 AS revenue
      FROM orders o
      WHERE o.order_date >= $1 AND o.order_date < $2
        AND ($3::bigint IS NULL OR o.person_id = $3)
      GROUP BY o.status
      ORDER BY orders DESC, o.status
      `,
      [range.from, range.to, sellerId],
    );

    return rows.map((row: any) => ({
      status: row.status,
      orders: Number(row.orders),
      revenue: Number(row.revenue),
    }));
  }

  private async getCategoryBreakdown(
    range: ResolvedRange,
    sellerId: number | null,
  ): Promise<CategorySlice[]> {
    const rows = await this.dataSource.query(
      `
      SELECT c.id AS "categoryId",
             COALESCE(c.name, 'Sin categoría') AS name,
             COALESCE(SUM(op.total_price), 0)::float8 AS revenue,
             COALESCE(SUM(op.quantity), 0)::int AS units
      FROM order_product op
      JOIN orders o ON o.id = op.order_id
      JOIN product pr ON pr.id = op.product_id
      LEFT JOIN category c ON c.id = pr.category_id
      WHERE o.order_date >= $1 AND o.order_date < $2
        AND o.status <> $3
        AND ($4::bigint IS NULL OR o.person_id = $4)
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      `,
      [range.from, range.to, CANCELLED, sellerId],
    );

    return rows.map((row: any) => ({
      categoryId: row.categoryId === null ? null : Number(row.categoryId),
      name: row.name,
      revenue: Number(row.revenue),
      units: Number(row.units),
    }));
  }

  /**
   * Ranking por quien *registró* el pedido. Incluye administradores porque en
   * este sistema también levantan ventas; `role` deja ver quién es quién.
   */
  private async getTopSellers(
    range: ResolvedRange,
    sellerId: number | null,
    limit: number,
  ): Promise<SellerStat[]> {
    const rows = await this.dataSource.query(
      `
      SELECT p.id AS "personId",
             p.name,
             r.role_name AS role,
             COUNT(*)::int AS orders,
             COALESCE(SUM(o.total_value), 0)::float8 AS revenue,
             COALESCE(SUM(it.units), 0)::int AS units,
             COALESCE(SUM(COALESCE(pay.paid, 0)), 0)::float8 AS "paidRevenue",
             COUNT(DISTINCT COALESCE(NULLIF(btrim(o.establishment_name), ''), '(sin nombre)'))::int AS customers
      FROM orders o
      JOIN person p ON p.id = o.person_id
      LEFT JOIN role r ON r.id = p.role_id
      LEFT JOIN (SELECT order_id, SUM(quantity) AS units FROM order_product GROUP BY order_id) it
             ON it.order_id = o.id
      LEFT JOIN (SELECT order_id, SUM(amount) AS paid FROM order_payment GROUP BY order_id) pay
             ON pay.order_id = o.id
      WHERE o.order_date >= $1 AND o.order_date < $2
        AND o.status <> $3
        AND r.role_name = ANY($4)
        AND ($5::bigint IS NULL OR o.person_id = $5)
      GROUP BY p.id, p.name, r.role_name
      ORDER BY revenue DESC, orders DESC
      LIMIT $6
      `,
      [range.from, range.to, CANCELLED, SELLER_ROLES, sellerId, limit],
    );

    return rows.map((row: any) => {
      const revenue = Number(row.revenue);
      const orders = Number(row.orders);
      return {
        personId: Number(row.personId),
        name: row.name,
        role: row.role ?? null,
        orders,
        revenue,
        units: Number(row.units),
        averageOrderValue: orders > 0 ? revenue / orders : 0,
        paidRevenue: Number(row.paidRevenue),
        customers: Number(row.customers),
        revenueShare: 0,
      };
    });
  }

  /**
   * Quién compra más. El comprador no es una FK: si el pedido lo hizo una
   * persona con rol `cliente` ese es el comprador; si lo registró un vendedor,
   * el comprador es el establecimiento al que se le vendió.
   */
  private async getTopCustomers(
    range: ResolvedRange,
    sellerId: number | null,
    limit: number,
  ): Promise<CustomerStat[]> {
    const rows = await this.dataSource.query(
      `
      WITH labeled AS (
        SELECT
          CASE
            WHEN r.role_name = 'cliente' THEN 'p:' || o.person_id::text
            ELSE 'e:' || lower(COALESCE(NULLIF(btrim(o.establishment_name), ''), '(sin nombre)'))
          END AS key,
          CASE
            WHEN r.role_name = 'cliente' THEN p.name
            ELSE COALESCE(NULLIF(btrim(o.establishment_name), ''), 'Sin nombre')
          END AS name,
          CASE WHEN r.role_name = 'cliente' THEN 'REGISTERED' ELSE 'ESTABLISHMENT' END AS kind,
          o.total_value,
          o.order_date,
          COALESCE(it.units, 0) AS units
        FROM orders o
        LEFT JOIN person p ON p.id = o.person_id
        LEFT JOIN role r ON r.id = p.role_id
        LEFT JOIN (SELECT order_id, SUM(quantity) AS units FROM order_product GROUP BY order_id) it
               ON it.order_id = o.id
        WHERE o.order_date >= $1 AND o.order_date < $2
          AND o.status <> $3
          AND ($4::bigint IS NULL OR o.person_id = $4)
      )
      SELECT key,
             min(name) AS name,
             min(kind) AS kind,
             COUNT(*)::int AS orders,
             COALESCE(SUM(total_value), 0)::float8 AS revenue,
             COALESCE(SUM(units), 0)::int AS units,
             MAX(order_date) AS "lastOrderDate"
      FROM labeled
      GROUP BY key
      ORDER BY revenue DESC, orders DESC
      LIMIT $5
      `,
      [range.from, range.to, CANCELLED, sellerId, limit],
    );

    return rows.map((row: any) => {
      const revenue = Number(row.revenue);
      const orders = Number(row.orders);
      return {
        key: row.key,
        name: row.name,
        kind: row.kind as CustomerKind,
        orders,
        revenue,
        units: Number(row.units),
        averageOrderValue: orders > 0 ? revenue / orders : 0,
        lastOrderDate: row.lastOrderDate,
        revenueShare: 0,
      };
    });
  }

  private async getTopProducts(
    range: ResolvedRange,
    sellerId: number | null,
    limit: number,
  ): Promise<ProductStat[]> {
    const rows = await this.dataSource.query(
      `
      SELECT pr.id AS "productId",
             pr.name,
             c.name AS category,
             pr.images ->> 0 AS image,
             COALESCE(SUM(op.quantity), 0)::int AS units,
             COALESCE(SUM(op.total_price), 0)::float8 AS revenue,
             COUNT(DISTINCT o.id)::int AS orders
      FROM order_product op
      JOIN orders o ON o.id = op.order_id
      JOIN product pr ON pr.id = op.product_id
      LEFT JOIN category c ON c.id = pr.category_id
      WHERE o.order_date >= $1 AND o.order_date < $2
        AND o.status <> $3
        AND ($4::bigint IS NULL OR o.person_id = $4)
      GROUP BY pr.id, pr.name, c.name, pr.images
      ORDER BY revenue DESC, units DESC
      LIMIT $5
      `,
      [range.from, range.to, CANCELLED, sellerId, limit],
    );

    return rows.map((row: any) => ({
      productId: Number(row.productId),
      name: row.name,
      category: row.category ?? null,
      image: row.image ?? null,
      units: Number(row.units),
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    }));
  }
}

function changePct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function withShare(rows: { revenue: number; revenueShare: number }[], total: number): void {
  for (const row of rows) {
    row.revenueShare = total > 0 ? (row.revenue / total) * 100 : 0;
  }
}

/** Granularidad por defecto según el ancho del rango. */
function autoGranularity(from: Date, to: Date): DashboardGranularity {
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days <= 31) return DashboardGranularity.DAY;
  if (days <= 120) return DashboardGranularity.WEEK;
  if (days <= 1_100) return DashboardGranularity.MONTH;
  return DashboardGranularity.YEAR;
}

function bucketLabel(bucket: Date, granularity: DashboardGranularity): string {
  const options: Record<DashboardGranularity, Intl.DateTimeFormatOptions> = {
    [DashboardGranularity.DAY]: { day: '2-digit', month: 'short' },
    [DashboardGranularity.WEEK]: { day: '2-digit', month: 'short' },
    [DashboardGranularity.MONTH]: { month: 'short', year: 'numeric' },
    [DashboardGranularity.YEAR]: { year: 'numeric' },
  };

  // `es-CO` intercala " de " ("sept de 2026"): sobra en un eje de gráfica.
  return new Intl.DateTimeFormat('es-CO', {
    ...options[granularity],
    timeZone: REPORT_TIMEZONE,
  })
    .format(bucket)
    .replace(/ de /g, ' ')
    .replace(/\./g, '');
}
