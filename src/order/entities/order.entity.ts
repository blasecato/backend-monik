import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { Person } from '../../person/entities/person.entity';
import { OrderProduct } from './order-product.entity';
import { OrderPayment } from './order-payment.entity';

@ObjectType()
@Entity('orders')
export class Order {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Field()
  @CreateDateColumn({ name: 'order_date', type: 'timestamptz' })
  orderDate: Date;

  @Field({ nullable: true })
  @Column({ name: 'delivery_date', type: 'timestamptz', nullable: true })
  deliveryDate: Date;

  @Field(() => Float)
  @Column({ name: 'total_value', type: 'numeric', default: 0 })
  totalValue: number;

  @Field()
  @Column({ type: 'text', default: 'pending' })
  status: string;

  /**
   * Bandera derivada: la mantiene el servicio al registrar o borrar abonos
   * (`paidAmount >= totalValue`). Se conserva porque el panel, el Excel y los
   * filtros existentes la consultan directamente.
   */
  @Field()
  @Column({ name: 'is_paid', type: 'boolean', default: false })
  isPaid: boolean;

  /** Suma de los abonos. Se resuelve en la misma consulta, sin N+1. */
  @Field(() => Float)
  @VirtualColumn({
    type: 'numeric',
    query: (alias) =>
      `SELECT COALESCE(SUM("op_sum"."amount"), 0) FROM "order_payment" "op_sum" WHERE "op_sum"."order_id" = ${alias}.id`,
  })
  paidAmount: number;

  @Field(() => String, { nullable: true })
  @Column({ name: 'establishment_name', type: 'text', nullable: true })
  establishmentName: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Field(() => Person, { nullable: true })
  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @Field(() => [OrderProduct], { nullable: true })
  @OneToMany(() => OrderProduct, (item) => item.order, { cascade: true })
  items: OrderProduct[];

  @Field(() => [OrderPayment], { nullable: true })
  @OneToMany(() => OrderPayment, (payment) => payment.order)
  payments: OrderPayment[];

  /** Saldo pendiente. Lo calcula el resolver; no existe en la tabla. */
  @Field(() => Float)
  balance: number;
}
