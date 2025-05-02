// __tests__/services/loadsureService.test.js

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      prefetch: jest.fn(),
      assertQueue: jest.fn().mockResolvedValue({}),
      consume: jest.fn(),
      sendToQueue: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      cancel: jest.fn()
    }),
    on: jest.fn(),
    close: jest.fn()
  })
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG'),
    keys: jest.fn().mockResolvedValue([]),
    quit: jest.fn().mockResolvedValue('OK')
  }));
});

jest.mock('../../src/services/databaseService.js', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(true),
    saveQuote: jest.fn().mockResolvedValue({ quoteId: 'test-quote-id' }),
    saveBooking: jest.fn().mockResolvedValue({ bookingId: 'test-booking-id' }),
    updateExpiredQuotes: jest.fn().mockResolvedValue(0)
  }
}));

jest.mock('../../src/services/loadsureApiService.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      getQuote: jest.fn().mockResolvedValue({
        quoteId: 'test-quote-id',
        premium: 100,
        currency: 'USD',
        coverageAmount: 10000,
        terms: 'Test terms',
        expiresAt: new Date().toISOString(),
        deductible: 0
      }),
      getQuoteFromPrimitives: jest.fn().mockResolvedValue({
        quoteId: 'test-quote-id',
        premium: 100,
        currency: 'USD',
        coverageAmount: 10000,
        terms: 'Test terms',
        expiresAt: new Date().toISOString(),
        deductible: 0
      }),
      bookInsurance: jest.fn().mockResolvedValue({
        bookingId: 'test-booking-id',
        quoteId: 'test-quote-id',
        policyNumber: 'test-policy-number',
        certificateUrl: 'https://example.com/certificate.pdf'
      })
    }))
  };
});

jest.mock('../../src/config.js', () => ({
  __esModule: true,
  default: {
    QUEUE_QUOTE_REQUESTED: 'quote-requested',
    QUEUE_QUOTE_RECEIVED: 'quote-received',
    QUEUE_BOOKING_REQUESTED: 'booking-requested',
    QUEUE_BOOKING_CONFIRMED: 'booking-confirmed',
    LOADSURE_API_KEY: 'test-api-key',
    LOADSURE_BASE_URL: 'https://test-api.com'
  }
}));

// Import after mocks are set up
import { startService, shutdown } from '../../src/services/loadsureService.js';

describe('LoadsureService', () => {
  let mockChannel;
  let mockConnection;
  let services;
  let mockRedis;
  let mockMessageContent;
  let callbackFn;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockChannel = {
      prefetch: jest.fn(),
      assertQueue: jest.fn().mockResolvedValue({}),
      consume: jest.fn((queue, callback) => {
        callbackFn = callback;
        return Promise.resolve({ consumerTag: 'test-consumer' });
      }),
      sendToQueue: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      cancel: jest.fn()
    };
    
    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      on: jest.fn(),
      close: jest.fn()
    };
    
    // Set up mock message content
    mockMessageContent = {
      requestId: 'test-request-id',
      instanceId: 'test-instance',
      payload: {
        freightDetails: {
          isPrimitives: true,
          description: 'Test Cargo',
          value: 10000,
          currency: 'USD'
        }
      }
    };
    
    const Redis = require('ioredis');
    mockRedis = new Redis();
    mockRedis.exists.mockResolvedValue(0); // Not being processed
    
    // Get references to the mocked modules
    const amqplib = require('amqplib');
    amqplib.connect.mockResolvedValue(mockConnection);
    
    // Initialize the service
    services = await startService();
  });

  afterEach(async () => {
    if (services) {
      await shutdown(services);
    }
  });

  test('should initialize correctly', async () => {
    const amqplib = require('amqplib');
    
    // Verify RabbitMQ connection
    expect(amqplib.connect).toHaveBeenCalled();
    expect(mockConnection.createChannel).toHaveBeenCalled();
    
    // Verify channel setup
    expect(mockChannel.prefetch).toHaveBeenCalled();
    expect(mockChannel.assertQueue).toHaveBeenCalledTimes(4); // 4 queues
    
    // Verify consumers
    expect(mockChannel.consume).toHaveBeenCalledTimes(2); // Quote and booking consumers
  });

  test('should process quote requests properly', async () => {
    const DatabaseService = require('../../src/services/databaseService.js').default;
    const LoadsureApiService = require('../../src/services/loadsureApiService.js').default;
    
    // Create a mock message
    const mockMessage = {
      content: Buffer.from(JSON.stringify(mockMessageContent))
    };
    
    // Simulate receiving a message
    await callbackFn(mockMessage);
    
    // Expect Redis to be checked for pending requests
    expect(mockRedis.exists).toHaveBeenCalled();
    
    // Expect API service to be called with the freight details
    const apiInstance = LoadsureApiService.mock.instances[0];
    expect(apiInstance.getQuoteFromPrimitives).toHaveBeenCalled();
    
    // Expect quote to be saved to database
    expect(DatabaseService.saveQuote).toHaveBeenCalled();
    
    // Expect a message to be sent to the quote-received queue
    expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
      'quote-received',
      expect.any(Buffer),
      expect.objectContaining({ persistent: true })
    );
    
    // Expect the message to be acknowledged
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    
    // Expect Redis pending key to be deleted
    expect(mockRedis.del).toHaveBeenCalled();
  });

  test('should handle errors during quote processing', async () => {
    const DatabaseService = require('../../src/services/databaseService.js').default;
    const LoadsureApiService = require('../../src/services/loadsureApiService.js').default;
    
    // Make the API throw an error
    const apiInstance = LoadsureApiService.mock.instances[0];
    apiInstance.getQuoteFromPrimitives.mockRejectedValueOnce(new Error('API Error'));
    
    // Create a mock message
    const mockMessage = {
      content: Buffer.from(JSON.stringify(mockMessageContent))
    };
    
    // Simulate receiving a message
    await callbackFn(mockMessage);
    
    // Expect Redis pending key to be deleted even in case of error
    expect(mockRedis.del).toHaveBeenCalled();
    
    // Expect error handling - should nack the message
    expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    
    // Database save should not be called
    expect(DatabaseService.saveQuote).not.toHaveBeenCalled();
  });

  test('should process booking requests properly', async () => {
    const DatabaseService = require('../../src/services/databaseService.js').default;
    const LoadsureApiService = require('../../src/services/loadsureApiService.js').default;
    
    // Create a booking request message
    const bookingRequestContent = {
      requestId: 'test-booking-request-id',
      instanceId: 'test-instance',
      quoteId: 'test-quote-id'
    };
    
    const mockBookingMessage = {
      content: Buffer.from(JSON.stringify(bookingRequestContent))
    };
    
    // Get the booking consumer callback
    // Since we have multiple consumers, we need to get the right one
    // In loadsureService.js, the second consume call is for bookings
    const bookingConsumerCallback = mockChannel.consume.mock.calls[1][1];
    
    // Simulate receiving a booking message
    await bookingConsumerCallback(mockBookingMessage);
    
    // Expect Redis to be checked for pending requests
    expect(mockRedis.exists).toHaveBeenCalled();
    
    // Expect API service to be called to book the insurance
    const apiInstance = LoadsureApiService.mock.instances[0];
    expect(apiInstance.bookInsurance).toHaveBeenCalledWith('test-quote-id');
    
    // Expect booking to be saved to database
    expect(DatabaseService.saveBooking).toHaveBeenCalled();
    
    // Expect a message to be sent to the booking-confirmed queue
    expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
      'booking-confirmed',
      expect.any(Buffer),
      expect.objectContaining({ persistent: true })
    );
    
    // Expect the message to be acknowledged
    expect(mockChannel.ack).toHaveBeenCalledWith(mockBookingMessage);
  });

  test('should handle errors during booking processing', async () => {
    const DatabaseService = require('../../src/services/databaseService.js').default;
    const LoadsureApiService = require('../../src/services/loadsureApiService.js').default;
    
    // Create a booking request message
    const bookingRequestContent = {
      requestId: 'test-booking-request-id',
      instanceId: 'test-instance',
      quoteId: 'test-quote-id'
    };
    
    const mockBookingMessage = {
      content: Buffer.from(JSON.stringify(bookingRequestContent))
    };
    
    // Make the API throw an error
    const apiInstance = LoadsureApiService.mock.instances[0];
    apiInstance.bookInsurance.mockRejectedValueOnce(new Error('Booking API Error'));
    
    // Get the booking consumer callback
    const bookingConsumerCallback = mockChannel.consume.mock.calls[1][1];
    
    // Simulate receiving a booking message
    await bookingConsumerCallback(mockBookingMessage);
    
    // Expect Redis pending key to be deleted even in case of error
    expect(mockRedis.del).toHaveBeenCalled();
    
    // Expect error handling - should nack the message
    expect(mockChannel.nack).toHaveBeenCalledWith(mockBookingMessage, false, true);
    
    // Database save should not be called
    expect(DatabaseService.saveBooking).not.toHaveBeenCalled();
  });

  test('should gracefully shut down', async () => {
    // Set active jobs to simulate waiting for them to complete
    global.activeJobs = 2;
    
    // Shutdown service
    await shutdown(services);
    
    // Check that connection was closed
    expect(mockConnection.close).toHaveBeenCalled();
    
    // Reset active jobs
    global.activeJobs = 0;
  });

  test('should handle duplicate request processing', async () => {
    const LoadsureApiService = require('../../src/services/loadsureApiService.js').default;
    
    // Make Redis indicate the request is already being processed
    mockRedis.exists.mockResolvedValueOnce(1);
    
    // Create a mock message
    const mockMessage = {
      content: Buffer.from(JSON.stringify(mockMessageContent))
    };
    
    // Simulate receiving a message
    await callbackFn(mockMessage);
    
    // Expect Redis to be checked for pending requests
    expect(mockRedis.exists).toHaveBeenCalled();
    
    // API service should not be called for duplicate requests
    const apiInstance = LoadsureApiService.mock.instances[0];
    expect(apiInstance.getQuoteFromPrimitives).not.toHaveBeenCalled();
    
    // Message should still be acknowledged to remove from queue
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
  });
});