import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { ProductInventory } from './entities/product-inventory.entity';
import { NutritionalTable } from './entities/nutritional-table.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { ProductService } from './product.service';
import { ProductResolver } from './product.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, ProductInventory, NutritionalTable, InventoryMovement])],
  providers: [ProductService, ProductResolver],
  exports: [ProductService],
})
export class ProductModule {}
