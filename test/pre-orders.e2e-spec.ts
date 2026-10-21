import {
  INestApplication,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { Server } from 'node:http';
import { PreOrderService } from '../src/pre-order/pre-order.service';
import { PreOrder } from '../src/pre-order/entities/pre-order.entity';
import type { PaginatedPreOrders } from '../src/pre-order/dto/paginated-pre-orders';
import { Person } from '../src/person/entities/person.entity';
import { ProductService } from '../src/product/product.service';
import { PersonService } from '../src/person/person.service';
import { CreatePreOrders1792540800000 } from '../src/migrations/1792540800000-CreatePreOrders';
import {
  createPreOrderTestApp,
  preparePreOrderDatabase,
  TEST_PASSWORD,
} from './pre-order-fixtures';

const url = process.env.PRE_ORDER_TEST_DATABASE_URL;
const integration = url ? describe : describe.skip;
const fields =
  'id establishmentName address notes version createdBy { id name } items { productId existingQuantity requestedQuantity }';
const createMutation = `mutation($input: CreatePreOrderInput!) { createPreOrder(input: $input) { ${fields} } }`;
const updateMutation = `mutation($input: UpdatePreOrderInput!) { updatePreOrder(input: $input) { ${fields} } }`;
const input = (name = 'Tienda Prueba') => ({
  establishmentName: name,
  items: [
    { productId: '10', existingQuantity: 7, requestedQuantity: 6 },
    { productId: '20', existingQuantity: null },
    { productId: '30' },
  ],
});

integration(
  'Preorders: actual PostgreSQL, SQL script, JWT sessions and GraphQL roles',
  () => {
    let app: INestApplication<Server>;
    let database: DataSource;
    let service: PreOrderService;
    let seller: Person, second: Person, admin: Person;
    const tokens: Record<string, string> = {};
    const gql = async <T = unknown>(
      query: string,
      variables = {},
      token?: string,
    ) => {
      const call = request(app.getHttpServer())
        .post('/graphql')
        .send({ query, variables });
      const response = await (token
        ? call.set('Authorization', `Bearer ${token}`)
        : call);
      return {
        body: response.body as { data: T; errors?: { message: string }[] },
      };
    };

    beforeAll(async () => {
      await preparePreOrderDatabase(url!);
      app = await createPreOrderTestApp(url!);
      database = app.get(DataSource);
      service = app.get(PreOrderService);
      [seller, second, admin] = await Promise.all(
        [1, 2, 9].map(
          async (id) =>
            (await database
              .getRepository(Person)
              .findOne({ where: { id }, relations: ['role'] }))!,
        ),
      );
      for (const name of [
        'vendedor-uno',
        'vendedor-dos',
        'administrador',
        'cliente',
      ]) {
        const result = await gql<{ login: { accessToken: string } }>(
          'mutation($input: LoginInput!) { login(input: $input) { accessToken } }',
          { input: { username: `${name}-test`, password: TEST_PASSWORD } },
        );
        expect(result.body.errors).toBeUndefined();
        tokens[name] = result.body.data.login.accessToken;
      }
    }, 30000);
    afterAll(async () => {
      await app?.close();
    });
    beforeEach(async () => {
      await database.query('TRUNCATE "pre_order" RESTART IDENTITY CASCADE');
    });

    it.each(['pre_order', 'pre_order_product'])(
      'reports the pending SQL when %s is missing and recovers after applying it',
      async (table) => {
        const order = await service.create(input(), seller);
        const errorMessage = 'Los prepedidos todavía no están habilitados.';
        await database.query(
          `ALTER TABLE "${table}" RENAME TO "${table}_not_applied"`,
        );
        try {
          for (const [query, variables] of [
            [createMutation, { input: input() }],
            ['{ preOrders { total } }', {}],
            [`{ preOrder(id: "${order.id}") { id } }`, {}],
            [
              updateMutation,
              { input: { ...input(), id: order.id, version: 1 } },
            ],
          ] as const) {
            const result = await gql(query, variables, tokens['vendedor-uno']);
            expect(result.body.errors?.length).toBeGreaterThan(0);
            result.body.errors?.forEach((error) => {
              expect(error.message).toContain(errorMessage);
            });
          }
        } finally {
          await database.query(
            `ALTER TABLE "${table}_not_applied" RENAME TO "${table}"`,
          );
        }
        expect(await database.getRepository(PreOrder).count()).toBe(1);
        expect((await service.findOne(order.id, seller)).version).toBe(1);
        await expect(service.create(input(), seller)).resolves.toMatchObject({
          establishmentName: 'Tienda Prueba',
        });
      },
    );

    it('saves typed non-multiples of six, nulls and omitted fields as zero, with the authenticated author', async () => {
      const response = await gql<{ createPreOrder: PreOrder }>(
        createMutation,
        { input: input('  Tienda La Esquina  ') },
        tokens['vendedor-uno'],
      );
      expect(response.body.errors).toBeUndefined();
      const order = response.body.data.createPreOrder;
      expect(order.establishmentName).toBe('Tienda La Esquina');
      expect(order.createdBy.id).toBe('1');
      expect(order.items).toEqual(
        expect.arrayContaining([
          { productId: '10', existingQuantity: 7, requestedQuantity: 6 },
          { productId: '20', existingQuantity: 0, requestedQuantity: 0 },
          { productId: '30', existingQuantity: 0, requestedQuantity: 0 },
        ]),
      );
      expect(
        (
          await database.query<{ current_stock: number }[]>(
            'SELECT current_stock FROM product_inventory',
          )
        ).every((row) => row.current_stock === 1000),
      ).toBe(true);
      expect(
        (
          await database.query<{ count: string }[]>(
            'SELECT count(*) FROM orders',
          )
        )[0].count,
      ).toBe('0');
      expect(
        (
          await database.query<{ count: string }[]>(
            'SELECT count(*) FROM inventory_movements',
          )
        )[0].count,
      ).toBe('0');
    });

    it('allows administrators to author preorders and forbids unauthenticated users, customers and forged creators', async () => {
      expect(
        (await gql(createMutation, { input: input() })).body.errors,
      ).toBeDefined();
      expect(
        (await gql(createMutation, { input: input() }, tokens.cliente)).body
          .errors,
      ).toBeDefined();
      expect(
        (
          await gql(
            createMutation,
            { input: { ...input(), createdById: '9' } },
            tokens['vendedor-uno'],
          )
        ).body.errors,
      ).toBeDefined();
      const result = await gql<{ createPreOrder: PreOrder }>(
        createMutation,
        { input: input() },
        tokens.administrador,
      );
      expect(result.body.errors).toBeUndefined();
      expect(result.body.data.createPreOrder.createdBy.id).toBe('9');
      expect(await database.getRepository(PreOrder).count()).toBe(1);
    });

    it('filters sellers at the backend, including direct IDs and edits, while the admin can see everyone', async () => {
      const own = await service.create(input('Tienda Uno'), seller);
      const other = await service.create(input('Tienda Dos'), second);
      const result = await gql<{ preOrders: PaginatedPreOrders }>(
        `{ preOrders { total items { id } } }`,
        {},
        tokens['vendedor-uno'],
      );
      expect(result.body.data.preOrders).toEqual({
        total: 1,
        items: [{ id: own.id }],
      });
      expect(
        (
          await gql(
            `{ preOrder(id: "${other.id}") { id } }`,
            {},
            tokens['vendedor-uno'],
          )
        ).body.errors,
      ).toBeDefined();
      expect(
        (
          await gql(
            updateMutation,
            { input: { ...input(), id: other.id, version: 1 } },
            tokens['vendedor-uno'],
          )
        ).body.errors,
      ).toBeDefined();
      const all = await gql<{ preOrders: PaginatedPreOrders }>(
        '{ preOrders(filter: { limit: 1 }) { total totalPages items { id } } }',
        {},
        tokens.administrador,
      );
      expect(all.body.data.preOrders.total).toBe(2);
      expect(all.body.data.preOrders.totalPages).toBe(2);
      expect(all.body.data.preOrders.items).toHaveLength(1);
      const edited = await service.update(
        { ...input('Corregido por admin'), id: other.id, version: 1 },
        admin,
      );
      expect(edited.createdById).toBe('2');
      expect(edited.version).toBe(2);
      await expect(service.findOne(other.id, seller)).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([-1, 0.5, 2147483648])(
      'rejects invalid quantity %s without saving a partial visit',
      async (quantity) => {
        const response = await gql(
          createMutation,
          {
            input: {
              ...input(),
              items: [{ productId: '10', existingQuantity: quantity }],
            },
          },
          tokens['vendedor-uno'],
        );
        expect(response.body.errors).toBeDefined();
        expect(await database.getRepository(PreOrder).count()).toBe(0);
      },
    );

    it('rejects duplicate and missing products, empty establishments and unsafe IDs', async () => {
      await expect(
        service.create(
          { ...input(), items: [{ productId: '10' }, { productId: '10' }] },
          seller,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...input(), items: [{ productId: '999' }] }, seller),
      ).rejects.toThrow(BadRequestException);
      await expect(service.create(input('   '), seller)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.create(
          { ...input(), items: [{ productId: '9223372036854775808' }] },
          seller,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(await database.getRepository(PreOrder).count()).toBe(0);
    });

    it('serializes simultaneous edits and refuses an outdated version instead of losing changes', async () => {
      const order = await service.create(input(), seller);
      const results = await Promise.allSettled([
        service.update(
          { ...input('Edición A'), id: order.id, version: 1 },
          seller,
        ),
        service.update(
          { ...input('Edición B'), id: order.id, version: 1 },
          admin,
        ),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        results.find((r) => r.status === 'rejected')?.reason,
      ).toBeInstanceOf(ConflictException);
      expect((await service.findOne(order.id, seller)).version).toBe(2);
    });

    it('rolls back the header and replaced lines if any detail fails', async () => {
      const order = await service.create(input(), seller);
      await database.query(
        'ALTER TABLE pre_order_product ADD CONSTRAINT test_failure CHECK (requested_quantity <> 13)',
      );
      try {
        await expect(
          service.update(
            {
              ...input('No debe quedar'),
              id: order.id,
              version: 1,
              items: [{ productId: '10', requestedQuantity: 13 }],
            },
            seller,
          ),
        ).rejects.toThrow();
        const restored = await service.findOne(order.id, seller);
        expect(restored.establishmentName).toBe('Tienda Prueba');
        expect(restored.version).toBe(1);
        expect(restored.items).toHaveLength(3);
        expect(
          restored.items.find((item) => item.productId === '10')
            ?.requestedQuantity,
        ).toBe(6);
      } finally {
        await database.query(
          'ALTER TABLE pre_order_product DROP CONSTRAINT test_failure',
        );
      }
    });

    it('enforces foreign keys, non-negative counts and unique products in the actual SQL, and can rerun the migration', async () => {
      const order = await service.create(input(), seller);
      await expect(
        database.query(
          'UPDATE pre_order_product SET existing_quantity = -1 WHERE pre_order_id = $1',
          [order.id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
      await expect(
        database.query(
          'INSERT INTO pre_order_product (pre_order_id, product_id) VALUES ($1, 10)',
          [order.id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23505' } });
      await expect(
        database.query(
          'INSERT INTO pre_order_product (pre_order_id, product_id) VALUES ($1, 999)',
          [order.id],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
      await expect(
        database.query('DELETE FROM person WHERE id = 1'),
      ).rejects.toMatchObject({ driverError: { code: '23503' } });
      const runner = database.createQueryRunner();
      try {
        await new CreatePreOrders1792540800000().up(runner);
      } finally {
        await runner.release();
      }
      expect((await service.findOne(order.id, seller)).items).toHaveLength(3);
    });

    it('refuses deleting referenced users/products without losing stock or movements', async () => {
      await service.create(input(), seller);
      await database.query(
        "INSERT INTO inventory_movements (type, quantity, reason, product_id) VALUES ('entrada', 6, 'Prueba', 10)",
      );
      try {
        await expect(app.get(ProductService).remove(10)).rejects.toThrow(
          BadRequestException,
        );
        await expect(app.get(PersonService).remove(1)).rejects.toThrow(
          BadRequestException,
        );
        expect(
          (
            await database.query<{ current_stock: number }[]>(
              'SELECT current_stock FROM product_inventory WHERE product_id = 10',
            )
          )[0].current_stock,
        ).toBe(1000);
        expect(
          (
            await database.query<{ count: string }[]>(
              'SELECT count(*) FROM inventory_movements WHERE product_id = 10',
            )
          )[0].count,
        ).toBe('1');
      } finally {
        await database.query('DELETE FROM inventory_movements');
      }
    });
  },
);
