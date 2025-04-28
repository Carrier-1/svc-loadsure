// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import * as amqp from 'amqplib';
import config from './config.js';

// Import services
import supportDataService from './services/supportDataService.js';
import supportDataRefreshService from './services/supportDataRefreshService.js';

// Import controllers
import supportDataController from './controllers/supportDataController.js';
import * as insuranceController from './controllers/insuranceController.js';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (replace with a database in production)
const pendingRequests = new Map();
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
    await channel.assertQueue(config.QUEUE_QUOTE_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_QUOTE_RECEIVED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_REQUESTED, { durable: true });
    await channel.assertQueue(config.QUEUE_BOOKING_CONFIRMED, { durable: true });
    
    console.log('RabbitMQ connection established');
    
    // Start consuming messages
    await setupConsumers();
    
    // Handle connection close
    connection.on('close', (err) => {
      console.error('RabbitMQ connection closed', err);
      console.log('Attempting to reconnect in 5 seconds...');
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
  // Consumer for quote received events
  await channel.consume(config.QUEUE_QUOTE_RECEIVED, (msg) => {
    if (msg !== null) {
      try {
        const data = JSON.parse(msg.content.toString());
        const { requestId } = data;
        
        // Check if response indicates an error
        if (data.error) {
          console.error(`Error in quote response for request ${requestId}:`, data.error);
          
          const res = pendingRequests.get(requestId);
          if (res) {
            res.status(400).json({
              error: data.error,
              requestId
            });
            pendingRequests.delete(requestId);
          }
          
          channel.ack(msg);
          return;
        }
        
        console.log(`Quote received for request ${requestId}, quote ID: ${data.quoteId}`);
        
        // Store quote for potential future booking
        quotes.set(data.quoteId, data);
        
        // Send response back to client
        const res = pendingRequests.get(requestId);
        if (res) {
          res.json({
            status: 'success',
            quote: {
              quoteId: data.quoteId,
              premium: data.premium,
              currency: data.currency,
              coverageAmount: data.coverageAmount,
              terms: data.terms,
              expiresAt: data.expiresAt,
              deductible: data.deductible || 0
            }
          });
          pendingRequests.delete(requestId);
        }
        
        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing quote received message:', error);
        // Negative acknowledge and requeue the message
        channel.nack(msg, false, true);
      }
    }
  });
  
  // Consumer for booking confirmed events
  await channel.consume(config.QUEUE_BOOKING_CONFIRMED, (msg) => {
    if (msg !== null) {
      try {
        const data = JSON.parse(msg.content.toString());
        const { requestId } = data;
        
        // Check if response indicates an error
        if (data.error) {
          console.error(`Error in booking response for request ${requestId}:`, data.error);
          
          const res = pendingRequests.get(requestId);
          if (res) {
            res.status(400).json({
              error: data.error,
              requestId
            });
            pendingRequests.delete(requestId);
          }
          
          channel.ack(msg);
          return;
        }
        
        console.log(`Booking confirmed for request ${requestId}, booking ID: ${data.bookingId}, quote ID: ${data.quoteId}, certificate URL: ${data.certificateUrl}, policy number: ${data.policyNumber}`);
        
        // Store booking
        bookings.set(data.bookingId, data);
        
        // Send response back to client
        const res = pendingRequests.get(requestId);
        if (res) {
          res.json({
            status: 'success',
            booking: {
              bookingId: data.bookingId,
              policyNumber: data.policyNumber,
              certificateUrl: data.certificateUrl,
              quoteId: data.quoteId,
              timestamp: new Date().toISOString()
            }
          });
          pendingRequests.delete(requestId);
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
      pendingRequests,
      quotes,
      bookings,
      channel
    });
    
    // Register controllers
    app.use('/api/support-data', supportDataController);
    app.use('/api/insurance', insuranceController.router);
    
    // Start the API server
    app.listen(config.PORT, () => {
      console.log(`Loadsure Insurance Microservice API running on port ${config.PORT}`);
    });
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
export { app };