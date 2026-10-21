import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Person } from '../person/entities/person.entity';
import { Order } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { PreOrder } from './entities/pre-order.entity';
import {
  CreatePreOrderInput,
  PreOrdersFilterInput,
  UpdatePreOrderInput,
} from './dto/pre-order.input';
import { PaginatedPreOrders } from './dto/paginated-pre-orders';
import { PreOrderService } from './pre-order.service';

@Resolver(() => PreOrder)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrador', 'admin', 'vendedor', 'seller')
export class PreOrderResolver {
  constructor(private readonly service: PreOrderService) {}

  @Query(() => [Product])
  preOrderProducts(@CurrentUser() user: Person) {
    return this.service.products(user);
  }

  @Query(() => PaginatedPreOrders)
  preOrders(
    @CurrentUser() user: Person,
    @Args('filter', { nullable: true }) filter?: PreOrdersFilterInput,
  ) {
    return this.service.findAll(user, filter);
  }

  @Query(() => PreOrder)
  preOrder(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: Person,
  ) {
    return this.service.findOne(id, user);
  }

  @Mutation(() => PreOrder)
  createPreOrder(
    @Args('input') input: CreatePreOrderInput,
    @CurrentUser() user: Person,
  ) {
    return this.service.create(input, user);
  }

  /** Pasa el prepedido a pedido. Solo administradores. */
  @Mutation(() => Order)
  @Roles('administrador', 'admin')
  convertPreOrderToOrder(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: Person,
  ) {
    return this.service.convertToOrder(id, user);
  }

  @Mutation(() => PreOrder)
  updatePreOrder(
    @Args('input') input: UpdatePreOrderInput,
    @CurrentUser() user: Person,
  ) {
    return this.service.update(input, user);
  }
}
