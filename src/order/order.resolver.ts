import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Float, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Person } from '../person/entities/person.entity';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { CreateOrderInput } from './dto/create-order.input';
import { UpdateOrderInput } from './dto/update-order.input';
import { RegisterOrderPaymentInput } from './dto/register-order-payment.input';
import { OrderStatus } from './dto/order-status.enum';

const ADMIN = ['admin', 'administrador'];
const SELLER = ['vendedor', 'seller'];
const STAFF = [...ADMIN, ...SELLER];

function isAdmin(user?: Person): boolean {
  const held = [user?.role?.key, user?.role?.roleName].map((value) => value?.toLowerCase());
  return held.some((role) => role && ADMIN.includes(role));
}

@Resolver(() => Order)
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  /** Suma de abonos. El valor ya viene en la consulta; si falta, se calcula. */
  @ResolveField(() => Float)
  async paidAmount(@Parent() order: Order): Promise<number> {
    if (order.paidAmount !== undefined && order.paidAmount !== null) {
      return Number(order.paidAmount);
    }
    return Number(order.totalValue) - (await this.orderService.getBalance(Number(order.id)));
  }

  /** Saldo pendiente: total menos abonos. */
  @ResolveField(() => Float)
  async balance(@Parent() order: Order): Promise<number> {
    const paid = await this.paidAmount(order);
    return Number(order.totalValue) - paid;
  }

  @Query(() => [Order], { name: 'orders' })
  @Roles(...ADMIN)
  findAll(): Promise<Order[]> {
    return this.orderService.findAll();
  }

  /**
   * Listado completo con items y abonos. Sin `sellerId` devuelve todas las
   * órdenes: es la vista del vendedor.
   */
  @Query(() => [Order], { name: 'ordersDetailed' })
  @Roles(...STAFF)
  findDetailed(
    @Args('sellerId', { type: () => ID, nullable: true }) sellerId?: number,
  ): Promise<Order[]> {
    return this.orderService.findDetailed(sellerId ? Number(sellerId) : undefined);
  }

  @Query(() => Order, { name: 'order' })
  @Roles(...STAFF)
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.findOne(id);
  }

  @Query(() => Order, { name: 'orderDetail' })
  @Roles(...STAFF)
  findOneDetail(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.findOneDetail(id);
  }

  @Query(() => [Order], { name: 'ordersBySeller' })
  @Roles(...STAFF)
  findBySeller(
    @Args('sellerId', { type: () => ID }) sellerId: number,
  ): Promise<Order[]> {
    return this.orderService.findBySeller(Number(sellerId));
  }

  /** Alimenta la descarga a Excel, que es exclusiva del administrador. */
  @Query(() => [Order], { name: 'ordersByDateRange' })
  @Roles(...ADMIN)
  findByDateRange(
    @Args('from', { type: () => String }) from: string,
    @Args('to', { type: () => String }) to: string,
    @Args('sellerId', { type: () => ID, nullable: true }) sellerId?: number,
  ): Promise<Order[]> {
    return this.orderService.findByDateRange(from, to, sellerId ? Number(sellerId) : undefined);
  }

  /** La crea cualquier usuario autenticado: el cliente también compra. */
  @Mutation(() => Order)
  createOrder(@Args('input') input: CreateOrderInput): Promise<Order> {
    return this.orderService.create(input);
  }

  @Mutation(() => Order)
  @Roles(...STAFF)
  updateOrder(@Args('input') input: UpdateOrderInput): Promise<Order> {
    return this.orderService.updateOrder(input);
  }

  @Mutation(() => Order)
  @Roles(...ADMIN)
  reactivateOrder(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.reactivateOrder(id);
  }

  @Mutation(() => Order)
  @Roles(...STAFF)
  deliverOrder(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.deliverOrder(id);
  }

  /** Cancelar devuelve stock al inventario: solo el administrador. */
  @Mutation(() => Order)
  @Roles(...ADMIN)
  cancelOrder(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.cancelOrder(id);
  }

  @Mutation(() => Order)
  @Roles(...STAFF)
  updateOrderStatus(
    @Args('id', { type: () => ID }) id: number,
    @Args('status', { type: () => OrderStatus }) status: OrderStatus,
    @CurrentUser() user?: Person,
  ): Promise<Order> {
    if (status === OrderStatus.CANCELLED && !isAdmin(user)) {
      throw new ForbiddenException('Solo un administrador puede cancelar una orden');
    }
    return this.orderService.updateStatus(Number(id), status);
  }

  @Mutation(() => Order)
  @Roles(...STAFF)
  markOrderAsPaid(
    @Args('id', { type: () => ID }) id: number,
    @CurrentUser() user?: Person,
  ): Promise<Order> {
    return this.orderService.markAsPaid(Number(id), user ? Number(user.id) : undefined);
  }

  @Mutation(() => Order)
  @Roles(...STAFF)
  markOrderAsUnpaid(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.markAsUnpaid(Number(id));
  }

  @Mutation(() => Order)
  @Roles(...STAFF)
  registerOrderPayment(
    @Args('input') input: RegisterOrderPaymentInput,
    @CurrentUser() user?: Person,
  ): Promise<Order> {
    return this.orderService.registerPayment(input, user ? Number(user.id) : undefined);
  }

  @Mutation(() => Order)
  @Roles(...STAFF)
  deleteOrderPayment(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.deletePayment(Number(id));
  }
}
