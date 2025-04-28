// backend/database/index.js
import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import model definitions
import defineQuoteModel from './models/Quote.js';
import defineBookingModel from './models/Booking.js';
import defineCertificateModel from './models/Certificate.js';

// Environment settings
const env = process.env.NODE_ENV || 'development';
const DB_DIALECT = process.env.DB_DIALECT || 'postgres';
const DB_HOST = process.env.DB_HOST || 'postgres';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USERNAME || 'loadsure';
const DB_PASSWORD = process.env.DB_PASSWORD || 'loadsurepass';
const DB_NAME = process.env.DB_NAME || 'loadsure_db';

// Create Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: env === 'development' ? console.log : false,
  dialectOptions: env === 'production' ? {
    ssl: {
      require: process.env.DB_SSL === 'true',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    }
  } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Define models
const models = {
  Quote: defineQuoteModel(sequelize),
  Booking: defineBookingModel(sequelize),
  Certificate: defineCertificateModel(sequelize),
};

// Set up model associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    
    // Log helpful message about database not existing
    if (error.message && error.message.includes('database') && error.message.includes('does not exist')) {
      console.error(`\n==============================================================`);
      console.error(`ERROR: Database '${DB_NAME}' does not exist`);
      console.error(`\nMake sure the database migrations have been run:`);
      console.error(`npx sequelize-cli db:migrate`);
      console.error(`==============================================================\n`);
    }
    
    return false;
  }
}

// Export the db object
export {
  sequelize,
  Sequelize,
  models,
  testConnection
};