import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductInventory } from '../product/entities/product-inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { InventorySummaryResponse } from './dto/inventory-summary.response';
import { UpdateStockInput } from './dto/update-stock.input';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(ProductInventory)
    private readonly inventoryRepository: Repository<ProductInventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
  ) {}

  async findAllInventory(): Promise<InventorySummaryResponse> {
    const inventories = await this.inventoryRepository.find({
      relations: ['product', 'product.category'],
    });

    return {
      inventories,
      totalProducts: inventories.length,
      lowStock: inventories.filter((i) => i.currentStock > 0 && i.currentStock < 100).length,
      outOfStock: inventories.filter((i) => i.currentStock === 0).length,
    };
  }

  async findOneInventory(id: number): Promise<ProductInventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['product', 'product.category'],
    });
    if (!inventory) throw new NotFoundException(`Inventario #${id} no encontrado`);
    return inventory;
  }

  findAllMovements(): Promise<InventoryMovement[]> {
    return this.movementRepository.find({ relations: ['product', 'product.category'] });
  }

  async findMovementsByProduct(productId: number): Promise<InventoryMovement[]> {
    return this.movementRepository.find({
      where: { product: { id: productId } },
      relations: ['product', 'product.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneMovement(id: number): Promise<InventoryMovement> {
    const movement = await this.movementRepository.findOne({
      where: { id },
      relations: ['product', 'product.category'],
    });
    if (!movement) throw new NotFoundException(`Movimiento #${id} no encontrado`);
    return movement;
  }

  async updateStock(input: UpdateStockInput): Promise<ProductInventory> {
    if (input.newStock < 0) {
      throw new BadRequestException('El stock no puede ser negativo');
    }

    const inventory = await this.inventoryRepository.findOne({
      where: { product: { id: Number(input.productId) } },
      relations: ['product'],
    });
    if (!inventory) {
      throw new NotFoundException(`Inventario para el producto #${input.productId} no encontrado`);
    }

    const currentStock = inventory.currentStock;
    const diff = input.newStock - currentStock;

    if (diff === 0) return inventory;

    const movement = this.movementRepository.create({
      type: diff > 0 ? MovementType.ENTRADA : MovementType.SALIDA,
      quantity: Math.abs(diff),
      reason: input.reason ?? (diff > 0 ? 'Ajuste de stock (entrada)' : 'Ajuste de stock (salida)'),
      product: { id: Number(input.productId) },
    });
    await this.movementRepository.save(movement);

    await this.inventoryRepository.update({ id: inventory.id }, { currentStock: input.newStock });

    return this.inventoryRepository.findOne({
      where: { id: inventory.id },
      relations: ['product', 'product.category'],
    }) as Promise<ProductInventory>;
  }
}
