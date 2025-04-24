// File: src/index.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const amqp = require('amqplib');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (replace with a database in production)
const pendingRequests = new Map();
const quotes = new Map();
const bookings = new Map();

// Constants
const PORT = process.env.PORT || 3000;
const LOADSURE_API_KEY = process.env.LOADSURE_API_KEY || 'your-api-key';
const LOADSURE_BASE_URL = process.env.LOADSURE_BASE_URL || 'https://api.loadsure.com';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// RabbitMQ Queues
const QUEUE_QUOTE_REQUESTED = 'quote-requested';
const QUEUE_QUOTE_RECEIVED = 'quote-received';
const QUEUE_BOOKING_REQUESTED = 'booking-requested';
const QUEUE_BOOKING_CONFIRMED = 'booking-confirmed';

// Connect to RabbitMQ
let channel;

async function setupRabbitMQ() {
  try {
    console.log('Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    
    // Create a channel
    channel = await connection.createChannel();
    
    // Ensure queues exist
    await channel.assertQueue(QUEUE_QUOTE_REQUESTED, { durable: true });
    await channel.assertQueue(QUEUE_QUOTE_RECEIVED, { durable: true });
    await channel.assertQueue(QUEUE_BOOKING_REQUESTED, { durable: true });
    await channel.assertQueue(QUEUE_BOOKING_CONFIRMED, { durable: true });
    
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
    QUEUE_QUOTE_REQUESTED,
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
  }, REQUEST_TIMEOUT);
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
    QUEUE_BOOKING_REQUESTED,
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
  }, REQUEST_TIMEOUT);
});

// --- RabbitMQ Consumers ---

async function setupConsumers() {
  // Consumer for quote received events
  await channel.consume(QUEUE_QUOTE_RECEIVED, (msg) => {
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
  await channel.consume(QUEUE_BOOKING_CONFIRMED, (msg) => {
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

// Now let's create a separate file for the Loadsure service that will handle the API integration

// File: src/loadsureService.js
/**
 * Loadsure Service
 * This service handles the integration with the Loadsure API.
 * It listens for quote and booking requests and publishes responses.
 */

const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants
const LOADSURE_API_KEY = process.env.LOADSURE_API_KEY || 'your-api-key';
const LOADSURE_BASE_URL = process.env.LOADSURE_BASE_URL || 'https://api.loadsure.com';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

// RabbitMQ Queues
const QUEUE_QUOTE_REQUESTED = 'quote-requested';
const QUEUE_QUOTE_RECEIVED = 'quote-received';
const QUEUE_BOOKING_REQUESTED = 'booking-requested';
const QUEUE_BOOKING_CONFIRMED = 'booking-confirmed';

async function startService() {
  try {
    console.log('Loadsure Service: Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    // Ensure queues exist
    await channel.assertQueue(QUEUE_QUOTE_REQUESTED, { durable: true });
    await channel.assertQueue(QUEUE_QUOTE_RECEIVED, { durable: true });
    await channel.assertQueue(QUEUE_BOOKING_REQUESTED, { durable: true });
    await channel.assertQueue(QUEUE_BOOKING_CONFIRMED, { durable: true });
    
    console.log('Loadsure Service: RabbitMQ connection established');
    
    // Process quote requests
    await channel.consume(QUEUE_QUOTE_REQUESTED, async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`Processing quote request: ${data.requestId}`);
          
          // Get quote from Loadsure API
          const quote = await getQuoteFromLoadsure(data.freightDetails);
          
          // Add request ID to the quote
          quote.requestId = data.requestId;
          
          // Publish quote received event
          channel.sendToQueue(
            QUEUE_QUOTE_RECEIVED,
            Buffer.from(JSON.stringify(quote)),
            { persistent: true }
          );
          
          console.log(`Quote received event published for request: ${data.requestId}`);
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing quote request:', error);
          // Negative acknowledge with requeue for retrying later
          channel.nack(msg, false, true);
        }
      }
    });
    
    // Process booking requests
    await channel.consume(QUEUE_BOOKING_REQUESTED, async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`Processing booking request: ${data.requestId}, Quote ID: ${data.quoteId}`);
          
          // Book insurance with Loadsure API
          const booking = await bookInsuranceWithLoadsure(data.quoteId);
          
          // Add request ID to the booking
          booking.requestId = data.requestId;
          
          // Publish booking confirmed event
          channel.sendToQueue(
            QUEUE_BOOKING_CONFIRMED,
            Buffer.from(JSON.stringify(booking)),
            { persistent: true }
          );
          
          console.log(`Booking confirmed event published for request: ${data.requestId}`);
          
          // Acknowledge the message
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing booking request:', error);
          // Negative acknowledge with requeue for retrying later
          channel.nack(msg, false, true);
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

// Mock function for getting a quote from Loadsure
// Replace with actual API call in production
async function getQuoteFromLoadsure(freightDetails) {
  console.log('Getting quote from Loadsure API');
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In production, this would be an actual API call:
  /*
  const response = await fetch(`${LOADSURE_BASE_URL}/api/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOADSURE_API_KEY}`
    },
    body: JSON.stringify({
      freight: {
        dimensions: freightDetails.dimensions,
        weight: freightDetails.weight,
        class: freightDetails.class,
        description: freightDetails.description,
        value: freightDetails.value,
        currency: freightDetails.currency,
        route: {
          origin: freightDetails.origin,
          destination: freightDetails.destination
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Loadsure API error: ${response.statusText}`);
  }

  const data = await response.json();
  */
  
  // Mock response
  return {
    quoteId: uuidv4(),
    premium: calculatePremium(freightDetails),
    currency: freightDetails.currency || 'USD',
    coverageAmount: freightDetails.value,
    terms: 'Standard cargo insurance terms apply.',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
  };
}

// Helper function to calculate mock premium
function calculatePremium(freightDetails) {
  // Simple calculation for demo purposes
  // In reality, this would come from the Loadsure API
  const baseRate = 0.025; // 2.5%
  let riskFactor = 1.0;
  
  // Adjust risk based on freight class (higher class = higher risk)
  if (freightDetails.class) {
    const classNum = parseInt(freightDetails.class, 10);
    if (!isNaN(classNum)) {
      riskFactor += (classNum / 100);
    }
  }
  
  return Math.round((freightDetails.value * baseRate * riskFactor) * 100) / 100;
}

// Mock function for booking insurance with Loadsure
// Replace with actual API call in production
async function bookInsuranceWithLoadsure(quoteId) {
  console.log(`Booking insurance with Loadsure API for quote: ${quoteId}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In production, this would be an actual API call:
  /*
  const response = await fetch(`${LOADSURE_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOADSURE_API_KEY}`
    },
    body: JSON.stringify({
      quoteId
    })
  });

  if (!response.ok) {
    throw new Error(`Loadsure API error: ${response.statusText}`);
  }

  const data = await response.json();
  */
  
  // Mock response
  return {
    bookingId: uuidv4(),
    quoteId,
    certificateUrl: `https://certificates.loadsure.com/${quoteId}.pdf`,
    policyNumber: `LS-${Date.now().toString().substring(4)}`
  };
}

// Start the service
startService().catch(console.error);

// This is the main entry point for the API service

// Start the server and RabbitMQ connection
async function startApiServer() {
  try {
    // Connect to RabbitMQ
    await setupRabbitMQ();
    
    // Start the API server
    app.listen(PORT, () => {
      console.log(`Loadsure Insurance Microservice API running on port ${PORT}`);
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