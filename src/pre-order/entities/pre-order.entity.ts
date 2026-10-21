import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { Person } from '../../person/entities/person.entity';
import { PreOrderProduct } from './pre-order-product.entity';

@ObjectType()
@Entity('pre_order')
@Index('IDX_pre_order_author_date', ['createdById', 'createdAt', 'id'])
@Index('IDX_pre_order_date', ['createdAt', 'id'])
@Check(
  'CHK_pre_order_establishment',
  'length(btrim("establishment_name")) BETWEEN 1 AND 200',
)
@Check('CHK_pre_order_version', '"version" >= 1')
export class PreOrder {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Field()
  @Column({ name: 'establishment_name', type: 'varchar', length: 200 })
  establishmentName: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 2000, nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'bigint' })
  createdById: string;

  @Field(() => Person)
  @ManyToOne(() => Person, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_pre_order_author',
  })
  createdBy: Person;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Field(() => Int)
  @Column({ type: 'integer', default: 1 })
  version: number;

  @Field(() => [PreOrderProduct])
  @OneToMany(() => PreOrderProduct, (item) => item.preOrder)
  items: PreOrderProduct[];

  /** Fecha en que el prepedido pasó a ser una orden. Null = sigue pendiente. */
  @Field(() => Date, { nullable: true })
  @Column({ name: 'converted_at', type: 'timestamptz', nullable: true })
  convertedAt: Date | null;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId: string | null;

  /** Orden generada a partir de este prepedido. */
  @Field(() => Order, { nullable: true })
  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'FK_pre_order_order',
  })
  order: Order | null;
}
