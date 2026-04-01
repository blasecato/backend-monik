import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreatePersonInput {
  @Field()
  name: string;

  @Field()
  dni: string;

  @Field()
  username: string;

  @Field()
  password: string;

  @Field(() => Int, { nullable: true })
  dniTypeId?: number;

  @Field(() => Int, { nullable: true })
  roleId?: number;
}
