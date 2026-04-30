import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { CreateNutritionalTableInput } from './create-nutritional-table.input';

@InputType()
export class CreateProductInput {
  @Field()
  name: string;

  @Field(() => Float)
  weight: number;

  @Field(() => Float)
  price: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  images?: string[];

  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @Field(() => CreateNutritionalTableInput, { nullable: true })
  nutritionalTable?: CreateNutritionalTableInput;
}
