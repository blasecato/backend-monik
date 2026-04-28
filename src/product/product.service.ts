import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { ProductInventory } from './entities/product-inventory.entity';
import { NutritionalTable } from './entities/nutritional-table.entity';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ProductInventory)
    private readonly inventoryRepository: Repository<ProductInventory>,
    @InjectRepository(NutritionalTable)
    private readonly nutritionalTableRepository: Repository<NutritionalTable>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
  ) {}

  private buildProductQuery() {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .leftJoinAndSelect('product.nutritionalTable', 'nutritionalTable');
  }

  findAll(): Promise<Product[]> {
    return this.productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.price',
        'product.images',
        'category.id',
        'category.name',
      ])
      .leftJoin('product.category', 'category')
      .orderBy('product.id', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.buildProductQuery()
      .where('product.id = :id', { id })
      .getOne();
    if (!product) throw new NotFoundException(`Producto #${id} no encontrado`);
    return product;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const product = this.productRepository.create({
      name: input.name,
      weight: input.weight,
      price: input.price,
      description: input.description,
      product_origin: input.product_origin,
      chef_tip: input.chef_tip,
      images: input.images,
    });

    if (input.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: input.categoryId },
      });
      if (!category)
        throw new NotFoundException(`Categoría #${input.categoryId} no encontrada`);
      product.category = category;
    }

    if (input.nutritionalTable) {
      const nutritionalTable = this.nutritionalTableRepository.create(input.nutritionalTable);
      const savedNutritionalTable = await this.nutritionalTableRepository.save(nutritionalTable);
      product.nutritionalTable = savedNutritionalTable;
    }

    const saved = await this.productRepository.save(product);

    const inventory = this.inventoryRepository.create({
      product: saved,
      currentStock: 0,
    });
    await this.inventoryRepository.save(inventory);

    return this.findOne(saved.id);
  }

  async update(input: UpdateProductInput): Promise<Product> {
    const product = await this.findOne(input.id);

    if (input.name !== undefined) product.name = input.name;
    if (input.weight !== undefined) product.weight = input.weight;
    if (input.price !== undefined) product.price = input.price;
    if (input.description !== undefined) product.description = input.description;
    if (input.product_origin !== undefined) product.product_origin = input.product_origin;
    if (input.chef_tip !== undefined) product.chef_tip = input.chef_tip;
    if (input.images !== undefined) product.images = input.images;

    if (input.categoryId !== undefined) {
      const category = await this.categoryRepository.findOne({
        where: { id: input.categoryId },
      });
      if (!category)
        throw new NotFoundException(`Categoría #${input.categoryId} no encontrada`);
      product.category = category;
    }

    if (input.nutritionalTable !== undefined) {
      if (product.nutritionalTable) {
        // Actualizar la tabla nutricional existente
        Object.assign(product.nutritionalTable, input.nutritionalTable);
        await this.nutritionalTableRepository.save(product.nutritionalTable);
      } else {
        // Crear nueva tabla nutricional y vincularla
        const nutritionalTable = this.nutritionalTableRepository.create(input.nutritionalTable);
        const savedNutritionalTable = await this.nutritionalTableRepository.save(nutritionalTable);
        product.nutritionalTable = savedNutritionalTable;
      }
    }

    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<boolean> {
    const product = await this.findOne(id);

    await this.movementRepository.delete({ product: { id: product.id } });

    if (product.inventory) {
      await this.inventoryRepository.remove(product.inventory);
    }

    const nutritionalTable = product.nutritionalTable;
    await this.productRepository.remove(product);

    if (nutritionalTable) {
      await this.nutritionalTableRepository.remove(nutritionalTable);
    }

    return true;
  }
}
