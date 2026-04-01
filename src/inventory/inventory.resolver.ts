import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { InventoryService } from './inventory.service';
import { ProductInventory } from '../product/entities/product-inventory.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventorySummaryResponse } from './dto/inventory-summary.response';
import { UpdateStockInput } from './dto/update-stock.input';

@Resolver()
export class InventoryResolver {
  constructor(private readonly inventoryService: InventoryService) {}

  @Query(() => InventorySummaryResponse, { name: 'inventories' })
  findAllInventory(): Promise<InventorySummaryResponse> {
    return this.inventoryService.findAllInventory();
  }

  @Query(() => ProductInventory, { name: 'inventory' })
  findOneInventory(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<ProductInventory> {
    return this.inventoryService.findOneInventory(id);
  }

  @Query(() => [InventoryMovement], { name: 'inventoryMovements' })
  findAllMovements(): Promise<InventoryMovement[]> {
    return this.inventoryService.findAllMovements();
  }

  @Query(() => [InventoryMovement], { name: 'inventoryMovementsByProduct' })
  findMovementsByProduct(
    @Args('productId', { type: () => ID }) productId: number,
  ): Promise<InventoryMovement[]> {
    return this.inventoryService.findMovementsByProduct(productId);
  }

  @Query(() => InventoryMovement, { name: 'inventoryMovement' })
  findOneMovement(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<InventoryMovement> {
    return this.inventoryService.findOneMovement(id);
  }

  @Mutation(() => ProductInventory)
  updateStock(@Args('input') input: UpdateStockInput): Promise<ProductInventory> {
    return this.inventoryService.updateStock(input);
  }
}
