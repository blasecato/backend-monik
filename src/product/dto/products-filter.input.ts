import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class ProductsFilterInput {
  @Field({ nullable: true })
  name?: string;

  @Field(() => [Int], { nullable: true })
  categoryIds?: number[];

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 7 })
  limit?: number;
}
