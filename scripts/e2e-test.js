// e2e-test.js
// End-to-end test script for Loadsure Insurance Integration

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const NUM_OF_TESTS = 3; // Number of times to run the full test suite
const DELAY_BETWEEN_TESTS = 2000; // Delay between test runs in milliseconds

/**
 * Sleep function for adding delays
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random test ID to track the test run
 */
function generateTestId() {
  return `test-${Date.now()}-${uuidv4().substring(0, 8)}`;
}

/**
 * Generate a random cancellation reason
 * @returns {string} Random cancellation reason
 */
function generateRandomCancellationReason() {
  const reasons = [
    "CANASD",
    "CANNLN",
    "CANPIE",
    "CANCHP",
    "CANVAL",
    "CANREQ",
    "CANCOP",
    "CANREP",
    "CANOTH"
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

/**
 * Create a test payload with unique values including all fields the UI accepts
 * @param {string} testId - Test ID for tracking
 * @returns {Object} Test payload
 */
function createTestPayload(testId) {
  // Create a timestamp-based ID for freight and PO
  const timestamp = Date.now();
  const freightId = `FR-${timestamp}`;
  const poNumber = `PO-${timestamp}`;
  
  // Generate pickup and delivery dates (today and a week from today)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const pickupDate = today.toISOString().split('T')[0];
  const deliveryDate = nextWeek.toISOString().split('T')[0];
  
  return {
    // Main freight details
    description: `Test Cargo ${testId}`,
    value: 25000 + Math.floor(Math.random() * 10000), // Random value between 25000 and 35000
    currency: "USD",
    
    // Dimension information
    dimensionLength: 48,
    dimensionWidth: 40,
    dimensionHeight: 48,
    dimensionUnit: "in",
    
    // Weight information
    weightValue: 500,
    weightUnit: "lbs",
    
    // Equipment and load type (these will map to IDs from support data)
    equipmentTypeId: 2, // Default to Dry Van
    loadTypeId: "FULL_TRUCKLOAD_1",
    
    // Freight class
    freightClass: "70",
    
    // Commodity (will map to ID from support data)
    commodityId: 7, // Electronics
    
    // Carrier details
    carriers: [
      {
        mode: "ROAD",
        name: `Test Carrier ${testId}`,
        email: `carrier-${testId}@example.com`,
        phone: "555-123-4567",
        carrierId: {
          type: "USDOT",
          value: "12345678"
        },
        equipmentType: 2 // Dry Van
      }
    ],
    
    // Stops (pickup and delivery)
    stops: [
      {
        stopType: "PICKUP",
        stopNumber: 1,
        date: pickupDate,
        address: {
          address1: "123 Pickup Street",
          address2: "Unit A",
          city: "Chicago",
          state: "IL",
          postal: "60601",
          country: "USA"
        }
      },
      {
        stopType: "DELIVERY",
        stopNumber: 2,
        date: deliveryDate,
        address: {
          address1: "456 Delivery Avenue",
          address2: "Building B",
          city: "Denver",
          state: "CO",
          postal: "80202",
          country: "USA"
        }
      }
    ],
    
    // User information (matching UserInfoForm component)
    user: {
      name: "Test User",
      email: `test-${testId}@example.com`,
      id: `test-${testId}@example.com`
    },
    
    // Assured information (matching UserInfoForm component)
    assured: {
      name: "Test Company LLC",
      email: `company-${testId}@example.com`,
      address: {
        address1: "789 Corporate HQ Blvd",
        address2: "Suite 1500",
        city: "Chicago",
        state: "IL",
        postal: "60601",
        country: "USA"
      }
    },
    
    // Additional fields used by API
    freightId: freightId,
    poNumber: poNumber,
    pickupDate: pickupDate,
    deliveryDate: deliveryDate,
    
    // Integration fee (matching IntegrationFeeForm component)
    integrationFeeType: "percentage",
    integrationFeeValue: 0.1
  };
}

/**
 * Create a simple test payload for the simple quotes API
 * @param {string} testId - Test ID for tracking
 * @returns {Object} Simple test payload
 */
function createSimpleTestPayload(testId) {
  return {
    // Required fields for simple API
    description: `Simple Test Cargo ${testId}`,
    freightClass: "70",
    value: 15000 + Math.floor(Math.random() * 5000), // Random value between 15000 and 20000
    originCity: "Chicago",
    originState: "IL",
    destinationCity: "Denver",
    destinationState: "CO",
    userName: "Simple Test User",
    userEmail: `simple-test-${testId}@example.com`,
    assuredName: "Simple Test Company LLC",
    assuredEmail: `simple-company-${testId}@example.com`,
    
    // Required address fields for Loadsure API
    originAddress1: "123 Simple Pickup Street",
    originAddress2: "Unit A",
    originPostal: "60601",
    originCountry: "USA",
    destinationAddress1: "456 Simple Delivery Avenue", 
    destinationAddress2: "Building B",
    destinationPostal: "80202",
    destinationCountry: "USA",
    
    // Optional fields
    currency: "USD",
    dimensionLength: 48,
    dimensionWidth: 40,
    dimensionHeight: 48,
    dimensionUnit: "in",
    weightValue: 300,
    weightUnit: "lbs",
    commodityId: 7, // Electronics
    loadTypeId: "FULL_TRUCKLOAD_1",
    equipmentTypeId: 2, // Dry Van
    
    // Carrier information
    carrierName: `Simple Test Carrier ${testId}`,
    carrierEmail: `simple-carrier-${testId}@example.com`,
    carrierPhone: "555-987-6543",
    carrierDotNumber: "87654321",
    carrierEquipmentType: 2, // Dry Van
    carrierMode: "ROAD",
    carrierIdType: "USDOT",
    carrierIdValue: "87654321",
    
    // Integration fee
    integrationFeeType: "percentage",
    integrationFeeValue: 0.05 // 5%
  };
}

/**
 * Test getting support data
 * @returns {Promise<boolean>} Success status
 */
async function testSupportData() {
  try {
    console.log("Testing support data endpoints...");
    
    // Check all support data endpoints
    const endpoints = [
      'commodities',
      'commodity-exclusions',
      'equipment-types',
      'load-types',
      'freight-classes',
      'terms-of-sales',
      'status'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`  Fetching ${endpoint}...`);
      const response = await fetch(`${API_BASE_URL}/support-data/${endpoint}`);
      
      if (!response.ok) {
        console.error(`  ❌ Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
        return false;
      }
      
      const data = await response.json();
      console.log(`  ✅ Successfully fetched ${endpoint}: ${Array.isArray(data) ? data.length : 'OK'} items`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error testing support data: ${error.message}`);
    return false;
  }
}

/**
 * Test creating a quote using the simple API
 * @param {string} testId - Test ID for tracking
 * @returns {Promise<Object>} Quote data or null if failed
 */
async function testCreateQuoteSimple(testId) {
  try {
    console.log(`Testing simple quote creation for ${testId}...`);
    
    const payload = createSimpleTestPayload(testId);
    
    // Log a summary of the key elements being tested
    console.log(`  Sending simple quote request for ${payload.description}...`);
    console.log(`  Origin: ${payload.originCity}, ${payload.originState}`);
    console.log(`  Destination: ${payload.destinationCity}, ${payload.destinationState}`);
    console.log(`  Cargo Value: ${payload.value.toLocaleString()}`);
    console.log(`  Freight Class: ${payload.freightClass}`);
    console.log(`  Integration Fee: ${payload.integrationFeeValue * 100}%`);
    
    const endpoint = `${API_BASE_URL}/insurance/quotes/simple`;
    console.log(`  Using simple endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-ID': testId
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`  ❌ Failed to create simple quote: ${response.status} ${response.statusText}`);
      console.error(`  Error details: ${JSON.stringify(errorData)}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.quote || !data.quote.quoteId) {
      console.error(`  ❌ Invalid simple quote response: ${JSON.stringify(data)}`);
      return null;
    }
    
    console.log(`  ✅ Simple quote created successfully: ${data.quote.quoteId}`);
    console.log(`    Premium: ${data.quote.premium}`);
    console.log(`    Coverage Amount: ${data.quote.coverageAmount}`);
    console.log(`    Integration Fee: ${data.quote.integrationFeeAmount || 0}`);
    console.log(`    Total Cost: ${data.quote.totalCost || 'N/A'}`);
    console.log(`    Expires: ${new Date(data.quote.expiresAt).toLocaleString()}`);
    
    return data.quote;
  } catch (error) {
    console.error(`Error creating simple quote: ${error.message}`);
    return null;
  }
}

/**
 * Test creating a quote
 * @param {string} testId - Test ID for tracking
 * @param {Object} [providedPayload] - Optional predefined payload to use
 * @returns {Promise<Object>} Quote data or null if failed
 */
async function testCreateQuote(testId, providedPayload = null) {
  try {
    console.log(`Testing quote creation for ${testId}...`);
    
    // Use the provided payload or create a new one
    const payload = providedPayload || createTestPayload(testId);
    
    // Log a summary of the key elements being tested
    console.log(`  Sending quote request for ${payload.description}...`);
    console.log(`  Origin: ${payload.stops[0].address.city}, ${payload.stops[0].address.state}`);
    console.log(`  Destination: ${payload.stops[1].address.city}, ${payload.stops[1].address.state}`);
    console.log(`  Cargo Value: ${payload.value.toLocaleString()}`);
    console.log(`  # of Carriers: ${payload.carriers.length}`);
    console.log(`  # of Stops: ${payload.stops.length}`);
    
    // Determine endpoint - use complete API instead of simple for complex payload
    const endpoint = payload.stops && payload.stops.length > 1 ? 
      `${API_BASE_URL}/insurance/quotes` :
      `${API_BASE_URL}/insurance/quotes/simple`;
    
    console.log(`  Using endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-ID': testId
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`  ❌ Failed to create quote: ${response.status} ${response.statusText}`);
      console.error(`  Error details: ${JSON.stringify(errorData)}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.quote || !data.quote.quoteId) {
      console.error(`  ❌ Invalid quote response: ${JSON.stringify(data)}`);
      return null;
    }
    
    console.log(`  ✅ Quote created successfully: ${data.quote.quoteId}`);
    console.log(`    Premium: ${data.quote.premium}`);
    console.log(`    Coverage Amount: ${data.quote.coverageAmount}`);
    console.log(`    Integration Fee: ${data.quote.integrationFeeAmount || 0}`);
    console.log(`    Total Cost: ${data.quote.totalCost || 'N/A'}`);
    console.log(`    Expires: ${new Date(data.quote.expiresAt).toLocaleString()}`);
    
    return data.quote;
  } catch (error) {
    console.error(`Error creating quote: ${error.message}`);
    return null;
  }
}

/**
 * Test retrieving a quote
 * @param {string} quoteId - Quote ID to retrieve
 * @returns {Promise<boolean>} Success status
 */
async function testGetQuote(quoteId) {
  try {
    console.log(`Testing quote retrieval for ${quoteId}...`);
    
    const response = await fetch(`${API_BASE_URL}/insurance/quotes/${quoteId}`);
    
    if (!response.ok) {
      console.error(`  ❌ Failed to retrieve quote: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.quote || data.quote.quoteId !== quoteId) {
      console.error(`  ❌ Invalid quote retrieval response: ${JSON.stringify(data)}`);
      return false;
    }
    
    console.log(`  ✅ Quote retrieved successfully: ${data.quote.quoteId}`);
    return true;
  } catch (error) {
    console.error(`Error retrieving quote: ${error.message}`);
    return false;
  }
}

/**
 * Test booking insurance
 * @param {string} quoteId - Quote ID to book
 * @returns {Promise<Object>} Booking data or null if failed
 */
async function testBookInsurance(quoteId) {
  try {
    console.log(`Testing insurance booking for quote ${quoteId}...`);
    
    const response = await fetch(`${API_BASE_URL}/insurance/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quoteId })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`  ❌ Failed to book insurance: ${response.status} ${response.statusText}`);
      console.error(`  Error details: ${JSON.stringify(errorData)}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.booking || !data.booking.policyNumber) {
      console.error(`  ❌ Invalid booking response: ${JSON.stringify(data)}`);
      return null;
    }
    
    console.log(`  ✅ Insurance booked successfully!`);
    console.log(`    Booking ID: ${data.booking.bookingId}`);
    console.log(`    Policy Number: ${data.booking.policyNumber}`);
    console.log(`    Certificate URL available: ${!data.booking.certificateUrl}`);
    
    return data.booking;
  } catch (error) {
    console.error(`Error booking insurance: ${error.message}`);
    return null;
  }
}

/**
 * Test retrieving a certificate
 * @param {string} policyNumber - Certificate/policy number
 * @param {Object} userData - User data for authentication
 * @returns {Promise<boolean>} Success status
 */
async function testGetCertificate(policyNumber, userData) {
  try {
    console.log(`Testing certificate retrieval for ${policyNumber}...`);
    
    const response = await fetch(`${API_BASE_URL}/insurance/certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        certificateNumber: policyNumber,
        userId: userData.email || userData.id
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`  ❌ Failed to retrieve certificate: ${response.status} ${response.statusText}`);
      console.error(`  Error details: ${JSON.stringify(errorData)}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !data.certificate || data.certificate.certificateNumber !== policyNumber) {
      console.error(`  ❌ Invalid certificate response: ${JSON.stringify(data)}`);
      return false;
    }
    
    console.log(`  ✅ Certificate retrieved successfully!`);
    console.log(`    Certificate Number: ${data.certificate.certificateNumber}`);
    console.log(`    Product: ${data.certificate.productName || 'Standard Coverage'}`);
    console.log(`    Status: ${data.certificate.status}`);
    console.log(`    Certificate Link available: ${!!data.certificate.certificateLink}`);
    
    // Display coverage amount and premium
    if (data.certificate.coverageAmount) {
      console.log(`    Coverage Amount: ${data.certificate.coverageAmount.toLocaleString()}`);
    }
    if (data.certificate.premium) {
      console.log(`    Premium: ${data.certificate.premium.toLocaleString()}`);
    }
    
    // Display validity dates if available
    if (data.certificate.validFrom || data.certificate.validTo) {
      console.log(`    Valid From: ${data.certificate.validFrom ? new Date(data.certificate.validFrom).toLocaleDateString() : 'N/A'}`);
      console.log(`    Valid To: ${data.certificate.validTo ? new Date(data.certificate.validTo).toLocaleDateString() : 'N/A'}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error retrieving certificate: ${error.message}`);
    return false;
  }
}

/**
 * Test Cancel a certificate
 * @param {string} certificateNumber - Certificate number
 * @returns {Promise<Object>} Cancellation request data
 */
async function cancelCertificate(certificateNumber, userData, reason, emailAssured = false) {
  console.log(`Initiating cancellation for certificate ${certificateNumber}...`);
  
  const response = await fetch(`${API_BASE_URL}/insurance/certificates/${certificateNumber}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: userData.id,
      reason: reason,
      additionalInfo: reason ==='CANOTH' ? 'I have my reasons': '',
      emailAssured: emailAssured
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.error(`❌ Failed to cancel certificate: ${JSON.stringify(result)}`);
    throw new Error(`Failed to cancel certificate: ${JSON.stringify(result)}`);
  }

  console.log(`✅ Certificate cancelled successfully: ${result.certificate.certificateNumber}`);
  console.log(`   Status: ${result.certificate.status}`);
  console.log(`   Cancellation Date: ${result.certificate.canceledDate}`);
  console.log(`   Reason: ${result.certificate.cancellationReason}`);
  console.log(`   Cancellation Additional Info: ${result.certificate.cancellationAdditionaInfo || 'N/A'}`);
  console.log('   Cancelled By: ', result.certificate.canceledBy);

  return result.certificate;
}

/**
 * Test the improved error handling for future pickup dates
 * This tests the specific scenario of submitting a pickup date more than 30 days in the future,
 * which should return a clear error message rather than a complex JSON structure
 * @param {string} testId - Test ID for tracking
 * @returns {Promise<boolean>} Success status
 */
async function testFuturePickupDateError(testId) {
  try {
    console.log(`\n⚠️ Testing error handling for future pickup dates with ${testId}...`);
    
    // Create a standard test payload
    const payload = createTestPayload(testId);
    
    // Modify the pickup date to be more than 30 days in the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 40); // 40 days in the future
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    // Find the pickup stop and update its date
    for (let i = 0; i < payload.stops.length; i++) {
      if (payload.stops[i].stopType === "PICKUP") {
        payload.stops[i].date = futureDateString;
        break;
      }
    }
    
    // Also update the pickup date field if it exists
    if (payload.pickupDate) {
      payload.pickupDate = futureDateString;
    }
    
    console.log(`  Sending quote request with pickup date ${futureDateString} (40 days in the future)...`);
    
    const endpoint = `${API_BASE_URL}/insurance/quotes`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-ID': testId
      },
      body: JSON.stringify(payload)
    });
    
    // We expect this request to fail with a 400 status
    if (response.status === 400) {
      const errorData = await response.json();
      
      // Log the full error data for debugging
      console.log(`\n📣 DEBUG - Full error data received:`, JSON.stringify(errorData, null, 2));
      
      // Log the full error data for diagnostic purposes
      console.log(`\n📣 DEBUG - Full error data received:`, JSON.stringify(errorData, null, 2));
      
      // Check for the correct API error response format - now with nested error structure
      if (errorData.status === 'failed' && errorData.details && errorData.details.error && errorData.msg) {
        // Get error message from nested structure and from top-level msg
        const nestedErrorMessage = errorData.details.error.error;
        const topLevelMessage = errorData.msg;
        
        // Log the received error messages for diagnostic purposes
        console.log(`\n📣 RECEIVED NESTED ERROR MESSAGE: "${nestedErrorMessage}"`);
        console.log(`\n📣 RECEIVED TOP-LEVEL MESSAGE: "${topLevelMessage}"`);
        
        // Expected error message pattern
        const expectedPattern = "Pickup date cannot be more than 30 days in the future";
        
        // Check if both error messages contain the expected pattern
        if (typeof nestedErrorMessage === 'string' && 
            nestedErrorMessage.includes(expectedPattern) &&
            typeof topLevelMessage === 'string' && 
            topLevelMessage.includes(expectedPattern) &&
            !nestedErrorMessage.includes('{"success":') && 
            !nestedErrorMessage.includes('{"errors":')) {
          
          console.log(`  ✅ Received expected error messages:`);
          console.log(`     - Nested: "${nestedErrorMessage}"`);
          console.log(`     - Top-level msg: "${topLevelMessage}"`);
          console.log(`  ✅ Error response has correct API format with status: "failed", details.error.error and msg properties`);
          return true;
        } else {
          console.error(`  ❌ Error message doesn't contain the expected pattern.`);
          console.error(`  Received in details.error.error: "${nestedErrorMessage}"`);
          console.error(`  Received in msg: "${topLevelMessage}"`);
          console.error(`  Expected to include: "${expectedPattern}"`);
          return false;
        }
      } else {
        console.error(`  ❌ Error response doesn't match expected structure with 'status', 'details.error.error', and 'msg' properties: ${JSON.stringify(errorData)}`);
        return false;
      }
    } else if (response.ok) {
      const data = await response.json();
      console.error(`  ❌ Expected error response, but request succeeded: ${JSON.stringify(data)}`);
      return false;
    } else {
      console.error(`  ❌ Unexpected response status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`  Response: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`Error testing future pickup date error handling: ${error.message}`);
    return false;
  }
}

/**
 * Run a complete test cycle including simple quotes
 * @param {number} testRunNumber - Test run number
 * @returns {Promise<boolean>} Success status
 */
async function runFullTestCycle(testRunNumber) {
  const testId = generateTestId();
  
  console.log(`\n🚀 Starting test run ${testRunNumber} with ID: ${testId}`);
  console.log(`===================================================`);
  const cancellationReason = generateRandomCancellationReason();
  
  // Test improved error handling for future pickup dates
  console.log(`\n🧪 Testing Improved Error Handling...`);
  const errorHandlingSuccess = await testFuturePickupDateError(testId);
  if (!errorHandlingSuccess) {
    console.error(`❌ Error handling test failed - the future pickup date error message is not formatted correctly`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Test support data first
  const supportDataSuccess = await testSupportData();
  if (!supportDataSuccess) {
    console.error(`❌ Support data test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Test simple quote creation
  console.log(`\n📝 Testing Simple Quote API...`);
  const simpleQuote = await testCreateQuoteSimple(testId);
  if (!simpleQuote) {
    console.error(`❌ Simple quote creation test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Test quote retrieval for simple quote
  const simpleQuoteRetrievalSuccess = await testGetQuote(simpleQuote.quoteId);
  if (!simpleQuoteRetrievalSuccess) {
    console.error(`❌ Simple quote retrieval test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Test complete quote creation
  console.log(`\n📋 Testing Complete Quote API...`);
  const payload = createTestPayload(testId);
  console.log(`Created test payload with freight ID: ${payload.freightId}`);
  
  const quote = await testCreateQuote(testId, payload);
  if (!quote) {
    console.error(`❌ Complete quote creation test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Test quote retrieval for complete quote
  const quoteRetrievalSuccess = await testGetQuote(quote.quoteId);
  if (!quoteRetrievalSuccess) {
    console.error(`❌ Complete quote retrieval test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Test booking insurance (using complete quote)
  console.log(`\n💳 Testing Insurance Booking...`);
  const booking = await testBookInsurance(quote.quoteId);
  if (!booking) {
    console.error(`❌ Insurance booking test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(2000);
  
  // Test certificate retrieval using the user data from the payload
  console.log(`\n📄 Testing Certificate Retrieval...`);
  const certificateRetrievalSuccess = await testGetCertificate(
    booking.policyNumber, 
    payload.user
  );
  if (!certificateRetrievalSuccess) {
    console.error(`❌ Certificate retrieval test failed - test run ${testRunNumber} partially failed`);
    return false;
  }

   await sleep(2000);

  // Test cancellation of the certificate
  const cancellationResult = await cancelCertificate(booking.policyNumber, payload.user, cancellationReason, true);
  if (!cancellationResult) {
    console.error(`❌ Certificate cancellation test failed - test run ${testRunNumber} partially failed`);
    return false;
  }

  await sleep(1000);

  console.log(`\n✅ Test run ${testRunNumber} completed successfully!`);
  console.log(`   Simple Quote ID: ${simpleQuote.quoteId}`);
  console.log(`   Complete Quote ID: ${quote.quoteId}`);
  console.log(`   Booking ID: ${booking.bookingId}`);
  console.log(`   Policy Number: ${booking.policyNumber}`);
  
  return true;
}

/**
 * Main function to run all tests
 */
async function main() {
  console.log('🧪 Loadsure Insurance Integration E2E Tests');
  console.log('===========================================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Number of test runs: ${NUM_OF_TESTS}`);
  console.log(`Delay between tests: ${DELAY_BETWEEN_TESTS}ms`);
  console.log();

  let successfulTests = 0;
  let failedTests = 0;

  for (let i = 1; i <= NUM_OF_TESTS; i++) {
    try {
      const success = await runFullTestCycle(i);
      if (success) {
        successfulTests++;
      } else {
        failedTests++;
      }
    } catch (error) {
      console.error(`❌ Test run ${i} failed with error: ${error.message}`);
      failedTests++;
    }
    
    // Add delay between test runs (except after the last test)
    if (i < NUM_OF_TESTS) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_TESTS}ms before next test run...\n`);
      await sleep(DELAY_BETWEEN_TESTS);
    }
  }

  // Print final summary
  console.log(`\n🏁 Test Summary`);
  console.log(`===============`);
  console.log(`Total test runs: ${NUM_OF_TESTS}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success rate: ${Math.round((successfulTests / NUM_OF_TESTS) * 100)}%`);

  if (failedTests === 0) {
    console.log(`\n🎉 All tests passed! The Loadsure Insurance Integration is working correctly.`);
    console.log(`\n✅ Improved error handling for future pickup dates is working correctly.`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the logs above for details.`);
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});