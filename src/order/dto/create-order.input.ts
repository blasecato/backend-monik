import { InputType, Field, ID } from '@nestjs/graphql';
import { CreateOrderItemInput } from './create-order-item.input';

@InputType()
export class CreateOrderInput {
  @Field(() => ID)
  personId: number;

  @Field({ nullable: true })
  deliveryDate?: Date;

  @Field({ nullable: true })
  establishmentName?: string;

  @Field({ nullable: true })
  address?: string;

  @Field(() => [CreateOrderItemInput])
  items: CreateOrderItemInput[];
}
