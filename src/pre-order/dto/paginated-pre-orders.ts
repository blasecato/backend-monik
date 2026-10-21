import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PreOrder } from '../entities/pre-order.entity';

@ObjectType()
export class PaginatedPreOrders {
  @Field(() => [PreOrder])
  items: PreOrder[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;
}
