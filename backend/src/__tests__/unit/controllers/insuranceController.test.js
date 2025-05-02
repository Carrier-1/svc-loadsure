// backend/__tests__/controllers/insuranceController.test.js

// Mock all dependencies
jest.mock('../../database/index.js', () => ({
    models: {
      Quote: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        findAndCountAll: jest.fn()
      },
      Booking: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        findAndCountAll: jest.fn()
      },
      Certificate: {
        findOne: jest.fn(),
        findAll: jest.fn(),
        findAndCountAll: jest.fn()
      }
    },
    Sequelize: {
      Op: {
        iLike: jest.fn(str => `ILIKE:${str}`),
        or: jest.fn(arr => `OR:${JSON.stringify(arr)}`),
        lt: jest.fn(val => `LT:${val}`)
      }
    }
  }));
  
  jest.mock('../../src/services/databaseService.js', () => ({
    getQuote: jest.fn(),
    getBooking: jest.fn(),
    getCertificate: jest.fn(),
    saveQuote: jest.fn(),
    saveBooking: jest.fn(),
    saveCertificate: jest.fn(),
    updateExpiredQuotes: jest.fn(),
    getStatistics: jest.fn()
  }));
  
  jest.mock('../../src/services/loadsureApiService.js', () => {
    return {
      default: jest.fn().mockImplementation(() => ({
        getCertificateDetails: jest.fn()
      }))
    };
  });
  
  // Mock Redis
  const redisMock = {
    set: jest.fn(() => Promise.resolve('OK')),
    get: jest.fn(),
    del: jest.fn(() => Promise.resolve(1)),
    exists: jest.fn(() => Promise.resolve(0)),
    keys: jest.fn(() => Promise.resolve([]))
  };
  
  // Mock RabbitMQ channel
  const channelMock = {
    sendToQueue: jest.fn(() => true),
    ack: jest.fn(),
    nack: jest.fn(),
    assertQueue: jest.fn(() => Promise.resolve({}))
  };
  
  // Import the controller (after mocks are set up)
  import { initialize, router } from '../../src/controllers/insuranceController.js';
  import DatabaseService from '../../src/services/databaseService.js';
  
  // Mock Express request/response objects
  const mockRequest = (body = {}, params = {}, query = {}, headers = {}) => ({
    body,
    params,
    query,
    headers,
    id: headers['x-request-id'] || 'test-request-id'
  });
  
  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  };
  
  describe('Insurance Controller', () => {
    beforeAll(() => {
      // Initialize the controller with mocked dependencies
      initialize({
        redis: redisMock,
        channel: channelMock,
        quotes: new Map(),
        bookings: new Map()
      });
    });
  
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });
  
    describe('GET /quotes/list', () => {
      test('should return quotes list with pagination', async () => {
        // Arrange
        const req = mockRequest({}, {}, { page: 2, limit: 10 });
        const res = mockResponse();
        
        const quotes = [
          { quoteId: 'q1', premium: 100, toJSON: () => ({ quoteId: 'q1', premium: 100 }) },
          { quoteId: 'q2', premium: 200, toJSON: () => ({ quoteId: 'q2', premium: 200 }) }
        ];
        
        // Mock the database response
        const { models } = await import('../../database/index.js');
        models.Quote.findAndCountAll.mockResolvedValue({
          count: 25,
          rows: quotes
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/quotes/list' && layer.route.methods.get
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(models.Quote.findAndCountAll).toHaveBeenCalledWith({
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 10, // page 2 with limit 10 = offset 10
          paranoid: true
        });
        
        expect(res.json).toHaveBeenCalledWith({
          status: 'success',
          quotes: [
            { quoteId: 'q1', premium: 100 },
            { quoteId: 'q2', premium: 200 }
          ],
          pagination: {
            total: 25,
            page: 2,
            limit: 10,
            pages: 3 // 25 items with 10 per page = 3 pages
          }
        });
      });
      
      test('should handle database errors', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        // Mock a database error
        const { models } = await import('../../database/index.js');
        models.Quote.findAndCountAll.mockRejectedValue(new Error('Database error'));
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/quotes/list' && layer.route.methods.get
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'error',
          error: 'Failed to fetch quotes'
        }));
      });
    });
  
    describe('POST /quotes', () => {
      test('should validate required fields and return 400 if missing', async () => {
        // Arrange
        const req = mockRequest({ shipment: { cargo: {} } });
        const res = mockResponse();
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/quotes' && layer.route.methods.post
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: expect.stringContaining('Missing required field')
        }));
      });
      
      test('should send message to quote-requested queue and handle response', async () => {
        // Arrange
        const freightDetails = {
          shipment: {
            cargo: {
              cargoValue: { value: 10000, currency: 'USD' },
              fullDescriptionOfCargo: 'Test cargo'
            }
          },
          user: { email: 'user@example.com' },
          assured: { name: 'Test Company' }
        };
        
        const req = mockRequest(freightDetails);
        const res = mockResponse();
        
        // Mock Redis response
        redisMock.get.mockImplementation(async (key) => {
          if (key.startsWith('response:')) {
            return JSON.stringify({
              data: {
                quoteId: 'test-quote-id',
                premium: 100,
                currency: 'USD',
                coverageAmount: 10000,
                terms: 'Test terms',
                expiresAt: new Date(Date.now() + 3600000).toISOString()
              }
            });
          }
          return null;
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/quotes' && layer.route.methods.post
        ).handle;
        
        // Act - We need to run the handler but prevent it from waiting for the response
        // by mocking setTimeout
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = jest.fn(fn => fn()); // Execute immediately
        
        await handler(req, res);
        
        // Restore setTimeout
        global.setTimeout = originalSetTimeout;
        
        // Assert
        expect(channelMock.sendToQueue).toHaveBeenCalledWith(
          'quote-requested',
          expect.any(Buffer),
          { persistent: true }
        );
        
        expect(redisMock.set).toHaveBeenCalledWith(
          expect.stringMatching(/^pending:/),
          expect.any(String),
          'EX',
          120
        );
        
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'success',
          quote: expect.objectContaining({
            quoteId: 'test-quote-id',
            premium: 100,
            coverageAmount: 10000
          })
        }));
      });
      
      test('should handle timeout when no response is received', async () => {
        // Arrange
        const freightDetails = {
          shipment: {
            cargo: {
              cargoValue: { value: 10000, currency: 'USD' },
              fullDescriptionOfCargo: 'Test cargo'
            }
          },
          user: { email: 'user@example.com' },
          assured: { name: 'Test Company' }
        };
        
        const req = mockRequest(freightDetails);
        const res = mockResponse();
        
        // Mock Redis to return no response
        redisMock.get.mockResolvedValue(null);
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/quotes' && layer.route.methods.post
        ).handle;
        
        // Act - We need to run the handler but force it to reach the timeout
        // by mocking the attempt counter
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = jest.fn((fn) => {
          // Create a modified version of the function that sets attempts to max
          return fn.toString().includes('attempts++') ? 
            (function() {
              // This will make it reach the timeout condition
              const attemptsPatch = 'attempts = 60;';
              Function('attempts', attemptsPatch + ';' + fn.toString())(60);
            })() : fn();
        });
        
        await handler(req, res);
        
        // Restore setTimeout
        global.setTimeout = originalSetTimeout;
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(408);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: expect.stringContaining('Request timeout')
        }));
      });
    });
  
    describe('GET /quotes/:id', () => {
      test('should return a quote by ID', async () => {
        // Arrange
        const quoteId = 'test-quote-id';
        const req = mockRequest({}, { id: quoteId });
        const res = mockResponse();
        
        // Mock the database service
        DatabaseService.getQuote.mockResolvedValue({
          quoteId,
          premium: 100,
          currency: 'USD',
          coverageAmount: 10000,
          terms: 'Test terms',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: 'active'
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/quotes/:id' && layer.route.methods.get
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(DatabaseService.getQuote).toHaveBeenCalledWith(quoteId);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'success',
          quote: expect.objectContaining({
            quoteId,
            premium: 100,
            coverageAmount: 10000
          })
        }));
      });
      
      test('should return 404 if quote is not found', async () => {
        // Arrange
        const quoteId = 'nonexistent-quote-id';
        const req = mockRequest({}, { id: quoteId });
        const res = mockResponse();
        
        // Mock the database service to reject
        DatabaseService.getQuote.mockRejectedValue(new Error('Quote not found'));
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/quotes/:id' && layer.route.methods.get
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'error',
          error: 'Quote not found'
        }));
      });
    });
  
    describe('POST /bookings', () => {
      test('should validate required fields and return 400 if missing', async () => {
        // Arrange
        const req = mockRequest({ /* No quoteId */ });
        const res = mockResponse();
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/bookings' && layer.route.methods.post
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Missing required field: quoteId'
        }));
      });
      
      test('should check if quote exists and return 404 if not found', async () => {
        // Arrange
        const quoteId = 'nonexistent-quote-id';
        const req = mockRequest({ quoteId });
        const res = mockResponse();
        
        // Mock the database service to reject
        DatabaseService.getQuote.mockRejectedValue(new Error('Quote not found'));
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/bookings' && layer.route.methods.post
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(DatabaseService.getQuote).toHaveBeenCalledWith(quoteId);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Quote not found'
        }));
      });
      
      test('should check if quote is expired and return 400 if expired', async () => {
        // Arrange
        const quoteId = 'expired-quote-id';
        const req = mockRequest({ quoteId });
        const res = mockResponse();
        
        // Mock the database service to return an expired quote
        DatabaseService.getQuote.mockResolvedValue({
          quoteId,
          status: 'expired',
          expiresAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/bookings' && layer.route.methods.post
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Quote has expired'
        }));
      });
      
      test('should send message to booking-requested queue and handle response', async () => {
        // Arrange
        const quoteId = 'valid-quote-id';
        const req = mockRequest({ quoteId });
        const res = mockResponse();
        
        // Mock the database service to return a valid quote
        DatabaseService.getQuote.mockResolvedValue({
          quoteId,
          status: 'active',
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        });
        
        // Mock Redis response
        redisMock.get.mockImplementation(async (key) => {
          if (key.startsWith('response:')) {
            return JSON.stringify({
              data: {
                bookingId: 'test-booking-id',
                quoteId,
                policyNumber: 'POLICY-123',
                certificateUrl: 'https://example.com/certificate.pdf'
              }
            });
          }
          return null;
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/bookings' && layer.route.methods.post
        ).handle;
        
        // Act - We need to run the handler but prevent it from waiting for the response
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = jest.fn(fn => fn()); // Execute immediately
        
        await handler(req, res);
        
        // Restore setTimeout
        global.setTimeout = originalSetTimeout;
        
        // Assert
        expect(channelMock.sendToQueue).toHaveBeenCalledWith(
          'booking-requested',
          expect.any(Buffer),
          { persistent: true }
        );
        
        expect(redisMock.set).toHaveBeenCalledWith(
          expect.stringMatching(/^pending:/),
          expect.any(String),
          'EX',
          120
        );
        
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'success',
          booking: expect.objectContaining({
            bookingId: 'test-booking-id',
            policyNumber: 'POLICY-123',
            certificateUrl: 'https://example.com/certificate.pdf'
          })
        }));
      });
    });
  
    describe('POST /certificates', () => {
      test('should validate required fields and return 400 if missing', async () => {
        // Arrange
        const req = mockRequest({ /* Missing required fields */ });
        const res = mockResponse();
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/certificates' && layer.route.methods.post
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Missing required fields: certificateNumber, userId',
          status: 'error'
        }));
      });
      
      test('should fetch certificate from database if it exists', async () => {
        // Arrange
        const certificateNumber = 'CERT-123';
        const userId = 'user@example.com';
        const req = mockRequest({ certificateNumber, userId });
        const res = mockResponse();
        
        // Mock the database service to return a certificate
        DatabaseService.getCertificate.mockResolvedValue({
          certificateNumber,
          productName: 'Test Product',
          status: 'ACTIVE',
          coverageAmount: 10000,
          premium: 100,
          certificateLink: 'https://example.com/certificate.pdf'
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/certificates' && layer.route.methods.post
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(DatabaseService.getCertificate).toHaveBeenCalledWith(certificateNumber);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'success',
          certificate: expect.objectContaining({
            certificateNumber,
            productName: 'Test Product',
            status: 'ACTIVE'
          })
        }));
      });
      
      test('should fetch certificate from Loadsure API if not in database', async () => {
        // Arrange
        const certificateNumber = 'NEW-CERT-123';
        const userId = 'user@example.com';
        const req = mockRequest({ certificateNumber, userId });
        const res = mockResponse();
        
        // Mock the database service to fail first
        DatabaseService.getCertificate.mockRejectedValueOnce(new Error('Certificate not found'));
        
        // Mock the Loadsure API service
        const LoadsureApiService = await import('../../src/services/loadsureApiService.js');
        const mockApiInstance = LoadsureApiService.default.mock.results[0].value;
        mockApiInstance.getCertificateDetails.mockResolvedValue({
          certificateNumber,
          productName: 'API Product',
          status: 'ACTIVE',
          limit: 10000,
          premium: 100,
          certificateLink: 'https://example.com/new-certificate.pdf'
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/certificates' && layer.route.methods.post
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(mockApiInstance.getCertificateDetails).toHaveBeenCalledWith(
          certificateNumber,
          userId
        );
        
        expect(DatabaseService.saveCertificate).toHaveBeenCalledWith(
          expect.objectContaining({
            certificateNumber,
            productName: 'API Product'
          }),
          expect.any(Object)
        );
        
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'success',
          certificate: expect.objectContaining({
            certificateNumber,
            productName: 'API Product',
            coverageAmount: 10000
          })
        }));
      });
    });
  
    describe('GET /stats', () => {
      test('should return insurance statistics', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        // Mock the database service
        DatabaseService.updateExpiredQuotes.mockResolvedValue(2); // 2 quotes updated
        DatabaseService.getStatistics.mockResolvedValue({
          quotes: {
            total: 100,
            active: 80,
            expired: 15,
            booked: 5
          },
          bookings: {
            total: 5,
            active: 5
          },
          certificates: {
            total: 5
          }
        });
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/stats' && layer.route.methods.get
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(DatabaseService.updateExpiredQuotes).toHaveBeenCalled();
        expect(DatabaseService.getStatistics).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'success',
          stats: expect.objectContaining({
            quotes: expect.objectContaining({
              total: 100,
              active: 80
            })
          })
        }));
      });
      
      test('should handle errors', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        // Mock the database service to throw an error
        DatabaseService.updateExpiredQuotes.mockRejectedValue(new Error('Database error'));
        
        // Get the controller's handler function
        const handler = router.stack.find(layer => 
          layer.route && layer.route.path === '/stats' && layer.route.methods.get
        ).handle;
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'error',
          error: 'Failed to get insurance statistics'
        }));
      });
    });
  });