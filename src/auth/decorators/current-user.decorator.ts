import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Person } from '../../person/entities/person.entity';

/** La persona autenticada que `JwtStrategy.validate` dejó en la request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Person | undefined =>
    GqlExecutionContext.create(context).getContext().req?.user,
);
