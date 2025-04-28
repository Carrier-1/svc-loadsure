// ESM-compatible Sequelize config
import dotenv from 'dotenv';
dotenv.config();

// Using named export instead of default export for compatibility
export const development = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'loadsure',
  password: process.env.DB_PASSWORD || 'loadsurepass',
  database: process.env.DB_NAME || 'loadsure',
  logging: console.log,
  seederStorage: 'sequelize',
  migrationStorageTableName: 'sequelize_migrations',
  seederStorageTableName: 'sequelize_seeders'
};

export const test = {
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  migrationStorageTableName: 'sequelize_migrations',
  seederStorageTableName: 'sequelize_seeders'
};

export const production = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'loadsure',
  password: process.env.DB_PASSWORD || 'loadsurepass',
  database: process.env.DB_NAME || 'loadsure',
  logging: false,
  dialectOptions: {
    ssl: {
      require: process.env.DB_SSL === 'true',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  migrationStorageTableName: 'sequelize_migrations',
  seederStorageTableName: 'sequelize_seeders'
};