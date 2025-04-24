// File: src/config.js
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
  QUEUE_BOOKING_CONFIRMED: 'booking-confirmed'
};