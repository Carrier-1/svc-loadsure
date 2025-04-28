// ESM-compatible migration runner
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Use glob pattern to match all JS files in migrations directory
    glob: path.join(__dirname, '../database/migrations/*.js'),
    // Resolver function to handle ESM imports
    resolve: ({ name, path, context }) => {
      // Use dynamic import for ES modules
      return import(path).then(module => {
        const migration = module.default;
        return {
          name,
          up: async () => migration.up(context.queryInterface, context.sequelize),
          down: async () => migration.down(context.queryInterface, context.sequelize)
        };
      });
    }
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

// Run migrations
async function runMigrations() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Run pending migrations
    const migrations = await umzug.up();
    console.log('Migrations executed:', migrations.map(m => m.name).join(', '));
    
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