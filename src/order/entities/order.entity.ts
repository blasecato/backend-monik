import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Person } from '../../person/entities/person.entity';
import { OrderProduct } from './order-product.entity';

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

  @Field(() => String, { nullable: true })
  @Column({ name: 'establishment_name', type: 'text', nullable: true })
  establishmentName: string | null;

  @Field(() => Person, { nullable: true })
  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @Field(() => [OrderProduct], { nullable: true })
  @OneToMany(() => OrderProduct, (item) => item.order, { cascade: true })
  items: OrderProduct[];
}
