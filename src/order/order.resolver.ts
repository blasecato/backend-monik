import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { CreateOrderInput } from './dto/create-order.input';

@Resolver(() => Order)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => [Order], { name: 'orders' })
  findAll(): Promise<Order[]> {
    return this.orderService.findAll();
  }

  @Query(() => Order, { name: 'order' })
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.findOne(id);
  }

  @Query(() => Order, { name: 'orderDetail' })
  findOneDetail(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.findOneDetail(id);
  }

  @Query(() => [Order], { name: 'ordersByDateRange' })
  findByDateRange(
    @Args('from', { type: () => String }) from: string,
    @Args('to', { type: () => String }) to: string,
    @Args('sellerId', { type: () => ID, nullable: true }) sellerId?: number,
  ): Promise<Order[]> {
    return this.orderService.findByDateRange(from, to, sellerId ? Number(sellerId) : undefined);
  }

  @Mutation(() => Order)
  createOrder(@Args('input') input: CreateOrderInput): Promise<Order> {
    return this.orderService.create(input);
  }

  @Mutation(() => Order)
  reactivateOrder(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.reactivateOrder(id);
  }

  @Mutation(() => Order)
  deliverOrder(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.deliverOrder(id);
  }

  @Mutation(() => Order)
  cancelOrder(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.cancelOrder(id);
  }

  @Mutation(() => Order)
  markOrderAsPaid(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.markAsPaid(id);
  }

  @Mutation(() => Order)
  markOrderAsUnpaid(@Args('id', { type: () => ID }) id: number): Promise<Order> {
    return this.orderService.markAsUnpaid(id);
  }
}
