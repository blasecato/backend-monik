import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const isCompiled = __filename.endsWith('.js');

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: true,
    extra: { ssl: { rejectUnauthorized: false } },
  }),
  entities: isCompiled ? ['dist/src/**/*.entity.js'] : ['src/**/*.entity.ts'],
  migrations: isCompiled ? ['dist/src/migrations/*.js'] : ['src/migrations/*.ts'],
});
