import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Person } from '../../person/entities/person.entity';
import { Order } from './order.entity';

/** Un abono sobre una orden. Varios abonos pueden cubrir una misma orden. */
@ObjectType()
@Entity('order_payment')
export class OrderPayment {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Index()
  @Column({ name: 'order_id', type: 'bigint' })
  orderId: number;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Field(() => Float)
  @Column({ type: 'numeric' })
  amount: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** Quién lo registró. Queda en null si la persona se elimina. */
  @Field(() => Person, { nullable: true })
  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: Person | null;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
