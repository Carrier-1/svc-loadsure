// backend/src/__tests__/unit/services/loadsureApiService.test.js
import { jest } from '@jest/globals';
import supportDataService from '../../../services/supportDataService.js';
import LoadsureApiService from '../../../services/loadsureApiService.js';

// Mock the external dependencies
jest.mock('node-fetch');
jest.mock('../../../services/supportDataService.js');

// Sample API key and base URL for testing
const API_KEY = 'MiphvjLVlwfZHrfhGklLgHzvjxiTbzIunOCrIAizpjVFiiRSufowtNhGGCLAiSmN';
const BASE_URL = 'https://portal.loadsure.net';

describe('LoadsureApiService', () => {
  let loadsureApi;
  let mockFetch;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();

    // Create a new instance of the service for each test
    loadsureApi = new LoadsureApiService(API_KEY, BASE_URL);

    // Mock fetch for dynamic import
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Setup fetch function on the service instance directly for testing
    loadsureApi.initFetch = jest.fn().mockResolvedValue();
    
    // Mock supportDataService methods
    supportDataService.mapFreightClassToCommodity = jest.fn().mockReturnValue(1);
    supportDataService.formatFreightClass = jest.fn(fc => `class${fc.replace('.', '_')}`);
    supportDataService.getLoadTypes = jest.fn().mockReturnValue([
      { id: 'FULL_TRUCKLOAD_1', name: 'Full Truckload' }
    ]);
    supportDataService.getEquipmentTypes = jest.fn().mockReturnValue([
      { id: 2, name: 'Dry Van' }
    ]);
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe('initialization', () => {
    it('should initialize with the provided API key and base URL', () => {
      expect(loadsureApi.apiKey).toBe(API_KEY);
      expect(loadsureApi.baseUrl).toBe(BASE_URL);
    });

    it('should initialize fetch during construction', () => {
      expect(loadsureApi.initFetch).toHaveBeenCalled();
    });
  });

  describe('getQuote', () => {
    it('should send a properly formatted request to the Loadsure API', async () => {
      // Mock the fetch response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          quoteToken: 'test-quote-token',
          insuranceProduct: {
            premium: 150.00,
            currency: 'USD',
            limit: 25000.00,
            description: 'Test insurance terms',
            deductible: 0
          },
          expiresIn: 3600 // 1 hour in seconds
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Sample freight details
      const freightDetails = {
        shipment: {
          cargo: {
            cargoValue: {
              currency: 'USD',
              value: 25000
            },
            fullDescriptionOfCargo: 'Test cargo',
            commodity: [7],
            weight: {
              unit: 'lbs',
              value: 500
            },
            freightClass: [
              { id: 'class70', percentage: 100 }
            ]
          },
          carriers: [
            {
              mode: 'ROAD',
              name: 'Test Carrier',
              equipmentType: 2
            }
          ],
          loadType: 'FULL_TRUCKLOAD_1',
          equipmentType: 2,
          integrationFeeType: 'percentage',
          integrationFeeValue: 0.1
        },
        user: {
          id: 'test-user',
          email: 'test@example.com'
        },
        assured: {
          name: 'Test Company'
        }
      };

      // Call the getQuote method
      const result = await loadsureApi.getQuote(freightDetails);

      // Verify fetch was called with the correct parameters
      expect(mockFetch).toHaveBeenCalledWith(`${BASE_URL}/api/insureLoad/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: expect.any(String)
      });

      // Verify the JSON body
      const parsedBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(parsedBody).toHaveProperty('shipment');
      expect(parsedBody.shipment).toHaveProperty('cargo');
      expect(parsedBody.shipment.cargo).toHaveProperty('cargoValue');
      expect(parsedBody.shipment.cargo.cargoValue.value).toBe(25000);

      // Verify the result is formatted correctly
      expect(result).toEqual({
        quoteId: 'test-quote-token',
        premium: 150.00,
        currency: 'USD',
        coverageAmount: 25000.00,
        terms: 'Test insurance terms',
        expiresAt: expect.any(String), // This will be a calculated date string
        deductible: 0,
        integrationFeeType: 'percentage',
        integrationFeeValue: 0.1
      });
    });

    it('should throw an error if the API response is not successful', async () => {
      // Mock a failed response
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          errors: ['Invalid cargo value']
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Sample freight details
      const freightDetails = {
        shipment: {
          cargo: {
            cargoValue: {
              currency: 'USD',
              value: -100 // Invalid negative value
            },
            fullDescriptionOfCargo: 'Test cargo'
          }
        }
      };

      // Call the getQuote method and expect it to throw
      await expect(loadsureApi.getQuote(freightDetails)).rejects.toThrow();
    });

    it('should throw an error if the API response contains validation errors', async () => {
      // Mock a response with validation errors
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          errors: ['Invalid cargo value']
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Sample freight details
      const freightDetails = {
        shipment: {
          cargo: {
            cargoValue: {
              currency: 'USD',
              value: -100 // Invalid negative value
            },
            fullDescriptionOfCargo: 'Test cargo'
          }
        }
      };

      // Call the getQuote method and expect it to throw
      await expect(loadsureApi.getQuote(freightDetails)).rejects.toThrow();
    });
  });

  describe('getQuoteFromPrimitives', () => {
    it('should convert primitives to a full payload and get a quote', async () => {
      // Mock getQuote to verify it's called with the correct payload
      loadsureApi.getQuote = jest.fn().mockResolvedValue({
        quoteId: 'test-quote-token',
        premium: 150.00,
        currency: 'USD',
        coverageAmount: 25000.00,
        terms: 'Test insurance terms',
        expiresAt: '2023-12-31T00:00:00.000Z',
        deductible: 0
      });

      // Sample primitive freight details
      const primitives = {
        description: 'Test cargo',
        freightClass: '70',
        value: 25000,
        originCity: 'Chicago',
        originState: 'IL',
        destinationCity: 'Denver',
        destinationState: 'CO',
        integrationFeeType: 'percentage',
        integrationFeeValue: 0.1
      };

      // Call the getQuoteFromPrimitives method
      const result = await loadsureApi.getQuoteFromPrimitives(primitives);

      // Verify getQuote was called with a properly converted payload
      expect(loadsureApi.getQuote).toHaveBeenCalledWith(expect.objectContaining({
        isPrimitives: true,
        description: 'Test cargo',
        freightClass: '70',
        value: 25000,
        freightClasses: [{ classId: '70', percentage: 100 }],
        originCity: 'Chicago',
        originState: 'IL',
        destinationCity: 'Denver',
        destinationState: 'CO',
        stops: expect.arrayContaining([
          expect.objectContaining({
            stopType: 'PICKUP',
            address: expect.objectContaining({
              city: 'Chicago',
              state: 'IL'
            })
          }),
          expect.objectContaining({
            stopType: 'DELIVERY',
            address: expect.objectContaining({
              city: 'Denver',
              state: 'CO'
            })
          })
        ]),
        integrationFeeType: 'percentage',
        integrationFeeValue: 0.1
      }));

      // Verify the result matches what getQuote returned
      expect(result).toEqual({
        quoteId: 'test-quote-token',
        premium: 150.00,
        currency: 'USD',
        coverageAmount: 25000.00,
        terms: 'Test insurance terms',
        expiresAt: '2023-12-31T00:00:00.000Z',
        deductible: 0
      });
    });

    it('should handle multiple freight classes and commodities', async () => {
      // Mock getQuote to verify it's called with the correct payload
      loadsureApi.getQuote = jest.fn().mockResolvedValue({
        quoteId: 'test-quote-token',
        premium: 150.00,
        currency: 'USD',
        coverageAmount: 25000.00,
        terms: 'Test insurance terms',
        expiresAt: '2023-12-31T00:00:00.000Z',
        deductible: 0
      });

      // Sample primitive freight details with multiple freight classes and commodities
      const primitives = {
        description: 'Test cargo',
        value: 25000,
        originCity: 'Chicago',
        originState: 'IL',
        destinationCity: 'Denver',
        destinationState: 'CO',
        freightClasses: [
          { classId: '70', percentage: 60 },
          { classId: '85', percentage: 40 }
        ],
        commodities: [
          { id: 7 }, // Electronics
          { id: 15 } // Machinery
        ]
      };

      // Call the getQuoteFromPrimitives method
      const result = await loadsureApi.getQuoteFromPrimitives(primitives);

      // Verify getQuote was called with a payload containing the multiple freight classes and commodities
      expect(loadsureApi.getQuote).toHaveBeenCalledWith(expect.objectContaining({
        freightClasses: [
          { classId: '70', percentage: 60 },
          { classId: '85', percentage: 40 }
        ],
        commodities: [
          { id: 7 },
          { id: 15 }
        ]
      }));

      // Verify the result matches what getQuote returned
      expect(result).toEqual({
        quoteId: 'test-quote-token',
        premium: 150.00,
        currency: 'USD',
        coverageAmount: 25000.00,
        terms: 'Test insurance terms',
        expiresAt: '2023-12-31T00:00:00.000Z',
        deductible: 0
      });
    });
  });

  describe('bookInsurance', () => {
    it('should send a properly formatted booking request to the Loadsure API', async () => {
      // Mock the fetch response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          certificateLink: `${BASE_URL}/certificates/test-certificate.pdf`,
          certificateNumber: 'CERT-12345'
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Sample quote ID
      const quoteId = 'test-quote-token';

      // Call the bookInsurance method
      const result = await loadsureApi.bookInsurance(quoteId);

      // Verify fetch was called with the correct parameters
      expect(mockFetch).toHaveBeenCalledWith(`${BASE_URL}/api/insureLoad/purchaseQuote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          quoteToken: quoteId,
          sendEmailsTo: ["USER", "ASSURED"]
        })
      });

      // Verify the result is formatted correctly
      expect(result).toEqual({
        bookingId: expect.any(String), // UUID generated
        quoteId: 'test-quote-token',
        certificateUrl: `${BASE_URL}/certificates/test-certificate.pdf`,
        policyNumber: 'CERT-12345'
      });
    });

    it('should throw an error if the API response is not successful', async () => {
      // Mock a failed response
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({
          error: 'Quote has expired'
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Sample quote ID
      const quoteId = 'expired-quote-token';

      // Call the bookInsurance method and expect it to throw
      await expect(loadsureApi.bookInsurance(quoteId)).rejects.toThrow();
    });
  });

  describe('buildQuoteRequestPayload', () => {
    it('should convert freight details to the correct Loadsure API payload format', () => {
      // Sample freight details in our internal format
      const freightDetails = {
        description: 'Test cargo',
        class: '70',
        value: 25000,
        currency: 'USD',
        dimensions: {
          length: 48,
          width: 40,
          height: 48,
          unit: 'in'
        },
        weight: {
          value: 500,
          unit: 'lbs'
        },
        origin: 'Chicago, IL',
        destination: 'Denver, CO',
        pickupDate: '2023-12-01',
        deliveryDate: '2023-12-08',
        carrier: {
          name: 'Test Carrier',
          email: 'carrier@example.com',
          phone: '555-123-4567',
          dotNumber: '12345678'
        },
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User'
        },
        assured: {
          name: 'Test Company',
          email: 'company@example.com',
          address: {
            address1: '123 Main St',
            city: 'Chicago',
            state: 'IL',
            postal: '60601',
            country: 'USA'
          }
        }
      };

      // Call the buildQuoteRequestPayload method
      const payload = loadsureApi.buildQuoteRequestPayload(freightDetails);

      // Verify the payload structure
      expect(payload).toHaveProperty('user');
      expect(payload).toHaveProperty('assured');
      expect(payload).toHaveProperty('shipment');
      
      // Verify important payload properties
      expect(payload.user.id).toBe('test-user');
      expect(payload.user.email).toBe('test@example.com');
      expect(payload.assured.name).toBe('Test Company');
      
      expect(payload.shipment.cargo.cargoValue.value).toBe(25000);
      expect(payload.shipment.cargo.cargoValue.currency).toBe('USD');
      expect(payload.shipment.cargo.fullDescriptionOfCargo).toBe('Test cargo');
      
      // Verify that freight class was properly formatted
      expect(supportDataService.formatFreightClass).toHaveBeenCalledWith('70');
      expect(payload.shipment.cargo.freightClass[0].id).toBe('class70');
      expect(payload.shipment.cargo.freightClass[0].percentage).toBe(100);
      
      // Verify stops were created correctly
      expect(payload.shipment.stops).toHaveLength(2);
      expect(payload.shipment.stops[0].stopType).toBe('PICKUP');
      expect(payload.shipment.stops[0].address.city).toBe('Chicago');
      expect(payload.shipment.stops[0].address.state).toBe('IL');
      expect(payload.shipment.stops[1].stopType).toBe('DELIVERY');
      expect(payload.shipment.stops[1].address.city).toBe('Denver');
      expect(payload.shipment.stops[1].address.state).toBe('CO');
      
      // Verify carrier information
      expect(payload.shipment.carriers).toHaveLength(1);
      expect(payload.shipment.carriers[0].name).toBe('Test Carrier');
      expect(payload.shipment.carriers[0].carrierId.type).toBe('USDOT');
      expect(payload.shipment.carriers[0].carrierId.value).toBe('12345678');
    });

    it('should handle more complex freight details with multiple stops and carriers', () => {
      // Sample freight details with multiple stops and carriers
      const freightDetails = {
        description: 'Complex cargo',
        class: '70',
        value: 50000,
        currency: 'USD',
        stops: [
          {
            stopType: 'PICKUP',
            stopNumber: 1,
            date: '2023-12-01',
            address: {
              address1: '123 Origin St',
              city: 'Chicago',
              state: 'IL',
              postal: '60601',
              country: 'USA'
            }
          },
          {
            stopType: 'INTERMEDIATE',
            stopNumber: 2,
            date: '2023-12-05',
            address: {
              address1: '456 Middle St',
              city: 'Indianapolis',
              state: 'IN',
              postal: '46202',
              country: 'USA'
            }
          },
          {
            stopType: 'DELIVERY',
            stopNumber: 3,
            date: '2023-12-10',
            address: {
              address1: '789 Destination Ave',
              city: 'Denver',
              state: 'CO',
              postal: '80202',
              country: 'USA'
            }
          }
        ],
        carriers: [
          {
            mode: 'ROAD',
            name: 'First Mile Carrier',
            email: 'carrier1@example.com',
            phone: '555-123-4567',
            carrierId: {
              type: 'USDOT',
              value: '12345678'
            }
          },
          {
            mode: 'RAIL',
            name: 'Middle Mile Carrier',
            email: 'carrier2@example.com',
            phone: '555-234-5678',
            carrierId: {
              type: 'SCAC',
              value: 'ABCD'
            }
          }
        ],
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User'
        },
        assured: {
          name: 'Test Company',
          email: 'company@example.com'
        }
      };

      // Call the buildQuoteRequestPayload method
      const payload = loadsureApi.buildQuoteRequestPayload(freightDetails);

      // Verify the stops were preserved
      expect(payload.shipment.stops).toHaveLength(3);
      expect(payload.shipment.stops[0].stopType).toBe('PICKUP');
      expect(payload.shipment.stops[1].stopType).toBe('INTERMEDIATE');
      expect(payload.shipment.stops[2].stopType).toBe('DELIVERY');
      
      // Verify the carriers were preserved
      expect(payload.shipment.carriers).toHaveLength(2);
      expect(payload.shipment.carriers[0].mode).toBe('ROAD');
      expect(payload.shipment.carriers[1].mode).toBe('RAIL');
      expect(payload.shipment.carriers[0].name).toBe('First Mile Carrier');
      expect(payload.shipment.carriers[1].name).toBe('Middle Mile Carrier');
    });
  });

  describe('calculateExpiryDate', () => {
    it('should correctly calculate the expiry date based on expiresIn seconds', () => {
      // Mock Date.now to return a consistent value for testing
      const originalDateNow = Date.now;
      const mockNow = new Date('2023-12-01T12:00:00Z').getTime();
      global.Date.now = jest.fn().mockReturnValue(mockNow);
      
      try {
        // Call the calculateExpiryDate method with 1 hour expiry
        const expiryDate = loadsureApi.calculateExpiryDate(3600); // 1 hour in seconds
        
        // The expected result should be 1 hour after the mocked now time
        const expectedDate = new Date(mockNow + 3600 * 1000).toISOString();
        
        expect(expiryDate).toBe(expectedDate);
      } finally {
        // Restore original Date.now
        global.Date.now = originalDateNow;
      }
    });
  });

  describe('getCertificateDetails', () => {
    it('should send a properly formatted request to get certificate details', async () => {
      // Mock the fetch response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          certificateNumber: 'CERT-12345',
          productName: 'Standard Coverage',
          status: 'ACTIVE',
          limit: 25000.00,
          premium: 150.00,
          certificateLink: `${BASE_URL}/certificates/test-certificate.pdf`,
          validFrom: '2023-12-01T00:00:00Z',
          validTo: '2024-12-01T00:00:00Z'
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Sample certificate number and user ID
      const certificateNumber = 'CERT-12345';
      const userId = 'test-user';

      // Call the getCertificateDetails method
      const result = await loadsureApi.getCertificateDetails(certificateNumber, userId);

      // Verify fetch was called with the correct parameters
      expect(mockFetch).toHaveBeenCalledWith(`${BASE_URL}/api/insureLoad/certificateSummary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          userId: userId,
          certificateNumber: certificateNumber
        })
      });

      // Verify the result matches the response
      expect(result).toEqual({
        certificateNumber: 'CERT-12345',
        productName: 'Standard Coverage',
        status: 'ACTIVE',
        limit: 25000.00,
        premium: 150.00,
        certificateLink: `${BASE_URL}/certificates/test-certificate.pdf`,
        validFrom: '2023-12-01T00:00:00Z',
        validTo: '2024-12-01T00:00:00Z'
      });
    });

    it('should throw an error if the API response is not successful', async () => {
      // Mock a failed response
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({
          error: 'Certificate not found'
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Sample certificate number and user ID
      const certificateNumber = 'NONEXISTENT-CERT';
      const userId = 'test-user';

      // Call the getCertificateDetails method and expect it to throw
      await expect(loadsureApi.getCertificateDetails(certificateNumber, userId)).rejects.toThrow();
    });
  });
});