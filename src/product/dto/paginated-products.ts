import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Product } from '../entities/product.entity';

@ObjectType()
export class PaginatedProducts {
  @Field(() => [Product])
  items: Product[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNextPage: boolean;
}
