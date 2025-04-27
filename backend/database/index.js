// backend/database/index.js
const { Sequelize } = require('sequelize');
const config = require('./config');
const path = require('path');

// Determine which environment to use
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
let sequelize;
if (dbConfig.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: dbConfig.dialect,
    storage: path.resolve(__dirname, '..', dbConfig.storage),
    logging: dbConfig.logging
  });
} else {
  sequelize = new Sequelize(
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
}

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
  Quote: require('./models/Quote')(sequelize),
  Booking: require('./models/Booking')(sequelize),
  Certificate: require('./models/Certificate')(sequelize),
};

// Set up model associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export the db object
module.exports = {
  sequelize,
  Sequelize,
  models,
  testConnection
};