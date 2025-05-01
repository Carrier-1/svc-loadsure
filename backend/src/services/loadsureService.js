// backend/src/services/loadsureService.js
import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import LoadsureApiService from './loadsureApiService.js';
import DatabaseService from './databaseService.js';

// Set default concurrency level from environment or config
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3', 10);
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;

// Track active consumers for graceful shutdown
const activeConsumers = {
  quotes: null,
  bookings: null
};

// Initialize Redis client for deduplication
let redisClient;
const memoryCache = {};

async function initializeRedis() {
  try {
    const Redis = await import('ioredis');
    redisClient = new Redis.default(process.env.REDIS_URL || 'redis://redis:6379', {
      keyPrefix: 'loadsure:',
      maxRetriesPerRequest: 3,
      connectTimeout: 5000
    });
    console.log('Redis client initialized for deduplication');
    
    // Test connection
    await redisClient.ping();
    
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing Redis client:', error);
    // Fallback to in-memory deduplication if Redis is not available
    console.log('Using in-memory deduplication fallback');
    redisClient = {
      get: async (key) => memoryCache[key],
      set: async (key, value, expMode, expValue) => {
        memoryCache[key] = value;
        if (expValue) {
          setTimeout(() => delete memoryCache[key], expValue * 1000);
        }
        return 'OK';
      },
      del: async (key) => {
        const result = key in memoryCache;
        delete memoryCache[key];
        return result ? 1 : 0;
      },
      ping: async () => 'PONG'
    };
    return false;
  }
}

/**
 * Main service for handling Loadsure integration through message queues
 * with improved concurrency handling and deduplication
 */
async function startService() {
  try {
    console.log(`Loadsure Service [${WORKER_ID}]: Starting with concurrency ${WORKER_CONCURRENCY}`);
    
    // Initialize Redis for deduplication
    await initializeRedis();
    
    console.log('Loadsure Service: Connecting to RabbitMQ...');
    const connection = await amqp.connect(config.RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Set prefetch based on concurrency - this controls how many messages
    // can be processed concurrently by this service instance
    channel.prefetch(WORKER_CONCURRENCY);
    
    // Ensure queues exist
    await channel.assertQueue(config.QUEUE_QUOTE_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_QUOTE_RECEIVED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_CONFIRMED, { durable: true });
    
    console.log(`Loadsure Service [${WORKER_ID}]: RabbitMQ connection established`);
    
    // Initialize database
    await DatabaseService.initialize();
    
    // Initialize Loadsure API service
    const loadsureApi = new LoadsureApiService(
      config.LOADSURE_API_KEY,
      config.LOADSURE_BASE_URL
    );

    // Track active jobs for more accurate concurrency control
    let activeJobs = 0;
    
    // Set up consumer functions
    await setupConsumers(channel, loadsureApi, activeJobs);
    
    // Handle connection close
    connection.on('close', (err) => {
      console.error(`Loadsure Service [${WORKER_ID}]: RabbitMQ connection closed`, err);
      console.log('Attempting to reconnect in 5 seconds...');
      
      // Clear active consumers
      activeConsumers.quotes = null;
      activeConsumers.bookings = null;
      
      setTimeout(startService, 5000);
    });
    
    console.log(`Loadsure Service [${WORKER_ID}] started with concurrency ${WORKER_CONCURRENCY}`);

    // Return connection and channel for shutdown handling
    return { connection, channel };
  } catch (error) {
    console.error('Loadsure Service: Error connecting to RabbitMQ:', error);
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(startService, 5000);
    return null;
  }
}

/**
 * Set up message consumers with improved error handling and deduplication
 */
async function setupConsumers(channel, loadsureApi, activeJobs) {
  // Process quote requests with deduplication
  const quoteConsumer = await channel.consume(config.QUEUE_QUOTE_REQUESTED, async (msg) => {
    if (msg !== null) {
      activeJobs++;
      const startTime = Date.now();
      let requestId = 'unknown';
      let processingKey = null;
      
      try {
        const data = JSON.parse(msg.content.toString());
        requestId = data.requestId;
        console.log(`Processing quote request: ${requestId}`);
        
        // Check for duplicate processing using Redis
        processingKey = `processing:quote:${requestId}`;
        const isDuplicate = await redisClient.get(processingKey);
        
        if (isDuplicate) {
          console.log(`Duplicate quote request detected: ${requestId} - Skipping`);
          channel.ack(msg); // Acknowledge to remove from queue
          activeJobs--;
          return;
        }
        
        // Mark as being processed (with 30s expiry to auto-clear stuck requests)
        await redisClient.set(processingKey, '1', 'EX', 30);
        
        let quote;
        const freightDetails = data.payload.freightDetails;
        
        // Check what type of request we're dealing with
        if (freightDetails.isPrimitives) {
          // Using primitives approach
          quote = await loadsureApi.getQuoteFromPrimitives(freightDetails);
        } else if (freightDetails.shipment) {
          // Using full API v2 structure (already in the correct format)
          quote = await loadsureApi.getQuote(freightDetails);
        } else {
          // Using legacy object structure
          quote = await loadsureApi.getQuote(freightDetails);
        }
        
        // Add request ID to the quote
        quote.requestId = requestId;
        
        // Save quote to database BEFORE acknowledging the message
        await DatabaseService.saveQuote(quote, freightDetails);
        
        // Publish quote received event
        await channel.sendToQueue(
          config.QUEUE_QUOTE_RECEIVED,
          Buffer.from(JSON.stringify(quote)),
          { persistent: true }
        );
        
        // Clear processing flag once successful
        await redisClient.del(processingKey);
        
        const processingTime = Date.now() - startTime;
        console.log(`Quote received event published for request: ${requestId} (took ${processingTime}ms)`);
        
        // Only acknowledge the message AFTER saving to database and publishing event
        channel.ack(msg);
      } catch (error) {
        console.error(`Error processing quote request ${requestId}:`, error);
        
        try {
          // Try to clear processing flag if we had one
          if (processingKey) {
            await redisClient.del(processingKey);
          }
          
          // If this is a temporary error, negative acknowledge with requeue
          // If it's a permanent error (like validation), we could decide not to requeue
          const isTemporaryError = error.message.includes('ECONNREFUSED') || 
                                  error.message.includes('timeout') ||
                                  error.message.includes('500');
          
          // If we have a request ID and it's not a temporary error, send an error response
          if (requestId !== 'unknown' && !isTemporaryError) {
            const errorResponse = {
              requestId: requestId,
              error: error.message,
              status: 'failed'
            };
            
            // Send error response back to the API
            channel.sendToQueue(
              config.QUEUE_QUOTE_RECEIVED,
              Buffer.from(JSON.stringify(errorResponse)),
              { persistent: true }
            );
            
            console.log(`Sent error response for request: ${requestId}`);
          }
          
          channel.nack(msg, false, isTemporaryError);
        } catch (innerError) {
          console.error('Error during error handling:', innerError);
          channel.nack(msg, false, false); // Don't requeue on error handling failure
        }
      } finally {
        activeJobs--;
        const processingTime = Date.now() - startTime;
        console.log(`Quote request ${requestId} processed in ${processingTime}ms, active jobs: ${activeJobs}`);
      }
    }
  }, { noAck: false });
  
  // Process booking requests with deduplication
  const bookingConsumer = await channel.consume(config.QUEUE_BOOKING_REQUESTED, async (msg) => {
    if (msg !== null) {
      activeJobs++;
      const startTime = Date.now();
      let requestId = 'unknown';
      let processingKey = null;
      
      try {
        const data = JSON.parse(msg.content.toString());
        requestId = data.requestId;
        const quoteId = data.quoteId;
        
        console.log(`Processing booking request: ${requestId}, Quote ID: ${quoteId}`);
        
        // Check for duplicate processing
        processingKey = `processing:booking:${requestId}`;
        const isDuplicate = await redisClient.get(processingKey);
        
        if (isDuplicate) {
          console.log(`Duplicate booking request detected: ${requestId} - Skipping`);
          channel.ack(msg); // Acknowledge to remove from queue
          activeJobs--;
          return;
        }
        
        // Mark as being processed
        await redisClient.set(processingKey, '1', 'EX', 30);
        
        // Book insurance with Loadsure API
        const booking = await loadsureApi.bookInsurance(quoteId);
        
        // Add request ID to the booking
        booking.requestId = requestId;
        
        // Save booking to database BEFORE acknowledging the message
        await DatabaseService.saveBooking(booking, data);
        
        // Publish booking confirmed event
        await channel.sendToQueue(
          config.QUEUE_BOOKING_CONFIRMED,
          Buffer.from(JSON.stringify(booking)),
          { persistent: true }
        );
        
        // Clear processing flag once successful
        await redisClient.del(processingKey);
        
        const processingTime = Date.now() - startTime;
        console.log(`Booking confirmed event published for request: ${requestId} (took ${processingTime}ms)`);
        
        // Only acknowledge the message AFTER saving to database and publishing event
        channel.ack(msg);
      } catch (error) {
        console.error(`Error processing booking request ${requestId}:`, error);
        
        try {
          // Try to clear processing flag if we had one
          if (processingKey) {
            await redisClient.del(processingKey);
          }
          
          // If this is a temporary error, negative acknowledge with requeue
          const isTemporaryError = error.message.includes('ECONNREFUSED') || 
                                  error.message.includes('timeout') ||
                                  error.message.includes('500');
          
          // If we have a request ID and it's not a temporary error, send an error response
          if (requestId !== 'unknown' && !isTemporaryError) {
            const errorResponse = {
              requestId: requestId,
              error: error.message,
              status: 'failed'
            };
            
            // Send error response back to the API
            channel.sendToQueue(
              config.QUEUE_BOOKING_CONFIRMED,
              Buffer.from(JSON.stringify(errorResponse)),
              { persistent: true }
            );
            
            console.log(`Sent error response for booking request: ${requestId}`);
          }
          
          channel.nack(msg, false, isTemporaryError);
        } catch (innerError) {
          console.error('Error during error handling:', innerError);
          channel.nack(msg, false, false); // Don't requeue on error handling failure
        }
      } finally {
        activeJobs--;
        const processingTime = Date.now() - startTime;
        console.log(`Booking request ${requestId} processed in ${processingTime}ms, active jobs: ${activeJobs}`);
      }
    }
  }, { noAck: false });
  
  // Store consumer tags for graceful shutdown
  activeConsumers.quotes = quoteConsumer;
  activeConsumers.bookings = bookingConsumer;
  
  // Start scheduled tasks
  startScheduledTasks();
  
  console.log('RabbitMQ consumers set up');
}

/**
 * Start scheduled tasks
 */
function startScheduledTasks() {
  // Update expired quotes every hour
  setInterval(async () => {
    try {
      const count = await DatabaseService.updateExpiredQuotes();
      if (count > 0) {
        console.log(`Updated ${count} expired quotes`);
      }
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  }, 60 * 60 * 1000); // Every hour
}

/**
 * Gracefully shut down the service
 * @param {Object} services - Services to shut down
 */
async function shutdown(services) {
  console.log(`Loadsure Service [${WORKER_ID}]: Shutting down gracefully...`);
  
  // Cancel consumers if active
  if (services && services.channel) {
    if (activeConsumers.quotes) {
      await services.channel.cancel(activeConsumers.quotes.consumerTag);
    }
    if (activeConsumers.bookings) {
      await services.channel.cancel(activeConsumers.bookings.consumerTag);
    }
  }
  
  // Wait for any active jobs to finish (with timeout)
  const maxWaitTimeMs = 10000; // 10 seconds
  const startTime = Date.now();
  
  // TODO: Wait for active jobs to complete
  
  // Close connection
  if (services && services.connection) {
    await services.connection.close();
  }
  
  // Close Redis connection if it's a real client
  if (redisClient && typeof redisClient.quit === 'function') {
    await redisClient.quit();
  }
  
  console.log(`Loadsure Service [${WORKER_ID}]: Shutdown complete`);
}

// Start the service and handle lifecycle
let services = null;

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  if (services) {
    await shutdown(services);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  if (services) {
    await shutdown(services);
  }
  process.exit(0);
});

// Start the service if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startService()
    .then(result => {
      services = result;
    })
    .catch(error => {
      console.error('Error starting service:', error);
      process.exit(1);
    });
}

export { startService, shutdown };