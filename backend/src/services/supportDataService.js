// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
const fetch = require('node-fetch');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const config = require('../config');

/**
 * Service for fetching, caching, and managing Loadsure support data
 * This includes commodities, equipment types, freight classes, etc.
 */
class SupportDataService {
  constructor(apiKey, baseUrl, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Initialize cache with TTL (time-to-live) in seconds
    this.cache = new NodeCache({
      stdTTL: options.cacheTTL || 3600, // Default 1 hour
      checkperiod: options.checkPeriod || 120, // Check for expired keys every 2 minutes
      useClones: false // Don't clone objects on get/set for better performance
    });
    
    // Create data directory if it doesn't exist
    this.dataDir = options.dataDir || path.join(__dirname, '../../data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Promisify file operations
    this.writeFile = promisify(fs.writeFile);
    this.readFile = promisify(fs.readFile);
    
    // Support data endpoints
    this.endpoints = {
      commodities: '/api/commodities',
      commodityExclusions: '/api/commodityExclusions',
      equipmentTypes: '/api/equipmentTypes',
      loadTypes: '/api/loadTypes',
      freightClasses: '/api/freightClasses',
      termsOfSales: '/api/termsOfSales'
    };
    
    // Cache keys
    this.cacheKeys = {
      commodities: 'loadsure_commodities',
      commodityExclusions: 'loadsure_commodity_exclusions',
      equipmentTypes: 'loadsure_equipment_types',
      loadTypes: 'loadsure_load_types',
      freightClasses: 'loadsure_freight_classes',
      termsOfSales: 'loadsure_terms_of_sales',
      lastUpdated: 'loadsure_support_data_last_updated'
    };
  }

  /**
   * Fetch all support data from Loadsure API and update cache and persistent storage
   * @returns {Promise<Object>} Support data result
   */
  async fetchAndUpdateAllSupportData() {
    console.log('Fetching all support data from Loadsure API...');
    
    try {
      const results = {};
      
      // Fetch all data types
      for (const [key, endpoint] of Object.entries(this.endpoints)) {
        const data = await this.fetchFromLoadsureAPI(endpoint);
        results[key] = data;
        
        // Update cache
        this.cache.set(this.cacheKeys[key], data);
        
        // Update persistent storage
        await this.persistToFile(key, data);
      }
      
      // Update last updated timestamp
      const now = new Date().toISOString();
      this.cache.set(this.cacheKeys.lastUpdated, now);
      await this.persistToFile('lastUpdated', { timestamp: now });
      
      console.log('All support data updated successfully');
      return results;
    } catch (error) {
      console.error('Error updating support data:', error);
      throw error;
    }
  }

  /**
   * Fetch data from Loadsure API
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<Array>} API response data
   */
  async fetchFromLoadsureAPI(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching from endpoint ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Persist data to file
   * @param {string} key - Data type key
   * @param {Object} data - Data to persist
   * @returns {Promise<void>}
   */
  async persistToFile(key, data) {
    const filePath = path.join(this.dataDir, `${key}.json`);
    await this.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Data persisted to ${filePath}`);
  }

  /**
   * Load persisted data from file
   * @param {string} key - Data type key
   * @returns {Promise<Object>} Loaded data
   */
  async loadFromFile(key) {
    try {
      const filePath = path.join(this.dataDir, `${key}.json`);
      const data = await this.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Could not load ${key} from file:`, error.message);
      return null;
    }
  }

  /**
   * Initialize the service by loading data from persistent storage to cache
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing Support Data Service...');
    
    // Load all data types from files to cache
    for (const key of Object.keys(this.endpoints)) {
      const data = await this.loadFromFile(key);
      if (data) {
        this.cache.set(this.cacheKeys[key], data);
        console.log(`Loaded ${key} data from persistent storage`);
      }
    }
    
    // Check last update time
    const lastUpdated = await this.loadFromFile('lastUpdated');
    
    if (lastUpdated) {
      this.cache.set(this.cacheKeys.lastUpdated, lastUpdated.timestamp);
      
      // Check if data refresh is needed
      const lastUpdateTime = new Date(lastUpdated.timestamp).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastUpdateTime;
      
      // If last update was more than 24 hours ago, refresh the data
      if (timeDiff > 24 * 60 * 60 * 1000) {
        console.log('Support data is more than 24 hours old, refreshing...');
        await this.fetchAndUpdateAllSupportData();
      }
    } else {
      // No previous data found, fetch fresh data
      console.log('No persisted support data found, fetching from API...');
      await this.fetchAndUpdateAllSupportData();
    }
  }

  /**
   * Get commodity data
   * @returns {Array} Commodity data
   */
  getCommodities() {
    return this.cache.get(this.cacheKeys.commodities) || [];
  }

  /**
   * Get commodity exclusions data
   * @returns {Array} Commodity exclusions data
   */
  getCommodityExclusions() {
    return this.cache.get(this.cacheKeys.commodityExclusions) || [];
  }

  /**
   * Get equipment types data
   * @returns {Array} Equipment types data
   */
  getEquipmentTypes() {
    return this.cache.get(this.cacheKeys.equipmentTypes) || [];
  }

  /**
   * Get load types data
   * @returns {Array} Load types data
   */
  getLoadTypes() {
    return this.cache.get(this.cacheKeys.loadTypes) || [];
  }

  /**
   * Get freight classes data
   * @returns {Array} Freight classes data
   */
  getFreightClasses() {
    return this.cache.get(this.cacheKeys.freightClasses) || [];
  }

  /**
   * Get terms of sales data
   * @returns {Array} Terms of sales data
   */
  getTermsOfSales() {
    return this.cache.get(this.cacheKeys.termsOfSales) || [];
  }

  /**
   * Get last updated timestamp
   * @returns {string} ISO timestamp string
   */
  getLastUpdated() {
    return this.cache.get(this.cacheKeys.lastUpdated);
  }

  /**
   * Map a freight class to a commodity ID
   * @param {string} freightClass - Freight class from our system
   * @returns {number} Mapped commodity ID
   */
  mapFreightClassToCommodity(freightClass) {
    // Get freight classes and commodities
    const freightClasses = this.getFreightClasses();
    const commodities = this.getCommodities();
    
    // Find the freight class by ID or name
    const freightClassObj = freightClasses.find(fc => 
      fc.id === freightClass || 
      fc.name === freightClass || 
      fc.name === `Class ${freightClass}`
    );
    
    // Default mapping based on known patterns if direct mapping not available
    // You could extend this with more sophisticated logic
    if (!freightClassObj) {
      // Default mapping fallback
      const defaultMappings = {
        '50': 16,  // Medical Equipment / Medical Supplies
        '55': 8,   // Building materials
        '60': 12,  // Car Accessories
        '65': 12,  // Car Parts
        '70': 2,   // Food Items
        '77.5': 22, // Tires
        '85': 15,  // Machinery
        '92.5': 7,  // Computers
        '100': 7,   // Electronics
        '110': 7,   // Electronics
        '125': 7,   // Electronics
        '150': 19,  // Metal products
        '175': 10,  // Clothing
        '200': 19,  // Metal
        '250': 14,  // Furniture
        '300': 14,  // Furniture
        '400': 1,   // Misc
        '500': 10   // Clothing
      };
      
      return defaultMappings[freightClass] || 1; // Default to miscellaneous
    }
    
    // If we have a mapping system between freight classes and commodities,
    // we would implement that logic here
    
    // For now, return a default commodity ID (miscellaneous)
    return 1;
  }

  /**
   * Map freight class string to Loadsure format
   * @param {string} freightClass - Freight class (e.g., "65" or "65.5")
   * @returns {string} Formatted freight class (e.g., "class65" or "class65_5")
   */
  formatFreightClass(freightClass) {
    // Get freight classes to check proper format
    const freightClasses = this.getFreightClasses();
    
    // If the freight class already matches a known ID, return it
    if (freightClasses.find(fc => fc.id === freightClass)) {
      return freightClass;
    }
    
    // Otherwise format it according to Loadsure's convention
    return `class${freightClass.replace('.', '_')}`;
  }
}

// Export singleton instance
const supportDataService = new SupportDataService(
  config.LOADSURE_API_KEY,
  config.LOADSURE_BASE_URL,
  {
    cacheTTL: 3600, // 1 hour cache TTL
    dataDir: path.join(__dirname, '../../data')
  }
);

module.exports = supportDataService;