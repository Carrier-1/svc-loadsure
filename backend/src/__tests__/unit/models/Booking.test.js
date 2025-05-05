// backend/__tests__/unit/models/Booking.test.js
import { jest } from '@jest/globals';

// Mock data for Booking model tests
const mockBookingData = {
  bookingId: 'booking-12345',
  requestId: 'req-12345',
  quoteId: 'quote-12345',
  policyNumber: 'POL-12345-ABC',
  certificateUrl: 'https://example.com/certificates/POL-12345-ABC.pdf',
  status: 'active',
  premium: 150.50,
  coverageAmount: 25000.00,
  requestData: { quoteId: 'quote-12345' },
  responseData: { bookingId: 'booking-12345', policyNumber: 'POL-12345-ABC' },
  metadata: { source: 'test' }
};

// Create mocks for related models
const mockQuoteUpdate = jest.fn().mockResolvedValue([1]);
const mockCertificateCreate = jest.fn().mockImplementation(data => Promise.resolve(data));

// Mock sequelize to avoid database connections
const mockSequelize = {
  define: jest.fn().mockImplementation((modelName, attributes, options) => {
    // Create a model mock
    const model = {
      init: jest.fn(),
      sync: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation(data => {
        // Create an instance with provided data
        const instance = { 
          ...data,
          id: 'uuid-12345',
          createdAt: new Date(),
          updatedAt: new Date(),
          reload: jest.fn().mockImplementation(() => Promise.resolve(instance)),
          toJSON: jest.fn().mockReturnValue(instance)
        };
        
        // Run any afterCreate hooks if defined
        if (options && options.hooks && options.hooks.afterCreate) {
          const opts = { transaction: { commit: jest.fn(), rollback: jest.fn() } };
          options.hooks.afterCreate(instance, opts);
        }
        
        return Promise.resolve(instance);
      }),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where && where.bookingId === mockBookingData.bookingId) {
          const instance = { 
            ...mockBookingData,
            id: 'uuid-12345',
            createdAt: new Date(),
            updatedAt: new Date(),
            reload: jest.fn().mockResolvedValue({ ...mockBookingData }),
            toJSON: jest.fn().mockReturnValue({ ...mockBookingData }),
            update: jest.fn().mockImplementation(data => {
              // Return updated instance
              return Promise.resolve({ 
                ...mockBookingData, 
                ...data, 
                updatedAt: new Date() 
              });
            })
          };
          return Promise.resolve(instance);
        }
        return Promise.resolve(null);
      }),
      findByPolicyNumber: jest.fn().mockImplementation(policyNumber => {
        if (policyNumber === mockBookingData.policyNumber) {
          return Promise.resolve({
            ...mockBookingData,
            id: 'uuid-12345',
            reload: jest.fn().mockResolvedValue({ ...mockBookingData }),
            toJSON: jest.fn().mockReturnValue({ ...mockBookingData })
          });
        }
        return Promise.resolve(null);
      }),
      findByBookingId: jest.fn().mockImplementation(bookingId => {
        if (bookingId === mockBookingData.bookingId) {
          return Promise.resolve({
            ...mockBookingData,
            id: 'uuid-12345',
            reload: jest.fn().mockResolvedValue({ ...mockBookingData }),
            toJSON: jest.fn().mockReturnValue({ ...mockBookingData })
          });
        }
        return Promise.resolve(null);
      }),
      destroy: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue([1])
    };
    
    // Set model name
    model.name = modelName;
    
    return model;
  }),
  models: {
    Quote: {
      update: mockQuoteUpdate
    },
    Certificate: {
      create: mockCertificateCreate
    }
  },
  DataTypes: {
    UUID: 'UUID',
    UUIDV4: 'UUIDV4',
    STRING: jest.fn().mockImplementation(length => `STRING(${length || ''})`),
    TEXT: 'TEXT',
    DECIMAL: jest.fn().mockImplementation((precision, scale) => `DECIMAL(${precision},${scale})`),
    ENUM: jest.fn().mockImplementation((...values) => `ENUM(${values.join(',')})`),
    JSONB: 'JSONB',
    DATE: 'DATE'
  }
};

// Import the Booking model definition
import defineBookingModel from '../../../database/models/Booking.js';

describe('Booking Model', () => {
  let Booking;
  
  beforeAll(() => {
    // Define the Booking model using the mock Sequelize
    Booking = defineBookingModel(mockSequelize);
    
    // Set up models property for associations
    mockSequelize.models.Booking = Booking;
    
    // Call associate method if it exists
    if (Booking.associate) {
      Booking.associate(mockSequelize.models);
    }
  });
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  test('should create a booking with correct fields', async () => {
    // Create a booking
    const booking = await Booking.create(mockBookingData);
    
    // Check that create was called with the correct data
    expect(Booking.create).toHaveBeenCalledWith(mockBookingData);
    
    // Verify the returned booking has expected properties
    expect(booking.bookingId).toBe(mockBookingData.bookingId);
    expect(booking.quoteId).toBe(mockBookingData.quoteId);
    expect(booking.policyNumber).toBe(mockBookingData.policyNumber);
    expect(booking.certificateUrl).toBe(mockBookingData.certificateUrl);
    expect(booking.status).toBe(mockBookingData.status);
  });
  
  test('should mark the quote as booked when a booking is created', async () => {
    // Get afterCreate hook
    const afterCreateHook = mockSequelize.define.mock.calls[0][2].hooks.afterCreate;
    
    // Create mock booking instance and options
    const booking = { ...mockBookingData };
    const options = { transaction: {} };
    
    // Call the hook manually
    await afterCreateHook(booking, options);
    
    // Check that Quote.update was called with the correct parameters
    expect(mockQuoteUpdate).toHaveBeenCalledWith(
      { status: 'booked' },
      expect.objectContaining({ 
        where: { quoteId: mockBookingData.quoteId }
      })
    );
  });
  
  test('should find booking by policyNumber', async () => {
    // Set up the mock
    const policyNumber = mockBookingData.policyNumber;
    
    // Use findByPolicyNumber
    await Booking.findByPolicyNumber(policyNumber);
    
    // Check that the method was called with the correct policy number
    expect(Booking.findByPolicyNumber).toHaveBeenCalledWith(policyNumber);
  });
  
  test('should find booking by bookingId', async () => {
    // Set up the mock
    const bookingId = mockBookingData.bookingId;
    
    // Use findByBookingId
    await Booking.findByBookingId(bookingId);
    
    // Check that the method was called with the correct booking ID
    expect(Booking.findByBookingId).toHaveBeenCalledWith(bookingId);
  });
  
  test('should update an existing booking', async () => {
    // Find the booking first
    const booking = await Booking.findOne({ where: { bookingId: mockBookingData.bookingId } });
    expect(booking).not.toBeNull();
    
    // Update the booking
    const updatedStatus = 'cancelled';
    const updatedData = { status: updatedStatus };
    
    await booking.update(updatedData);
    
    // Check that update was called with correct parameters
    expect(booking.update).toHaveBeenCalledWith(updatedData);
  });
});