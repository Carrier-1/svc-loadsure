// backend/tests/unit/database/models/Quote.test.js
import { jest } from '@jest/globals';
import { Sequelize } from 'sequelize';

// Mock data
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

// Create a mock Sequelize instance
const mockSequelize = new Sequelize('sqlite::memory:');

describe('Quote Model', () => {
  let Quote;
  
  beforeAll(async () => {
    // Import the Quote model definition
    const defineQuoteModel = (await import('../../backend/backend/database/models/Quote.js')).default;
    
    // Define the model with the mock Sequelize instance
    Quote = defineQuoteModel(mockSequelize);
    
    // Sync the model to create the table
    await Quote.sync({ force: true });
  });
  
  beforeEach(async () => {
    // Clear the table before each test
    await Quote.destroy({ truncate: true });
  });
  
  test('should create a quote with correct fields', async () => {
    const quote = await Quote.create(mockQuoteData);
    
    // Check that the quote was created correctly
    expect(quote.quoteId).toBe(mockQuoteData.quoteId);
    expect(quote.premium).toBe(mockQuoteData.premium);
    expect(quote.currency).toBe(mockQuoteData.currency);
    expect(quote.coverageAmount).toBe(mockQuoteData.coverageAmount);
    expect(quote.terms).toBe(mockQuoteData.terms);
    expect(quote.deductible).toBe(mockQuoteData.deductible);
    expect(quote.integrationFeeType).toBe(mockQuoteData.integrationFeeType);
    expect(quote.integrationFeeValue).toBe(mockQuoteData.integrationFeeValue);
    expect(quote.status).toBe(mockQuoteData.status);
    
    // Check that the timestamps were set
    expect(quote.createdAt).toBeInstanceOf(Date);
    expect(quote.updatedAt).toBeInstanceOf(Date);
  });
  
  test('should calculate integration fee amount before create', async () => {
    // Create a quote without explicitly setting the integration fee amount
    const quote = await Quote.create({
      ...mockQuoteData,
      integrationFeeAmount: null // Explicitly set to null to trigger calculation
    });
    
    // Check that the integration fee amount was calculated correctly
    // Expected: premium * integrationFeeValue = 150.50 * 0.1 = 15.05
    expect(parseFloat(quote.integrationFeeAmount)).toBe(15.05);
  });
  
  test('should set status to expired if expiresAt is in the past', async () => {
    // Create a quote with an expiration date in the past
    const quote = await Quote.create({
      ...mockQuoteData,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
      status: 'active' // Explicitly set to active, but should be changed to expired
    });
    
    // Check that the status was set to expired
    expect(quote.status).toBe('expired');
  });
  
  test('should find quote by quoteId', async () => {
    // Create a quote
    await Quote.create(mockQuoteData);
    
    // Find the quote by quoteId
    const quote = await Quote.findByQuoteId(mockQuoteData.quoteId);
    
    // Check that the quote was found
    expect(quote).not.toBeNull();
    expect(quote.quoteId).toBe(mockQuoteData.quoteId);
  });
  
  test('should update an existing quote', async () => {
    // Create a quote
    const quote = await Quote.create(mockQuoteData);
    
    // Update the quote
    const updatedPremium = 200.00;
    const updatedStatus = 'expired';
    
    await quote.update({
      premium: updatedPremium,
      status: updatedStatus
    });
    
    // Reload the quote from the database to ensure changes were saved
    await quote.reload();
    
    // Check that the quote was updated correctly
    expect(quote.premium).toBe(updatedPremium);
    expect(quote.status).toBe(updatedStatus);
    
    // Check that only the specified fields were updated
    expect(quote.quoteId).toBe(mockQuoteData.quoteId);
    expect(quote.currency).toBe(mockQuoteData.currency);
  });
  
  test('should calculate integration fee amount for fixed type', async () => {
    // Create a quote with fixed integration fee type
    const quote = await Quote.create({
      ...mockQuoteData,
      integrationFeeType: 'fixed',
      integrationFeeValue: 25.00,
      integrationFeeAmount: null // Explicitly set to null to trigger calculation
    });
    
    // Check that the integration fee amount was calculated correctly
    // For fixed type, the amount should be equal to the value
    expect(parseFloat(quote.integrationFeeAmount)).toBe(25.00);
  });
  
  test('should not calculate integration fee amount if already set', async () => {
    // Create a quote with integration fee amount already set
    const presetAmount = 30.00;
    
    const quote = await Quote.create({
      ...mockQuoteData,
      integrationFeeAmount: presetAmount
    });
    
    // Check that the integration fee amount was not recalculated
    expect(parseFloat(quote.integrationFeeAmount)).toBe(presetAmount);
  });
  
  test('should not calculate integration fee if type or value is missing', async () => {
    // Create a quote without integration fee type
    const quote1 = await Quote.create({
      ...mockQuoteData,
      integrationFeeType: null,
      integrationFeeValue: 0.1,
      integrationFeeAmount: null
    });
    
    // Check that no integration fee amount was calculated
    expect(quote1.integrationFeeAmount).toBeNull();
    
    // Create a quote without integration fee value
    const quote2 = await Quote.create({
      ...mockQuoteData,
      integrationFeeType: 'percentage',
      integrationFeeValue: null,
      integrationFeeAmount: null
    });
    
    // Check that no integration fee amount was calculated
    expect(quote2.integrationFeeAmount).toBeNull();
  });
});