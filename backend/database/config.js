// ESM-compatible Sequelize config
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Common configuration options
const baseConfig = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'loadsure',
  password: process.env.DB_PASSWORD || 'loadsurepass',
  database: process.env.DB_NAME || 'loadsure',
  migrationStorageTableName: 'sequelize_migrations',
  seederStorageTableName: 'sequelize_seeders',
  seederStorage: 'sequelize',
};

// Environment-specific configurations
const config = {
  development: {
    ...baseConfig,
    logging: console.log,
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    migrationStorageTableName: 'sequelize_migrations',
    seederStorageTableName: 'sequelize_seeders'
  },
  production: {
    ...baseConfig,
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
    }
  }
};

// Export the current environment's config and all configs
export default config[env];
export const configs = config;