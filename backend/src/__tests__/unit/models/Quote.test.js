// backend/__tests__/unit/models/Quote.test.js
import { jest } from '@jest/globals';

// Mock data for Quote model tests
const mockQuoteData = {
  quoteId: 'quote-12345',
  requestId: 'req-12345',
  premium: 150.50,
  currency: 'USD',
  coverageAmount: 25000.00,
  terms: 'These are sample terms and conditions.',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  deductible: 500.00,
  integrationFeeType: 'percentage',
  integrationFeeValue: 0.1,
  requestData: { description: 'Test cargo' },
  responseData: { quoteToken: 'quote-12345' },
  status: 'active'
};

// Mock Sequelize
const mockSequelize = {
  define: jest.fn().mockImplementation((modelName, attributes, options) => {
    // Mock the model definition and instance methods
    const model = {
      init: jest.fn(),
      sync: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation(data => {
        // Clone data and add default properties
        const instance = { 
          ...data,
          id: 'uuid-12345',
          createdAt: new Date(),
          updatedAt: new Date(),
          reload: jest.fn().mockImplementation(() => Promise.resolve(instance)),
          toJSON: jest.fn().mockReturnValue(instance)
        };
        
        // Apply any model hooks
        if (options && options.hooks && options.hooks.beforeCreate) {
          options.hooks.beforeCreate(instance);
        }
        
        return Promise.resolve(instance);
      }),
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where && where.quoteId === mockQuoteData.quoteId) {
          const instance = { 
            ...mockQuoteData,
            id: 'uuid-12345',
            createdAt: new Date(),
            updatedAt: new Date(),
            reload: jest.fn().mockResolvedValue({ ...mockQuoteData }),
            toJSON: jest.fn().mockReturnValue({ ...mockQuoteData })
          };
          return Promise.resolve(instance);
        }
        return Promise.resolve(null);
      }),
      findByQuoteId: jest.fn().mockImplementation(quoteId => {
        if (quoteId === mockQuoteData.quoteId) {
          return Promise.resolve({
            ...mockQuoteData,
            id: 'uuid-12345',
            reload: jest.fn().mockResolvedValue({ ...mockQuoteData }),
            toJSON: jest.fn().mockReturnValue({ ...mockQuoteData })
          });
        }
        return Promise.resolve(null);
      }),
      destroy: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue([1])
    };
    
    // Add any custom model methods defined in the returned model
    return model;
  }),
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

// Import the Quote model definition
import defineQuoteModel from '../../../database/models/Quote.js';

describe('Quote Model', () => {
  let Quote;
  
  beforeAll(() => {
    // Define the Quote model using the mock Sequelize
    Quote = defineQuoteModel(mockSequelize);
  });
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  test('should create a quote with correct fields', async () => {
    // Create a quote
    const quote = await Quote.create(mockQuoteData);
    
    // Check that create was called with the correct data
    expect(Quote.create).toHaveBeenCalledWith(mockQuoteData);
    
    // Verify the returned quote has expected properties
    expect(quote.quoteId).toBe(mockQuoteData.quoteId);
    expect(quote.premium).toBe(mockQuoteData.premium);
    expect(quote.currency).toBe(mockQuoteData.currency);
  });
  
  test('should calculate integration fee amount before create', async () => {
    // Create mock hook to test
    const beforeCreateHook = mockSequelize.define.mock.calls[0][2].hooks.beforeCreate;
    
    // Create a quote object without integrationFeeAmount
    const quote = {
      ...mockQuoteData,
      integrationFeeAmount: null,
      // Add values to test calculation
      premium: 100.00,
      integrationFeeType: 'percentage',
      integrationFeeValue: 0.15
    };
    
    // Call the hook manually
    beforeCreateHook(quote);
    
    // Check that the integration fee was calculated correctly (100 * 0.15 = 15)
    expect(parseFloat(quote.integrationFeeAmount)).toBe(15);
  });
  
  test('should set status to expired if expiresAt is in the past', async () => {
    // Create mock hook to test
    const beforeCreateHook = mockSequelize.define.mock.calls[0][2].hooks.beforeCreate;
    
    // Create a quote with expiry in the past
    const quote = {
      ...mockQuoteData,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
      status: 'active'
    };
    
    // Call the hook manually
    beforeCreateHook(quote);
    
    // Check that status was set to expired
    expect(quote.status).toBe('expired');
  });
  
  test('should find quote by quoteId', async () => {
    // Use the mock findByQuoteId we defined above
    const quote = await Quote.findByQuoteId(mockQuoteData.quoteId);
    
    // Check that the method was called with the correct ID
    expect(Quote.findByQuoteId).toHaveBeenCalledWith(mockQuoteData.quoteId);
    
    // Verify the quote was found and has the correct properties
    expect(quote).not.toBeNull();
    expect(quote.quoteId).toBe(mockQuoteData.quoteId);
  });

  test('should calculate integration fee amount for fixed type', async () => {
    // Create mock hook to test
    const beforeCreateHook = mockSequelize.define.mock.calls[0][2].hooks.beforeCreate;
    
    // Create a quote with fixed fee
    const quote = {
      ...mockQuoteData,
      integrationFeeAmount: null,
      integrationFeeType: 'fixed',
      integrationFeeValue: 25.00
    };
    
    // Call the hook manually
    beforeCreateHook(quote);
    
    // Check that the integration fee was set to the fixed value
    expect(parseFloat(quote.integrationFeeAmount)).toBe(25.00);
  });
  
  test('should not calculate integration fee if already set', async () => {
    // Create mock hook to test
    const beforeCreateHook = mockSequelize.define.mock.calls[0][2].hooks.beforeCreate;
    
    // Create a quote with fee already set
    const quote = {
      ...mockQuoteData,
      integrationFeeAmount: 30.00,
      integrationFeeType: 'percentage',
      integrationFeeValue: 0.1
    };
    
    // Call the hook manually
    beforeCreateHook(quote);
    
    // Check that the fee wasn't changed
    expect(parseFloat(quote.integrationFeeAmount)).toBe(30.00);
  });
});