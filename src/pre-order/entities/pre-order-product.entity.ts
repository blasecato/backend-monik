import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { PreOrder } from './pre-order.entity';

@ObjectType()
@Entity('pre_order_product')
@Index('IDX_pre_order_product_product', ['productId'])
@Check('CHK_pre_order_product_existing', '"existing_quantity" >= 0')
@Check('CHK_pre_order_product_requested', '"requested_quantity" >= 0')
export class PreOrderProduct {
  @PrimaryColumn({ name: 'pre_order_id', type: 'bigint' })
  preOrderId: string;

  @Field(() => ID)
  @PrimaryColumn({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Field(() => Int)
  @Column({ name: 'existing_quantity', type: 'integer', default: 0 })
  existingQuantity: number;

  @Field(() => Int)
  @Column({ name: 'requested_quantity', type: 'integer', default: 0 })
  requestedQuantity: number;

  @ManyToOne(() => PreOrder, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'pre_order_id',
    foreignKeyConstraintName: 'FK_pre_order_product_header',
  })
  preOrder: PreOrder;

  @Field(() => Product)
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'product_id',
    foreignKeyConstraintName: 'FK_pre_order_product_product',
  })
  product: Product;
}
