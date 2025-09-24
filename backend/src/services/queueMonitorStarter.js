// backend/src/services/queueMonitorStarter.js
import QueueMonitorService from './queueMonitorService.js';
import config from '../config.js';

// Log environment variables for debugging (without exposing passwords)
console.log(`RABBITMQ_USER=${process.env.RABBITMQ_USER || 'not set'}`);
console.log(`RABBITMQ_PASSWORD=${process.env.RABBITMQ_PASSWORD ? '******' : 'not set'}`);
console.log(`RABBITMQ_URL=${process.env.RABBITMQ_URL ? process.env.RABBITMQ_URL.replace(/:[^:]*@/, ':***@') : 'not set'}`);

// Get credentials from secrets in k8s
const user = process.env.RABBITMQ_USER || 'guest';
const pass = process.env.RABBITMQ_PASSWORD || 'guest';

// Construct the URL with explicit credentials
const amqpUrl = `amqp://${user}:${pass}@rabbitmq:5672`;
console.log(`Connecting to RabbitMQ at: ${amqpUrl.replace(/:[^:]*@/, ':***@')}`); // Hide password in logs

// Read configuration from environment variables
const monitorOptions = {
  rabbitMqUrl: amqpUrl,
  queues: [
    config.QUEUE_QUOTE_REQUESTED, 
    config.QUEUE_BOOKING_REQUESTED
  ],
  minWorkers: parseInt(process.env.MIN_WORKERS || '1', 10),
  maxWorkers: parseInt(process.env.MAX_WORKERS || '5', 10),
  scaleUpThreshold: parseInt(process.env.SCALE_UP_THRESHOLD || '10', 10),
  scaleDownThreshold: parseInt(process.env.SCALE_DOWN_THRESHOLD || '2', 10),
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '10000', 10)
};

console.log('Starting Queue Monitor Service with options:', monitorOptions);

// Create and start the queue monitor service
const queueMonitor = new QueueMonitorService(monitorOptions);
queueMonitor.start().catch(console.error);

// Handle process termination signals
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down queue monitor...');
  await queueMonitor.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down queue monitor...');
  await queueMonitor.stop();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await queueMonitor.stop();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await queueMonitor.stop();
  process.exit(1);
});