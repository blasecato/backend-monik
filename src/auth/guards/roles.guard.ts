import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Person } from '../../person/entities/person.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const ctx = GqlExecutionContext.create(context);
    const user: Person | undefined = ctx.getContext().req?.user;

    if (!user) throw new ForbiddenException('No autenticado');

    const allowed = required.map((role) => role.toLowerCase());
    const held = [user.role?.key, user.role?.roleName]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    if (!held.some((role) => allowed.includes(role))) {
      throw new ForbiddenException('No tienes permisos para esta operación');
    }

    return true;
  }
}
