import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ProductInventory } from '../../product/entities/product-inventory.entity';

@ObjectType()
export class InventorySummaryResponse {
  @Field(() => [ProductInventory])
  inventories: ProductInventory[];

  @Field(() => Int)
  totalProducts: number;

  @Field(() => Int)
  lowStock: number;

  @Field(() => Int)
  outOfStock: number;
}
