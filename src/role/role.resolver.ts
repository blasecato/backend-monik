import { Resolver, Query } from '@nestjs/graphql';
import { RoleService } from './role.service';
import { Role } from '../person/entities/role.entity';

@Resolver(() => Role)
export class RoleResolver {
  constructor(private readonly roleService: RoleService) {}

  @Query(() => [Role], { name: 'roles' })
  findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }
}
