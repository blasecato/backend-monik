import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import { UpdateNutritionalTableInput } from './update-nutritional-table.input';

@InputType()
export class UpdateProductInput {
  @Field(() => ID)
  id: number;

  @Field({ nullable: true })
  name?: string;

  @Field(() => Float, { nullable: true })
  weight?: number;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  product_origin?: string;

  @Field({ nullable: true })
  chef_tip?: string;

  @Field(() => [String], { nullable: true })
  images?: string[];

  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @Field(() => UpdateNutritionalTableInput, { nullable: true })
  nutritionalTable?: UpdateNutritionalTableInput;
}
