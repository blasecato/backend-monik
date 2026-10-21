import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../order/order.module';
import { Product } from '../product/entities/product.entity';
import { PreOrder } from './entities/pre-order.entity';
import { PreOrderProduct } from './entities/pre-order-product.entity';
import { PreOrderResolver } from './pre-order.resolver';
import { PreOrderService } from './pre-order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PreOrder, PreOrderProduct, Product]),
    AuthModule,
    OrderModule,
  ],
  providers: [PreOrderService, PreOrderResolver],
})
export class PreOrderModule {}
