import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductInventory } from '../product/entities/product-inventory.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { Product } from '../product/entities/product.entity';
import { InventoryService } from './inventory.service';
import { InventoryResolver } from './inventory.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([ProductInventory, InventoryMovement, Product])],
  providers: [InventoryService, InventoryResolver],
})
export class InventoryModule {}
