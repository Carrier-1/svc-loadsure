// backend/scripts/create-database.js
// Script to create the database if it doesn't exist

import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const config = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'loadsure',
  password: process.env.DB_PASSWORD || 'loadsurepass',
  database: 'postgres', // Connect to default database first
};

const dbName = process.env.DB_NAME || 'loadsure_db';

// Create a new client
const client = new pg.Client(config);

async function createDatabase() {
  try {
    console.log(`Attempting to create database: ${dbName}`);
    
    // Connect to the PostgreSQL server
    await client.connect();
    
    // Check if database exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (checkResult.rowCount === 0) {
      // Create the database if it doesn't exist
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully!`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
    
    // Grant privileges
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${config.user}"`);
    console.log(`Granted privileges on database "${dbName}" to user "${config.user}"`);
    
    // Test connection to the new database
    await testConnection();
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  } finally {
    // Close the client
    await client.end();
  }
}

async function testConnection() {
  // Create a connection to the new database
  const sequelize = new Sequelize(dbName, config.user, config.password, {
    host: config.host,
    port: config.port,
    dialect: 'postgres',
    logging: false,
  });
  
  try {
    await sequelize.authenticate();
    console.log(`Connection to database "${dbName}" has been established successfully.`);
    await sequelize.close();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

// Run the create database function
createDatabase().catch(console.error);