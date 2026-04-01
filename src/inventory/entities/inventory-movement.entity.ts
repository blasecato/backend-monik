import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from '../../product/entities/product.entity';

export enum MovementType {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

registerEnumType(MovementType, { name: 'MovementType' });

@ObjectType()
@Entity('inventory_movements')
export class InventoryMovement {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Field(() => MovementType)
  @Column({ type: 'text' })
  type: MovementType;

  @Field(() => Int)
  @Column({ type: 'int' })
  quantity: number;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  reason: string;

  @Field(() => Product)
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
