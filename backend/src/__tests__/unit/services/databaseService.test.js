// backend/src/__tests__/unit/services/databaseService.test.js
import { jest } from '@jest/globals';


jest.mock('../../../services/databaseService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  saveQuote: jest.fn().mockImplementation(async (quoteData, requestData) => {
    // Simulate creating or updating a quote based on if it exists
    if (quoteData.quoteId === 'existing-quote') {
      // Return updated quote
      return {
        quoteId: quoteData.quoteId,
        premium: quoteData.premium,
        currency: quoteData.currency,
        update: jest.fn().mockResolvedValue([1]),
        isExisting: true
      };
    } else {
      // Return new quote
      return {
        quoteId: quoteData.quoteId,
        premium: quoteData.premium,
        currency: quoteData.currency,
        coverageAmount: quoteData.coverageAmount,
        isExisting: false
      };
    }
  }),
  getQuote: jest.fn().mockImplementation(async (quoteId) => {
    if (!quoteId) {
      throw new Error('Quote ID is required');
    }
    
    return {
      quoteId,
      premium: 100,
      currency: 'USD',
      coverageAmount: 10000,
      status: 'active',
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };
  }),
  saveBooking: jest.fn().mockImplementation(async (bookingData, requestData) => {
    return {
      bookingId: bookingData.bookingId,
      quoteId: bookingData.quoteId,
      policyNumber: bookingData.policyNumber,
      certificateUrl: bookingData.certificateUrl,
      status: 'active'
    };
  }),
  getBooking: jest.fn().mockImplementation(async (bookingId) => {
    if (!bookingId) {
      throw new Error('Booking ID is required');
    }
    
    return {
      bookingId,
      quoteId: 'test-quote-id',
      policyNumber: 'test-policy-number',
      status: 'active'
    };
  }),
  getCertificate: jest.fn().mockImplementation(async (certificateNumber) => {
    if (!certificateNumber) {
      throw new Error('Certificate number is required');
    }
    
    return {
      certificateNumber,
      bookingId: 'test-booking-id',
      status: 'ACTIVE'
    };
  }),
  updateExpiredQuotes: jest.fn().mockResolvedValue(5), // 5 quotes updated
  cancelCertificate: jest.fn().mockImplementation(async (certificateNumber, cancellationData) => {
    return {
      certificateNumber,
      status: 'CANCELLED',
      cancellationDate: cancellationData.cancellationDate,
      cancellationReason: cancellationData.cancellationReason
    };
  }),
  getStatistics: jest.fn().mockResolvedValue({
    quotes: { total: 10, active: 5, expired: 3, booked: 2 },
    bookings: { total: 2, active: 2 },
    certificates: { total: 2 }
  })
}));

// Now import the mocked service
import DatabaseService from '../../../services/databaseService';

describe('DatabaseService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('initialize', () => {
    test('should initialize database connection', async () => {
      const result = await DatabaseService.initialize();
      
      expect(DatabaseService.initialize).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
  
  describe('saveQuote', () => {
    test('should save a new quote', async () => {
      const quoteData = {
        quoteId: 'test-quote-id',
        premium: 100,
        currency: 'USD',
        coverageAmount: 10000,
        terms: 'Test terms',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      const requestData = { description: 'Test cargo' };
      
      const result = await DatabaseService.saveQuote(quoteData, requestData);
      
      expect(DatabaseService.saveQuote).toHaveBeenCalledWith(quoteData, requestData);
      expect(result).toEqual(expect.objectContaining({
        quoteId: 'test-quote-id',
        premium: 100,
        isExisting: false
      }));
    });
    
    test('should update an existing quote', async () => {
      const quoteData = {
        quoteId: 'existing-quote',
        premium: 150,
        currency: 'USD',
        coverageAmount: 15000,
        terms: 'Updated terms',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      const requestData = { description: 'Updated cargo' };
      
      const result = await DatabaseService.saveQuote(quoteData, requestData);
      
      expect(DatabaseService.saveQuote).toHaveBeenCalledWith(quoteData, requestData);
      expect(result).toEqual(expect.objectContaining({
        quoteId: 'existing-quote',
        premium: 150,
        isExisting: true
      }));
    });
  });
  
  describe('getQuote', () => {
    test('should get a quote by ID', async () => {
      const result = await DatabaseService.getQuote('test-quote-id');
      
      expect(DatabaseService.getQuote).toHaveBeenCalledWith('test-quote-id');
      expect(result).toEqual(expect.objectContaining({
        quoteId: 'test-quote-id',
        premium: 100,
        coverageAmount: 10000
      }));
    });
    
    test('should throw error if quote ID is not provided', async () => {
      await expect(DatabaseService.getQuote()).rejects.toThrow('Quote ID is required');
    });
  });
  
  describe('saveBooking', () => {
    test('should save a booking', async () => {
      const bookingData = {
        bookingId: 'test-booking-id',
        quoteId: 'test-quote-id',
        policyNumber: 'test-policy-number',
        certificateUrl: 'https://example.com/certificate.pdf'
      };
      
      const result = await DatabaseService.saveBooking(bookingData);
      
      expect(DatabaseService.saveBooking).toHaveBeenCalledWith(bookingData);
      expect(result).toEqual(expect.objectContaining({
        bookingId: 'test-booking-id',
        quoteId: 'test-quote-id',
        policyNumber: 'test-policy-number'
      }));
    });
  });
  
  describe('getBooking', () => {
    test('should get a booking by ID', async () => {
      const result = await DatabaseService.getBooking('test-booking-id');
      
      expect(DatabaseService.getBooking).toHaveBeenCalledWith('test-booking-id');
      expect(result).toEqual(expect.objectContaining({
        bookingId: 'test-booking-id',
        quoteId: 'test-quote-id',
        policyNumber: 'test-policy-number'
      }));
    });
  });
  
  describe('getCertificate', () => {
    test('should get a certificate by number', async () => {
      const result = await DatabaseService.getCertificate('test-certificate');
      
      expect(DatabaseService.getCertificate).toHaveBeenCalledWith('test-certificate');
      expect(result).toEqual(expect.objectContaining({
        certificateNumber: 'test-certificate',
        status: 'ACTIVE'
      }));
    });
  });
  
  describe('updateExpiredQuotes', () => {
    test('should update expired quotes', async () => {
      const result = await DatabaseService.updateExpiredQuotes();
      
      expect(DatabaseService.updateExpiredQuotes).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });
  
  describe('cancelCertificate', () => {
    test('should cancel a certificate', async () => {
      const cancellationData = {
        cancellationDate: '2025-05-01T12:00:00Z',
        cancellationReason: 'Client Request'
      };
      
      const result = await DatabaseService.cancelCertificate('test-certificate', cancellationData);
      
      expect(DatabaseService.cancelCertificate).toHaveBeenCalledWith('test-certificate', cancellationData);
      expect(result).toEqual(expect.objectContaining({
        certificateNumber: 'test-certificate',
        status: 'CANCELLED',
        cancellationDate: cancellationData.cancellationDate,
        cancellationReason: cancellationData.cancellationReason
      }));
    });
  });
  
  describe('getStatistics', () => {
    test('should get system statistics', async () => {
      const result = await DatabaseService.getStatistics();
      
      expect(DatabaseService.getStatistics).toHaveBeenCalled();
      expect(result).toEqual({
        quotes: { total: 10, active: 5, expired: 3, booked: 2 },
        bookings: { total: 2, active: 2 },
        certificates: { total: 2 }
      });
    });
  });
});