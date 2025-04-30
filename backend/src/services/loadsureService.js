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

/**
 * Main service for handling Loadsure integration through message queues
 * with improved concurrency handling
 */
async function startService() {
  try {
    console.log(`Loadsure Service [${WORKER_ID}]: Starting with concurrency ${WORKER_CONCURRENCY}`);
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
    
    // Process quote requests
    const quoteConsumer = await channel.consume(config.QUEUE_QUOTE_REQUESTED, async (msg) => {
      if (msg !== null) {
        activeJobs++;
        const startTime = Date.now();
        
        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`Processing quote request: ${data.requestId}`);
          
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
          quote.requestId = data.requestId;
          
          // Save quote to database BEFORE acknowledging the message
          await DatabaseService.saveQuote(quote, freightDetails);
          
          // Publish quote received event
          await channel.sendToQueue(
            config.QUEUE_QUOTE_RECEIVED,
            Buffer.from(JSON.stringify(quote)),
            { persistent: true }
          );
          
          const processingTime = Date.now() - startTime;
          console.log(`Quote received event published for request: ${data.requestId} (took ${processingTime}ms)`);
          
          // Only acknowledge the message AFTER saving to database and publishing event
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing quote request:', error);
          // If this is a temporary error, negative acknowledge with requeue
          // If it's a permanent error (like validation), we could decide not to requeue
          const isTemporaryError = error.message.includes('ECONNREFUSED') || 
                                  error.message.includes('timeout') ||
                                  error.message.includes('500');
          
          channel.nack(msg, false, isTemporaryError);
          
          // If it's a permanent error, we could send a failure event back to the API
          if (!isTemporaryError) {
            try {
              const messageData = JSON.parse(msg.content.toString());
              const errorResponse = {
                requestId: messageData.requestId,
                error: error.message,
                status: 'failed'
              };
              
              channel.sendToQueue(
                config.QUEUE_QUOTE_RECEIVED,
                Buffer.from(JSON.stringify(errorResponse)),
                { persistent: true }
              );
            } catch (parseError) {
              console.error('Error parsing message content:', parseError);
            }
          }
        } finally {
          activeJobs--;
          const processingTime = Date.now() - startTime;
          console.log(`Quote request processed in ${processingTime}ms, active jobs: ${activeJobs}`);
        }
      }
    }, { noAck: false });
    
    // Process booking requests
    const bookingConsumer = await channel.consume(config.QUEUE_BOOKING_REQUESTED, async (msg) => {
      if (msg !== null) {
        activeJobs++;
        const startTime = Date.now();
        
        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`Processing booking request: ${data.requestId}, Quote ID: ${data.quoteId}`);
          
          // Book insurance with Loadsure API
          const booking = await loadsureApi.bookInsurance(data.quoteId);
          
          // Add request ID to the booking
          booking.requestId = data.requestId;
          
          // Save booking to database BEFORE acknowledging the message
          await DatabaseService.saveBooking(booking, data);
          
          // Publish booking confirmed event
          await channel.sendToQueue(
            config.QUEUE_BOOKING_CONFIRMED,
            Buffer.from(JSON.stringify(booking)),
            { persistent: true }
          );
          
          const processingTime = Date.now() - startTime;
          console.log(`Booking confirmed event published for request: ${data.requestId} (took ${processingTime}ms)`);
          
          // Only acknowledge the message AFTER saving to database and publishing event
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing booking request:', error);
          // If this is a temporary error, negative acknowledge with requeue
          // If it's a permanent error (like validation), we could decide not to requeue
          const isTemporaryError = error.message.includes('ECONNREFUSED') || 
                                  error.message.includes('timeout') ||
                                  error.message.includes('500');
          
          channel.nack(msg, false, isTemporaryError);
          
          // If it's a permanent error, we could send a failure event back to the API
          if (!isTemporaryError) {
            try {
              const messageData = JSON.parse(msg.content.toString());
              const errorResponse = {
                requestId: messageData.requestId,
                error: error.message,
                status: 'failed'
              };
              
              channel.sendToQueue(
                config.QUEUE_BOOKING_CONFIRMED,
                Buffer.from(JSON.stringify(errorResponse)),
                { persistent: true }
              );
            } catch (parseError) {
              console.error('Error parsing message content:', parseError);
            }
          }
        } finally {
          activeJobs--;
          const processingTime = Date.now() - startTime;
          console.log(`Booking request processed in ${processingTime}ms, active jobs: ${activeJobs}`);
        }
      }
    }, { noAck: false });
    
    // Store consumer tags for graceful shutdown
    activeConsumers.quotes = quoteConsumer;
    activeConsumers.bookings = bookingConsumer;
    
    // Start scheduled tasks
    startScheduledTasks();
    
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