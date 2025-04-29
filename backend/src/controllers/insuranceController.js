// backend/src/controllers/insuranceController.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import DatabaseService from '../services/databaseService.js';

const router = express.Router();

// In-memory storage for pending responses (still needed for async handling)
let pendingRequests;
// RabbitMQ channel
let channel;

/**
 * Initialize the controller with dependencies
 * @param {Object} dependencies - Dependencies
 */
function initialize(dependencies) {
  pendingRequests = dependencies.pendingRequests;
  channel = dependencies.channel;
}

/**
 * @route POST /api/insurance/quotes
 * @desc Get insurance quote using full freightDetails object
 * @access Public
 */
router.post('/quotes', (req, res) => {
  const freightDetails = req.body;
  const requestId = uuidv4();
  
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
  
  // Store connection info for later response
  pendingRequests.set(requestId, res);
  
  // Publish event to RabbitMQ
  const message = {
    requestId,
    payload: {
      freightDetails,
      callbackUrl: req.body.callbackUrl || null
    },
    timestamp: new Date().toISOString()
  };
  
  channel.sendToQueue(
    'quote-requested',
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
  }, 30000); // 30 seconds timeout
});

/**
 * Updates to existing consumer for quote received events
 * This is in setupConsumers() function
 */
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
        
        // Calculate total with integration fee
        let totalCost = parseFloat(data.premium || 0);
        if (data.integrationFeeAmount) {
          totalCost += parseFloat(data.integrationFeeAmount);
        }
        
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
              deductible: data.deductible || 0,
              integrationFeeType: data.integrationFeeType,
              integrationFeeValue: data.integrationFeeValue,
              integrationFeeAmount: data.integrationFeeAmount,
              totalCost: totalCost.toFixed(2)
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
}

/**
 * @route POST /api/insurance/quotes/simple
 * @desc Get insurance quote using primitive values
 * @access Public
 */
router.post('/quotes/simple', (req, res) => {
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
    assured
  } = req.body;
  
  const requestId = uuidv4();
  
  // Basic validation for required fields
  if (!description || (!freightClass && !freightClasses) || !value || 
      (!originCity && !stops) || (!originState && !stops) || 
      (!destinationCity && !stops) || (!destinationState && !stops)) {
    return res.status(400).json({
      error: 'Missing required fields. Required: description, freightClass/freightClasses, value, origin and destination info (either as individual fields or in stops array)',
      requestId
    });
  }
  
  // Store connection info for later response
  pendingRequests.set(requestId, res);
  
  // Create primitives object for the service
  const freightDetails = {
    isPrimitives: true, // Flag to indicate this is primitives format
    description,
    freightClass,
    value,
    originCity,
    originState,
    destinationCity,
    destinationState,
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
    
    // Support for multiple elements
    freightClasses,
    commodities,
    carriers,
    stops,
    
    // Support for user and assured data
    user: user || {
      name: userName,
      email: userEmail,
      id: userEmail // Set id to email by default
    },
    assured: assured || {
      name: assuredName,
      email: assuredEmail,
      address: req.body.assuredAddress || {
        city: originCity,
        state: originState,
        country: 'USA'
      }
    }
  };
  
  // Publish event to RabbitMQ
  const message = {
    requestId,
    payload: {
      freightDetails,
      callbackUrl: callbackUrl || null
    },
    timestamp: new Date().toISOString()
  };
  
  channel.sendToQueue(
    'quote-requested',
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
  
  console.log(`Simplified quote request ${requestId} sent to queue`);
  
  // Set timeout to handle case where quote is not received
  setTimeout(() => {
    if (pendingRequests.has(requestId)) {
      res.status(408).json({
        error: 'Request timeout',
        requestId
      });
      pendingRequests.delete(requestId);
    }
  }, 30000); // 30 seconds timeout
});

/**
 * @route POST /api/insurance/bookings
 * @desc Book insurance
 * @access Public
 */
router.post('/bookings', async (req, res) => {
  const { quoteId } = req.body;
  const requestId = uuidv4();
  
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
    'booking-requested',
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
  }, 30000); // 30 seconds timeout
});

/**
 * @route POST /api/insurance/certificates
 * @desc Get certificate details
 * @access Public
 */
router.post('/certificates', async (req, res) => {
  const { certificateNumber, userId } = req.body;
  
  // Basic validation
  if (!certificateNumber || !userId) {
    return res.status(400).json({
      error: 'Missing required fields: certificateNumber, userId',
      status: 'error'
    });
  }
  
  try {
    // Check if certificate exists in database
    try {
      const certificate = await DatabaseService.getCertificate(certificateNumber);
      
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
          certificateLink: certificate.certificateLink
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
        certificateLink: certificateDetails.certificateLink
      }
    });
  } catch (error) {
    console.error('Error fetching certificate details:', error);
    res.status(500).json({
      error: 'Failed to retrieve certificate details',
      message: error.message,
      status: 'error'
    });
  }
});

/**
 * @route GET /api/insurance/quotes/:id
 * @desc Get quote details by ID
 * @access Public
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
 * @route GET /api/insurance/bookings/:id
 * @desc Get booking details by ID
 * @access Public
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
 * @route GET /api/insurance/certificates/:number
 * @desc Get certificate details by number
 * @access Public
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
 * @route GET /api/insurance/stats
 * @desc Get insurance statistics
 * @access Public
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

export { router, initialize };