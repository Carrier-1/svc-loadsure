// File: src/loadsureService.js
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

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
    
    // Process quote requests
    await channel.consume(config.QUEUE_QUOTE_REQUESTED, async (msg) => {
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
            config.QUEUE_QUOTE_RECEIVED,
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
    await channel.consume(config.QUEUE_BOOKING_REQUESTED, async (msg) => {
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
            config.QUEUE_BOOKING_CONFIRMED,
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
  const response = await fetch(`${config.LOADSURE_BASE_URL}/api/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.LOADSURE_API_KEY}`
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
  const response = await fetch(`${config.LOADSURE_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.LOADSURE_API_KEY}`
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
if (require.main === module) {
  startService().catch(console.error);
}

module.exports = { startService };