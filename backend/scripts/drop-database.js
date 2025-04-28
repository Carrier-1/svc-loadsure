// backend/scripts/drop-database.js
// Script to drop the database (USE WITH CAUTION)

import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Database configuration
const config = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'loadsure',
  password: process.env.DB_PASSWORD || 'loadsurepass',
  database: 'postgres', // Connect to default database
};

const dbName = process.env.DB_NAME || 'loadsure_db';

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askForConfirmation() {
  return new Promise((resolve) => {
    rl.question(`Are you sure you want to drop the database "${dbName}"? This will PERMANENTLY DELETE all data. (yes/no) `, (answer) => {
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function dropDatabase() {
  // Ask for confirmation
  const confirmed = await askForConfirmation();
  if (!confirmed) {
    console.log('Database drop cancelled.');
    rl.close();
    return;
  }
  
  // Create a new client
  const client = new pg.Client(config);
  
  try {
    console.log(`Attempting to drop database: ${dbName}`);
    
    // Connect to the PostgreSQL server
    await client.connect();
    
    // Check if database exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (checkResult.rowCount > 0) {
      // Force disconnect all clients
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
      `, [dbName]);
      
      // Drop the database
      await client.query(`DROP DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" dropped successfully!`);
    } else {
      console.log(`Database "${dbName}" does not exist.`);
    }
    
    console.log('Database drop completed successfully!');
  } catch (error) {
    console.error('Error dropping database:', error);
    process.exit(1);
  } finally {
    // Close the client
    await client.end();
    rl.close();
  }
}

// Run the drop database function
dropDatabase().catch(console.error);