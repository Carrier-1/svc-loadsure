// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const LoadsureApiService = require('./loadsureApiService');

/**
 * Main service for handling Loadsure integration through message queues
 */
async function startService() {
  try {
    console.log('Loadsure Service: Connecting to RabbitMQ...');
    const connection = await amqp.connect(config.RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    // Ensure queues exist
    await channel.assertQueue(config.QUEUE_QUOTE_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_QUOTE_RECEIVED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_CONFIRMED, { durable: true });
    
    console.log('Loadsure Service: RabbitMQ connection established');
    
    // Initialize Loadsure API service
    const loadsureApi = new LoadsureApiService(
      config.LOADSURE_API_KEY,
      config.LOADSURE_BASE_URL
    );
    
    // Process quote requests
    await channel.consume(config.QUEUE_QUOTE_REQUESTED, async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`Processing quote request: ${data.requestId}`);
          
          // Determine if we're getting a full freightDetails object or primitives
          let quote;
          if (data.payload.freightDetails.isPrimitives) {
            // Using primitives
            const primitives = data.payload.freightDetails;
            quote = await loadsureApi.getQuoteFromPrimitives(primitives);
          } else {
            // Using full object
            quote = await loadsureApi.getQuote(data.payload.freightDetails);
          }
          
          // Add request ID to the quote
          quote.requestId = data.requestId;
          
          // Publish quote received event
          channel.sendToQueue(
            config.QUEUE_QUOTE_RECEIVED,
            Buffer.from(JSON.stringify(quote)),
            { persistent: true }
          );
          
          console.log(`Quote received event published for request: ${data.requestId}`);
          
          // Acknowledge the message
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
            const errorResponse = {
              requestId: JSON.parse(msg.content.toString()).requestId,
              error: error.message,
              status: 'failed'
            };
            
            channel.sendToQueue(
              config.QUEUE_QUOTE_RECEIVED,
              Buffer.from(JSON.stringify(errorResponse)),
              { persistent: true }
            );
          }
        }
      }
    });
    
    // Process booking requests
    await channel.consume(config.QUEUE_BOOKING_REQUESTED, async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`Processing booking request: ${data.requestId}, Quote ID: ${data.quoteId}`);
          
          // Book insurance with Loadsure API
          const booking = await loadsureApi.bookInsurance(data.quoteId);
          
          // Add request ID to the booking
          booking.requestId = data.requestId;
          
          // Publish booking confirmed event
          channel.sendToQueue(
            config.QUEUE_BOOKING_CONFIRMED,
            Buffer.from(JSON.stringify(booking)),
            { persistent: true }
          );
          
          console.log(`Booking confirmed event published for request: ${data.requestId}`);
          
          // Acknowledge the message
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
            const errorResponse = {
              requestId: JSON.parse(msg.content.toString()).requestId,
              error: error.message,
              status: 'failed'
            };
            
            channel.sendToQueue(
              config.QUEUE_BOOKING_CONFIRMED,
              Buffer.from(JSON.stringify(errorResponse)),
              { persistent: true }
            );
          }
        }
      }
    });
    
    // Handle connection close
    connection.on('close', (err) => {
      console.error('Loadsure Service: RabbitMQ connection closed', err);
      console.log('Attempting to reconnect in 5 seconds...');
      setTimeout(startService, 5000);
    });
    
    console.log('Loadsure Service started');
  } catch (error) {
    console.error('Loadsure Service: Error connecting to RabbitMQ:', error);
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(startService, 5000);
  }
}

// Start the service
if (require.main === module) {
  startService().catch(console.error);
}

module.exports = { startService };