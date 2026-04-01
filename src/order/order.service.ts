import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderProduct } from './entities/order-product.entity';
import { Product } from '../product/entities/product.entity';
import { ProductInventory } from '../product/entities/product-inventory.entity';
import { Person } from '../person/entities/person.entity';
import { InventoryMovement, MovementType } from '../inventory/entities/inventory-movement.entity';
import { CreateOrderInput } from './dto/create-order.input';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private buildOrderQuery() {
    return this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.person', 'person')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .orderBy('order.orderDate', 'DESC');
  }

  findAll(): Promise<Order[]> {
    return this.buildOrderQuery().getMany();
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.buildOrderQuery()
      .where('order.id = :id', { id })
      .getOne();
    if (!order) throw new NotFoundException(`Orden #${id} no encontrada`);
    return order;
  }

  async create(input: CreateOrderInput): Promise<Order> {
    if (!input.items.length) {
      throw new BadRequestException('La orden debe tener al menos un producto');
    }

    const person = await this.personRepository.findOne({ where: { id: input.personId } });
    if (!person) throw new NotFoundException(`Persona #${input.personId} no encontrada`);

    const productIds = input.items.map((item) => Number(item.productId));

    const products = await this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .whereInIds(productIds)
      .getMany();

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => Number(p.id));
      const missing = productIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Productos no encontrados: ${missing.join(', ')}`);
    }

    const productMap = new Map(products.map((p) => [Number(p.id), p]));

    // Validar stock antes de abrir la transacción
    for (const item of input.items) {
      const product = productMap.get(Number(item.productId))!;
      const stock = product.inventory?.currentStock ?? 0;
      if (stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}": disponible ${stock}, solicitado ${item.quantity}`,
        );
      }
    }

    let savedOrderId: number;

    await this.dataSource.transaction(async (em: EntityManager) => {
      let totalValue = 0;

      const order = em.create(Order, {
        person,
        deliveryDate: input.deliveryDate,
        totalValue: 0,
        status: 'pending',
      });
      const savedOrder = await em.save(Order, order);

      const orderItems: OrderProduct[] = [];

      for (const item of input.items) {
        const product = productMap.get(Number(item.productId))!;
        const unitPrice = Number(product.price);
        const totalPrice = unitPrice * item.quantity;
        totalValue += totalPrice;

        const orderProduct = em.create(OrderProduct, {
          orderId: Number(savedOrder.id),
          productId: Number(product.id),
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });
        orderItems.push(orderProduct);

        // Descontar stock
        await em.decrement(
          ProductInventory,
          { product: { id: Number(product.id) } },
          'currentStock',
          item.quantity,
        );

        // Registrar movimiento de salida
        const movement = em.create(InventoryMovement, {
          type: MovementType.SALIDA,
          quantity: item.quantity,
          reason: `Venta - Orden #${savedOrder.id}`,
          product: { id: Number(product.id) },
        });
        await em.save(InventoryMovement, movement);
      }

      await em.save(OrderProduct, orderItems);

      await em.update(Order, { id: savedOrder.id }, { totalValue });

      savedOrderId = Number(savedOrder.id);
    });

    return this.findOne(savedOrderId!);
  }

  async reactivateOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status !== 'cancelled') {
      throw new BadRequestException(`Solo se pueden reactivar órdenes canceladas`);
    }

    // Validar stock antes de abrir transacción
    for (const item of order.items) {
      const inventory = item.product.inventory;
      const stock = inventory?.currentStock ?? 0;
      if (stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${item.product.name}": disponible ${stock}, solicitado ${item.quantity}`,
        );
      }
    }

    await this.dataSource.transaction(async (em: EntityManager) => {
      for (const item of order.items) {
        await em.decrement(
          ProductInventory,
          { product: { id: Number(item.product.id) } },
          'currentStock',
          item.quantity,
        );

        const movement = em.create(InventoryMovement, {
          type: MovementType.SALIDA,
          quantity: item.quantity,
          reason: `Reactivación - Orden #${id}`,
          product: { id: Number(item.product.id) },
        });
        await em.save(InventoryMovement, movement);
      }

      await em.update(Order, { id }, { status: 'pending' });
    });

    return this.findOne(id);
  }

  async deliverOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === 'delivered') {
      throw new BadRequestException(`La orden #${id} ya fue entregada`);
    }
    if (order.status === 'cancelled') {
      throw new BadRequestException(`No se puede entregar una orden cancelada`);
    }

    await this.orderRepository.update({ id }, { status: 'delivered' });

    return this.findOne(id);
  }

  async cancelOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === 'cancelled') {
      throw new BadRequestException(`La orden #${id} ya está cancelada`);
    }
    if (order.status === 'paid') {
      throw new BadRequestException(`No se puede cancelar una orden pagada`);
    }

    await this.dataSource.transaction(async (em: EntityManager) => {
      for (const item of order.items) {
        // Devolver stock
        await em.increment(
          ProductInventory,
          { product: { id: Number(item.product.id) } },
          'currentStock',
          item.quantity,
        );

        // Registrar movimiento de entrada por devolución
        const movement = em.create(InventoryMovement, {
          type: MovementType.ENTRADA,
          quantity: item.quantity,
          reason: `Cancelación - Orden #${id}`,
          product: { id: Number(item.product.id) },
        });
        await em.save(InventoryMovement, movement);
      }

      await em.update(Order, { id }, { status: 'cancelled' });
    });

    return this.findOne(id);
  }
}
