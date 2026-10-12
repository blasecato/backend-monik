import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderProduct } from './entities/order-product.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { Product } from '../product/entities/product.entity';
import { ProductInventory } from '../product/entities/product-inventory.entity';
import { Person } from '../person/entities/person.entity';
import { InventoryMovement, MovementType } from '../inventory/entities/inventory-movement.entity';
import { CreateOrderInput } from './dto/create-order.input';
import { UpdateOrderInput } from './dto/update-order.input';
import { RegisterOrderPaymentInput } from './dto/register-order-payment.input';
import { OrderStatus } from './dto/order-status.enum';

/** Tolerancia al comparar montos `numeric`, para no fallar por centavos. */
const EPSILON = 0.009;

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
    return this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.id',
        'order.status',
        'order.isPaid',
        'order.orderDate',
        'order.establishmentName',
        'person.id',
        'person.name',
      ])
      .leftJoin('order.person', 'person')
      .orderBy('order.orderDate', 'DESC')
      .getMany();
  }


  async findOne(id: number): Promise<Order> {
    const order = await this.buildOrderQuery()
      .where('order.id = :id', { id })
      .getOne();
    if (!order) throw new NotFoundException(`Orden #${id} no encontrada`);
    return order;
  }

  findBySeller(sellerId: number): Promise<Order[]> {
    return this.findDetailed(sellerId);
  }

  /**
   * Listado completo con items y abonos. Sin `sellerId` devuelve todas las
   * órdenes: es la vista que usan tanto el vendedor como el administrador.
   */
  async findDetailed(sellerId?: number): Promise<Order[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.id',
        'order.status',
        'order.isPaid',
        'order.totalValue',
        'order.orderDate',
        'order.deliveryDate',
        'order.establishmentName',
        'order.address',
        'order.notes',
        'person.id',
        'person.name',
        'role.id',
        'role.roleName',
        'items.quantity',
        'items.unitPrice',
        'items.totalPrice',
        'product.id',
        'product.name',
        'product.sort_order',
        'payments.id',
        'payments.amount',
        'payments.note',
        'payments.createdAt',
        'createdBy.id',
        'createdBy.name',
      ])
      .leftJoin('order.person', 'person')
      .leftJoin('person.role', 'role')
      .leftJoin('order.items', 'items')
      .leftJoin('items.product', 'product')
      .leftJoin('order.payments', 'payments')
      .leftJoin('payments.createdBy', 'createdBy');

    if (sellerId) {
      qb.where('person.id = :sellerId', { sellerId });
    }

    return qb
      .orderBy('order.orderDate', 'DESC')
      .addOrderBy('product.sort_order', 'ASC')
      .addOrderBy('payments.createdAt', 'ASC')
      .getMany();
  }

  async findByDateRange(from: string, to: string, sellerId?: number): Promise<Order[]> {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);

    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.person', 'person')
      .leftJoinAndSelect('person.role', 'role')
      .leftJoinAndSelect('person.dniType', 'dniType')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .where('order.orderDate >= :start', { start })
      .andWhere('order.orderDate <= :end', { end });

    if (sellerId) {
      qb.andWhere('person.id = :sellerId', { sellerId });
    }

    return qb.orderBy('order.orderDate', 'DESC').addOrderBy('product.sort_order', 'ASC').getMany();
  }

  async findOneDetail(id: number): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.id', 'order.status', 'order.isPaid', 'order.totalValue', 'order.orderDate',
        'order.deliveryDate', 'order.establishmentName', 'order.address', 'order.notes',
        'person.id', 'person.name', 'person.dni', 'person.username',
        'role.id', 'role.roleName',
        'dniType.id', 'dniType.typeName',
        'items.quantity', 'items.unitPrice', 'items.totalPrice',
        'product.id', 'product.name', 'product.images', 'product.sort_order',
        'payments.id', 'payments.amount', 'payments.note', 'payments.createdAt',
        'createdBy.id', 'createdBy.name',
      ])
      .leftJoin('order.person', 'person')
      .leftJoin('person.role', 'role')
      .leftJoin('person.dniType', 'dniType')
      .leftJoin('order.items', 'items')
      .leftJoin('items.product', 'product')
      .leftJoin('order.payments', 'payments')
      .leftJoin('payments.createdBy', 'createdBy')
      .where('order.id = :id', { id })
      .addOrderBy('product.sort_order', 'ASC')
      .addOrderBy('payments.createdAt', 'ASC')
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
      .select(['product.id', 'product.price'])
      .whereInIds(productIds)
      .getMany();

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => Number(p.id));
      const missing = productIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Productos no encontrados: ${missing.join(', ')}`);
    }

    const productMap = new Map(products.map((p) => [Number(p.id), p]));

    let savedOrderId: number;

    await this.dataSource.transaction(async (em: EntityManager) => {
      let totalValue = 0;

      const order = em.create(Order, {
        person,
        deliveryDate: input.deliveryDate,
        establishmentName: input.establishmentName ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
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
      }

      await em.save(OrderProduct, orderItems);

      await em.update(Order, { id: savedOrder.id }, { totalValue });

      savedOrderId = Number(savedOrder.id);
    });

    return this.findOne(savedOrderId!);
  }

  async updateOrder(input: UpdateOrderInput): Promise<Order> {
    const id = Number(input.id);
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden #${id} no encontrada`);

    if (order.status === 'cancelled') {
      throw new BadRequestException(`No se puede modificar una orden cancelada`);
    }
    if (order.status === 'delivered') {
      throw new BadRequestException(`No se puede modificar una orden ya entregada`);
    }

    await this.dataSource.transaction(async (em: EntityManager) => {
      const fieldsToUpdate: Partial<Order> = {};

      if (input.deliveryDate !== undefined) fieldsToUpdate.deliveryDate = input.deliveryDate;
      if (input.establishmentName !== undefined) fieldsToUpdate.establishmentName = input.establishmentName ?? null;
      if (input.address !== undefined) fieldsToUpdate.address = input.address ?? null;
      if (input.notes !== undefined) fieldsToUpdate.notes = input.notes ?? null;

      if (input.items && input.items.length > 0) {
        const productIds = input.items.map((i) => Number(i.productId));

        const products = await em
          .getRepository(Product)
          .createQueryBuilder('product')
          .select(['product.id', 'product.price'])
          .whereInIds(productIds)
          .getMany();

        if (products.length !== productIds.length) {
          const foundIds = products.map((p) => Number(p.id));
          const missing = productIds.filter((pid) => !foundIds.includes(pid));
          throw new NotFoundException(`Productos no encontrados: ${missing.join(', ')}`);
        }

        const productMap = new Map(products.map((p) => [Number(p.id), p]));

        await em.delete(OrderProduct, { orderId: id });

        let totalValue = 0;
        const newItems: OrderProduct[] = [];

        for (const item of input.items) {
          const product = productMap.get(Number(item.productId))!;
          const unitPrice = Number(product.price);
          const totalPrice = unitPrice * item.quantity;
          totalValue += totalPrice;

          newItems.push(
            em.create(OrderProduct, {
              orderId: id,
              productId: Number(product.id),
              quantity: item.quantity,
              unitPrice,
              totalPrice,
            }),
          );
        }

        await em.save(OrderProduct, newItems);
        fieldsToUpdate.totalValue = totalValue;
      }

      if (Object.keys(fieldsToUpdate).length > 0) {
        await em.update(Order, { id }, fieldsToUpdate);
      }
    });

    return this.findOneDetail(id);
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

  /** Marca la orden como pagada registrando un abono por el saldo restante. */
  async markAsPaid(id: number, actorId?: number): Promise<Order> {
    const balance = await this.getBalance(id);
    if (balance <= EPSILON) {
      const order = await this.orderRepository.findOne({ where: { id } });
      if (!order) throw new NotFoundException(`Orden #${id} no encontrada`);
      await this.orderRepository.update({ id }, { isPaid: true });
      return this.findOneDetail(id);
    }

    return this.registerPayment({ orderId: id, amount: balance }, actorId);
  }

  /** Revierte el pago borrando todos los abonos de la orden. */
  async markAsUnpaid(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden #${id} no encontrada`);

    await this.dataSource.transaction(async (em: EntityManager) => {
      await em.delete(OrderPayment, { orderId: id });
      await em.update(Order, { id }, { isPaid: false });
    });

    return this.findOneDetail(id);
  }

  /** Abono sobre una orden. Varios abonos pueden cubrirla. */
  async registerPayment(input: RegisterOrderPaymentInput, actorId?: number): Promise<Order> {
    const orderId = Number(input.orderId);
    const amount = Number(input.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('El abono debe ser mayor a cero');
    }

    await this.dataSource.transaction(async (em: EntityManager) => {
      // Bloqueo de fila: dos abonos simultáneos no pueden dejar `is_paid`
      // inconsistente con la suma real de la tabla de abonos.
      const [locked] = await em.query(
        'SELECT "id", "total_value", "status" FROM "orders" WHERE "id" = $1 FOR UPDATE',
        [orderId],
      );

      if (!locked) throw new NotFoundException(`Orden #${orderId} no encontrada`);
      if (locked.status === 'cancelled') {
        throw new BadRequestException('No se pueden registrar abonos en una orden cancelada');
      }

      const total = Number(locked.total_value);
      const paid = await this.sumPayments(em, orderId);
      const balance = total - paid;

      if (balance <= EPSILON) {
        throw new BadRequestException('La orden ya está pagada por completo');
      }
      if (amount - balance > EPSILON) {
        throw new BadRequestException(
          `El abono (${amount}) supera el saldo pendiente (${balance})`,
        );
      }

      await em.insert(OrderPayment, {
        orderId,
        amount,
        note: input.note?.trim() || null,
        createdBy: actorId ? ({ id: actorId } as Person) : null,
      });

      await em.update(Order, { id: orderId }, { isPaid: paid + amount >= total - EPSILON });
    });

    return this.findOneDetail(orderId);
  }

  /** Borra un abono mal registrado y recalcula la bandera de pago. */
  async deletePayment(paymentId: number): Promise<Order> {
    const payment = await this.dataSource
      .getRepository(OrderPayment)
      .findOne({ where: { id: paymentId } });

    if (!payment) throw new NotFoundException(`Abono #${paymentId} no encontrado`);

    const orderId = Number(payment.orderId);

    await this.dataSource.transaction(async (em: EntityManager) => {
      const [locked] = await em.query(
        'SELECT "total_value" FROM "orders" WHERE "id" = $1 FOR UPDATE',
        [orderId],
      );
      if (!locked) throw new NotFoundException(`Orden #${orderId} no encontrada`);

      await em.delete(OrderPayment, { id: paymentId });

      const paid = await this.sumPayments(em, orderId);
      await em.update(
        Order,
        { id: orderId },
        { isPaid: paid >= Number(locked.total_value) - EPSILON },
      );
    });

    return this.findOneDetail(orderId);
  }

  /**
   * Cambio de estado desde el modal. Delega en las operaciones existentes
   * cuando el cambio mueve inventario (cancelar devuelve stock, reactivar lo
   * vuelve a descontar); los demás saltos solo tocan la columna.
   */
  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden #${id} no encontrada`);

    if (order.status === status) return this.findOneDetail(id);

    if (status === OrderStatus.CANCELLED) {
      await this.cancelOrder(id);
      return this.findOneDetail(id);
    }

    if (order.status === OrderStatus.CANCELLED) {
      // Reactivar vuelve a descontar stock; deja la orden en `pending`.
      await this.reactivateOrder(id);
      if (status === OrderStatus.DELIVERED) {
        await this.orderRepository.update({ id }, { status: OrderStatus.DELIVERED });
      }
      return this.findOneDetail(id);
    }

    // pending <-> delivered: sin efecto sobre inventario.
    await this.orderRepository.update({ id }, { status });
    return this.findOneDetail(id);
  }

  /** Saldo pendiente de la orden. */
  async getBalance(id: number): Promise<number> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden #${id} no encontrada`);
    const paid = await this.sumPayments(this.dataSource.manager, id);
    return Number(order.totalValue) - paid;
  }

  private async sumPayments(em: EntityManager, orderId: number): Promise<number> {
    const [row] = await em.query(
      'SELECT COALESCE(SUM("amount"), 0) AS total FROM "order_payment" WHERE "order_id" = $1',
      [orderId],
    );
    return Number(row.total);
  }

  async cancelOrder(id: number): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === 'cancelled') {
      throw new BadRequestException(`La orden #${id} ya está cancelada`);
    }

    const paid = await this.sumPayments(this.dataSource.manager, id);
    if (paid > EPSILON) {
      throw new BadRequestException(
        `La orden #${id} tiene abonos registrados. Borra los abonos antes de cancelarla.`,
      );
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
