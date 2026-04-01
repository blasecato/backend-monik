import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Product } from './product.entity';

@ObjectType()
@Entity('nutritional_table')
export class NutritionalTable {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Field(() => Float)
  @Column({ type: 'numeric' })
  calories: number;

  @Field(() => Float)
  @Column({ type: 'numeric' })
  protein: number;

  @Field(() => Float)
  @Column({ type: 'numeric' })
  fat: number;

  @Field(() => Float)
  @Column({ type: 'numeric' })
  carbohydrates: number;

  @Field(() => Float)
  @Column({ type: 'numeric' })
  fiber: number;

  @Field(() => Float)
  @Column({ type: 'numeric' })
  sugar: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  energy_calories: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  total_fat: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  saturated_fat: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  trans_fat: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  total_carbohydrates: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  dietary_fiber: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  total_sugars: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  added_sugars: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  sodium: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  vitamin_a: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  vitamin_d: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  iron: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  calcium: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'numeric', nullable: true })
  zinc: number;

  @Field(() => Product, { nullable: true })
  @OneToOne(() => Product, (product) => product.nutritionalTable)
  product: Product;
}
