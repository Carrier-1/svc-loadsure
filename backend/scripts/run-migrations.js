// ESM-compatible migration runner with correct path resolution
import { Sequelize } from 'sequelize';
import pkg from 'umzug';
const { Umzug, SequelizeStorage } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Database configuration
const DB_HOST = process.env.DB_HOST || 'postgres';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USERNAME || 'loadsure';
const DB_PASSWORD = process.env.DB_PASSWORD || 'loadsurepass';
const DB_NAME = process.env.DB_NAME || 'loadsure';
const DB_DIALECT = process.env.DB_DIALECT || 'postgres';

// Create Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: console.log
});

// Configure Umzug (migration runner)
const umzug = new Umzug({
  migrations: {
    // Use specific glob path for migrations
    glob: 'database/migrations/*.js',
    // Custom resolver for ESM
    resolve: ({ name, path, context }) => {
      // Log for debugging
      console.log(`Resolving migration: ${name}, path: ${path}`);
      console.log('Migration context:', {
        hasQueryInterface: !!context.queryInterface,
        hasSequelize: !!context.sequelize,
        sequelizeKeys: Object.keys(context.sequelize || {}),
        contextKeys: Object.keys(context)
      });
      // Define migration object with up/down functions
      return {
        name,
        up: async () => {
          try {
            // Use dynamic import with complete path
            const migrationPath = `file://${path}`;
            console.log(`Importing migration from: ${migrationPath}`);
            
            const migration = await import(migrationPath);
            
            // Check if migration exports have up/down functions
            if (!migration.default || typeof migration.default.up !== 'function') {
              console.error(`Migration ${path} does not have a valid default export with up function`);
              console.log('Migration exports:', Object.keys(migration));
              throw new Error(`Invalid migration format in ${path}`);
            }
            
            // Execute the migration
            return await migration.default.up(context.queryInterface, context.sequelize.Sequelize);
          } catch (error) {
            console.error(`Error executing migration ${path}:`, error);
            throw error;
          }
        },
        down: async () => {
          const migrationPath = `file://${path}`;
          const migration = await import(migrationPath);
          return await migration.default.down(context.queryInterface, context.sequelize.Sequelize);
        }
      };
    }
  },
  context: {
    queryInterface: sequelize.getQueryInterface(),
    sequelize: sequelize
  },
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

// Function to wait for database to be available
async function waitForDatabase(retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      return true;
    } catch (error) {
      console.log(`Database connection attempt ${i + 1}/${retries} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`Waiting ${delay / 1000} seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Run migrations
async function runMigrations() {
  try {
    // Wait for database to be available
    const connected = await waitForDatabase();
    if (!connected) {
      console.error('Failed to connect to database after maximum retries');
      process.exit(1);
    }
    
    // List pending migrations
    console.log('Checking for pending migrations...');
    const pendingMigrations = await umzug.pending();
    console.log(`Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(m => console.log(`- ${m.name}`));
    
    // Run pending migrations
    if (pendingMigrations.length > 0) {
      console.log('Running migrations...');
      const migrations = await umzug.up();
      console.log('Migrations executed:', migrations.map(m => m.name).join(', '));
    } else {
      console.log('No migrations were executed. Database schema is up to date.');
    }
    
    // Create a file to indicate migration completion for healthcheck
    const completionFilePath = path.join(projectRoot, '.migration-complete');
    fs.writeFileSync(completionFilePath, new Date().toISOString());
    console.log(`Created migration completion marker at ${completionFilePath}`);
    
    // Close database connection
    await sequelize.close();
    
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migration process
runMigrations();