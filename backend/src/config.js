// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  LOADSURE_API_KEY: process.env.LOADSURE_API_KEY || 'MiphvjLVlwfZHrfhGklLgHzvjxiTbzIunOCrIAizpjVFiiRSufowtNhGGCLAiSmN',
  LOADSURE_BASE_URL: process.env.LOADSURE_BASE_URL || 'https://portal.loadsure.net/api/',
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost',
  QUEUE_QUOTE_REQUESTED: 'quote-requested',
  QUEUE_QUOTE_RECEIVED: 'quote-received',
  QUEUE_BOOKING_REQUESTED: 'booking-requested',
  QUEUE_BOOKING_CONFIRMED: 'booking-confirmed',

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