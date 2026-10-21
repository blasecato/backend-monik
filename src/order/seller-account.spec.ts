import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Person } from '../person/entities/person.entity';
import { Order } from './entities/order.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { OrderService } from './order.service';
import { OrderResolver } from './order.resolver';
import { sellerAccountDates } from './seller-account-dates';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('Seller account dates', () => {
  it('includes an entire Colombian day, with an exclusive next-day boundary', () => {
    const { start, end } = sellerAccountDates('2026-10-14', '2026-10-14');
    expect(start.toISOString()).toBe('2026-10-14T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-15T05:00:00.000Z');
    expect(new Date('2026-10-15T04:59:59.999Z').getTime()).toBeLessThan(
      end.getTime(),
    );
  });

  it('handles leap years and ranges crossing a year', () => {
    expect(
      sellerAccountDates('2028-02-29', '2028-02-29').end.toISOString(),
    ).toBe('2028-03-01T05:00:00.000Z');
    expect(
      sellerAccountDates('2026-12-31', '2027-01-01').end.toISOString(),
    ).toBe('2027-01-02T05:00:00.000Z');
  });

  it.each([
    ['', '2026-10-14'],
    ['2026-02-30', '2026-03-01'],
    ['2026-10-14', '2026-10-13'],
    ['2026-10-14T00:00:00Z', '2026-10-14'],
    ['2026-13-01', '2026-13-01'],
  ])('rejects invalid ranges %s – %s', (from, to) => {
    expect(() => sellerAccountDates(from, to)).toThrow(BadRequestException);
  });
});

describe('Seller account', () => {
  const findOne = jest.fn();
  const query = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const createQueryBuilder = jest.fn(() => query);
  const service = new OrderService(
    {} as Repository<Order>,
    { findOne } as unknown as Repository<Person>,
    { getRepository: () => ({ createQueryBuilder }) } as unknown as DataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockResolvedValue({ id: 7, name: 'Ana', role: { key: 'seller' } });
    query.getMany.mockResolvedValue([]);
  });

  it('totals partial payments once and counts distinct orders, including older orders', async () => {
    const payment = {
      orderId: 10,
      createdAt: new Date('2026-10-14T18:00:00Z'),
      note: null,
      order: {
        orderDate: new Date('2026-09-01T12:00:00Z'),
        establishmentName: 'Tienda',
      },
    };
    query.getMany.mockResolvedValue([
      { ...payment, id: 1, amount: '10000.10' },
      { ...payment, id: 2, amount: '20000.20' },
      { ...payment, id: 3, orderId: 11, amount: '5000.05' },
    ] as unknown as OrderPayment[]);
    const result = await service.sellerAccount(7, '2026-10-14', '2026-10-14');
    expect(result.totalCollected).toBe(35000.35);
    expect(result.orderCount).toBe(2);
    expect(result.payments).toHaveLength(3);
    expect(result.payments[0].amount).toBe(10000.1);
    expect(result.payments[0].orderDate.toISOString()).toBe(
      '2026-09-01T12:00:00.000Z',
    );
    // Regression: collection belongs to the payment author and payment date,
    // not the person who placed the order or the date the order was created.
    expect(query.where).toHaveBeenCalledWith('payment.created_by = :sellerId', {
      sellerId: 7,
    });
    expect(query.andWhere).toHaveBeenCalledWith('payment.createdAt >= :start', {
      start: new Date('2026-10-14T05:00:00Z'),
    });
    expect(query.andWhere).toHaveBeenCalledWith('payment.createdAt < :end', {
      end: new Date('2026-10-15T05:00:00Z'),
    });
  });

  it('returns a usable zero account when there are no payments', async () => {
    expect(await service.sellerAccount(7, '2026-10-14', '2026-10-14')).toEqual({
      sellerId: 7,
      sellerName: 'Ana',
      from: '2026-10-14',
      to: '2026-10-14',
      totalCollected: 0,
      orderCount: 0,
      payments: [],
    });
  });

  it('rejects a missing seller or a non-seller instead of reporting a misleading zero', async () => {
    findOne.mockResolvedValueOnce(null);
    await expect(
      service.sellerAccount(7, '2026-10-14', '2026-10-14'),
    ).rejects.toThrow(NotFoundException);
    findOne.mockResolvedValueOnce({ role: { key: 'admin' } });
    await expect(
      service.sellerAccount(7, '2026-10-14', '2026-10-14'),
    ).rejects.toThrow(BadRequestException);
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects invalid seller IDs before querying', async () => {
    await expect(
      service.sellerAccount(NaN, '2026-10-14', '2026-10-14'),
    ).rejects.toThrow(BadRequestException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('limits the report to administrator roles', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, OrderResolver.prototype.sellerAccount),
    ).toEqual(['admin', 'administrador']);
  });
});
