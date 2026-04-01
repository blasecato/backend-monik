import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class UpdateNutritionalTableInput {
  @Field(() => Float, { nullable: true })
  calories?: number;

  @Field(() => Float, { nullable: true })
  protein?: number;

  @Field(() => Float, { nullable: true })
  fat?: number;

  @Field(() => Float, { nullable: true })
  carbohydrates?: number;

  @Field(() => Float, { nullable: true })
  fiber?: number;

  @Field(() => Float, { nullable: true })
  sugar?: number;

  @Field(() => Float, { nullable: true })
  energy_calories?: number;

  @Field(() => Float, { nullable: true })
  total_fat?: number;

  @Field(() => Float, { nullable: true })
  saturated_fat?: number;

  @Field(() => Float, { nullable: true })
  trans_fat?: number;

  @Field(() => Float, { nullable: true })
  total_carbohydrates?: number;

  @Field(() => Float, { nullable: true })
  dietary_fiber?: number;

  @Field(() => Float, { nullable: true })
  total_sugars?: number;

  @Field(() => Float, { nullable: true })
  added_sugars?: number;

  @Field(() => Float, { nullable: true })
  sodium?: number;

  @Field(() => Float, { nullable: true })
  vitamin_a?: number;

  @Field(() => Float, { nullable: true })
  vitamin_d?: number;

  @Field(() => Float, { nullable: true })
  iron?: number;

  @Field(() => Float, { nullable: true })
  calcium?: number;

  @Field(() => Float, { nullable: true })
  zinc?: number;
}
