// backend/src/services/loadsureService.js
import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
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

// Initialize Redis client for distributed request tracking
const redis = new Redis(config.REDIS_URL || 'redis://redis:6379', {
  keyPrefix: 'loadsure:',
  maxRetriesPerRequest: 3,
  connectTimeout: 5000
});

// Track active jobs for more accurate concurrency control
let activeJobs = 0;

// Log Redis connection status
redis.on('connect', () => {
  console.log(`Loadsure Service [${WORKER_ID}]: Connected to Redis`);
});

redis.on('error', (err) => {
  console.error(`Loadsure Service [${WORKER_ID}]: Redis connection error:`, err);
});

/**
 * Main service for handling Loadsure integration through message queues
 * with improved concurrency handling and distributed request tracking
 */
async function startService() {
  try {
    console.log(`Loadsure Service [${WORKER_ID}]: Starting with concurrency ${WORKER_CONCURRENCY}`);
    
    // Test Redis connection
    try {
      const pingResult = await redis.ping();
      console.log(`Loadsure Service [${WORKER_ID}]: Redis ping result: ${pingResult}`);
    } catch (redisError) {
      console.error(`Loadsure Service [${WORKER_ID}]: Redis connection failed:`, redisError);
      // Continue anyway - the service can still function without Redis
      // but will not be able to coordinate with other instances
    }
    
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
    await channel.assertQueue(config.QUEUE_CERTIFICATE_CANCELLATION_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_CERTIFICATE_CANCELLATION_CONFIRMED, { durable: true });
    
    console.log(`Loadsure Service [${WORKER_ID}]: RabbitMQ connection established`);
    
    // Initialize database
    await DatabaseService.initialize();
    
    // Initialize Loadsure API service
    const loadsureApi = new LoadsureApiService(
      config.LOADSURE_API_KEY,
      config.LOADSURE_BASE_URL
    );

    // Set up consumer functions
    await setupConsumers(channel, loadsureApi);
    
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
 * Set up message consumers with Redis-based distributed request tracking
 */
async function setupConsumers(channel, loadsureApi) {
  // Process quote requests
  const quoteConsumer = await channel.consume(config.QUEUE_QUOTE_REQUESTED, async (msg) => {
    if (msg !== null) {
      activeJobs++;
      const startTime = Date.now();
      let requestId = 'unknown';
      
      try {
        const data = JSON.parse(msg.content.toString());
        requestId = data.requestId;
        console.log(`Processing quote request: ${requestId}`);
        
        // Check if this request is already being processed by another instance
        // Use Redis to coordinate between instances
        const processingKey = `pending:${requestId}`;
        const isBeingProcessed = await redis.exists(processingKey);
        
        if (isBeingProcessed) {
          console.log(`Request ${requestId} is already being processed by another instance - skipping`);
          // Acknowledge the message to remove from queue
          channel.ack(msg);
          activeJobs--;
          return;
        }
        
        // Mark this request as being processed, with a 60s expiry to automatically clean up
        // in case this service instance crashes
        const instanceInfo = JSON.stringify({
          instanceId: WORKER_ID,
          timestamp: Date.now()
        });
        await redis.set(processingKey, instanceInfo, 'EX', 60);
        
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
        
        const processingTime = Date.now() - startTime;
        console.log(`Quote received event published for request: ${requestId} (took ${processingTime}ms)`);
        
        // Only acknowledge the message AFTER saving to database and publishing event
        channel.ack(msg);
        
        // Clean up the Redis key
        await redis.del(processingKey);
      } catch (error) {
        console.error(`Error processing quote request ${requestId}:`, error);
        
        try {
          // Remove the pending request from Redis
          await redis.del(`pending:${requestId}`);
          
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
  
  // Process booking requests with Redis-based distributed request tracking
  const bookingConsumer = await channel.consume(config.QUEUE_BOOKING_REQUESTED, async (msg) => {
    if (msg !== null) {
      activeJobs++;
      const startTime = Date.now();
      let requestId = 'unknown';
      
      try {
        const data = JSON.parse(msg.content.toString());
        requestId = data.requestId;
        const quoteId = data.quoteId;
        
        console.log(`Processing booking request: ${requestId}, Quote ID: ${quoteId}`);
        
        // Check if this request is already being processed by another instance
        const processingKey = `pending:${requestId}`;
        const isBeingProcessed = await redis.exists(processingKey);
        
        if (isBeingProcessed) {
          console.log(`Booking request ${requestId} is already being processed by another instance - skipping`);
          // Acknowledge the message to remove from queue
          channel.ack(msg);
          activeJobs--;
          return;
        }
        
        // Mark this request as being processed
        const instanceInfo = JSON.stringify({
          instanceId: WORKER_ID,
          timestamp: Date.now()
        });
        await redis.set(processingKey, instanceInfo, 'EX', 60);
        
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
        
        const processingTime = Date.now() - startTime;
        console.log(`Booking confirmed event published for request: ${requestId} (took ${processingTime}ms)`);
        
        // Only acknowledge the message AFTER saving to database and publishing event
        channel.ack(msg);
        
        // Clean up the Redis key
        await redis.del(processingKey);
      } catch (error) {
        console.error(`Error processing booking request ${requestId}:`, error);
        
        try {
          // Remove the pending request from Redis
          await redis.del(`pending:${requestId}`);
          
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

  // Process certificate cancellation requests with Redis-based distributed request tracking
  const cancellationConsumer = await channel.consume(config.QUEUE_CERTIFICATE_CANCELLATION_REQUESTED, async (msg) => {
    if (msg !== null) {
      activeJobs++;
      const startTime = Date.now();
      let requestId = 'unknown';
      
      try {
        const data = JSON.parse(msg.content.toString());
        requestId = data.requestId;
        const certificateNumber = data.certificateNumber;
        const userId = data.userId;
        const reason = data.reason || 'Client Request';
        const additionalInfo = data.additionalInfo || '';
        const emailAssured = data.emailAssured || false;
        
        console.log(`Processing certificate cancellation request: ${requestId}, Certificate: ${certificateNumber}`);
        
        // Check if this request is already being processed by another instance
        const processingKey = `pending:${requestId}`;
        const isBeingProcessed = await redis.exists(processingKey);
        
        if (isBeingProcessed) {
          console.log(`Cancellation request ${requestId} is already being processed by another instance - skipping`);
          // Acknowledge the message to remove from queue
          channel.ack(msg);
          activeJobs--;
          return;
        }
        
        // Mark this request as being processed
        const instanceInfo = JSON.stringify({
          instanceId: WORKER_ID,
          timestamp: Date.now()
        });
        await redis.set(processingKey, instanceInfo, 'EX', 60);
        
        // Cancel certificate with Loadsure API
        const cancellationResult = await loadsureApi.cancelCertificate(
          certificateNumber, 
          userId, 
          reason,
          additionalInfo,
          emailAssured
        );
        
        // Add request ID to the result
        cancellationResult.requestId = requestId;
        
        // Check if the result contains an error (success: false property)
        if (cancellationResult.success === false) {
          console.error(`Certificate cancellation failed: ${cancellationResult.error}`);
          
          // Format error response
          const errorResponse = {
            requestId: requestId,
            certificateNumber: certificateNumber,
            error: cancellationResult.error,
            details: cancellationResult.details,
            status: 'failed'
          };
          
          // Send error response back to the API
          await channel.sendToQueue(
            config.QUEUE_CERTIFICATE_CANCELLATION_CONFIRMED,
            Buffer.from(JSON.stringify(errorResponse)),
            { persistent: true }
          );
          
          console.log(`Sent error response for cancellation request: ${requestId}`);
        } else {
          // Update certificate in database
          await DatabaseService.cancelCertificate(certificateNumber, cancellationResult);
          
          // Publish cancellation confirmed event
          await channel.sendToQueue(
            config.QUEUE_CERTIFICATE_CANCELLATION_CONFIRMED,
            Buffer.from(JSON.stringify(cancellationResult)),
            { persistent: true }
          );
        }
        
        const processingTime = Date.now() - startTime;
        console.log(`Certificate cancellation confirmed for request: ${requestId} (took ${processingTime}ms)`);
        
        // Only acknowledge the message AFTER saving to database and publishing event
        channel.ack(msg);
        
        // Clean up the Redis key
        await redis.del(processingKey);
      } catch (error) {
        console.error(`Error processing certificate cancellation request ${requestId}:`, error);
        
        try {
          // Remove the pending request from Redis
          await redis.del(`pending:${requestId}`);
          
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
              config.QUEUE_CERTIFICATE_CANCELLATION_CONFIRMED,
              Buffer.from(JSON.stringify(errorResponse)),
              { persistent: true }
            );
            
            console.log(`Sent error response for cancellation request: ${requestId}`);
          }
          
          channel.nack(msg, false, isTemporaryError);
        } catch (innerError) {
          console.error('Error during error handling:', innerError);
          channel.nack(msg, false, false); // Don't requeue on error handling failure
        }
      } finally {
        activeJobs--;
        const processingTime = Date.now() - startTime;
        console.log(`Certificate cancellation request ${requestId} processed in ${processingTime}ms, active jobs: ${activeJobs}`);
      }
    }
  }, { noAck: false });

  
  // Store consumer tags for graceful shutdown
  activeConsumers.quotes = quoteConsumer;
  activeConsumers.bookings = bookingConsumer;
  activeConsumers.cancellations = cancellationConsumer;
  
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
  
  // Clean up stale pending requests every 5 minutes
  setInterval(async () => {
    try {
      // Redis TTL will handle this automatically, no need for manual cleanup
      // This is just a placeholder for any additional periodic tasks
    } catch (error) {
      console.error('Error in scheduled pending request cleanup:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
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
  
  while (activeJobs > 0 && (Date.now() - startTime) < maxWaitTimeMs) {
    console.log(`Waiting for ${activeJobs} active jobs to complete...`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (activeJobs > 0) {
    console.log(`Warning: Shutting down with ${activeJobs} jobs still active`);
  }
  
  // Close connection
  if (services && services.connection) {
    await services.connection.close();
  }
  
  // Close Redis connection
  await redis.quit();
  
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