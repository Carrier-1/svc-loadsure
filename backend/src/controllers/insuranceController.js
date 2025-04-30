// backend/src/controllers/insuranceController.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import DatabaseService from '../services/databaseService.js';
import { Op } from 'sequelize';

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