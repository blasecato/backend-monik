import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { ProductInventory } from './product-inventory.entity';
import { NutritionalTable } from './nutritional-table.entity';

@ObjectType()
@Entity('product')
export class Product {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Field()
  @Column({ type: 'text' })
  name: string;

  @Field(() => Float)
  @Column({ type: 'decimal' })
  weight: number;

  @Field(() => Float)
  @Column({ type: 'decimal' })
  price: number;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  product_origin: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  chef_tip: string;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @Field(() => Category, { nullable: true })
  @ManyToOne(() => Category, (category) => category.products, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Field(() => ProductInventory, { nullable: true })
  @OneToOne(() => ProductInventory, (inventory) => inventory.product)
  inventory: ProductInventory;

  @Field(() => NutritionalTable, { nullable: true })
  @OneToOne(() => NutritionalTable, (nt) => nt.product, { nullable: true })
  @JoinColumn({ name: 'nutritional_table_id' })
  nutritionalTable: NutritionalTable;
}
