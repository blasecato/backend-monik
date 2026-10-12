import { Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';

/** Periodos predefinidos. `CUSTOM` usa `from`/`to`. */
export enum DashboardPreset {
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_12_MONTHS = 'LAST_12_MONTHS',
  CUSTOM = 'CUSTOM',
}

/** Tamaño del bucket de la serie temporal. Omitido = se deduce del rango. */
export enum DashboardGranularity {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

registerEnumType(DashboardPreset, { name: 'DashboardPreset' });
registerEnumType(DashboardGranularity, { name: 'DashboardGranularity' });

@InputType()
export class DashboardFilterInput {
  @Field(() => DashboardPreset, { nullable: true })
  preset?: DashboardPreset;

  /** Solo con `preset: CUSTOM`. Fecha local inclusiva, `YYYY-MM-DD`. */
  @Field(() => String, { nullable: true })
  from?: string;

  /** Solo con `preset: CUSTOM`. Fecha local inclusiva, `YYYY-MM-DD`. */
  @Field(() => String, { nullable: true })
  to?: string;

  @Field(() => DashboardGranularity, { nullable: true })
  granularity?: DashboardGranularity;

  /** Limita todas las métricas a los pedidos registrados por esta persona. */
  @Field(() => ID, { nullable: true })
  sellerId?: number;

  /** Filas máximas en cada ranking. */
  @Field(() => Int, { nullable: true })
  topLimit?: number;
}
