import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { preOrderDatabaseError } from './pre-order-database-error';

describe('preOrderDatabaseError', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['pre_order', 'pre_order_product', 'public.pre_order'])(
    'identifies a missing %s table and explains how to apply the SQL',
    (table) => {
      const error = new QueryFailedError('INSERT INTO pre_order', [], {
        code: '42P01',
        message: `relation "${table}" does not exist`,
      });
      expect(() => preOrderDatabaseError(error)).toThrow(
        ServiceUnavailableException,
      );
      expect(() => preOrderDatabaseError(error)).toThrow(
        'Los prepedidos todavía no están habilitados.',
      );
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('sql/2026-10-21-prepedidos-neon.sql'),
        'PreOrderService',
      );
    },
  );

  it.each([
    new QueryFailedError('SELECT', [], {
      code: '42P01',
      message: 'relation "product" does not exist',
    }),
    new QueryFailedError('INSERT', [], {
      code: '23503',
      message: 'foreign key violation',
    }),
    new QueryFailedError('SELECT', [], {
      code: '42P01',
      message: 'missing FROM-clause entry for table "pre_order"',
    }),
    new Error('Network failure'),
  ])('preserves unrelated errors', (error) => {
    expect(() => preOrderDatabaseError(error)).toThrow(error);
    expect(log).not.toHaveBeenCalled();
  });
});
