import { ObjectType, Field } from '@nestjs/graphql';
import { Person } from '../../person/entities/person.entity';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field(() => Person)
  person: Person;
}
