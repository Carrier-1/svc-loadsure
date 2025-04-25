// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const supportDataService = require('./supportDataService');

/**
 * Loadsure API Service
 * Integrates with Loadsure API endpoints for insurance quotes and booking
 */
class loadsureApiService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Get a quote from Loadsure API using a complete freightDetails object
   * @param {Object} freightDetails - Freight details
   * @returns {Promise<Object>} Quote details
   */
  async getQuote(freightDetails) {
    console.log('Getting quote from Loadsure API');
    
    try {
      // Prepare the request payload according to Loadsure API specs
      const payload = this.buildQuoteRequestPayload(freightDetails);
      
      const response = await fetch(`${this.baseUrl}/api/insureLoad/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Loadsure API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      // Check if response contains errors
      if (data.errors && data.errors.length > 0) {
        throw new Error(`Loadsure Quote API validation errors: ${JSON.stringify(data.errors)}`);
      }
      
      // Format the response to match our internal format
      return {
        quoteId: data.quoteToken,
        premium: data.insuranceProduct.premium,
        currency: data.insuranceProduct.currency,
        coverageAmount: data.insuranceProduct.limit,
        terms: data.insuranceProduct.description,
        expiresAt: this.calculateExpiryDate(data.expiresIn),
        deductible: data.insuranceProduct.deductible
      };
    } catch (error) {
      console.error('Error getting quote from Loadsure API:', error);
      throw error;
    }
  }
  
  /**
   * Get a quote from Loadsure API using primitive values
   * This provides a simpler interface for clients that don't want to build the complete object
   * 
   * @param {Object} params - Object containing primitive values for freight details
   * @returns {Promise<Object>} Quote details
   */
  async getQuoteFromPrimitives({
    // Required fields
    description,
    freightClass,
    value,
    originCity,
    originState,
    destinationCity,
    destinationState,
    
    // Optional fields with defaults
    currency = 'USD',
    dimensionLength = 48,
    dimensionWidth = 40,
    dimensionHeight = 48,
    dimensionUnit = 'in',
    weightValue = 500,
    weightUnit = 'lb',
    commodityId = null,
    loadTypeId = null,
    equipmentTypeId = null,
    
    // Additional optional fields
    pickupDate = null,
    deliveryDate = null,
    carrierName = null,
    carrierEmail = null,
    carrierPhone = null,
    carrierDotNumber = null,
    
    // User information (optional)
    userName = null,
    userEmail = null,
    assuredName = null,
    assuredEmail = null
  }) {
    // Construct the freightDetails object from primitives
    const freightDetails = {
      description,
      class: freightClass,
      value: parseFloat(value),
      currency,
      commodityId: commodityId || this.resolveCommodityIdFromFreightClass(freightClass),
      loadType: loadTypeId || this.resolveDefaultLoadType(),
      equipmentTypeId: equipmentTypeId || this.resolveDefaultEquipmentType(),
      dimensions: {
        length: parseFloat(dimensionLength),
        width: parseFloat(dimensionWidth),
        height: parseFloat(dimensionHeight),
        unit: dimensionUnit
      },
      weight: {
        value: parseFloat(weightValue),
        unit: weightUnit
      },
      origin: `${originCity}, ${originState}`,
      destination: `${destinationCity}, ${destinationState}`,
      
      // Additional optional fields
      pickupDate,
      deliveryDate,
      carrier: carrierName ? {
        name: carrierName,
        email: carrierEmail || 'info@example.com',
        phone: carrierPhone || '555-555-5555',
        dotNumber: carrierDotNumber
      } : null,
      
      // User information
      user: {
        name: userName || 'User',
        email: userEmail || 'user@example.com'
      },
      assured: {
        name: assuredName || 'Assured Company',
        email: assuredEmail || 'assured@example.com'
      }
    };
    
    // Call the main getQuote method with the constructed object
    return this.getQuote(freightDetails);
  }

  /**
   * Book insurance with Loadsure API
   * @param {String} quoteId - Quote ID (token)
   * @returns {Promise<Object>} Booking confirmation
   */
  async bookInsurance(quoteId) {
    console.log(`Booking insurance with Loadsure API for quote: ${quoteId}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/insureLoad/purchaseQuote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          quoteToken: quoteId,
          sendEmailsTo: ["USER", "ASSURED"]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Loadsure API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      // Format the response to match our internal format
      return {
        bookingId: uuidv4(), // Generate an internal ID for tracking
        quoteId: quoteId,
        certificateUrl: data.certificateLink,
        policyNumber: data.certificateNumber
      };
    } catch (error) {
      console.error('Error booking insurance with Loadsure API:', error);
      throw error;
    }
  }

  /**
   * Build the quote request payload according to Loadsure API specifications
   * @param {Object} freightDetails - Freight details from our system
   * @returns {Object} Formatted payload for Loadsure API
   */
  buildQuoteRequestPayload(freightDetails) {
    const {
      description,
      class: freightClass,
      value,
      currency = 'USD',
      dimensions,
      weight,
      origin,
      destination,
      commodityId,
      pickupDate,
      deliveryDate,
      carrier,
      user,
      assured
    } = freightDetails;

    // Map freight class to commodity if not provided
    const resolvedCommodityId = commodityId || supportDataService.mapFreightClassToCommodity(freightClass);
    
    // Format freight class according to Loadsure's convention
    const formattedFreightClass = supportDataService.formatFreightClass(freightClass);
    
    // Get equipment types from support data service
    const equipmentTypes = supportDataService.getEquipmentTypes();
    
    // Default to dry van (equipment type 2) if no mapping is available
    const equipmentType = freightDetails.equipmentTypeId || 
                         equipmentTypes.find(et => et.name.toLowerCase().includes('dry van'))?.id || 
                         2;

    // Parse origin and destination
    const originParts = origin.split(',').map(part => part.trim());
    const destinationParts = destination.split(',').map(part => part.trim());
    
    // Calculate dates if not provided
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const formattedPickupDate = pickupDate || today.toISOString().split('T')[0];
    const formattedDeliveryDate = deliveryDate || nextWeek.toISOString().split('T')[0];
    
    // Default user information
    const defaultUser = {
      id: "internal-" + uuidv4().substring(0, 8),
      email: "user@example.com",
      name: "User"
    };
    
    // Default assured information
    const defaultAssured = {
      name: "Assured Company",
      email: "assured@example.com",
      address: {
        address1: "123 Business St",
        city: originParts[0] || "Unknown",
        state: originParts[1] || "Unknown",
        country: "USA",
        postal: "12345"
      }
    };
    
    // Use provided user/assured info or defaults
    const userData = user || defaultUser;
    const assuredData = assured || defaultAssured;

    // Construct the payload according to Loadsure API structure
    return {
      // Required user and assured info
      user: {
        id: userData.id || defaultUser.id,
        email: userData.email || defaultUser.email,
        name: userData.name || defaultUser.name
      },
      assured: {
        name: assuredData.name || defaultAssured.name,
        email: assuredData.email || defaultAssured.email,
        address: assuredData.address || {
          address1: "123 Business St",
          city: originParts[0] || "Unknown",
          state: originParts[1] || "Unknown",
          country: "USA",
          postal: "12345"
        }
      },
      // Shipment details
      shipment: {
        version: "2",
        freightId: `FR-${Date.now().toString().substring(7)}`,
        pickupDate: formattedPickupDate,
        deliveryDate: formattedDeliveryDate,
        
        // Cargo details
        cargo: {
          cargoValue: {
            currency: currency,
            value: value
          },
          commodity: resolvedCommodityId,
          fullDescriptionOfCargo: description,
          weight: {
            unit: weight.unit,
            value: weight.value
          },
          freightClass: formattedFreightClass
        },
        
        // Carriers - using road by default
        carriers: [{
          mode: "ROAD",
          name: carrier?.name || "Sample Carrier",
          email: carrier?.email || "carrier@example.com",
          phone: carrier?.phone || "123-456-7890",
          carrierId: {
            type: "USDOT",
            value: carrier?.dotNumber || "123456"
          },
          equipmentType: equipmentType
        }],
        
        // Stops - pickup and delivery
        stops: [
          {
            stopType: "PICKUP",
            stopNumber: 1,
            date: formattedPickupDate,
            address: {
              address1: "Pickup Address",
              city: originParts[0] || "Unknown",
              state: originParts[1] || "Unknown",
              country: "USA"
            }
          },
          {
            stopType: "DELIVERY",
            stopNumber: 2,
            date: formattedDeliveryDate,
            address: {
              address1: "Delivery Address",
              city: destinationParts[0] || "Unknown",
              state: destinationParts[1] || "Unknown",
              country: "USA"
            }
          }
        ]
      }
    };
  }

  /**
   * Calculate expiry date based on expiresIn seconds
   * @param {Number} expiresIn - Seconds until expiry
   * @returns {String} ISO date string
   */
  calculateExpiryDate(expiresIn) {
    const expiryDate = new Date(Date.now() + (expiresIn * 1000));
    return expiryDate.toISOString();
  }
  
  /**
   * Get certificate details from Loadsure API
   * @param {String} certificateNumber - Certificate number
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Certificate details
   */
  async getCertificateDetails(certificateNumber, userId) {
    console.log(`Getting certificate details for: ${certificateNumber}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/insureLoad/certificateSummary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          userId: userId,
          certificateNumber: certificateNumber
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Loadsure API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting certificate details:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to resolve commodity ID from freight class
   * @param {String} freightClass - Freight class
   * @returns {Number} Commodity ID
   */
  resolveCommodityIdFromFreightClass(freightClass) {
    return supportDataService.mapFreightClassToCommodity(freightClass);
  }
  
  /**
   * Helper method to resolve default load type
   * @returns {String} Default load type ID
   */
  resolveDefaultLoadType() {
    const loadTypes = supportDataService.getLoadTypes();
    return loadTypes.length > 0 ? loadTypes[0].id : 'FULL_TRUCKLOAD_1';
  }
  
  /**
   * Helper method to resolve default equipment type
   * @returns {Number} Default equipment type ID
   */
  resolveDefaultEquipmentType() {
    const equipmentTypes = supportDataService.getEquipmentTypes();
    return equipmentTypes.find(et => et.name.toLowerCase().includes('dry van'))?.id || 2;
  }
}

module.exports = LoadsureApiService;