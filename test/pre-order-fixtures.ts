import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { DataSource } from 'typeorm';
import { hash } from 'bcrypt';
import { AuthModule } from '../src/auth/auth.module';
import { AuthSession } from '../src/auth/entities/auth-session.entity';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity';
import { Person } from '../src/person/entities/person.entity';
import { Role } from '../src/person/entities/role.entity';
import { DniType } from '../src/person/entities/dni-type.entity';
import { Category } from '../src/category/entities/category.entity';
import { Product } from '../src/product/entities/product.entity';
import { ProductInventory } from '../src/product/entities/product-inventory.entity';
import { NutritionalTable } from '../src/product/entities/nutritional-table.entity';
import { InventoryMovement } from '../src/inventory/entities/inventory-movement.entity';
import { Order } from '../src/order/entities/order.entity';
import { OrderProduct } from '../src/order/entities/order-product.entity';
import { OrderPayment } from '../src/order/entities/order-payment.entity';
import { PreOrder } from '../src/pre-order/entities/pre-order.entity';
import { PreOrderProduct } from '../src/pre-order/entities/pre-order-product.entity';
import { PreOrderModule } from '../src/pre-order/pre-order.module';
import { ProductModule } from '../src/product/product.module';
import { CategoryModule } from '../src/category/category.module';
import { PersonModule } from '../src/person/person.module';

const CORE = [
  Person,
  Role,
  DniType,
  Category,
  Product,
  ProductInventory,
  NutritionalTable,
  InventoryMovement,
  Order,
  OrderProduct,
  OrderPayment,
  AuthSession,
  RefreshToken,
];
export const TEST_ENTITIES = [...CORE, PreOrder, PreOrderProduct];
export const TEST_PASSWORD = 'preorder-local-test-only';

export function assertLocalTestDatabase(url: string) {
  const parsed = new URL(url);
  if (
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    parsed.pathname !== '/monik_preorders_test'
  ) {
    throw new Error(
      'Preorder tests require the isolated local database monik_preorders_test',
    );
  }
}

/** Fixture setup deliberately creates only the existing tables with TypeORM.
 * The new tables must be created by the actual manual Neon SQL, not sync. */
export async function preparePreOrderDatabase(url: string) {
  assertLocalTestDatabase(url);
  const database = await new DataSource({
    type: 'postgres',
    url,
    entities: CORE,
    synchronize: true,
  }).initialize();
  try {
    await database.query(
      readFileSync(
        join(__dirname, '../sql/2026-10-21-prepedidos-neon.sql'),
        'utf8',
      ),
    );
    await database.query(
      readFileSync(
        join(__dirname, '../sql/2026-10-21-prepedidos-conversion-neon.sql'),
        'utf8',
      ),
    );
    await database.query(
      'TRUNCATE "pre_order", "product", "category", "person", "role" RESTART IDENTITY CASCADE',
    );
    await database.getRepository(Role).insert([
      { id: 1, roleName: 'administrador', key: 'admin' },
      { id: 2, roleName: 'vendedor', key: 'seller' },
      { id: 3, roleName: 'cliente', key: 'client' },
    ]);
    const password = await hash(TEST_PASSWORD, 4);
    for (const [id, name, username, roleId] of [
      [1, 'Vendedor Uno', 'vendedor-uno-test', 2],
      [2, 'Vendedor Dos', 'vendedor-dos-test', 2],
      [9, 'Administrador Prueba', 'administrador-test', 1],
      [3, 'Cliente Prueba', 'cliente-test', 3],
    ])
      await database.query(
        'INSERT INTO person (id, name, username, dni, password, role_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, name, username, String(id), password, roleId],
      );
    await database.getRepository(Category).insert({ id: 1, name: 'Especias' });
    for (const [id, name, weight, position, image] of [
      [10, 'Canela', 14, 1, '/monik-assets/bag-canela.png'],
      [20, 'Anís', 15, 2, '/monik-assets/bag-anis.png'],
      [30, 'Uvas pasas', 60, 3, '/monik-assets/bag-paprika.png'],
    ])
      await database.query(
        'INSERT INTO product (id, name, weight, price, sort_order, category_id, images) VALUES ($1, $2, $3, 1200, $4, 1, $5)',
        [id, name, weight, position, JSON.stringify([image])],
      );
    await database
      .getRepository(ProductInventory)
      .insert(
        [10, 20, 30].map((id) => ({ currentStock: 1000, product: { id } })),
      );
  } finally {
    await database.destroy();
  }
}

export async function createPreOrderTestApp(url: string) {
  assertLocalTestDatabase(url);
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            JWT_SECRET: 'preorder-test-only-secret',
            JWT_EXPIRES_IN: '',
            REFRESH_TOKEN_SECRET: 'preorder-test-only-refresh',
            REFRESH_TOKEN_EXPIRES_IN: '1d',
          }),
        ],
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        url,
        entities: TEST_ENTITIES,
        synchronize: false,
      }),
      GraphQLModule.forRoot<ApolloDriverConfig>({
        driver: ApolloDriver,
        autoSchemaFile: true,
      }),
      AuthModule,
      PreOrderModule,
      ProductModule,
      CategoryModule,
      PersonModule,
    ],
  }).compile();
  const app = module.createNestApplication<INestApplication<Server>>();
  app.enableCors();
  await app.init();
  return app;
}
