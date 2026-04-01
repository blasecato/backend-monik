import { InputType, Field, ID, Int } from '@nestjs/graphql';

@InputType()
export class UpdateStockInput {
  @Field(() => ID)
  productId: number;

  @Field(() => Int)
  newStock: number;

  @Field({ nullable: true })
  reason?: string;
}
