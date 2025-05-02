// backend/src/__tests__/unit/services/databaseService.test.js
import { jest } from '@jest/globals';
import { mockDatabase, mockQuote, mockBooking, mockCertificate } from '../../../mocks/db.mock.js';

// Mock the database module
jest.mock('../../../database/index.js', () => mockDatabase);

// Import the service to test after mocking
import DatabaseService from '../../../services/databaseService.js';

describe('DatabaseService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the database connection', async () => {
      // Test initialization
      await expect(DatabaseService.initialize()).resolves.not.toThrow();
      
      // Expect authenticate to have been called
      expect(mockDatabase.testConnection).toHaveBeenCalledTimes(1);
    });

    it('should handle database initialization errors', async () => {
      // Mock testConnection to throw an error
      mockDatabase.testConnection.mockRejectedValueOnce(new Error('Connection error'));
      
      // Test that the error is properly handled
      await expect(DatabaseService.initialize()).rejects.toThrow('Connection error');
    });
  });

  describe('saveQuote', () => {
    it('should save a new quote', async () => {
      // Mock Quote.findOne to return null (quote doesn't exist)
      mockDatabase.models.Quote.findOne.mockResolvedValueOnce(null);
      
      // Create test data
      const quoteData = {
        quoteId: 'NEW-QUOTE-12345',
        requestId: 'REQ-12345',
        premium: 150.00,
        currency: 'USD',
        coverageAmount: 15000.00,
        terms: 'Test terms',
        expiresAt: new Date().toISOString(),
        deductible: 0,
        integrationFeeType: 'percentage',
        integrationFeeValue: 0.1
      };
      
      const requestData = {
        description: 'Test cargo',
        value: 15000
      };
      
      // Call the method
      const result = await DatabaseService.saveQuote(quoteData, requestData);
      
      // Check that Quote.create was called
      expect(mockDatabase.models.Quote.findOne).toHaveBeenCalledWith({ where: { quoteId: 'NEW-QUOTE-12345' } });
      expect(mockDatabase.models.Quote.create).toHaveBeenCalledTimes(1);
      expect(mockDatabase.models.Quote.create).toHaveBeenCalledWith(expect.objectContaining({
        quoteId: 'NEW-QUOTE-12345',
        requestData,
        responseData: quoteData
      }));
      
      // Check the return value
      expect(result).toEqual(mockQuote);
    });

    it('should update an existing quote', async () => {
      // Mock data for update scenario
      const existingQuote = { ...mockQuote, update: jest.fn().mockResolvedValue(mockQuote) };
      mockDatabase.models.Quote.findOne.mockResolvedValueOnce(existingQuote);
      
      const quoteData = {
        quoteId: 'QUOTE-12345',
        requestId: 'REQ-12345',
        premium: 120.00, // Updated premium
        currency: 'USD',
        coverageAmount: 12000.00, // Updated coverage
        terms: 'Updated terms',
        expiresAt: new Date().toISOString(),
        deductible: 0
      };
      
      const requestData = {
        description: 'Updated cargo description',
        value: 12000
      };
      
      // Call the method
      const result = await DatabaseService.saveQuote(quoteData, requestData);
      
      // Check that Quote.update was called via the instance update method
      expect(existingQuote.update).toHaveBeenCalledWith(expect.objectContaining({
        premium: 120.00,
        coverageAmount: 12000.00,
        terms: 'Updated terms',
        requestData,
        responseData: quoteData
      }));
      
      // Check that create was not called
      expect(mockDatabase.models.Quote.create).not.toHaveBeenCalled();
      
      // Check the return value
      expect(result).toEqual(mockQuote);
    });

    it('should handle errors when saving quotes', async () => {
      // Mock Quote.findOne to throw an error
      mockDatabase.models.Quote.findOne.mockRejectedValueOnce(new Error('Database error'));
      
      // Test that the error is properly handled
      await expect(DatabaseService.saveQuote({}, {})).rejects.toThrow('Database error');
    });
  });

  describe('getQuote', () => {
    it('should retrieve a quote by ID', async () => {
      // Call the method
      const result = await DatabaseService.getQuote('QUOTE-12345');
      
      // Check that findOne was called with the correct parameters
      expect(mockDatabase.models.Quote.findOne).toHaveBeenCalledWith({ where: { quoteId: 'QUOTE-12345' } });
      
      // Check the return value
      expect(result).toEqual(mockQuote);
    });

    it('should throw an error if quote not found', async () => {
      // Mock Quote.findOne to return null
      mockDatabase.models.Quote.findOne.mockResolvedValueOnce(null);
      
      // Test that the method throws an error when quote is not found
      await expect(DatabaseService.getQuote('NONEXISTENT-QUOTE')).rejects.toThrow(
        'Quote with ID NONEXISTENT-QUOTE not found'
      );
    });
  });

  describe('saveBooking', () => {
    it('should save a new booking', async () => {
      // Mock Booking.findOne to return null (booking doesn't exist)
      mockDatabase.models.Booking.findOne.mockResolvedValueOnce(null);
      
      // Set up mock Quote.findOne to return a quote
      mockDatabase.models.Quote.findOne.mockResolvedValueOnce({
        ...mockQuote,
        update: jest.fn().mockResolvedValue(mockQuote)
      });
      
      // Create test data
      const bookingData = {
        bookingId: 'NEW-BOOKING-67890',
        requestId: 'REQ-67890',
        quoteId: 'QUOTE-12345',
        policyNumber: 'POLICY-67890',
        certificateUrl: 'https://test.loadsure.net/certificates/POLICY-67890.pdf'
      };
      
      const requestData = {
        quoteId: 'QUOTE-12345'
      };
      
      // Call the method
      const result = await DatabaseService.saveBooking(bookingData, requestData);
      
      // Check that Booking.create was called
      expect(mockDatabase.models.Booking.findOne).toHaveBeenCalledWith({ where: { bookingId: 'NEW-BOOKING-67890' } });
      expect(mockDatabase.models.Booking.create).toHaveBeenCalledTimes(1);
      expect(mockDatabase.models.Booking.create).toHaveBeenCalledWith(expect.objectContaining({
        bookingId: 'NEW-BOOKING-67890',
        quoteId: 'QUOTE-12345',
        requestData,
        responseData: bookingData
      }));
      
      // Check that Quote.update was called to mark quote as booked
      expect(mockDatabase.models.Quote.findOne).toHaveBeenCalledWith({ where: { quoteId: 'QUOTE-12345' } });
      expect(mockQuote.update).toHaveBeenCalledWith({ status: 'booked' });
      
      // Check that Certificate.create was called
      expect(mockDatabase.models.Certificate.create).toHaveBeenCalledTimes(1);
      expect(mockDatabase.models.Certificate.create).toHaveBeenCalledWith(expect.objectContaining({
        certificateNumber: 'POLICY-67890',
        bookingId: 'NEW-BOOKING-67890'
      }));
      
      // Check the return value
      expect(result).toEqual(mockBooking);
    });

    it('should update an existing booking', async () => {
      // Mock existing booking
      const existingBooking = { ...mockBooking, update: jest.fn().mockResolvedValue(mockBooking) };
      mockDatabase.models.Booking.findOne.mockResolvedValueOnce(existingBooking);
      
      const bookingData = {
        bookingId: 'BOOKING-67890',
        requestId: 'REQ-67890',
        quoteId: 'QUOTE-12345',
        policyNumber: 'POLICY-67890',
        certificateUrl: 'https://test.loadsure.net/certificates/POLICY-67890.pdf'
      };
      
      const requestData = {
        quoteId: 'QUOTE-12345'
      };
      
      // Call the method
      const result = await DatabaseService.saveBooking(bookingData, requestData);
      
      // Check that booking.update was called with correct parameters
      expect(existingBooking.update).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'REQ-67890',
        quoteId: 'QUOTE-12345',
        policyNumber: 'POLICY-67890',
        certificateUrl: 'https://test.loadsure.net/certificates/POLICY-67890.pdf',
        requestData,
        responseData: bookingData
      }));
      
      // Check that create was not called
      expect(mockDatabase.models.Booking.create).not.toHaveBeenCalled();
      
      // Check the return value
      expect(result).toEqual(mockBooking);
    });

    it('should handle errors when saving bookings', async () => {
      // Mock Booking.findOne to throw an error
      mockDatabase.models.Booking.findOne.mockRejectedValueOnce(new Error('Database error'));
      
      // Test that the error is properly handled
      await expect(DatabaseService.saveBooking({}, {})).rejects.toThrow('Database error');
    });
  });

  describe('getBooking', () => {
    it('should retrieve a booking by ID', async () => {
      // Call the method
      const result = await DatabaseService.getBooking('BOOKING-67890');
      
      // Check that findOne was called with the correct parameters
      expect(mockDatabase.models.Booking.findOne).toHaveBeenCalledWith({ where: { bookingId: 'BOOKING-67890' } });
      
      // Check the return value
      expect(result).toEqual(mockBooking);
    });

    it('should throw an error if booking not found', async () => {
      // Mock Booking.findOne to return null
      mockDatabase.models.Booking.findOne.mockResolvedValueOnce(null);
      
      // Test that the method throws an error when booking is not found
      await expect(DatabaseService.getBooking('NONEXISTENT-BOOKING')).rejects.toThrow(
        'Booking with ID NONEXISTENT-BOOKING not found'
      );
    });
  });

  describe('updateExpiredQuotes', () => {
    it('should update expired quotes', async () => {
      // Mock Quote.update to simulate updating 3 expired quotes
      mockDatabase.models.Quote.update.mockResolvedValueOnce([3]);
      
      // Call the method
      const count = await DatabaseService.updateExpiredQuotes();
      
      // Check that update was called with correct parameters
      expect(mockDatabase.models.Quote.update).toHaveBeenCalledWith(
        { status: 'expired' },
        { where: expect.any(Object) }
      );
      
      // Check the return value
      expect(count).toBe(3);
    });

    it('should handle errors when updating expired quotes', async () => {
      // Mock Quote.update to throw an error
      mockDatabase.models.Quote.update.mockRejectedValueOnce(new Error('Database error'));
      
      // Test that the error is properly handled
      await expect(DatabaseService.updateExpiredQuotes()).rejects.toThrow('Database error');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics about the database', async () => {
      // Mock various count methods
      mockDatabase.models.Quote.count.mockImplementation((options) => {
        if (!options || !options.where) return 10;
        if (options.where.status === 'active') return 5;
        if (options.where.status === 'expired') return 3;
        if (options.where.status === 'booked') return 2;
        return 0;
      });
      
      mockDatabase.models.Booking.count.mockImplementation((options) => {
        if (!options || !options.where) return 5;
        if (options.where.status === 'active') return 5;
        return 0;
      });
      
      mockDatabase.models.Certificate.count.mockResolvedValueOnce(5);
      
      // Call the method
      const stats = await DatabaseService.getStatistics();
      
      // Check that count methods were called
      expect(mockDatabase.models.Quote.count).toHaveBeenCalledTimes(4);
      expect(mockDatabase.models.Booking.count).toHaveBeenCalledTimes(2);
      expect(mockDatabase.models.Certificate.count).toHaveBeenCalledTimes(1);
      
      // Check the return value structure
      expect(stats).toEqual({
        quotes: {
          total: 10,
          active: 5,
          expired: 3,
          booked: 2
        },
        bookings: {
          total: 5,
          active: 5
        },
        certificates: {
          total: 5
        }
      });
    });

    it('should handle errors when getting statistics', async () => {
      // Mock Quote.count to throw an error
      mockDatabase.models.Quote.count.mockRejectedValueOnce(new Error('Database error'));
      
      // Test that the error is properly handled
      await expect(DatabaseService.getStatistics()).rejects.toThrow('Database error');
    });
  });
});