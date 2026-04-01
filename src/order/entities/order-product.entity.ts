import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { Order } from './order.entity';

@ObjectType()
@Entity('order_product')
export class OrderProduct {
  @PrimaryColumn({ name: 'order_id', type: 'bigint' })
  orderId: number;

  @PrimaryColumn({ name: 'product_id', type: 'bigint' })
  productId: number;

  @Field(() => Int)
  @Column({ type: 'int' })
  quantity: number;

  @Field(() => Float)
  @Column({ name: 'unit_price', type: 'numeric' })
  unitPrice: number;

  @Field(() => Float)
  @Column({ name: 'total_price', type: 'numeric' })
  totalPrice: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Field(() => Product)
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
