// backend/src/services/supportDataService.js
import { promisify } from 'util';
import Redis from 'ioredis';
import config from '../config.js';
import { sequelize, Sequelize } from '../../database/index.js';

// Constants for Redis keys and cache expiration
const CACHE_KEY_PREFIX = 'loadsure:supportData:';
const CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Service for fetching, caching, and managing Loadsure support data
 * This includes commodities, equipment types, freight classes, etc.
 * Using PostgreSQL database for persistence and Redis for caching
 */
class SupportDataService {
  constructor(apiKey, baseUrl, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Initialize Redis client
    this.redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      keyPrefix: CACHE_KEY_PREFIX,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000
    });
    
    // Log Redis connection status
    this.redis.on('connect', () => {
      console.log('Support Data Service: Connected to Redis');
    });
    
    this.redis.on('error', (err) => {
      console.error('Support Data Service: Redis connection error:', err);
    });
    
    // Initialize fetch for API calls
    this.initializeFetch();
  }

  /**
   * Initialize fetch with dynamic import
   */
  async initializeFetch() {
    try {
      // Dynamically import node-fetch
      const module = await import('node-fetch');
      this.fetch = module.default;
      console.log('Fetch initialized successfully in SupportDataService');
    } catch (error) {
      console.error('Error initializing fetch in SupportDataService:', error);
      try {
        const fetchModule = await import('node-fetch');
        this.fetch = fetchModule.default;
        console.log('Fetch initialized using fallback in SupportDataService');
      } catch (e) {
        console.error('Failed to initialize fetch using fallback in SupportDataService:', e);
      }
    }
  }

  /**
   * Initialize the service by loading data from database or API if needed
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing Support Data Service...');
    
    // Make sure fetch is initialized
    if (!this.fetch) {
      await this.initializeFetch();
    }
    
    // Ensure database tables exist
    await this.ensureDatabaseTables();
    
    // Check if we need to refresh the data
    const lastUpdated = await this.getLastUpdated();
    const shouldRefresh = !lastUpdated || this.isDataStale(lastUpdated);
    
    if (shouldRefresh) {
      console.log('Support data is stale or missing, refreshing from API...');
      await this.fetchAndUpdateAllSupportData();
    } else {
      console.log('Support data is current, using cached data');
      // Warm up Redis cache from database
      await this.warmupCache();
    }
    
    console.log('Support Data Service initialized successfully');
  }
  
  /**
   * Check if data is stale based on last update time
   * @param {string} lastUpdated - ISO datetime string of last update
   * @returns {boolean} True if data is stale
   */
  isDataStale(lastUpdated) {
    const lastUpdateTime = new Date(lastUpdated).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastUpdateTime;
    
    // Consider data stale if older than 24 hours
    return timeDiff > 24 * 60 * 60 * 1000;
  }
  
  /**
   * Ensure database tables exist for support data
   * @returns {Promise<void>}
   */
  async ensureDatabaseTables() {
    try {
      // Define models if they don't exist yet
      const models = {
        Commodity: sequelize.define('Commodity', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT
        }, { timestamps: true }),
        
        CommodityExclusion: sequelize.define('CommodityExclusion', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          commodityId: Sequelize.INTEGER,
          description: Sequelize.TEXT
        }, { timestamps: true }),
        
        EquipmentType: sequelize.define('EquipmentType', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT
        }, { timestamps: true }),
        
        LoadType: sequelize.define('LoadType', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT
        }, { timestamps: true }),
        
        FreightClass: sequelize.define('FreightClass', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT
        }, { timestamps: true }),
        
        TermOfSale: sequelize.define('TermOfSale', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT
        }, { timestamps: true }),
        
        SupportDataMetadata: sequelize.define('SupportDataMetadata', {
          key: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          value: Sequelize.TEXT
        }, { timestamps: true })
      };
      
      // Sync models to create tables
      await Promise.all(Object.values(models).map(model => model.sync()));
      
      // Store models for later use
      this.models = models;
      
      console.log('Support data database tables verified');
    } catch (error) {
      console.error('Error ensuring support data tables:', error);
      throw error;
    }
  }
  
  /**
   * Warm up Redis cache from database
   * @returns {Promise<void>}
   */
  async warmupCache() {
    try {
      // Load all data types from database to Redis cache
      await Promise.all([
        this.loadToCache('commodities'),
        this.loadToCache('commodityExclusions'),
        this.loadToCache('equipmentTypes'),
        this.loadToCache('loadTypes'),
        this.loadToCache('freightClasses'),
        this.loadToCache('termsOfSales')
      ]);
      
      console.log('Redis cache warmed up with support data');
    } catch (error) {
      console.error('Error warming up Redis cache:', error);
      // Continue execution - we can still fetch data directly from the database if needed
    }
  }
  
  /**
   * Load data from database to Redis cache
   * @param {string} dataType - Type of data to load
   * @returns {Promise<void>}
   */
  async loadToCache(dataType) {
    try {
      let data;
      
      // Get data from database based on type
      switch (dataType) {
        case 'commodities':
          data = await this.models.Commodity.findAll();
          break;
        case 'commodityExclusions':
          data = await this.models.CommodityExclusion.findAll();
          break;
        case 'equipmentTypes':
          data = await this.models.EquipmentType.findAll();
          break;
        case 'loadTypes':
          data = await this.models.LoadType.findAll();
          break;
        case 'freightClasses':
          data = await this.models.FreightClass.findAll();
          break;
        case 'termsOfSales':
          data = await this.models.TermOfSale.findAll();
          break;
        default:
          console.warn(`Unknown data type: ${dataType}`);
          return;
      }
      
      // If data is found, convert to plain objects and cache in Redis
      if (data && data.length > 0) {
        const plainData = data.map(item => item.get({ plain: true }));
        await this.redis.set(dataType, JSON.stringify(plainData), 'EX', CACHE_TTL);
        console.log(`Loaded ${plainData.length} ${dataType} from database to Redis cache`);
      } else {
        console.log(`No ${dataType} found in database`);
      }
    } catch (error) {
      console.error(`Error loading ${dataType} to cache:`, error);
      throw error;
    }
  }

  /**
   * Fetch all support data from Loadsure API and update database and cache
   * @returns {Promise<Object>} Support data result
   */
  async fetchAndUpdateAllSupportData() {
    console.log('Fetching all support data from Loadsure API...');
    
    // Make sure fetch is initialized
    if (!this.fetch) {
      await this.initializeFetch();
      if (!this.fetch) {
        throw new Error('Fetch is not initialized in SupportDataService');
      }
    }
    
    try {
      const results = {};
      
      // Define data types and their corresponding models
      const dataTypes = [
        { key: 'commodities', endpoint: '/api/commodities', model: this.models.Commodity },
        { key: 'commodityExclusions', endpoint: '/api/commodityExclusions', model: this.models.CommodityExclusion },
        { key: 'equipmentTypes', endpoint: '/api/equipmentTypes', model: this.models.EquipmentType },
        { key: 'loadTypes', endpoint: '/api/loadTypes', model: this.models.LoadType },
        { key: 'freightClasses', endpoint: '/api/freightClasses', model: this.models.FreightClass },
        { key: 'termsOfSales', endpoint: '/api/termsOfSales', model: this.models.TermOfSale }
      ];
      
      // Fetch and process each data type
      for (const { key, endpoint, model } of dataTypes) {
        try {
          console.log(`Fetching from endpoint ${endpoint}...`);
          let data = await this.fetchFromLoadsureAPI(endpoint);
          
          // Process data if needed
          if (key === 'termsOfSales') {
            data = this.processTermsOfSales(data);
          }
          
          // Store results
          results[key] = data;
          
          // Update database
          await this.updateDatabase(model, data);
          
          // Update Redis cache
          await this.redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
          
          console.log(`Successfully fetched ${data.length} items from ${endpoint}`);
        } catch (error) {
          console.error(`Error processing ${key}:`, error);
          // Continue with other data types
        }
      }
      
      // Update last updated timestamp
      const now = new Date().toISOString();
      await this.setLastUpdated(now);
      
      console.log('All support data updated successfully');
      return results;
    } catch (error) {
      console.error('Error updating support data:', error);
      throw error;
    }
  }
  
  /**
   * Update database with new data
   * @param {Object} model - Sequelize model
   * @param {Array} data - Data to update
   * @returns {Promise<void>}
   */
  async updateDatabase(model, data) {
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Clear existing data
      await model.destroy({ 
        where: {}, 
        truncate: true,
        cascade: true,
        transaction
      });
      
      // Insert new data
      if (data && data.length > 0) {
        await model.bulkCreate(data, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();
      
      console.log(`Updated ${model.name} in database with ${data.length} records`);
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error(`Error updating ${model.name} in database:`, error);
      throw error;
    }
  }

  /**
   * Process terms of sales data from the API and format it properly
   * @param {Array|Object} data - Raw terms of sales data from Loadsure API
   * @returns {Array} Processed terms of sales
   */
  processTermsOfSales(data) {
    // If data is a single string, wrap it in an array
    if (typeof data === 'string') {
      data = [data];
    }
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.warn('Unexpected format for terms of sales data:', typeof data);
      return [];
    }
    
    // Process each item
    return data.map(term => {
      // Convert to string if not already
      const termStr = String(term);
      
      // Extract the ID - take characters before the hyphen or first 3 characters
      let id = '';
      const hyphenIndex = termStr.indexOf('-');
      if (hyphenIndex > 0) {
        // Get the part before the hyphen and trim it
        id = termStr.substring(0, hyphenIndex).trim();
      } else {
        // Just take the first 3 characters
        id = termStr.substring(0, 3);
      }
      
      // Ensure ID is not empty
      if (!id) {
        id = 'TOS';
      }
      
      // Return formatted object
      return {
        id: id,
        name: id,
        description: termStr
      };
    });
  }

  /**
   * Fetch data from Loadsure API
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<Array>} API response data
   */
  async fetchFromLoadsureAPI(endpoint) {
    // Make sure fetch is initialized
    if (!this.fetch) {
      await this.initializeFetch();
      if (!this.fetch) {
        throw new Error('Fetch is not initialized in SupportDataService');
      }
    }
    
    try {
      console.log(`Fetching from endpoint ${endpoint}...`);
      const response = await this.fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText} ${this.baseUrl}${endpoint}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching from endpoint ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Set the last updated timestamp
   * @param {string} timestamp - ISO string timestamp
   * @returns {Promise<void>}
   */
  async setLastUpdated(timestamp) {
    try {
      // Update in database
      await this.models.SupportDataMetadata.upsert({
        key: 'lastUpdated',
        value: timestamp
      });
      
      // Update in Redis
      await this.redis.set('lastUpdated', timestamp, 'EX', CACHE_TTL);
      
      console.log(`Set last updated timestamp to ${timestamp}`);
    } catch (error) {
      console.error('Error setting last updated timestamp:', error);
      throw error;
    }
  }

  /**
   * Get the last updated timestamp
   * @returns {Promise<string|null>} ISO timestamp or null if not set
   */
  async getLastUpdated() {
    try {
      // Try to get from Redis first
      const cachedTimestamp = await this.redis.get('lastUpdated');
      if (cachedTimestamp) {
        return cachedTimestamp;
      }
      
      // Fallback to database
      const record = await this.models.SupportDataMetadata.findOne({
        where: { key: 'lastUpdated' }
      });
      
      if (record) {
        // Cache the result for future use
        await this.redis.set('lastUpdated', record.value, 'EX', CACHE_TTL);
        return record.value;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting last updated timestamp:', error);
      return null;
    }
  }

  /**
   * Generic method to get data from cache or database
   * @param {string} dataType - Type of data to get
   * @param {Object} model - Sequelize model for database fallback
   * @returns {Promise<Array>} Data from cache or database
   */
  async getData(dataType, model) {
    try {
      // Try to get from Redis first
      const cachedData = await this.redis.get(dataType);
      if (cachedData) {
        console.log(`Cache hit for ${dataType}`);
        return JSON.parse(cachedData);
      }
      
      // Fallback to database
      const records = await model.findAll();
      const data = records.map(record => record.get({ plain: true }));
      
      // Cache the result for future use
      if (data.length > 0) {
        await this.redis.set(dataType, JSON.stringify(data), 'EX', CACHE_TTL);
      }
      
      return data;
    } catch (error) {
      console.error(`Error getting ${dataType}:`, error);
      return [];
    }
  }

  /**
   * Get commodity data
   * @returns {Promise<Array>} Commodity data
   */
  async getCommodities() {
    return this.getData('commodities', this.models.Commodity);
  }

  /**
   * Get commodity exclusions data
   * @returns {Promise<Array>} Commodity exclusions data
   */
  async getCommodityExclusions() {
    return this.getData('commodityExclusions', this.models.CommodityExclusion);
  }

  /**
   * Get equipment types data
   * @returns {Promise<Array>} Equipment types data
   */
  async getEquipmentTypes() {
    return this.getData('equipmentTypes', this.models.EquipmentType);
  }

  /**
   * Get load types data
   * @returns {Promise<Array>} Load types data
   */
  async getLoadTypes() {
    return this.getData('loadTypes', this.models.LoadType);
  }

  /**
   * Get freight classes data
   * @returns {Promise<Array>} Freight classes data
   */
  async getFreightClasses() {
    return this.getData('freightClasses', this.models.FreightClass);
  }

  /**
   * Get terms of sales data
   * @returns {Promise<Array>} Terms of sales data
   */
  async getTermsOfSales() {
    return this.getData('termsOfSales', this.models.TermOfSale);
  }

  /**
   * Map a freight class to a commodity ID
   * @param {string} freightClass - Freight class from our system
   * @returns {Promise<number>} Mapped commodity ID
   */
  async mapFreightClassToCommodity(freightClass) {
    try {
      // Get freight classes and commodities
      const freightClasses = await this.getFreightClasses();
      const commodities = await this.getCommodities();
      
      // Find the freight class by ID or name
      const freightClassObj = freightClasses.find(fc => 
        fc.id === freightClass || 
        fc.name === freightClass || 
        fc.name === `Class ${freightClass}`
      );
      
      // Default mapping based on known patterns if direct mapping not available
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
    } catch (error) {
      console.error('Error mapping freight class to commodity:', error);
      return 1; // Default to miscellaneous on error
    }
  }

  /**
   * Map freight class string to Loadsure format
   * @param {string} freightClass - Freight class (e.g., "65" or "65.5")
   * @returns {string} Formatted freight class (e.g., "class65" or "class65_5")
   */
  formatFreightClass(freightClass) {
    // If the freight class already starts with "class", return it as is
    if (freightClass.startsWith('class')) {
      return freightClass;
    }
    
    // Format according to Loadsure's convention
    return `class${freightClass.replace('.', '_')}`;
  }
}

// Export singleton instance
const supportDataService = new SupportDataService(
  config.LOADSURE_API_KEY,
  config.LOADSURE_BASE_URL
);

export default supportDataService;