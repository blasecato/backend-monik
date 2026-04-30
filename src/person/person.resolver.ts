import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PersonService } from './person.service';
import { Person } from './entities/person.entity';
import { CreatePersonInput } from './dto/create-person.input';
import { UpdatePersonInput } from './dto/update-person.input';

@Resolver(() => Person)
export class PersonResolver {
  constructor(private readonly personService: PersonService) {}

  @Query(() => [Person], { name: 'persons' })
  findAll(): Promise<Person[]> {
    return this.personService.findAll();
  }

  @Query(() => [Person], { name: 'personsByRole' })
  findByRole(
    @Args('roleKey', { type: () => String }) roleKey: string,
  ): Promise<Person[]> {
    return this.personService.findByRoleKey(roleKey);
  }

  @Mutation(() => Person)
  createPerson(@Args('input') input: CreatePersonInput): Promise<Person> {
    return this.personService.create(input);
  }

  @Mutation(() => Person)
  updatePerson(@Args('input') input: UpdatePersonInput): Promise<Person> {
    return this.personService.update(input);
  }

  @Mutation(() => Boolean)
  removePerson(@Args('id', { type: () => ID }) id: number): Promise<boolean> {
    return this.personService.remove(id);
  }
}
