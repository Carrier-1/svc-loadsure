// backend/scripts/check-migrations.cjs
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Log function
const log = (message) => {
  console.log(`[MIGRATION-CHECK] ${message}`);
};

// Run a command and return its output
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

// Check if SequelizeMeta table exists
async function checkSequelizeMetaExists() {
  // Database configuration
  const DB_HOST = process.env.DB_HOST || 'postgres';
  const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
  const DB_USERNAME = process.env.DB_USERNAME || 'loadsure';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'loadsurepass';
  const DB_NAME = process.env.DB_NAME || 'loadsure';

  // Create Sequelize instance
  const sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    log('Database connection established');
    
    // Query information schema to check if SequelizeMeta exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SequelizeMeta'
      )
    `);
    
    const metaTableExists = results[0].exists;
    log(`SequelizeMeta table exists: ${metaTableExists}`);
    await sequelize.close();
    
    return {
      connected: true,
      metaTableExists: metaTableExists
    };
  } catch (error) {
    log(`Database check error: ${error.message}`);
    try {
      await sequelize.close();
    } catch (e) {
      // Ignore
    }
    return {
      connected: false,
      metaTableExists: false
    };
  }
}

// Main function
async function main() {
  try {
    // Check if we can connect and if SequelizeMeta exists
    let { connected, metaTableExists } = await checkSequelizeMetaExists();
    
    // Try multiple times if database is not ready yet
    let attempts = 1;
    const maxAttempts = 5;
    
    while (!connected && attempts <= maxAttempts) {
      log(`Database not ready. Attempt ${attempts}/${maxAttempts}. Waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      const result = await checkSequelizeMetaExists();
      connected = result.connected;
      metaTableExists = result.metaTableExists;
      attempts++;
    }
    
    if (!connected) {
      log('Cannot connect to database after multiple attempts. Will run migrations anyway.');
      await runCommand('node', ['scripts/run-migrations.js']);
    } else if (!metaTableExists) {
      log('SequelizeMeta table not found. Running initial migrations...');
      await runCommand('node', ['scripts/run-migrations.js']);
    } else {
      log('SequelizeMeta table found. Checking for pending migrations...');
      
      // Use db:migrate which only applies pending migrations
      await runCommand('npx', ['sequelize-cli', 'db:migrate']);
      log('Any pending migrations have been applied');
    }
    
    // Create completion marker
    fs.writeFileSync(
      path.join(__dirname, '..', '.migration-complete'), 
      new Date().toISOString()
    );
    
    log('Migration process completed successfully');
    process.exit(0);
  } catch (error) {
    log(`Migration process failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();