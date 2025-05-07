// File: src/services/loadsureApiService.js
import { v4 as uuidv4 } from 'uuid';
import supportDataService from './supportDataService.js';

// We'll initialize fetch using dynamic import
let fetch;

/**
 * Initialize fetch with dynamic import
 */
async function initializeFetch() {
  try {
    // Dynamically import node-fetch
    const module = await import('node-fetch');
    fetch = module.default;
    console.log('Fetch initialized successfully in LoadsureApiService');
  } catch (error) {
    console.error('Error initializing fetch in LoadsureApiService:', error);
    // Fallback to try again with another approach
    try {
      const module = await import('node-fetch');
      fetch = module.default;
      console.log('Fetch initialized using fallback in LoadsureApiService');
    } catch (e) {
      console.error('Failed to initialize fetch using fallback in LoadsureApiService:', e);
    }
  }
}

/**
 * Loadsure API Service
 * Integrates with Loadsure API endpoints for insurance quotes and booking
 */
class LoadsureApiService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Initialize fetch
    this.initFetch();
  }
  
  /**
   * Initialize fetch asynchronously
   */
  async initFetch() {
    if (!fetch) {
      await initializeFetch();
    }
  }

  /**
   * Helper method to resolve commodity ID from freight class
   * @param {String} freightClass - Freight class
   * @returns {Promise<Number>} Commodity ID
   */
  async resolveCommodityIdFromFreightClass(freightClass) {
    return await supportDataService.mapFreightClassToCommodity(freightClass);
  }
  
  /**
   * Helper method to resolve default load type
   * @returns {Promise<String>} Default load type ID
   */
  async resolveDefaultLoadType() {
    const loadTypes = await supportDataService.getLoadTypes();
    return loadTypes.length > 0 ? loadTypes[0].id : 'FULL_TRUCKLOAD_1';
  }
  
  /**
   * Helper method to resolve default equipment type
   * @returns {Promise<Number>} Default equipment type ID
   */
  async resolveDefaultEquipmentType() {
    const equipmentTypes = await supportDataService.getEquipmentTypes();
    // Default to dry van (equipment type 2) if not found in the support data
    return equipmentTypes.find(et => et.name.toLowerCase().includes('dry van'))?.id || 2;
  }

/**
 * Get a quote from Loadsure API using a complete freightDetails object
 * @param {Object} freightDetails - Freight details
 * @returns {Promise<Object>} Quote details
 */
  async getQuote(freightDetails) {
    console.log('Getting quote from Loadsure API');
    
    // Make sure fetch is initialized
    if (!fetch) {
      await initializeFetch();
      if (!fetch) {
        throw new Error('Fetch is not initialized in LoadsureApiService');
      }
    }
    
    try {
      // Extract integration fee details if present
      const integrationFeeType = freightDetails.integrationFeeType || 
                                (freightDetails.shipment && freightDetails.shipment.integrationFeeType);
      const integrationFeeValue = freightDetails.integrationFeeValue || 
                                (freightDetails.shipment && freightDetails.shipment.integrationFeeValue);
      
      // Check if this is a complete payload or needs transformation
      let payload = freightDetails.shipment ? 
        freightDetails : // If it already has a shipment property, it's in the correct format
        await this.buildQuoteRequestPayload(freightDetails);
      
      // Ensure equipment type is set for all carriers
      if (payload.shipment && payload.shipment.carriers && Array.isArray(payload.shipment.carriers)) {
        const defaultEquipmentType = await this.resolveDefaultEquipmentType();
        
        for (const carrier of payload.shipment.carriers) {
          if (!carrier.equipmentType) {
            carrier.equipmentType = defaultEquipmentType;
          }
        }
      }
      
      // Log the payload for debugging
      console.log('Sending payload to Loadsure API:', JSON.stringify(payload, null, 2));
      
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
      
      console.log(`Received quote from Loadsure API:, ${JSON.stringify(data, null, 2)}`);
      // Format the response to match our internal format
      return {
        quoteId: data.quoteToken,
        premium: data.insuranceProduct.premium,
        currency: data.insuranceProduct.currency,
        coverageAmount: data.insuranceProduct.limit,
        terms: data.insuranceProduct.description,
        expiresAt: this.calculateExpiryDate(data.expiresIn),
        deductible: data.insuranceProduct.deductible,
        // Add integration fee details to the response
        integrationFeeType: integrationFeeType,
        integrationFeeValue: integrationFeeValue
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
    weightUnit = 'lbs',
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
    assuredEmail = null,
    
    // Support for multiple freight classes, commodities, carriers, stops
    freightClasses = null,
    commodities = null,
    carriers = null,
    stops = null,
    
    // Integration fee fields
    integrationFeeType = null,
    integrationFeeValue = null
  }) {
    // Default dates if not provided
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const formattedPickupDate = pickupDate || today.toISOString().split('T')[0];
    const formattedDeliveryDate = deliveryDate || nextWeek.toISOString().split('T')[0];
    
    // Get default equipment type ID
    const defaultEquipmentTypeId = await this.resolveDefaultEquipmentType();
    const defaultLoadTypeId = await this.resolveDefaultLoadType();
    
    // Process freight classes
    let resolvedFreightClasses = [];
    if (freightClasses && Array.isArray(freightClasses) && freightClasses.length > 0) {
      resolvedFreightClasses = freightClasses.map(fc => ({
        id: supportDataService.formatFreightClass(fc.classId),
        percentage: fc.percentage
      }));
    } else if (freightClass) {
      // Legacy single freight class support
      resolvedFreightClasses = [{
        id: supportDataService.formatFreightClass(freightClass),
        percentage: 100
      }];
    }
    
    // Process commodities
    let resolvedCommodities = [];
    if (commodities && Array.isArray(commodities) && commodities.length > 0) {
      resolvedCommodities = commodities.map(c => c.id);
    } else if (commodityId) {
      // Legacy single commodity support
      resolvedCommodities = [commodityId];
    } else if (freightClass) {
      // Fallback to mapping from freight class
      resolvedCommodities = [await this.resolveCommodityIdFromFreightClass(freightClass)];
    }
    
    // Process carriers - Ensure equipmentType is always set
    let resolvedCarriers = [];
    if (carriers && Array.isArray(carriers) && carriers.length > 0) {
      resolvedCarriers = carriers.map(carrier => {
        // Ensure each carrier has an equipmentType
        return {
          ...carrier,
          equipmentType: carrier.equipmentType || equipmentTypeId || defaultEquipmentTypeId
        };
      });
    } else {
      // Create default carrier from primitive fields
      resolvedCarriers = [{
        mode: "ROAD",
        name: carrierName || "Sample Carrier",
        email: carrierEmail || "carrier@example.com",
        phone: carrierPhone || "123-456-7890",
        carrierId: {
          type: "USDOT",
          value: carrierDotNumber || "123456"
        },
        equipmentType: equipmentTypeId || defaultEquipmentTypeId // Use resolved equipment type
      }];
    }
    
    // Process stops
    let resolvedStops = [];
    if (stops && Array.isArray(stops) && stops.length > 0) {
      resolvedStops = stops;
    } else {
      // Create default stops from origin and destination
      resolvedStops = [
        {
          stopType: "PICKUP",
          stopNumber: 1,
          date: formattedPickupDate,
          address: {
            address1: "Pickup Address",
            city: originCity || "Unknown",
            state: originState || "Unknown",
            postal: "12345",
            country: "USA"
          }
        },
        {
          stopType: "DELIVERY",
          stopNumber: 2,
          date: formattedDeliveryDate,
          address: {
            address1: "Delivery Address",
            city: destinationCity || "Unknown",
            state: destinationState || "Unknown",
            postal: "12345",
            country: "USA"
          }
        }
      ];
    }
    
    // Create user and assured info
    const userId = userEmail || "user@example.com";
    const user = {
      id: userId,
      email: userEmail || "user@example.com",
      name: userName || "User"
    };
    
    const assured = {
      name: assuredName || "Assured Company",
      email: assuredEmail || "assured@example.com",
      address: {
        address1: "123 Business St",
        city: originCity || "Unknown",
        state: originState || "Unknown",
        country: "USA",
        postal: "12345"
      }
    };
    
    // Construct the full API payload
    const payload = {
      user,
      assured,
      shipment: {
        version: "2",
        freightId: `FR-${Date.now().toString().substring(7)}`,
        poNumber: `PO-${Date.now().toString().substring(7)}`,
        pickupDate: formattedPickupDate,
        deliveryDate: formattedDeliveryDate,
        cargo: {
          cargoValue: {
            currency: currency,
            value: parseFloat(value)
          },
          commodity: resolvedCommodities,
          fullDescriptionOfCargo: description,
          weight: {
            unit: weightUnit,
            value: parseFloat(weightValue)
          },
          freightClass: resolvedFreightClasses
        },
        carriers: resolvedCarriers,
        stops: resolvedStops,
        loadType: loadTypeId || defaultLoadTypeId,
        equipmentType: equipmentTypeId || defaultEquipmentTypeId,
        
        // Add integration fee fields if provided
        integrationFeeType,
        integrationFeeValue
      }
    };
    
    // Call the main getQuote method with the constructed object
    return this.getQuote(payload);
  }

  /**
   * Book insurance with Loadsure API
   * @param {String} quoteId - Quote ID (token)
   * @returns {Promise<Object>} Booking confirmation
   */
  async bookInsurance(quoteId) {
    console.log(`Booking insurance with Loadsure API for quote: ${quoteId}`);
    
    // Make sure fetch is initialized
    if (!fetch) {
      await initializeFetch();
      if (!fetch) {
        throw new Error('Fetch is not initialized in LoadsureApiService');
      }
    }
    
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
   * @returns {Promise<Object>} Formatted payload for Loadsure API
   */
  async buildQuoteRequestPayload(freightDetails) {
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
      assured,
      // Support for multiple elements
      freightClasses = null,
      commodities = null,
      carriers = null,
      stops = null
    } = freightDetails;

    // Default equipment type ID
    const defaultEquipmentTypeId = await this.resolveDefaultEquipmentType();
    
    // Process freight classes
    let resolvedFreightClasses = [];
    if (freightClasses && Array.isArray(freightClasses) && freightClasses.length > 0) {
      resolvedFreightClasses = freightClasses.map(fc => ({
        id: supportDataService.formatFreightClass(fc.classId),
        percentage: fc.percentage
      }));
    } else if (freightClass) {
      // Legacy single freight class support
      resolvedFreightClasses = [{
        id: supportDataService.formatFreightClass(freightClass),
        percentage: 100
      }];
    }
    
    // Process commodities
    let resolvedCommodities = [];
    if (commodities && Array.isArray(commodities) && commodities.length > 0) {
      resolvedCommodities = commodities.map(c => c.id);
    } else if (commodityId) {
      // Legacy single commodity support
      resolvedCommodities = [commodityId];
    } else if (freightClass) {
      // Fallback to mapping from freight class
      resolvedCommodities = [await supportDataService.mapFreightClassToCommodity(freightClass)];
    }
    
    // Get equipment types from support data service
    const equipmentType = freightDetails.equipmentTypeId || defaultEquipmentTypeId;

    // Parse origin and destination if they're provided as strings
    let originParts = ['Unknown', 'Unknown'];
    let destinationParts = ['Unknown', 'Unknown'];
    
    if (origin) {
      originParts = origin.split(',').map(part => part.trim());
    }
    
    if (destination) {
      destinationParts = destination.split(',').map(part => part.trim());
    }
    
    // Calculate dates if not provided
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const formattedPickupDate = pickupDate || today.toISOString().split('T')[0];
    const formattedDeliveryDate = deliveryDate || nextWeek.toISOString().split('T')[0];
    
    // Process carriers - Ensure equipmentType is set for each carrier
    let resolvedCarriers = [];
    if (carriers && Array.isArray(carriers) && carriers.length > 0) {
      resolvedCarriers = carriers.map(carrier => {
        return {
          ...carrier,
          equipmentType: carrier.equipmentType || equipmentType || defaultEquipmentTypeId
        };
      });
    } else if (carrier) {
      // Legacy single carrier support
      resolvedCarriers = [{
        mode: "ROAD",
        name: carrier.name || "Sample Carrier",
        email: carrier.email || "carrier@example.com",
        phone: carrier.phone || "123-456-7890",
        carrierId: {
          type: "USDOT",
          value: carrier.dotNumber || "123456"
        },
        equipmentType: equipmentType // Use the equipmentType from above
      }];
    } else {
      // Default carrier
      resolvedCarriers = [{
        mode: "ROAD",
        name: "Sample Carrier",
        email: "carrier@example.com",
        phone: "123-456-7890",
        carrierId: {
          type: "USDOT",
          value: "123456"
        },
        equipmentType: equipmentType // Use the equipmentType from above
      }];
    }
    
    // Process stops
    let resolvedStops = [];
    if (stops && Array.isArray(stops) && stops.length > 0) {
      resolvedStops = stops;
    } else {
      // Create default stops from origin and destination
      resolvedStops = [
        {
          stopType: "PICKUP",
          stopNumber: 1,
          date: formattedPickupDate,
          address: {
            address1: "Pickup Address",
            city: originParts[0] || "Unknown",
            state: originParts[1] || "Unknown",
            postal: "12345",
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
            postal: "12345",
            country: "USA"
          }
        }
      ];
    }
    
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
    
    // Resolve default load type
    const defaultLoadType = await this.resolveDefaultLoadType();

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
        poNumber: freightDetails.poNumber || `PO-${Date.now().toString().substring(7)}`,
        pickupDate: formattedPickupDate,
        deliveryDate: formattedDeliveryDate,
        
        // Cargo details
        cargo: {
          cargoValue: {
            currency: currency,
            value: parseFloat(value)
          },
          commodity: resolvedCommodities,
          fullDescriptionOfCargo: description,
          weight: {
            unit: weight ? weight.unit : 'lbs',
            value: weight ? weight.value : 500
          },
          freightClass: resolvedFreightClasses
        },
        
        // Carriers
        carriers: resolvedCarriers,
        
        // Stops
        stops: resolvedStops,
        
        // Additional fields
        loadType: freightDetails.loadTypeId || defaultLoadType,
        equipmentType: equipmentType
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
    
    // Make sure fetch is initialized
    if (!fetch) {
      await initializeFetch();
      if (!fetch) {
        throw new Error('Fetch is not initialized in LoadsureApiService');
      }
    }
    
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
}

// Initialize fetch at module level
initializeFetch();

export default LoadsureApiService;