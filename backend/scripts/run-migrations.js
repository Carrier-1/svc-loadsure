#!/usr/bin/env node

/**
 * This is a simplified migration runner that uses the sequelize-cli directly
 * and avoids using PostgreSQL client tools
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Log helper
function log(message) {
  console.log(`[MIGRATION] ${message}`);
}

// Error helper
function error(message) {
  console.error(`[MIGRATION-ERROR] ${message}`);
  process.exit(1);
}

// Get database configuration from environment variables
const DB_HOST = process.env.DB_HOST || 'postgres';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USERNAME || 'loadsure';
const DB_PASSWORD = process.env.DB_PASSWORD || 'loadsurepass';
const DB_NAME = process.env.DB_NAME || 'loadsure';
const DB_DIALECT = process.env.DB_DIALECT || 'postgres';

// Create a Sequelize instance for database operations
const createSequelizeInstance = (database = 'postgres') => {
  return new Sequelize(database, DB_USERNAME, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: false // Disable SQL logging
  });
};

// Wait for PostgreSQL to be ready
async function waitForPostgres() {
  log('Waiting for PostgreSQL to be ready...');
  
  const sequelize = createSequelizeInstance();
  const maxRetries = 30;
  
  for (let retries = 0; retries < maxRetries; retries++) {
    try {
      await sequelize.authenticate();
      log('PostgreSQL is ready!');
      await sequelize.close();
      return true;
    } catch (err) {
      if (retries === maxRetries - 1) {
        error(`Failed to connect to PostgreSQL after ${maxRetries} attempts: ${err.message}`);
        return false;
      }
      log(`PostgreSQL not ready yet, waiting... (attempt ${retries+1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return false;
}

// Check if database exists and create it if needed
async function checkDatabaseExists() {
  log(`Checking if database '${DB_NAME}' exists...`);
  
  const sequelize = createSequelizeInstance();
  
  try {
    // Check if database exists
    const [results] = await sequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`
    );
    
    if (results.length === 0) {
      log(`Database '${DB_NAME}' does not exist. Creating it...`);
      await sequelize.query(`CREATE DATABASE "${DB_NAME}"`);
      log(`Database '${DB_NAME}' created successfully.`);
    } else {
      log(`Database '${DB_NAME}' exists.`);
    }
    
    await sequelize.close();
    return true;
  } catch (err) {
    error(`Failed to check or create database: ${err.message}`);
    await sequelize.close();
    return false;
  }
}

// Run migrations
async function runMigrations() {
  try {
    log('Running migrations...');
    execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
    log('Migrations completed successfully!');
    return true;
  } catch (err) {
    error(`Failed to run migrations: ${err.message}`);
    return false;
  }
}

// Create completion marker
function createCompletionMarker() {
  const markerPath = path.join(__dirname, '..', '.migration-complete');
  fs.writeFileSync(markerPath, new Date().toISOString());
  log(`Created migration completion marker at ${markerPath}`);
}

// Main function
async function main() {
  try {
    // Wait for PostgreSQL to be ready
    const isPostgresReady = await waitForPostgres();
    if (!isPostgresReady) return;
    
    // Check if database exists
    const dbExists = await checkDatabaseExists();
    if (!dbExists) return;
    
    // Run migrations
    const success = await runMigrations();
    if (!success) return;
    
    // Create completion marker
    createCompletionMarker();
    
    log('Migration process completed successfully!');
    process.exit(0);
  } catch (err) {
    error(`Migration process failed: ${err.message}`);
    process.exit(1);
  }
}

// Run the main function
main();