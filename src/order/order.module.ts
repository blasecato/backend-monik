import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderProduct } from './entities/order-product.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { Person } from '../person/entities/person.entity';
import { AuthModule } from '../auth/auth.module';
import { OrderService } from './order.service';
import { OrderResolver } from './order.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderProduct, OrderPayment, Person]),
    AuthModule,
  ],
  providers: [OrderService, OrderResolver],
})
export class OrderModule {}
