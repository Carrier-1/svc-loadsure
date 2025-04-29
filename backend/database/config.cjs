'use strict';

// This file is used by sequelize-cli for migrations
// CommonJS format is needed for Sequelize CLI
require('dotenv').config();

// Common configuration
const baseConfig = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'loadsure',
  password: process.env.DB_PASSWORD || 'loadsurepass',
  database: process.env.DB_NAME || 'loadsure',
  // Use sequelize_migrations table instead of SequelizeMeta
  migrationStorageTableName: 'sequelize_migrations',
  seederStorageTableName: 'sequelize_seeders',
  seederStorage: 'sequelize',
};

module.exports = {
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