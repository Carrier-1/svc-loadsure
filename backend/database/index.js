// backend/database/index.js
import { Sequelize } from 'sequelize';
import config from './config.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import model definitions
import defineQuoteModel from './models/Quote.js';
import defineBookingModel from './models/Booking.js';
import defineCertificateModel from './models/Certificate.js';

// Determine which environment to use
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions,
    pool: dbConfig.pool
  }
);

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

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

// Export the db object
export {
  sequelize,
  Sequelize,
  models,
  testConnection
};