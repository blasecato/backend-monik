import { Resolver, Query } from '@nestjs/graphql';
import { DniTypeService } from './dni-type.service';
import { DniType } from '../person/entities/dni-type.entity';

@Resolver(() => DniType)
export class DniTypeResolver {
  constructor(private readonly dniTypeService: DniTypeService) {}

  @Query(() => [DniType], { name: 'dniTypes' })
  findAll(): Promise<DniType[]> {
    return this.dniTypeService.findAll();
  }
}
