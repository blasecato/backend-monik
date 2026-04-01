import { InputType, Field, ID, Int } from '@nestjs/graphql';

@InputType()
export class UpdatePersonInput {
  @Field(() => ID)
  id: number;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  dni?: string;

  @Field({ nullable: true })
  username?: string;

  @Field(() => Int, { nullable: true })
  dniTypeId?: number;

  @Field(() => Int, { nullable: true })
  roleId?: number;
}
