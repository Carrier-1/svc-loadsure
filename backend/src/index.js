// File: src/index.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');
const config = require('./config');

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

// --- API Routes ---

// Get insurance quote
app.post('/api/insurance/quotes', (req, res) => {
  const freightDetails = req.body;
  const requestId = uuidv4();
  
  // Store connection info for later response
  pendingRequests.set(requestId, res);
  
  // Publish event to RabbitMQ
  const message = {
    requestId,
    freightDetails,
    callbackUrl: req.body.callbackUrl || null,
    timestamp: new Date().toISOString()
  };
  
  channel.sendToQueue(
    config.QUEUE_QUOTE_REQUESTED,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
  
  console.log(`Quote request ${requestId} sent to queue`);
  
  // Set timeout to handle case where quote is not received
  setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      res.status(408).json({
        error: 'Request timeout',
        requestId
      });
      pendingRequests.delete(requestId);
    }
  }, config.REQUEST_TIMEOUT);
});

// Book insurance
app.post('/api/insurance/bookings', (req, res) => {
  const { quoteId } = req.body;
  const requestId = uuidv4();
  
  // Make sure quote exists
  if (!quotes.has(quoteId)) {
    return res.status(404).json({
      error: 'Quote not found',
      quoteId
    });
  }
  
  // Store connection info for later response
  pendingRequests.set(requestId, res);
  
  // Publish event to RabbitMQ
  const message = {
    requestId,
    quoteId,
    callbackUrl: req.body.callbackUrl || null,
    timestamp: new Date().toISOString()
  };
  
  channel.sendToQueue(
    config.QUEUE_BOOKING_REQUESTED,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
  
  console.log(`Booking request ${requestId} sent to queue`);
  
  // Set timeout to handle case where booking confirmation is not received
  setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      res.status(408).json({
        error: 'Request timeout',
        requestId
      });
      pendingRequests.delete(requestId);
    }
  }, config.REQUEST_TIMEOUT);
});

// --- RabbitMQ Consumers ---

async function setupConsumers() {
  // Consumer for quote received events
  await channel.consume(config.QUEUE_QUOTE_RECEIVED, (msg) => {
    if (msg !== null) {
      try {
        const data = JSON.parse(msg.content.toString());
        const { requestId, quoteId } = data;
        
        console.log(`Quote received for request ${requestId}, quote ID: ${quoteId}`);
        
        // Store quote
        quotes.set(quoteId, data);
        
        // Send response back to client
        const res = pendingRequests.get(requestId);
        if (res) {
          res.json({
            status: 'success',
            quote: data
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
        const { requestId, bookingId } = data;
        
        console.log(`Booking confirmed for request ${requestId}, booking ID: ${bookingId}`);
        
        // Store booking
        bookings.set(bookingId, data);
        
        // Send response back to client
        const res = pendingRequests.get(requestId);
        if (res) {
          res.json({
            status: 'success',
            booking: data
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

// Start the server and RabbitMQ connection
async function startApiServer() {
  try {
    // Connect to RabbitMQ
    await setupRabbitMQ();
    
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
startApiServer();

// --- Error handling ---

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for testing
module.exports = { app };