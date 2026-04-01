import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class UpdateCategoryInput {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;
}
