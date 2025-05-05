// src/__tests__/mocks/models/Quote.mock.js
// This file provides a mock implementation of the Quote model for tests

export default (sequelize) => {
    // Create a mock Quote model
    const Quote = {
      init: jest.fn(),
      name: 'Quote',
      findOne: jest.fn().mockResolvedValue({
        quoteId: 'QUOTE-12345',
        premium: 100.00,
        currency: 'USD',
        coverageAmount: 10000.00,
        terms: 'Test terms',
        expiresAt: new Date().toISOString(),
        deductible: 0,
        status: 'active',
        integrationFeeType: 'percentage',
        integrationFeeValue: 0.1,
        toJSON: function() { return this; }
      }),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(data => {
        return {
          ...data,
          id: 'uuid-12345',
          createdAt: new Date(),
          updatedAt: new Date(),
          reload: jest.fn(),
          toJSON: function() { return this; }
        };
      }),
      update: jest.fn().mockResolvedValue([1]),
      associate: jest.fn()
    };
    
    // Add the beforeCreate hook implementation
    Quote.beforeCreate = (quote) => {
      // Set expiration status if needed
      if (quote.expiresAt < new Date()) {
        quote.status = 'expired';
      }
  
      // Calculate integration fee amount if not already calculated
      if (quote.integrationFeeType && quote.integrationFeeValue && quote.premium && !quote.integrationFeeAmount) {
        if (quote.integrationFeeType === 'percentage') {
          // For percentage, multiply premium by the percentage value
          quote.integrationFeeAmount = parseFloat(quote.premium) * parseFloat(quote.integrationFeeValue);
        } else if (quote.integrationFeeType === 'fixed') {
          // For fixed amount, just use the value directly
          quote.integrationFeeAmount = parseFloat(quote.integrationFeeValue);
        }
        // Round to 2 decimal places
        quote.integrationFeeAmount = parseFloat(quote.integrationFeeAmount).toFixed(2);
      }
    };
    
    // Add the findByQuoteId class method
    Quote.findByQuoteId = jest.fn().mockImplementation(async (quoteId) => {
      return Quote.findOne({ where: { quoteId } });
    });
    
    return Quote;
  };