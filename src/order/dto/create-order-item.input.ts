import { InputType, Field, ID, Int } from '@nestjs/graphql';

@InputType()
export class CreateOrderItemInput {
  @Field(() => ID)
  productId: number;

  @Field(() => Int)
  quantity: number;
}
