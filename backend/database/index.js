// backend/database/index.js - Updated version
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

// IMPORTANT FIX: Ensure database name is correctly set to loadsure_dev
if (!dbConfig.database || dbConfig.database === 'loadsure') {
  dbConfig.database = 'loadsure_dev';
  console.log('Database name overridden to loadsure_dev');
}

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
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    
    // Log helpful message about database not existing
    if (error.message && error.message.includes('database') && error.message.includes('does not exist')) {
      console.error(`\n==============================================================`);
      console.error(`ERROR: Database '${dbConfig.database}' does not exist`);
      console.error(`\nTo fix this issue, run the following commands:`);
      console.error(`1. Connect to postgres: docker-compose exec postgres bash`);
      console.error(`2. Launch psql: psql -U ${dbConfig.username}`);
      console.error(`3. Create the database: CREATE DATABASE ${dbConfig.database};`);
      console.error(`4. Exit psql: \\q`);
      console.error(`5. Restart services: docker-compose restart api-service loadsure-service`);
      console.error(`==============================================================\n`);
    }
    
    return false;
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