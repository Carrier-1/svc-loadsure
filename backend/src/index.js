// backend/src/index.js
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import * as amqp from 'amqplib';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import config from './config.js';
import createRateLimiter from './middleware/rateLimiter.js';

// Import services
import supportDataService from './services/supportDataService.js';
import supportDataRefreshService from './services/supportDataRefreshService.js';
import QueueMonitorService from './services/queueMonitorService.js';

// Import controllers
import supportDataController from './controllers/supportDataController.js';
import * as insuranceController from './controllers/insuranceController.js';

// Import Swagger setup
import { setupSwagger } from './swagger.js';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create and apply rate limiter middleware
const rateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per window
});

// Apply rate limiting to all routes
app.use(rateLimiter);

// Add request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Add basic logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [${req.id}]`);
  });
  next();
});

// Create Redis client with configuration
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  keyPrefix: 'api:',
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  }
});
console.log(`Creating Redis connection to ${process.env.REDIS_URL || 'redis://redis:6379'}`);

// Create event emitter for response handling
const receiveEmitter = new EventEmitter();
receiveEmitter.setMaxListeners(1000); // Increase max listeners to handle concurrent requests

// Log Redis connection status
redis.on('connect', () => {
  console.log(`API Service [${process.env.HOSTNAME || 'unknown'}]: Connected to Redis`);
});

redis.on('error', (err) => {
  console.error(`API Service [${process.env.HOSTNAME || 'unknown'}]: Redis connection error:`, err);
});

// In-memory storage (replace with a database in production)
// We'll keep quotes and bookings in memory since they don't need to be shared
const quotes = new Map();
const bookings = new Map();

// Connect to RabbitMQ
let channel;

async function setupRabbitMQ() {
  try {
    console.log('Connecting to RabbitMQ...');
    const connection = await amqp.connect(config.RABBITMQ_URL);
    
    // Create a channel
    channel = await connection.createChannel();
    
    // Ensure queues exist
    console.log("Asserting queues");
    await channel.assertQueue(config.QUEUE_QUOTE_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_QUOTE_RECEIVED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_CONFIRMED, { durable: true });
    
    console.log('RabbitMQ connection established');
    
    // Start consuming messages
    console.log("Setting up consumers");
    await setupConsumers();
    console.log("Consumers set up successfully");
    
    // Handle connection close
    connection.on('close', (err) => {
      console.error('RabbitMQ connection closed', err);
      console.log('Attempting to reconnect in 5 seconds...');
      
      // Additional logging about pending requests
      redis.keys('pending:*').then(keys => {
        console.log(`Pending requests at connection close: ${keys.length}`);
        console.log(`Pending request IDs: ${keys.map(k => k.replace('pending:', '')).join(', ')}`);
      }).catch(console.error);
      
      setTimeout(setupRabbitMQ, 5000);
    });
    
    return channel;
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(setupRabbitMQ, 5000);
  }
}

// --- RabbitMQ Consumers ---

async function setupConsumers() {
  // In the consumer that processes messages from QUEUE_QUOTE_RECEIVED
  await channel.consume(config.QUEUE_QUOTE_RECEIVED, async (msg) => {
    console.log("Received message in quote-received queue");
    if (msg !== null) {
      try {
        console.log(`Message content: ${msg.content.toString().substring(0, 100)}...`);
        const data = JSON.parse(msg.content.toString());
        const { requestId } = data;
        
        console.log(`Looking for request ID: ${requestId}`);
        
        // Check if this is a pending request
        const pendingExists = await redis.exists(`pending:${requestId}`);
        console.log(`Checking for request ID: ${requestId} in Redis, exists: ${pendingExists}`);
        
        // Check if response indicates an error
        if (data.error) {
          console.error(`Error in quote response for request ${requestId}:`, data.error);
          
          if (pendingExists) {
            // Store the error response in Redis
            await redis.set(`response:${requestId}`, JSON.stringify({ 
              error: data.error,
              timestamp: Date.now()
            }), 'EX', 300); // Keep response for 5 minutes
            
            console.log(`Stored error response in Redis for request ${requestId}`);
          } else {
            console.warn(`No pending request found for error response: ${requestId}`);
          }
          
          channel.ack(msg);
          return;
        }
        
        console.log(`Quote received for request ${requestId}, quote ID: ${data.quoteId}`);
        
        // Store quote for potential future booking
        quotes.set(data.quoteId, data);
        
        // Store the response in Redis instead of using event emitter
        if (pendingExists) {
          console.log(`Storing response in Redis for request ${requestId}`);
          
          // Store full response data
          await redis.set(`response:${requestId}`, JSON.stringify({
            data: data,
            timestamp: Date.now()
          }), 'EX', 300); // Keep response for 5 minutes
        } else {
          console.warn(`No pending request found for requestId: ${requestId}`);
        }
        
        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing quote received message:', error);
        console.error(`Message content: ${msg.content.toString()}`);
        // Negative acknowledge and requeue the message
        channel.nack(msg, false, true);
      }
    }
  });
  
  // Consumer for booking confirmed events
  await channel.consume(config.QUEUE_BOOKING_CONFIRMED, async (msg) => {
    console.log("Received message in booking-confirmed queue");
    if (msg !== null) {
      try {
        const data = JSON.parse(msg.content.toString());
        const { requestId } = data;
        
        // Check if response indicates an error
        if (data.error) {
          console.error(`Error in booking response for request ${requestId}:`, data.error);
          
          // Check if this is a pending request
          const pendingExists = await redis.exists(`pending:${requestId}`);
          if (pendingExists) {
            receiveEmitter.emit(requestId, { error: data.error });
          }
          
          channel.ack(msg);
          return;
        }
        
        console.log(`Booking confirmed for request ${requestId}, booking ID: ${data.bookingId}, quote ID: ${data.quoteId}, certificate URL: ${data.certificateUrl}`);
        
        // Store booking
        bookings.set(data.bookingId, data);
        
        // Check if this is a pending request
        const pendingExists = await redis.exists(`pending:${requestId}`);
        
        if (pendingExists) {
          console.log(`Found pending request for ${requestId}, emitting event`);
          receiveEmitter.emit(requestId, data);
        } else {
          console.warn(`No pending request found for requestId: ${requestId}`);
        }
        
        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing booking confirmed message:', error);
        // Negative acknowledge and requeue the message
        channel.nack(msg, false, true);
      }
    }
  });
  
  console.log('RabbitMQ consumers set up');
}

async function ensureDatabaseSetup() {
  try {
    // Import database modules
    const { testConnection } = await import('../database/index.js');
    
    // Test database connection
    await testConnection();
    
    console.log('Database connection verified successfully.');
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Please ensure the database is created properly as specified in the environment variables.');
    console.error('You may need to create the database manually:');
    console.error('  1. docker-compose exec postgres psql -U loadsure');
    console.error('  2. CREATE DATABASE loadsure_dev;');
    console.error('  3. \\q');
    console.error('  4. docker-compose restart api-service loadsure-service');
    
    // Continue starting the server, other functionality can still work
    console.log('Continuing server startup without database connection...');
  }
}

// Start the server and services
async function startServer() {
  try {
    console.log('Ensuring database setup...');
    // Ensure database setup
    await ensureDatabaseSetup();

    // Initialize support data service
    console.log('Initializing support data service...');
    await supportDataService.initialize();
    
    // Start support data refresh service
    supportDataRefreshService.start();
    
    // Connect to RabbitMQ
    await setupRabbitMQ();
    
    // Initialize controllers
    insuranceController.initialize({
      redis,
      receiveEmitter,
      quotes,
      bookings,
      channel
    });
    
    // Register controllers
    app.use('/api/support-data', supportDataController);
    app.use('/api/insurance', insuranceController.router);


    // Add a health check endpoint (not rate limited)
    app.get('/health', async (req, res) => {
      // Check Redis connection
      let redisStatus = 'disconnected';
      let redisDetails = {};
      try {
        const pingResult = await redis.ping();
        redisStatus = pingResult === 'PONG' ? 'connected' : 'error';
        
        // Get pending requests count
        const pendingKeys = await redis.keys('pending:*');
        redisDetails = {
          pendingRequests: pendingKeys.length,
          pendingRequestIds: pendingKeys.map(k => k.replace('pending:', '')).slice(0, 10) // Show max 10 keys
        };
      } catch (redisError) {
        redisStatus = 'error';
        redisDetails = { error: redisError.message };
      }
      
      // Check RabbitMQ status
      const rabbitmqStatus = channel ? 'connected' : 'disconnected';
      let rabbitmqDetails = {};
      if (channel) {
        try {
          // Check if queues exist (this will throw if connection is down)
          await channel.checkQueue(config.QUEUE_QUOTE_REQUESTED);
          rabbitmqDetails.healthCheck = 'passed';
        } catch (rmqError) {
          rabbitmqDetails.healthCheck = 'failed';
          rabbitmqDetails.error = rmqError.message;
        }
      }
      
      res.json({ 
        status: redisStatus === 'connected' && rabbitmqStatus === 'connected' ? 'ok' : 'degraded', 
        timestamp: new Date().toISOString(),
        instanceId: process.env.HOSTNAME || 'unknown',
        version: process.env.npm_package_version || 'dev',
        redis: {
          status: redisStatus,
          ...redisDetails
        },
        rabbitmq: {
          status: rabbitmqStatus,
          ...rabbitmqDetails
        }
      });
    });
    
    // Setup Swagger documentation
    setupSwagger(app);
    
    // Start the API server
    app.listen(config.PORT, () => {
      console.log(`Loadsure Insurance Microservice API running on port ${config.PORT}`);
      console.log(`Instance ID: ${process.env.HOSTNAME || 'unknown'}`);
      console.log(`Swagger documentation available at http://localhost:${config.PORT}/api-docs`);
    });
        
    // Start queue monitor service if enabled in environment
    if (process.env.ENABLE_QUEUE_MONITOR === 'true') {
      console.log('Starting queue monitor service...');
      const queueMonitor = new QueueMonitorService({
        rabbitMqUrl: config.RABBITMQ_URL,
        queues: [
          config.QUEUE_QUOTE_REQUESTED,
          config.QUEUE_BOOKING_REQUESTED
        ],
        minWorkers: parseInt(process.env.MIN_WORKERS || '1', 10),
        maxWorkers: parseInt(process.env.MAX_WORKERS || '5', 10)
      });
      
      await queueMonitor.start();
    }
  } catch (error) {
    console.error('Failed to start services:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// --- Error handling ---

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for testing
export { app, redis, receiveEmitter };