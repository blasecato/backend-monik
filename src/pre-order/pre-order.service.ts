import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, SelectQueryBuilder } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { OrderService } from '../order/order.service';
import { Person } from '../person/entities/person.entity';
import { Product } from '../product/entities/product.entity';
import { PreOrder } from './entities/pre-order.entity';
import { PreOrderProduct } from './entities/pre-order-product.entity';
import {
  CreatePreOrderInput,
  PreOrdersFilterInput,
  UpdatePreOrderInput,
} from './dto/pre-order.input';
import { PaginatedPreOrders } from './dto/paginated-pre-orders';
import { preOrderDatabaseError } from './pre-order-database-error';

const ADMIN = ['admin', 'administrador'];
const STAFF = [...ADMIN, 'seller', 'vendedor'];
const MAX_QUANTITY = 2147483647;

function positiveId(value: string): string {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d{0,18}$/.test(value) ||
    BigInt(value) > 9223372036854775807n
  ) {
    throw new BadRequestException('Identificador inválido');
  }
  return value;
}

/** Convertir un prepedido en orden es exclusivo del administrador. */
function assertAdmin(user: Person) {
  const roles = [user?.role?.key, user?.role?.roleName].map((r) =>
    r?.toLowerCase(),
  );
  if (!roles.some((r) => r && ADMIN.includes(r))) {
    throw new ForbiddenException(
      'Solo un administrador puede pasar un prepedido a pedido',
    );
  }
}

function scope(user: Person) {
  const roles = [user?.role?.key, user?.role?.roleName].map((r) =>
    r?.toLowerCase(),
  );
  if (!user || !roles.some((r) => r && STAFF.includes(r))) {
    throw new ForbiddenException(
      'Solo vendedores y administradores pueden gestionar prepedidos',
    );
  }
  return {
    authorId: positiveId(String(user.id)),
    admin: roles.some((r) => r && ADMIN.includes(r)),
  };
}

function optionalText(
  value: string | null | undefined,
  max: number,
  label: string,
) {
  if (value == null) return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new BadRequestException(`${label}: máximo ${max} caracteres`);
  }
  return value.trim() || null;
}

/** Existing quantities describe the shop, not the warehouse inventory. */
@Injectable()
export class PreOrderService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly orderService: OrderService,
  ) {}

  private query(manager = this.dataSource.manager) {
    return manager
      .getRepository(PreOrder)
      .createQueryBuilder('pre')
      .leftJoinAndSelect('pre.createdBy', 'author')
      .leftJoinAndSelect('pre.order', 'order')
      .leftJoinAndSelect('pre.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('product.category', 'category');
  }

  private restrict(query: SelectQueryBuilder<PreOrder>, user: Person) {
    const access = scope(user);
    if (!access.admin)
      query.andWhere('pre.createdById = :authorId', {
        authorId: access.authorId,
      });
    return query;
  }

  private normalize(input: CreatePreOrderInput) {
    const establishmentName = optionalText(
      input.establishmentName,
      200,
      'Nombre del establecimiento',
    );
    if (!establishmentName)
      throw new BadRequestException(
        'El nombre del establecimiento es obligatorio',
      );
    if (
      !Array.isArray(input.items) ||
      !input.items.length ||
      input.items.length > 10000
    ) {
      throw new BadRequestException('Debes incluir entre 1 y 10000 productos');
    }
    const seen = new Set<string>();
    const quantity = (value?: number | null) => {
      const result = value ?? 0;
      if (!Number.isInteger(result) || result < 0 || result > MAX_QUANTITY) {
        throw new BadRequestException(
          `Las cantidades deben ser enteros entre 0 y ${MAX_QUANTITY}`,
        );
      }
      return result;
    };
    const items = input.items.map((item) => {
      const productId = positiveId(item.productId);
      if (seen.has(productId))
        throw new BadRequestException(
          'No se puede repetir un producto en el mismo prepedido',
        );
      seen.add(productId);
      return {
        productId,
        existingQuantity: quantity(item.existingQuantity),
        requestedQuantity: quantity(item.requestedQuantity),
      };
    });
    return {
      establishmentName,
      address: optionalText(input.address, 500, 'Dirección'),
      notes: optionalText(input.notes, 2000, 'Observaciones'),
      items,
    };
  }

  private async checkProducts(manager: EntityManager, ids: string[]) {
    const found = await manager
      .getRepository(Product)
      .find({ select: { id: true }, where: { id: In(ids) } });
    if (found.length !== ids.length)
      throw new BadRequestException(
        'Hay productos que ya no existen. Actualiza el listado',
      );
  }

  products(user: Person): Promise<Product[]> {
    scope(user);
    return this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.sort_order', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .getMany();
  }

  async findAll(
    user: Person,
    filter?: PreOrdersFilterInput,
  ): Promise<PaginatedPreOrders> {
    scope(user);
    const page = filter?.page ?? 1,
      limit = filter?.limit ?? 10;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1000000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException(
        'La página debe ser positiva y el límite debe estar entre 1 y 100',
      );
    }
    const search = optionalText(filter?.search, 200, 'Búsqueda');
    const query = this.restrict(this.query(), user);
    // Un prepedido convertido ya vive como orden: sale del listado salvo que
    // se pidan explícitamente para consultar el histórico.
    if (!filter?.includeConverted) {
      query.andWhere('pre.convertedAt IS NULL');
    }
    if (search)
      query.andWhere(
        '(pre.establishmentName ILIKE :search OR pre.address ILIKE :search OR author.name ILIKE :search)',
        { search: `%${search}%` },
      );
    const [items, total] = await query
      .orderBy('pre.createdAt', 'DESC')
      .addOrderBy('pre.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
      .catch(preOrderDatabaseError);
    return {
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(
    id: string,
    user: Person,
    manager = this.dataSource.manager,
  ): Promise<PreOrder> {
    const query = this.restrict(
      this.query(manager).where('pre.id = :id', { id: positiveId(id) }),
      user,
    );
    const order = await query.getOne().catch(preOrderDatabaseError);
    if (!order) throw new NotFoundException('Prepedido no encontrado');
    return order;
  }

  async create(input: CreatePreOrderInput, user: Person): Promise<PreOrder> {
    const { authorId } = scope(user);
    const { items, ...header } = this.normalize(input);
    return this.dataSource
      .transaction(async (manager) => {
        await this.checkProducts(
          manager,
          items.map((item) => item.productId),
        );
        const repository = manager.getRepository(PreOrder);
        const order = await repository.save(
          repository.create({ ...header, createdById: authorId }),
        );
        await manager
          .getRepository(PreOrderProduct)
          .insert(items.map((item) => ({ ...item, preOrderId: order.id })));
        return this.findOne(order.id, user, manager);
      })
      .catch(preOrderDatabaseError);
  }

  async update(input: UpdatePreOrderInput, user: Person): Promise<PreOrder> {
    scope(user);
    const id = positiveId(input.id);
    if (
      !Number.isInteger(input.version) ||
      input.version < 1 ||
      input.version >= MAX_QUANTITY
    ) {
      throw new BadRequestException('Versión de prepedido inválida');
    }
    const { items, ...header } = this.normalize(input);
    return this.dataSource
      .transaction(async (manager) => {
        // Lock only the header: PostgreSQL cannot FOR UPDATE nullable outer joins.
        const query = this.restrict(
          manager
            .getRepository(PreOrder)
            .createQueryBuilder('pre')
            .where('pre.id = :id', { id }),
          user,
        ).setLock('pessimistic_write');
        const order = await query.getOne();
        if (!order) throw new NotFoundException('Prepedido no encontrado');
        if (order.version !== input.version) {
          throw new ConflictException(
            'Este prepedido cambió mientras lo editabas. Vuelve a abrirlo antes de guardar',
          );
        }
        await this.checkProducts(
          manager,
          items.map((item) => item.productId),
        );
        Object.assign(order, header, { version: order.version + 1 });
        await manager.getRepository(PreOrder).save(order);
        await manager.getRepository(PreOrderProduct).delete({ preOrderId: id });
        await manager
          .getRepository(PreOrderProduct)
          .insert(items.map((item) => ({ ...item, preOrderId: id })));
        return this.findOne(id, user, manager);
      })
      .catch(preOrderDatabaseError);
  }

  /**
   * Pasa un prepedido a orden. La orden queda idéntica a una creada a mano:
   * el vendedor que registró la visita es quien figura en el pedido, y las
   * cantidades salen de "para llevar" con los precios vigentes del catálogo.
   */
  async convertToOrder(id: string, user: Person): Promise<Order> {
    scope(user);
    assertAdmin(user);
    const preOrderId = positiveId(id);

    return this.dataSource.transaction(async (em: EntityManager) => {
      // Bloqueo de fila: dos clics simultáneos no pueden crear dos órdenes.
      const [locked] = await em.query(
        'SELECT "id", "converted_at", "order_id", "created_by", "establishment_name", "address", "notes" FROM "pre_order" WHERE "id" = $1 FOR UPDATE',
        [preOrderId],
      );

      if (!locked) throw new NotFoundException('Prepedido no encontrado');
      if (locked.converted_at) {
        throw new ConflictException(
          `Este prepedido ya se pasó al pedido #${locked.order_id}`,
        );
      }

      const items = await em
        .getRepository(PreOrderProduct)
        .createQueryBuilder('item')
        .where('item.preOrderId = :preOrderId', { preOrderId })
        .andWhere('item.requestedQuantity > 0')
        .orderBy('item.productId', 'ASC')
        .getMany();

      if (items.length === 0) {
        throw new BadRequestException(
          'El prepedido no tiene cantidades para llevar: no hay nada que pedir',
        );
      }

      const order = await this.orderService.create(
        {
          personId: Number(locked.created_by),
          establishmentName: locked.establishment_name,
          address: locked.address ?? undefined,
          notes: locked.notes ?? undefined,
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: item.requestedQuantity,
          })),
        },
        em,
      );

      await em.update(
        PreOrder,
        { id: preOrderId },
        { convertedAt: new Date(), orderId: String(order.id) },
      );

      return order;
    });
  }
}
