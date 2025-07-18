// backend/src/controllers/insuranceController.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import DatabaseService from '../services/databaseService.js';
import { Op } from 'sequelize';
import config from '../config.js';

// Import models directly
let Quote, Booking, Certificate;

// We'll import these when the controller is initialized
const importModels = async () => {
  try {
    const { models } = await import('../../database/index.js');
    Quote = models.Quote;
    Booking = models.Booking;
    Certificate = models.Certificate;
  } catch (error) {
    console.error('Error importing models:', error);
  }
};

const router = express.Router();

// Redis and RabbitMQ dependencies - will be injected during initialization
let redis;
let channel;

/**
 * Initialize the controller with dependencies
 * @param {Object} dependencies - Dependencies
 */
function initialize(dependencies) {
  redis = dependencies.redis;
  channel = dependencies.channel;
  
  // Import models
  importModels().catch(console.error);
}

/**
 * @swagger
 * /insurance/quotes/list:
 *   get:
 *     summary: Get a list of all quotes
 *     description: Returns a paginated list of all quotes
 *     tags: [Insurance Quotes]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of quotes successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuoteListResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/quotes/list', async (req, res) => {
  try {
    // Get quotes from database with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Import the Quote model from database
    const { models } = await import('../../database/index.js');
    const { Quote } = models;
    
    const { count, rows } = await Quote.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      paranoid: true // Exclude soft-deleted records
    });
    
    // Format the response
    const quotes = rows.map(quote => {
      const formattedQuote = quote.toJSON();
      
      // Add any additional formatting or calculated fields
      return formattedQuote;
    });
    
    res.json({
      status: 'success',
      quotes,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching quotes list:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch quotes',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /insurance/quotes:
 *   post:
 *     summary: Request an insurance quote using the complete API structure
 *     description: >
 *       Creates a new insurance quote request using the full Loadsure API payload structure.
 *       This endpoint is for advanced integration where you need complete control over the request format.
 *     tags: [Insurance Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FreightDetailsComplete'
 *     responses:
 *       200:
 *         description: Quote successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuoteResponse'
 *       400:
 *         description: Bad request, validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       408:
 *         description: Request timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Modified API endpoint to use Redis for response handling
router.post('/quotes', async (req, res) => {
  const freightDetails = req.body;
  const requestId = uuidv4();
  const instanceId = process.env.HOSTNAME || 'unknown-instance';
  
  console.log(`Creating new quote request with ID: ${requestId} on instance ${instanceId}`);
  
  // Basic validation for shipment-based payload
  if (freightDetails.shipment) {
    if (!freightDetails.shipment.cargo || !freightDetails.shipment.cargo.cargoValue || !freightDetails.shipment.cargo.cargoValue.value) {
      return res.status(400).json({
        error: 'Missing required field: shipment.cargo.cargoValue.value',
        requestId
      });
    }
    
    if (!freightDetails.user || !freightDetails.user.email) {
      return res.status(400).json({
        error: 'Missing required field: user.email',
        requestId
      });
    }
    
    if (!freightDetails.assured || !freightDetails.assured.name) {
      return res.status(400).json({
        error: 'Missing required field: assured.name',
        requestId
      });
    }
  } 
  // Basic validation for legacy payload
  else if (!freightDetails.value) {
    return res.status(400).json({
      error: 'Missing required field: value',
      requestId
    });
  }
  
  // Store request info in Redis (key will automatically expire after 120 seconds)
  console.log(`Storing request ${requestId} in Redis with 120s expiry`);
  await redis.set(`pending:${requestId}`, JSON.stringify({ 
    timestamp: Date.now(),
    instanceId,
    type: 'quote'
  }), 'EX', 120);
  
  // Prepare message for RabbitMQ
  const message = {
    requestId,
    instanceId,
    payload: {
      freightDetails,
      callbackUrl: req.body.callbackUrl || null
    },
    timestamp: new Date().toISOString()
  };
  
  try {
    // Enhanced retry mechanism for RabbitMQ channel
    let retries = 0;
    const maxRetries = 10; // Increase max retries
    const retryDelay = 1000; // 1 second between retries

    const sendToQueue = async () => {
      if (!channel) {
        if (retries < maxRetries) {
          console.log(`RabbitMQ channel not ready, retrying (${retries + 1}/${maxRetries})...`);
          retries++;
          
          // Wait longer between retries
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Wait longer between retries for the 5th attempt
          if (retries === 5) {
            console.log("Extended wait for RabbitMQ connection to stabilize...");
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          return sendToQueue();
        } else {
          throw new Error(`RabbitMQ channel not initialized after ${maxRetries} retries`);
        }
      }

      try {
        channel.sendToQueue(
          'quote-requested', // Use hardcoded queue name as in original code
          Buffer.from(JSON.stringify(message)),
          { persistent: true }
        );
        
        console.log(`Quote request ${requestId} sent to queue`);
      } catch (queueError) {
        throw new Error(`Failed to send message to queue: ${queueError.message}`);
      }
    };

    await sendToQueue();
  } catch (error) {
    console.error(`Error sending message to queue: ${error.message}`);
    
    // Clean up Redis
    await redis.del(`pending:${requestId}`);
    
    // Check if this is a validation error (pickup date, etc.)
    if (error.message && error.message.includes('Pickup date cannot be more than 30 days in the future')) {
      return res.status(400).json({
        status: 'failed',
        details: {
          error: error.message
        },
        requestId
      });
    }
    // Handle other errors
    return res.status(500).json({
      error: 'Error sending request to processing queue',
      requestId
    });
  }
  
  // Set up polling to check for response
  let attempts = 0;
  const maxAttempts = 60; // 60 attempts × 1 second = 60 seconds max wait time
  const pollInterval = 1000; // 1 second between checks
  
  const checkForResponse = async () => {
    attempts++;
    
    // Check if there's a response in Redis
    const responseJson = await redis.get(`response:${requestId}`);
    
    if (responseJson) {
      // We found a response
      const response = JSON.parse(responseJson);

      console.log('Response found in Redis:', response);
      
      // Clean up Redis keys
      await redis.del(`pending:${requestId}`);
      await redis.del(`response:${requestId}`);
      
      // Check if it's an error response - both direct error property and status:failed format
      if (response.error || response.data.status === 'failed') {
        return res.status(400).json({
          status: 'failed',
          details: {
            error: response.error || (response.data.details || 'Unknown error')
          },
          msg: response.data.details.error || 'Unknown error',
          requestId
        });
      }
      
      // It's a successful response if we got here
      const data = response.data;
      
      // Calculate total with integration fee
      let totalCost = parseFloat(data.premium || 0);
      if (data.integrationFeeAmount) {
        totalCost += parseFloat(data.integrationFeeAmount);
      }
      
      // Send response back to client
      console.log(`Sending response for request ${requestId} to client (found in Redis)`);
      return res.json({
        status: 'success',
        quote: {
          quoteId: data.quoteId,
          premium: data.premium,
          currency: data.currency,
          coverageAmount: data.coverageAmount,
          terms: data.terms,
          expiresAt: data.expiresAt,
          deductible: data.deductible || 0,
          integrationFeeType: data.integrationFeeType,
          integrationFeeValue: data.integrationFeeValue,
          integrationFeeAmount: data.integrationFeeAmount,
          totalCost: totalCost.toFixed(2),
          processingTime: Date.now() - message.timestamp
        }
      });
    }
    
    // Check if we've exceeded the maximum number of attempts
    if (attempts >= maxAttempts) {
      // We've waited long enough, send a timeout response
      console.log(`Request ${requestId} timed out after ${maxAttempts} attempts`);
      
      // Clean up Redis key
      await redis.del(`pending:${requestId}`);
      
      return res.status(408).json({
        error: 'Request timeout. Your request is still being processed, but the response did not arrive in time.',
        requestId
      });
    }
    
    // Continue polling
    setTimeout(checkForResponse, pollInterval);
  };
  
  // Start polling
  setTimeout(checkForResponse, pollInterval);
});

/**
 * @swagger
 * /insurance/quotes/simple:
 *   post:
 *     summary: Request an insurance quote using simplified parameters
 *     description: >
 *       Creates a new insurance quote request using simple parameters.
 *       This endpoint is easier to use for basic integration.
 *     tags: [Insurance Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FreightDetailsSimple'
 *     responses:
 *       200:
 *         description: Quote successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuoteResponse'
 *       400:
 *         description: Bad request, validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       408:
 *         description: Request timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/quotes/simple', async (req, res) => {
  const {
    // Required fields
    description,
    freightClass,
    value,
    originCity,
    originState,
    destinationCity,
    destinationState,
    
    // Optional fields
    currency,
    dimensionLength,
    dimensionWidth,
    dimensionHeight,
    dimensionUnit,
    weightValue,
    weightUnit,
    commodityId,
    loadTypeId,
    equipmentTypeId,
    pickupDate,
    deliveryDate,
    carrierName,
    carrierEmail,
    carrierPhone,
    carrierDotNumber,
    userName,
    userEmail,
    assuredName,
    assuredEmail,
    callbackUrl,
    
    // Support for multiple elements
    freightClasses,
    commodities,
    carriers,
    stops,
    
    // Support for user and assured data
    user,
    assured,
    
    // Integration fee fields
    integrationFeeType,
    integrationFeeValue,
    
    // Additional fields the UI supports
    freightId,
    poNumber,
    
    // Full address fields
    assuredAddress,
    originAddress1,
    originAddress2,
    originPostal,
    originCountry,
    destinationAddress1,
    destinationAddress2,
    destinationPostal,
    destinationCountry,
    
    // Additional carrier fields
    carrierEquipmentType,
    carrierMode,
    carrierIdType,
    carrierIdValue
  } = req.body;
  
  const requestId = uuidv4();
  const instanceId = process.env.HOSTNAME || 'unknown-instance';
  
  // Basic validation for required fields with more flexible handling
  const missingFields = [];
  
  if (!description) missingFields.push('description');
  
  // Check for freight class in any format
  if (!freightClass && (!freightClasses || freightClasses.length === 0)) {
    missingFields.push('freightClass/freightClasses');
  }
  
  if (!value) missingFields.push('value');
  
  // Check for origin/destination in any format
  const hasOrigin = (originCity && originState) || 
                    (stops && stops.length > 0 && stops[0].address && 
                     stops[0].address.city && stops[0].address.state);
  
  const hasDestination = (destinationCity && destinationState) || 
                         (stops && stops.length > 1 && stops[1].address && 
                          stops[1].address.city && stops[1].address.state);
  
  if (!hasOrigin) missingFields.push('origin information');
  if (!hasDestination) missingFields.push('destination information');
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(', ')}`,
      requestId
    });
  }
  
  // Store request info in Redis (key will automatically expire after 120 seconds)
  console.log(`Storing simple quote request ${requestId} in Redis with 120s expiry`);
  await redis.set(`pending:${requestId}`, JSON.stringify({ 
    timestamp: Date.now(),
    instanceId,
    type: 'quote'
  }), 'EX', 120);
  
  // Create primitives object for the service
  const freightDetails = {
    isPrimitives: true, // Flag to indicate this is primitives format
    description,
    freightClass,
    value,
    
    // Location data with flexible handling
    originCity: originCity || (stops && stops[0] && stops[0].address ? stops[0].address.city : null),
    originState: originState || (stops && stops[0] && stops[0].address ? stops[0].address.state : null),
    originAddress1: originAddress1 || (stops && stops[0] && stops[0].address ? stops[0].address.address1 : null),
    originAddress2: originAddress2 || (stops && stops[0] && stops[0].address ? stops[0].address.address2 : null),
    originPostal: originPostal || (stops && stops[0] && stops[0].address ? stops[0].address.postal : null),
    originCountry: originCountry || (stops && stops[0] && stops[0].address ? stops[0].address.country : 'USA'),
    
    destinationCity: destinationCity || (stops && stops[1] && stops[1].address ? stops[1].address.city : null),
    destinationState: destinationState || (stops && stops[1] && stops[1].address ? stops[1].address.state : null),
    destinationAddress1: destinationAddress1 || (stops && stops[1] && stops[1].address ? stops[1].address.address1 : null),
    destinationAddress2: destinationAddress2 || (stops && stops[1] && stops[1].address ? stops[1].address.address2 : null),
    destinationPostal: destinationPostal || (stops && stops[1] && stops[1].address ? stops[1].address.postal : null),
    destinationCountry: destinationCountry || (stops && stops[1] && stops[1].address ? stops[1].address.country : 'USA'),
    
    // Optional fields with defaults for compatibility
    currency: currency || 'USD',
    dimensionLength: dimensionLength || 48,
    dimensionWidth: dimensionWidth || 40,
    dimensionHeight: dimensionHeight || 48,
    dimensionUnit: dimensionUnit || 'in',
    weightValue: weightValue || 500,
    weightUnit: weightUnit || 'lbs',
    commodityId,
    loadTypeId,
    equipmentTypeId,
    
    // Date handling with fallback defaults
    pickupDate: pickupDate || (stops && stops[0] ? stops[0].date : null),
    deliveryDate: deliveryDate || (stops && stops[1] ? stops[1].date : null),
    
    // Carrier information with flexible handling
    carrierName,
    carrierEmail,
    carrierPhone,
    carrierDotNumber,
    carrierEquipmentType,
    carrierMode,
    carrierIdType,
    carrierIdValue,
    
    // Support for multiple elements
    freightClasses: freightClasses || (freightClass ? [{ classId: freightClass, percentage: 100 }] : null),
    commodities: commodities || (commodityId ? [{ id: commodityId }] : null),
    carriers: carriers || (carrierName ? [{
      name: carrierName,
      email: carrierEmail,
      phone: carrierPhone,
      mode: carrierMode || 'ROAD',
      equipmentType: carrierEquipmentType || equipmentTypeId,
      carrierId: {
        type: carrierIdType || 'USDOT',
        value: carrierIdValue || carrierDotNumber
      }
    }] : null),
    
    // Handle stops with proper validation
    stops: stops || [
      {
        stopType: 'PICKUP',
        stopNumber: 1,
        date: pickupDate || new Date().toISOString().split('T')[0],
        address: {
          address1: originAddress1 || '',
          address2: originAddress2 || '',
          city: originCity || '',
          state: originState || '',
          postal: originPostal || '',
          country: originCountry || 'USA'
        }
      },
      {
        stopType: 'DELIVERY',
        stopNumber: 2,
        date: deliveryDate || (() => {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return nextWeek.toISOString().split('T')[0];
        })(),
        address: {
          address1: destinationAddress1 || '',
          address2: destinationAddress2 || '',
          city: destinationCity || '',
          state: destinationState || '',
          postal: destinationPostal || '',
          country: destinationCountry || 'USA'
        }
      }
    ],
    
    // Support for user and assured data
    user: user || {
      name: userName || '',
      email: userEmail || '',
      id: userEmail || '' // Set id to email by default
    },
    
    assured: assured || {
      name: assuredName || '',
      email: assuredEmail || '',
      address: assuredAddress || {
        address1: originAddress1 || '',
        address2: originAddress2 || '',
        city: originCity || '',
        state: originState || '',
        postal: originPostal || '',
        country: originCountry || 'USA'
      }
    },
    
    // Additional fields
    freightId: freightId || `FR-${Date.now().toString().substring(7)}`,
    poNumber: poNumber || `PO-${Date.now().toString().substring(7)}`,
    
    // Add integration fee fields if provided
    integrationFeeType,
    integrationFeeValue
  };
  
  // Publish event to RabbitMQ
  const message = {
    requestId,
    instanceId,
    payload: {
      freightDetails,
      callbackUrl: callbackUrl || null
    },
    timestamp: new Date().toISOString()
  };
  
  try {
    // Add retry mechanism for RabbitMQ channel initialization
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 500; // 500ms

    const sendToQueue = async () => {
      if (!channel) {
        if (retries < maxRetries) {
          console.log(`RabbitMQ channel not ready, retrying (${retries + 1}/${maxRetries})...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return sendToQueue();
        } else {
          throw new Error('RabbitMQ channel not initialized after retries');
        }
      }

      channel.sendToQueue(
        'quote-requested',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      
      console.log(`Simple quote request ${requestId} sent to queue`);
    };

    await sendToQueue();
  } catch (error) {
    console.error(`Error sending message to queue: ${error.message}`);
    
    // Clean up Redis
    await redis.del(`pending:${requestId}`);
    
    // Check if this is a validation error (pickup date, etc.)
    if (error.message && error.message.includes('Pickup date cannot be more than 30 days in the future')) {
      return res.status(400).json({
        status: 'failed',
        details: {
          error: error.message
        },
        requestId
      });
    }
    // Handle other errors
    return res.status(500).json({
      error: 'Error sending request to processing queue',
      requestId
    });
  }
  
  // Set up polling to check for response
  let attempts = 0;
  const maxAttempts = 60; // 60 attempts × 1 second = 60 seconds max wait time
  const pollInterval = 1000; // 1 second between checks
  
  const checkForResponse = async () => {
    attempts++;
    
    // Check if there's a response in Redis
    const responseJson = await redis.get(`response:${requestId}`);
    
    if (responseJson) {
      // We found a response
      const response = JSON.parse(responseJson);

      console.log('Response found in Redis:', response);
      
      // Clean up Redis keys
      await redis.del(`pending:${requestId}`);
      await redis.del(`response:${requestId}`);
      
      // Check if it's an error response - both direct error property and status:failed format
      if (response.error || response.data.status === 'failed') {
        return res.status(400).json({
          status: 'failed',
          details: {
            error: response.error || (response.data.details || 'Unknown error')
          },
          msg: response.data.details.error || 'Unknown error',
          requestId
        });
      }
      
      // It's a successful response if we got here
      const data = response.data;
      
      // Calculate total with integration fee
      let totalCost = parseFloat(data.premium || 0);
      if (data.integrationFeeAmount) {
        totalCost += parseFloat(data.integrationFeeAmount);
      }
      
      // Send response back to client
      console.log(`Sending response for simple quote request ${requestId} to client (found in Redis)`);
      return res.json({
        status: 'success',
        quote: {
          quoteId: data.quoteId,
          premium: data.premium,
          currency: data.currency,
          coverageAmount: data.coverageAmount,
          terms: data.terms,
          expiresAt: data.expiresAt,
          deductible: data.deductible || 0,
          integrationFeeType: data.integrationFeeType,
          integrationFeeValue: data.integrationFeeValue,
          integrationFeeAmount: data.integrationFeeAmount,
          totalCost: totalCost.toFixed(2)
        }
      });
    }
    
    // Check if we've exceeded the maximum number of attempts
    if (attempts >= maxAttempts) {
      // We've waited long enough, send a timeout response
      console.log(`Request ${requestId} timed out after ${maxAttempts} attempts`);
      
      // Clean up Redis key
      await redis.del(`pending:${requestId}`);
      
      return res.status(408).json({
        error: 'Request timeout. Your request is still being processed, but the response did not arrive in time.',
        requestId
      });
    }
    
    // Continue polling
    setTimeout(checkForResponse, pollInterval);
  };
  
  // Start polling
  setTimeout(checkForResponse, pollInterval);
});

/**
 * @swagger
 * /insurance/quotes/{id}:
 *   get:
 *     summary: Get quote details by ID
 *     description: Retrieves details for a specific insurance quote
 *     tags: [Insurance Quotes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Quote ID to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quote details successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuoteResponse'
 *       404:
 *         description: Quote not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/quotes/:id', async (req, res) => {
  try {
    // Only use database lookup for GET requests
    const quote = await DatabaseService.getQuote(req.params.id);
    
    // Calculate total with integration fee
    let totalCost = parseFloat(quote.premium || 0);
    if (quote.integrationFeeAmount) {
      totalCost += parseFloat(quote.integrationFeeAmount);
    }
    
    res.json({
      status: 'success',
      quote: {
        quoteId: quote.quoteId,
        premium: quote.premium,
        currency: quote.currency,
        coverageAmount: quote.coverageAmount,
        terms: quote.terms,
        expiresAt: quote.expiresAt,
        status: quote.status,
        deductible: quote.deductible || 0,
        integrationFeeType: quote.integrationFeeType,
        integrationFeeValue: quote.integrationFeeValue,
        integrationFeeAmount: quote.integrationFeeAmount,
        totalCost: totalCost.toFixed(2)
      }
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      error: 'Quote not found',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /insurance/bookings:
 *   post:
 *     summary: Book insurance for a quote
 *     description: Creates a new insurance booking based on a previously created quote
 *     tags: [Insurance Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingRequest'
 *     responses:
 *       200:
 *         description: Booking successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Bad request, validation error or expired quote
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Quote not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       408:
 *         description: Request timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/bookings', async (req, res) => {
  const { quoteId } = req.body;
  const requestId = uuidv4();
  const instanceId = process.env.HOSTNAME || 'unknown-instance';
  
  // Validate quote exists
  if (!quoteId) {
    return res.status(400).json({
      error: 'Missing required field: quoteId',
      requestId
    });
  }
  
  // Check if quote exists in the database
  try {
    const quote = await DatabaseService.getQuote(quoteId);
    if (quote.status === 'expired') {
      return res.status(400).json({
        error: 'Quote has expired',
        requestId,
        quoteId
      });
    }
    if (quote.status === 'booked') {
      return res.status(400).json({
        error: 'Quote has already been booked',
        requestId,
        quoteId
      });
    }
  } catch (error) {
    return res.status(404).json({
      error: 'Quote not found',
      requestId,
      quoteId
    });
  }
  
  // Store request info in Redis (key will automatically expire after 120 seconds)
  console.log(`Storing booking request ${requestId} in Redis with 120s expiry`);
  await redis.set(`pending:${requestId}`, JSON.stringify({ 
    timestamp: Date.now(),
    instanceId,
    type: 'booking'
  }), 'EX', 120);
  
  // Publish event to RabbitMQ
  const message = {
    requestId,
    instanceId,
    quoteId,
    callbackUrl: req.body.callbackUrl || null,
    timestamp: new Date().toISOString()
  };
  
  try {
    // Add retry mechanism for RabbitMQ channel initialization
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 500; // 500ms

    const sendToQueue = async () => {
      if (!channel) {
        if (retries < maxRetries) {
          console.log(`RabbitMQ channel not ready, retrying (${retries + 1}/${maxRetries})...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return sendToQueue();
        } else {
          throw new Error('RabbitMQ channel not initialized after retries');
        }
      }

      channel.sendToQueue(
        'booking-requested',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      
      console.log(`Booking request ${requestId} sent to queue`);
    };

    await sendToQueue();
  } catch (error) {
    console.error(`Error sending booking message to queue: ${error.message}`);
    
    // Clean up Redis
    await redis.del(`pending:${requestId}`);
    
    return res.status(500).json({
      error: 'Error sending booking request to processing queue',
      requestId
    });
  }
  
  // Set up polling to check for response
  let attempts = 0;
  const maxAttempts = 60; // 60 attempts × 1 second = 60 seconds max wait time
  const pollInterval = 1000; // 1 second between checks
  
  const checkForResponse = async () => {
    attempts++;
    
    // Check if there's a response in Redis
    const responseJson = await redis.get(`response:${requestId}`);
    
    if (responseJson) {
      // We found a response
      const response = JSON.parse(responseJson);
      
      // Clean up Redis keys
      await redis.del(`pending:${requestId}`);
      await redis.del(`response:${requestId}`);
      
      // Check if it's an error response
      if (response.error) {
        return res.status(400).json({
          error: response.error,
          requestId
        });
      }
      
      // It's a successful response
      const data = response.data;
      
      // Send response back to client
      console.log(`Sending booking response for request ${requestId} to client (found in Redis)`);
      return res.json({
        status: 'success',
        booking: {
          bookingId: data.bookingId,
          policyNumber: data.policyNumber,
          certificateUrl: data.certificateUrl,
          quoteId: data.quoteId,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check if we've exceeded the maximum number of attempts
    if (attempts >= maxAttempts) {
      // We've waited long enough, send a timeout response
      console.log(`Request ${requestId} timed out after ${maxAttempts} attempts`);
      
      // Clean up Redis key
      await redis.del(`pending:${requestId}`);
      
      return res.status(408).json({
        error: 'Request timeout. Your booking request is still being processed, but the response did not arrive in time.',
        requestId
      });
    }
    
    // Continue polling
    setTimeout(checkForResponse, pollInterval);
  };
  
  // Start polling
  setTimeout(checkForResponse, pollInterval);
});

/**
 * @swagger
 * /insurance/certificates/list:
 *   get:
 *     summary: Get a list of all certificates
 *     description: Returns a paginated list of all certificates
 *     tags: [Certificates]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of certificates successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateListResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/certificates/list', async (req, res) => {
  try {
    // Get certificates from database with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Import the Certificate model from database
    const { models } = await import('../../database/index.js');
    const { Certificate } = models;
    
    const { count, rows } = await Certificate.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      paranoid: true // Exclude soft-deleted records
    });
    
    // Format the response
    const certificates = rows.map(certificate => {
      const formattedCertificate = certificate.toJSON();
      
      // Add any additional formatting or calculated fields
      // Check if certificate is still valid based on dates
      if (formattedCertificate.validFrom && formattedCertificate.validTo) {
        const now = new Date();
        const validFrom = new Date(formattedCertificate.validFrom);
        const validTo = new Date(formattedCertificate.validTo);
        
        if (now < validFrom) {
          formattedCertificate.status = 'PENDING';
        } else if (now > validTo) {
          formattedCertificate.status = 'EXPIRED';
        }
      }
      
      return formattedCertificate;
    });
    
    res.json({
      status: 'success',
      certificates,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching certificates list:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch certificates',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /insurance/certificates:
 *   post:
 *     summary: Get certificate details by number
 *     description: Retrieves details for a specific insurance certificate
 *     tags: [Certificates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateRequest'
 *     responses:
 *       200:
 *         description: Certificate details successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Bad request, validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/certificates', async (req, res) => {
  const { certificateNumber, userId } = req.body;
  const requestId = uuidv4();
  const instanceId = process.env.HOSTNAME || 'unknown-instance';

  // Basic validation
  if (!certificateNumber || !userId) {
    return res.status(400).json({
      error: 'Missing required fields: certificateNumber, userId',
      status: 'error'
    });
  }
  
  // Store request info in Redis for tracking (key will automatically expire after 120 seconds)
  console.log(`Storing certificate request ${requestId} in Redis with 120s expiry`);
  await redis.set(`pending:${requestId}`, JSON.stringify({ 
    timestamp: Date.now(),
    instanceId,
    type: 'certificate',
    certificateNumber
  }), 'EX', 120);

  try {
    // Check if certificate exists in database
    try {
      const certificate = await DatabaseService.getCertificate(certificateNumber);

      // Clean up Redis key
      await redis.del(`pending:${requestId}`);
      
      // Return certificate from database
      return res.json({
        status: 'success',
        certificate: {
          certificateNumber: certificate.certificateNumber,
          productName: certificate.productName,
          productId: certificate.productId,
          status: certificate.status,
          coverageAmount: certificate.coverageAmount,
          premium: certificate.premium,
          certificateLink: certificate.certificateLink,
          validFrom: certificate.validFrom,
          validTo: certificate.validTo
        }
      });
    } catch (dbError) {
      console.log('Certificate not found in database, fetching from API');
      // Fall through to API call if not in database
    }
    
    // Create a temporary LoadsureApiService instance for this request
    const LoadsureApiService = await import('../services/loadsureApiService.js');
    const loadsureApi = new LoadsureApiService.default(
      process.env.LOADSURE_API_KEY || 'MiphvjLVlwfZHrfhGklLgHzvjxiTbzIunOCrIAizpjVFiiRSufowtNhGGCLAiSmN',
      process.env.LOADSURE_BASE_URL || 'https://portal.loadsure.net',
    );
    
    // Get certificate details from Loadsure
    const certificateDetails = await loadsureApi.getCertificateDetails(certificateNumber, userId);
    
    // Save certificate to database
    await DatabaseService.saveCertificate(certificateDetails, { 
      certificateNumber, 
      userId 
    });

    // Clean up Redis key
    await redis.del(`pending:${requestId}`);
    
    // Store the response in Redis for future reference
    await redis.set(`certificate:${certificateNumber}`, JSON.stringify({
      certificateDetails,
      timestamp: Date.now()
    }), 'EX', 3600); // Keep for 1 hour
    
    // Format response
    res.json({
      status: 'success',
      certificate: {
        certificateNumber: certificateDetails.certificateNumber,
        productName: certificateDetails.productName,
        productId: certificateDetails.productId,
        status: certificateDetails.status,
        coverageAmount: certificateDetails.limit,
        premium: certificateDetails.premium,
        certificateLink: certificateDetails.certificateLink,
        validFrom: certificateDetails.validFrom,
        validTo: certificateDetails.validTo
      }
    });
  } catch (error) {
    console.error('Error fetching certificate details:', error);

    // Clean up Redis key
    await redis.del(`pending:${requestId}`);

    res.status(500).json({
      error: 'Failed to retrieve certificate details',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * @swagger
 * /insurance/certificates/{number}:
 *   get:
 *     summary: Get certificate details by number
 *     description: Retrieves details for a specific insurance certificate
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         description: Certificate number to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate details successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       404:
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/certificates/:number', async (req, res) => {
  try {
    // Only use database lookup for GET requests
    const certificate = await DatabaseService.getCertificate(req.params.number);
    res.json({
      status: 'success',
      certificate: {
        certificateNumber: certificate.certificateNumber,
        productName: certificate.productName,
        productId: certificate.productId,
        status: certificate.status,
        coverageAmount: certificate.coverageAmount,
        premium: certificate.premium,
        certificateLink: certificate.certificateLink,
        validFrom: certificate.validFrom,
        validTo: certificate.validTo
      }
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      error: 'Certificate not found',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /insurance/certificates/{number}/cancel:
 *   post:
 *     summary: Cancel a certificate
 *     description: Cancels an insurance certificate with Loadsure using asynchronous processing
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         description: Certificate number to cancel
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID for authentication with Loadsure
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Certificate cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 certificate:
 *                   type: object
 *                   properties:
 *                     certificateNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [CANCELLED]
 *                     cancellationDate:
 *                       type: string
 *                       format: date-time
 *                     cancellationReason:
 *                       type: string
 *       400:
 *         description: Bad request, missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       408:
 *         description: Request timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/certificates/:number/cancel', async (req, res) => {
  const certificateNumber = req.params.number;
  const { userId, reason, additionalInfo, emailAssured } = req.body;
  const requestId = uuidv4();
  const instanceId = process.env.HOSTNAME || 'unknown-instance';
  
  // Validate required fields
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      error: 'Missing required field: userId',
      requestId
    });
  }
  
  try {
    // Check if certificate exists in database
    try {
      await DatabaseService.getCertificate(certificateNumber);
    } catch (dbError) {
      return res.status(404).json({
        status: 'error',
        error: 'Certificate not found',
        message: dbError.message,
        requestId
      });
    }
    
    // Store request info in Redis (key will automatically expire after 120 seconds)
    console.log(`Storing cancellation request ${requestId} in Redis with 120s expiry`);
    await redis.set(`pending:${requestId}`, JSON.stringify({ 
      timestamp: Date.now(),
      instanceId,
      type: 'certificate-cancellation',
      certificateNumber
    }), 'EX', 120);
    
    // Publish event to RabbitMQ
    const message = {
      requestId,
      instanceId,
      certificateNumber,
      userId,
      additionalInfo,
      emailAssured,
      reason: reason || 'Client Request',
      timestamp: new Date().toISOString()
    };
    
  try {
    // Add retry mechanism for RabbitMQ channel initialization
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 500; // 500ms

    const sendToQueue = async () => {
      if (!channel) {
        if (retries < maxRetries) {
          console.log(`RabbitMQ channel not ready, retrying (${retries + 1}/${maxRetries})...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return sendToQueue();
        } else {
          throw new Error('RabbitMQ channel not initialized after retries');
        }
      }

      channel.sendToQueue(
        'certificate-cancellation-requested',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      
      console.log(`Certificate cancellation request ${requestId} sent to queue`);
    };

    await sendToQueue();
  } catch (queueError) {
    console.error(`Error sending message to queue: ${queueError.message}`);
    
    // Clean up Redis
    await redis.del(`pending:${requestId}`);
    
    return res.status(500).json({
      status: 'error',
      error: 'Error sending cancellation request to processing queue',
      requestId
    });
  }
    
    // Set up polling to check for response
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts × 1 second = 60 seconds max wait time
    const pollInterval = 1000; // 1 second between checks
    
    const checkForResponse = async () => {
      attempts++;
      
      // Check if there's a response in Redis
      const responseJson = await redis.get(`response:${requestId}`);
      
      if (responseJson) {
        // We found a response
        const response = JSON.parse(responseJson);
        
        // Clean up Redis keys
        await redis.del(`pending:${requestId}`);
        await redis.del(`response:${requestId}`);
        
        // Check if it's an error response
        if (response.error) {
          return res.status(400).json({
            status: 'error',
            error: response.error,
            requestId
          });
        }
        
        // It's a successful response
        const data = response.data;
        
        // Send response back to client
        console.log(`Sending cancellation response for request ${requestId} to client (found in Redis)`);
        return res.json({
          status: 'success',
          certificate: {
            certificateNumber: data.certificateNumber,
            status: data.status,
            cancellationReason: data.cancellationReason,
            cancellationAdditionalInfo: data.cancellationAdditionalInfo,
            canceledBy: data.canceledBy,
            canceledDate: data.canceledDate
          }
        });
      }
      
      // Check if we've exceeded the maximum number of attempts
      if (attempts >= maxAttempts) {
        // We've waited long enough, send a timeout response
        console.log(`Request ${requestId} timed out after ${maxAttempts} attempts`);
        
        // Clean up Redis key
        await redis.del(`pending:${requestId}`);
        
        return res.status(408).json({
          status: 'error',
          error: 'Request timeout. Your cancellation request is still being processed, but the response did not arrive in time.',
          requestId
        });
      }
      
      // Continue polling
      setTimeout(checkForResponse, pollInterval);
    };
    
    // Start polling
    setTimeout(checkForResponse, pollInterval);
  } catch (error) {
    console.error(`Error processing certificate cancellation request for ${certificateNumber}:`, error);
    
    res.status(500).json({
      status: 'error',
      error: 'Failed to process certificate cancellation request',
      message: error.message,
      requestId
    });
  }
});

/**
 * @swagger
 * /insurance/bookings/list:
 *   get:
 *     summary: Get a list of all bookings
 *     description: Returns a paginated list of all bookings
 *     tags: [Insurance Bookings]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of bookings successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingListResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/bookings/list', async (req, res) => {
  try {
    // Get bookings from database with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Import the required models from database
    const { models } = await import('../../database/index.js');
    const { Booking, Certificate } = models;
    
    const { count, rows } = await Booking.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      paranoid: true, // Exclude soft-deleted records
      include: [
        {
          model: Certificate,
          as: 'certificate',
          required: false
        }
      ]
    });
    
    // Format the response
    const bookings = rows.map(booking => booking.toJSON());
    
    res.json({
      status: 'success',
      bookings,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bookings list:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to fetch bookings',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /insurance/bookings/{id}:
 *   get:
 *     summary: Get booking details by ID
 *     description: Retrieves details for a specific insurance booking
 *     tags: [Insurance Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Booking ID to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/bookings/:id', async (req, res) => {
  try {
    // Only use database lookup for GET requests
    const booking = await DatabaseService.getBooking(req.params.id);
    res.json({
      status: 'success',
      booking: {
        bookingId: booking.bookingId,
        quoteId: booking.quoteId,
        policyNumber: booking.policyNumber,
        certificateUrl: booking.certificateUrl,
        status: booking.status,
        premium: booking.premium,
        coverageAmount: booking.coverageAmount,
        timestamp: booking.createdAt
      }
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      error: 'Booking not found',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /insurance/stats:
 *   get:
 *     summary: Get insurance statistics
 *     description: Returns statistics about quotes, bookings, and certificates
 *     tags: [Insurance Quotes, Insurance Bookings, Certificates]
 *     responses:
 *       200:
 *         description: Statistics successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: ['success']
 *                 stats:
 *                   type: object
 *                   properties:
 *                     quotes:
 *                       type: object
 *                       properties:
 *                         total: { type: 'integer' }
 *                         active: { type: 'integer' }
 *                         expired: { type: 'integer' }
 *                         booked: { type: 'integer' }
 *                     bookings:
 *                       type: object
 *                       properties:
 *                         total: { type: 'integer' }
 *                         active: { type: 'integer' }
 *                     certificates:
 *                       type: object
 *                       properties:
 *                         total: { type: 'integer' }
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', async (req, res) => {
  try {
    // Clean up expired quotes first
    const updatedCount = await DatabaseService.updateExpiredQuotes();
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} expired quotes`);
    }
    
    // Get statistics from database
    const stats = await DatabaseService.getStatistics();
    res.json({
      status: 'success',
      stats
    });
  } catch (error) {
    console.error('Error getting insurance statistics:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to get insurance statistics',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /insurance/search:
 *   get:
 *     summary: Search across quotes, bookings, and certificates
 *     description: Search for records matching the given term
 *     tags: [Insurance Quotes, Insurance Bookings, Certificates]
 *     parameters:
 *       - in: query
 *         name: term
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, quotes, bookings, certificates]
 *           default: all
 *         description: Type of records to search
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 results:
 *                   type: object
 *                   properties:
 *                     quotes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Quote'
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     certificates:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Certificate'
 *       400:
 *         description: Bad request, missing search term
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/search', async (req, res) => {
  try {
    const { term, type = 'all' } = req.query;
    
    if (!term) {
      return res.status(400).json({
        status: 'error',
        error: 'Search term is required'
      });
    }
    
    // Import models and Sequelize operators
    const { models, Sequelize } = await import('../../database/index.js');
    const { Quote, Booking, Certificate } = models;
    const { Op } = Sequelize;
    
    const results = {
      quotes: [],
      bookings: [],
      certificates: []
    };
    
    // Search in quotes if requested
    if (type === 'all' || type === 'quotes') {
      const quotes = await Quote.findAll({
        where: {
          [Op.or]: [
            { quoteId: { [Op.iLike]: `%${term}%` } },
            { requestId: { [Op.iLike]: `%${term}%` } },
            { 
              requestData: {
                [Op.or]: [
                  { description: { [Op.iLike]: `%${term}%` } },
                  { '$shipment.cargo.fullDescriptionOfCargo$': { [Op.iLike]: `%${term}%` } }
                ]
              }
            }
          ]
        },
        limit: 20,
        order: [['createdAt', 'DESC']]
      });
      
      results.quotes = quotes.map(quote => quote.toJSON());
    }
    
    // Search in bookings if requested
    if (type === 'all' || type === 'bookings') {
      const bookings = await Booking.findAll({
        where: {
          [Op.or]: [
            { bookingId: { [Op.iLike]: `%${term}%` } },
            { quoteId: { [Op.iLike]: `%${term}%` } },
            { policyNumber: { [Op.iLike]: `%${term}%` } }
          ]
        },
        limit: 20,
        order: [['createdAt', 'DESC']]
      });
      
      results.bookings = bookings.map(booking => booking.toJSON());
    }
    
    // Search in certificates if requested
    if (type === 'all' || type === 'certificates') {
      const certificates = await Certificate.findAll({
        where: {
          [Op.or]: [
            { certificateNumber: { [Op.iLike]: `%${term}%` } },
            { productName: { [Op.iLike]: `%${term}%` } }
          ]
        },
        limit: 20,
        order: [['createdAt', 'DESC']]
      });
      
      results.certificates = certificates.map(cert => cert.toJSON());
    }
    
    res.json({
      status: 'success',
      results
    });
  } catch (error) {
    console.error('Error searching insurance data:', error);
    res.status(500).json({
      status: 'error',
      error: 'Search failed',
      message: error.message
    });
  }
});

export { router, initialize };