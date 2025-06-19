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
    
    // Freight classes (matching FreightClassesForm component)
    freightClasses: [
      { 
        classId: "class70",
        percentage: 100
      }
    ],
    
    // Commodities (matching FreightClassesForm component)
    commodities: [
      { 
        id: 7 // Default to Electronics (ID 7)
      }
    ],
    
    // Stops information (matching StopsForm component)
    stops: [
      {
        stopType: "PICKUP",
        stopNumber: 1,
        date: pickupDate,
        address: {
          address1: "123 Test Origin St",
          address2: "Suite 100",
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
          address1: "456 Test Destination Ave",
          address2: "Floor 3",
          city: "Denver",
          state: "CO",
          postal: "80202",
          country: "USA"
        }
      }
    ],
    
    // Carriers information (matching CarriersForm component)
    carriers: [
      {
        mode: "ROAD",
        name: "Test Carrier Inc.",
        email: `carrier-${testId}@example.com`,
        phone: "555-123-4567",
        carrierId: {
          type: "USDOT",
          value: "12345678"
        },
        equipmentType: 2 // Dry Van
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
    console.log(`    Certificate URL available: ${!!data.booking.certificateUrl}`);
    
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
 * Run the complete test suite once
 * @param {number} testRunNumber - Test run number for logging
 * @returns {Promise<boolean>} Success status
 */
async function runCompleteSuite(testRunNumber) {
  console.log(`\n========================================`);
  console.log(`Starting test run #${testRunNumber}`);
  console.log(`========================================\n`);
  
  // Generate a unique test ID and reason for this run
  const testId = generateTestId();
  console.log(`Test ID: ${testId}`);
  const cancellationReason = generateRandomCancellationReason();
  
  // Test support data first
  const supportDataSuccess = await testSupportData();
  if (!supportDataSuccess) {
    console.error(`❌ Support data test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Create the test payload
  const payload = createTestPayload(testId);
  console.log(`Created test payload with freight ID: ${payload.freightId}`);
  
  // Test quote creation
  const quote = await testCreateQuote(testId, payload);
  if (!quote) {
    console.error(`❌ Quote creation test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Test quote retrieval
  const quoteRetrievalSuccess = await testGetQuote(quote.quoteId);
  if (!quoteRetrievalSuccess) {
    console.error(`❌ Quote retrieval test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(1000);
  
  // Test booking insurance
  const booking = await testBookInsurance(quote.quoteId);
  if (!booking) {
    console.error(`❌ Insurance booking test failed - aborting test run ${testRunNumber}`);
    return false;
  }
  
  // Add small delay before next test
  await sleep(2000);
  
  // Test certificate retrieval using the user data from the payload
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
  
  console.log(`\n✅ Test run #${testRunNumber} completed successfully!`);
  return true;
}

/**
 * Run multiple test suites
 * @returns {Promise<void>}
 */
async function runAllTests() {
  console.log("Starting Loadsure Insurance Integration E2E Tests");
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Number of test runs: ${NUM_OF_TESTS}`);
  console.log("-----------------------------------------------\n");
  
  let successCount = 0;
  
  // Run tests multiple times
  for (let i = 1; i <= NUM_OF_TESTS; i++) {
    const success = await runCompleteSuite(i);
    if (success) {
      successCount++;
    }
    
    // Add delay between test runs (except for the last one)
    if (i < NUM_OF_TESTS) {
      console.log(`\nWaiting ${DELAY_BETWEEN_TESTS / 1000} seconds before next test run...\n`);
      await sleep(DELAY_BETWEEN_TESTS);
    }
  }
  
  // Print final summary
  console.log("\n===============================================");
  console.log(`E2E Test Summary: ${successCount}/${NUM_OF_TESTS} test runs passed`);
  console.log("===============================================");
  
  // Exit with appropriate code
  process.exit(successCount === NUM_OF_TESTS ? 0 : 1);
}

// Start the tests
runAllTests().catch(error => {
  console.error('Unhandled error in test suite:', error);
  process.exit(1);
});