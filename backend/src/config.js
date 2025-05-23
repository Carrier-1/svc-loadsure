// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
import 'dotenv/config';

// Check for required environment variables
const requiredEnvVars = ['LOADSURE_API_KEY', 'DB_USERNAME', 'DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env file or environment configuration.');
}

export default {
  PORT: process.env.PORT || 3000,
  LOADSURE_API_KEY: process.env.LOADSURE_API_KEY,
  LOADSURE_BASE_URL: process.env.LOADSURE_BASE_URL || 'https://portal.loadsure.net',
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RABBITMQ_URL: process.env.RABBITMQ_URL,
  QUEUE_QUOTE_REQUESTED: 'quote-requested',
  QUEUE_QUOTE_RECEIVED: 'quote-received',
  QUEUE_BOOKING_REQUESTED: 'booking-requested',
  QUEUE_BOOKING_CONFIRMED: 'booking-confirmed',
  QUEUE_CERTIFICATE_CANCELLATION_REQUESTED: 'certificate-cancellation-requested',
  QUEUE_CERTIFICATE_CANCELLATION_CONFIRMED: 'certificate-cancellation-confirmed',

  // Database configuration
  DB_DIALECT: process.env.DB_DIALECT || 'postgres',
  DB_HOST: process.env.DB_HOST || 'postgres',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || 'loadsure',
  DB_SSL: process.env.DB_SSL === 'true',
  DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',

  // Redis configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',

  // Loadsure API specific configurations
  LOADSURE_API_VERSION: 'v2', // API version
  LOADSURE_COMMODITY_MAPPINGS: {
    // Map freight classes to commodity IDs
    // Based on the Loadsure API documentation
    '50': 16,  // Medical Equipment / Medical Supplies
    '55': 8,   // Building materials
    '60': 12,  // Car Accessories
    '65': 12,  // Car Parts
    '70': 2,   // Food Items
    '77.5': 22, // Tires
    '85': 15,  // Machinery
    '92.5': 7,  // Computers
    '100': 7,   // Electronics
    '110': 7,   // Electronics
    '125': 7,   // Electronics
    '150': 19,  // Metal products
    '175': 10,  // Clothing
    '200': 19,  // Metal
    '250': 14,  // Furniture
    '300': 14,  // Furniture
    '400': 1,   // Misc
    '500': 10   // Clothing
  },
  
  // Documentation URLs for reference
  LOADSURE_API_DOCS: 'https://developer.loadsure.com/docs',
  LOADSURE_SUPPORT_EMAIL: 'support@loadsure.net'
};