import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderProduct } from './entities/order-product.entity';
import { Person } from '../person/entities/person.entity';
import { OrderService } from './order.service';
import { OrderResolver } from './order.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderProduct, Person])],
  providers: [OrderService, OrderResolver],
})
export class OrderModule {}
