// backend/src/services/supportDataService.js
import Redis from 'ioredis';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import config from '../config.js';
import { sequelize, Sequelize } from '../../database/index.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log('Fetch initialized successfully in SupportDataService');
  } catch (error) {
    console.error('Error initializing fetch in SupportDataService:', error);
    // Fallback to try again with another approach
    try {
      const module = await import('node-fetch');
      fetch = module.default;
      console.log('Fetch initialized using fallback in SupportDataService');
    } catch (e) {
      console.error('Failed to initialize fetch using fallback in SupportDataService:', e);
    }
  }
}

/**
 * Service for fetching, caching, and managing Loadsure support data
 * This includes commodities, equipment types, freight classes, etc.
 * Uses PostgreSQL for persistence and Redis for caching
 */
class SupportDataService {
  constructor(apiKey, baseUrl, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Initialize Redis client
    this.redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      keyPrefix: 'loadsure:support:',
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true, // Don't connect immediately
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });
    
    // Cache TTL in seconds
    this.cacheTTL = options.cacheTTL || 3600; // Default 1 hour
    
    // Define table names for each data type
    this.tables = {
      commodities: 'SupportCommodities',
      commodityExclusions: 'SupportCommodityExclusions',
      equipmentTypes: 'SupportEquipmentTypes',
      loadTypes: 'SupportLoadTypes',
      freightClasses: 'SupportFreightClasses',
      termsOfSales: 'SupportTermsOfSales',
      lastUpdated: 'SupportLastUpdated'
    };
    
    // Define Redis cache keys
    this.cacheKeys = {
      commodities: 'commodities',
      commodityExclusions: 'commodityExclusions',
      equipmentTypes: 'equipmentTypes',
      loadTypes: 'loadTypes',
      freightClasses: 'freightClasses',
      termsOfSales: 'termsOfSales',
      lastUpdated: 'lastUpdated'
    };
    
    // Support data endpoints
    this.endpoints = {
      commodities: '/api/commodities',
      commodityExclusions: '/api/commodityExclusions',
      equipmentTypes: '/api/equipmentTypes',
      loadTypes: '/api/loadTypes',
      freightClasses: '/api/freightClasses',
      termsOfSales: '/api/termsOfSales'
    };
    
    // Default freight class to commodity mappings
    this.defaultFreightClassMappings = {
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
    
    // Initialize fetch
    this.initializeFetch();
  }

  /**
   * Initialize fetch with dynamic import
   */
  async initializeFetch() {
    if (!fetch) {
      await initializeFetch();
    }
  }

  /**
   * Initialize the service by ensuring tables exist and loading cached data
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing Support Data Service...');
    
    try {
      // Make sure fetch is initialized
      if (!fetch) {
        await this.initializeFetch();
      }
      
      // Connect to Redis
      await this.redis.connect().catch(err => {
        console.warn('Could not connect to Redis:', err.message);
        console.warn('SupportDataService will continue without caching');
      });
      
      // Ensure database tables exist
      await this.ensureTables();
      
      // Check if we need to refresh data
      const lastUpdated = await this.getLastUpdatedFromDb();
      
      if (!lastUpdated) {
        console.log('No support data found in database, fetching from API...');
        await this.fetchAndUpdateAllSupportData();
      } else {
        console.log(`Support data last updated: ${lastUpdated}`);
        
        // If last update was more than 24 hours ago, refresh the data
        const lastUpdateTime = new Date(lastUpdated).getTime();
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastUpdateTime;
        
        if (timeDiff > 24 * 60 * 60 * 1000) {
          console.log('Support data is more than 24 hours old, refreshing...');
          await this.fetchAndUpdateAllSupportData();
        } else {
          // Load data from database to Redis cache
          await this.loadDataToCache();
        }
      }
      
      console.log('Support Data Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Support Data Service:', error);
      throw error;
    }
  }
  
  /**
   * Ensure the necessary database tables exist
   * @returns {Promise<void>}
   */
  async ensureTables() {
    try {
      // Define models dynamically if they don't exist
      // SupportCommodities table
      if (!sequelize.models.SupportCommodities) {
        sequelize.define('SupportCommodities', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, {
          freezeTableName: true
        });
      }
      
      // SupportCommodityExclusions table
      if (!sequelize.models.SupportCommodityExclusions) {
        sequelize.define('SupportCommodityExclusions', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          commodityId: Sequelize.INTEGER,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, {
          freezeTableName: true
        });
      }
      
      // SupportEquipmentTypes table
      if (!sequelize.models.SupportEquipmentTypes) {
        sequelize.define('SupportEquipmentTypes', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, {
          freezeTableName: true
        });
      }
      
      // SupportLoadTypes table
      if (!sequelize.models.SupportLoadTypes) {
        sequelize.define('SupportLoadTypes', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, {
          freezeTableName: true
        });
      }
      
      // SupportFreightClasses table
      if (!sequelize.models.SupportFreightClasses) {
        sequelize.define('SupportFreightClasses', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, {
          freezeTableName: true
        });
      }
      
      // SupportTermsOfSales table
      if (!sequelize.models.SupportTermsOfSales) {
        sequelize.define('SupportTermsOfSales', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, {
          freezeTableName: true
        });
      }
      
      // SupportLastUpdated table
      if (!sequelize.models.SupportLastUpdated) {
        sequelize.define('SupportLastUpdated', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            defaultValue: 1
          },
          timestamp: Sequelize.DATE
        }, {
          freezeTableName: true
        });
      }
      
      // Sync models with database
      await sequelize.sync();
      console.log('Support Data tables synchronized with database');
    } catch (error) {
      console.error('Error ensuring tables exist:', error);
      throw error;
    }
  }
  
  /**
   * Load all data from database to Redis cache
   * @returns {Promise<void>}
   */
  async loadDataToCache() {
    try {
      console.log('Loading support data from database to cache...');
      
      // Load each data type from database to cache
      for (const [type, tableName] of Object.entries(this.tables)) {
        if (type === 'lastUpdated') continue; // Handle separately
        
        const model = sequelize.models[tableName];
        if (!model) {
          console.warn(`Model ${tableName} not found, skipping cache population`);
          continue;
        }
        
        const records = await model.findAll();
        const data = records.map(record => {
          // If record has data field, use it (contains the full object)
          if (record.data) return record.data;
          
          // Otherwise construct object from fields
          const { id, name, description, ...rest } = record.toJSON();
          return { id, name, description, ...rest };
        });
        
        // Store in Redis cache
        const cacheKey = this.cacheKeys[type];
        if (cacheKey && data.length > 0) {
          await this.setCache(cacheKey, data);
          console.log(`Loaded ${data.length} ${type} records to cache`);
        }
      }
      
      // Load last updated timestamp
      const lastUpdated = await this.getLastUpdatedFromDb();
      if (lastUpdated) {
        await this.setCache(this.cacheKeys.lastUpdated, lastUpdated);
      }
      
      console.log('Finished loading support data to cache');
    } catch (error) {
      console.error('Error loading data to cache:', error);
      // Continue without caching
    }
  }
  
  /**
   * Get data from Redis cache
   * @param {String} key - Cache key
   * @returns {Promise<any>} Cached data or null
   */
  async getCache(key) {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Error getting ${key} from cache:`, error.message);
      return null;
    }
  }
  
  /**
   * Set data in Redis cache
   * @param {String} key - Cache key
   * @param {any} data - Data to cache
   * @param {Number} ttl - Cache TTL in seconds (optional)
   * @returns {Promise<void>}
   */
  async setCache(key, data, ttl = this.cacheTTL) {
    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (error) {
      console.warn(`Error setting ${key} in cache:`, error.message);
      // Continue without caching
    }
  }
  
  /**
   * Get last updated timestamp from database
   * @returns {Promise<String|null>} ISO timestamp string or null
   */
  async getLastUpdatedFromDb() {
    try {
      const model = sequelize.models[this.tables.lastUpdated];
      const record = await model.findOne({ where: { id: 1 } });
      return record ? record.timestamp.toISOString() : null;
    } catch (error) {
      console.warn('Error getting last updated from database:', error.message);
      return null;
    }
  }
  
  /**
   * Update last updated timestamp in database
   * @param {Date} timestamp - Timestamp to set
   * @returns {Promise<void>}
   */
  async updateLastUpdatedInDb(timestamp = new Date()) {
    try {
      const model = sequelize.models[this.tables.lastUpdated];
      await model.upsert({
        id: 1,
        timestamp
      });
    } catch (error) {
      console.error('Error updating last updated in database:', error.message);
    }
  }

  /**
   * Fetch all support data from Loadsure API and update database and cache
   * @returns {Promise<Object>} Support data result
   */
  async fetchAndUpdateAllSupportData() {
    console.log('Fetching all support data from Loadsure API...');
    
    // Make sure fetch is initialized
    if (!fetch) {
      await this.initializeFetch();
      if (!fetch) {
        throw new Error('Fetch is not initialized');
      }
    }
    
    try {
      const results = {};
      
      // Fetch all data types
      for (const [key, endpoint] of Object.entries(this.endpoints)) {
        const data = await this.fetchFromLoadsureAPI(endpoint);
        results[key] = data;
        
        // Save to database
        await this.saveToDatabase(key, data);
        
        // Update cache
        await this.setCache(this.cacheKeys[key], data);
      }
      
      // Update last updated timestamp
      const now = new Date();
      await this.updateLastUpdatedInDb(now);
      await this.setCache(this.cacheKeys.lastUpdated, now.toISOString());
      
      console.log('All support data updated successfully');
      return results;
    } catch (error) {
      console.error('Error updating support data:', error);
      throw error;
    }
  }

  /**
   * Save data to database
   * @param {String} type - Data type
   * @param {Array} data - Data to save
   * @returns {Promise<void>}
   */
  async saveToDatabase(type, data) {
    try {
      const tableName = this.tables[type];
      const model = sequelize.models[tableName];
      
      if (!model) {
        console.warn(`Model ${tableName} not found, skipping database save`);
        return;
      }
      
      // Use transaction for atomicity
      await sequelize.transaction(async (t) => {
        // Clear existing data
        await model.destroy({ truncate: true, transaction: t });
        
        // Insert new data
        for (const item of data) {
          // For items where id is not a simple type, store the full object in data field
          // and use a generated id as the primary key
          if (typeof item.id === 'object') {
            await model.create({
              id: `${type}_${Math.random().toString(36).substring(2, 10)}`,
              name: item.name || '',
              description: item.description || '',
              data: item
            }, { transaction: t });
          } else {
            // For simple items, spread the fields
            await model.create({
              id: item.id,
              name: item.name || '',
              description: item.description || '',
              data: item
            }, { transaction: t });
          }
        }
      });
      
      console.log(`Saved ${data.length} ${type} records to database`);
    } catch (error) {
      console.error(`Error saving ${type} to database:`, error);
      throw error;
    }
  }

  /**
   * Fetch data from Loadsure API
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<Array>} API response data
   */
  async fetchFromLoadsureAPI(endpoint) {
    // Make sure fetch is initialized
    if (!fetch) {
      await this.initializeFetch();
      if (!fetch) {
        throw new Error('Fetch is not initialized');
      }
    }
    
    try {
      console.log(`Fetching from endpoint ${endpoint}...`);
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
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
      console.log(`Successfully fetched ${Array.isArray(data) ? data.length : 'some'} items from ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`Error fetching from endpoint ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Get commodity data
   * @returns {Promise<Array>} Commodity data
   */
  async getCommodities() {
    // Try to get from cache first
    const cached = await this.getCache(this.cacheKeys.commodities);
    if (cached) return cached;
    
    // If not in cache, get from database
    try {
      const model = sequelize.models[this.tables.commodities];
      const records = await model.findAll();
      const data = records.map(record => record.data || record.toJSON());
      
      // Update cache
      await this.setCache(this.cacheKeys.commodities, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching commodities from database:', error);
      return [];
    }
  }

  /**
   * Get commodity exclusions data
   * @returns {Promise<Array>} Commodity exclusions data
   */
  async getCommodityExclusions() {
    // Try to get from cache first
    const cached = await this.getCache(this.cacheKeys.commodityExclusions);
    if (cached) return cached;
    
    // If not in cache, get from database
    try {
      const model = sequelize.models[this.tables.commodityExclusions];
      const records = await model.findAll();
      const data = records.map(record => record.data || record.toJSON());
      
      // Update cache
      await this.setCache(this.cacheKeys.commodityExclusions, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching commodity exclusions from database:', error);
      return [];
    }
  }

  /**
   * Get equipment types data
   * @returns {Promise<Array>} Equipment types data
   */
  async getEquipmentTypes() {
    // Try to get from cache first
    const cached = await this.getCache(this.cacheKeys.equipmentTypes);
    if (cached) return cached;
    
    // If not in cache, get from database
    try {
      const model = sequelize.models[this.tables.equipmentTypes];
      const records = await model.findAll();
      const data = records.map(record => record.data || record.toJSON());
      
      // Update cache
      await this.setCache(this.cacheKeys.equipmentTypes, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching equipment types from database:', error);
      return [];
    }
  }

  /**
   * Get load types data
   * @returns {Promise<Array>} Load types data
   */
  async getLoadTypes() {
    // Try to get from cache first
    const cached = await this.getCache(this.cacheKeys.loadTypes);
    if (cached) return cached;
    
    // If not in cache, get from database
    try {
      const model = sequelize.models[this.tables.loadTypes];
      const records = await model.findAll();
      const data = records.map(record => record.data || record.toJSON());
      
      // Update cache
      await this.setCache(this.cacheKeys.loadTypes, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching load types from database:', error);
      return [];
    }
  }

  /**
   * Get freight classes data
   * @returns {Promise<Array>} Freight classes data
   */
  async getFreightClasses() {
    // Try to get from cache first
    const cached = await this.getCache(this.cacheKeys.freightClasses);
    if (cached) return cached;
    
    // If not in cache, get from database
    try {
      const model = sequelize.models[this.tables.freightClasses];
      const records = await model.findAll();
      const data = records.map(record => record.data || record.toJSON());
      
      // Update cache
      await this.setCache(this.cacheKeys.freightClasses, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching freight classes from database:', error);
      return [];
    }
  }

  /**
   * Get terms of sales data
   * @returns {Promise<Array>} Terms of sales data
   */
  async getTermsOfSales() {
    // Try to get from cache first
    const cached = await this.getCache(this.cacheKeys.termsOfSales);
    if (cached) return cached;
    
    // If not in cache, get from database
    try {
      const model = sequelize.models[this.tables.termsOfSales];
      const records = await model.findAll();
      const data = records.map(record => record.data || record.toJSON());
      
      // Update cache
      await this.setCache(this.cacheKeys.termsOfSales, data);
      
      return data;
    } catch (error) {
      console.error('Error fetching terms of sales from database:', error);
      return [];
    }
  }

  /**
   * Get last updated timestamp
   * @returns {Promise<string>} ISO timestamp string
   */
  async getLastUpdated() {
    // Try to get from cache first
    const cached = await this.getCache(this.cacheKeys.lastUpdated);
    if (cached) return cached;
    
    // If not in cache, get from database
    const fromDb = await this.getLastUpdatedFromDb();
    if (fromDb) {
      // Update cache
      await this.setCache(this.cacheKeys.lastUpdated, fromDb);
      return fromDb;
    }
    
    return null;
  }

  /**
   * Map a freight class to a commodity ID
   * @param {string} freightClass - Freight class from our system
   * @returns {Promise<number>} Mapped commodity ID
   */
  async mapFreightClassToCommodity(freightClass) {
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
      // Use default mappings
      const defaultMapping = this.defaultFreightClassMappings[freightClass];
      if (defaultMapping) {
        return defaultMapping;
      }
      
      // Default to miscellaneous
      const misc = commodities.find(c => c.name.toLowerCase().includes('misc'));
      return misc ? misc.id : 1;
    }
    
    // If we have a mapping system between freight classes and commodities,
    // we would implement that logic here
    
    // For now, return a default commodity ID (miscellaneous)
    const misc = commodities.find(c => c.name.toLowerCase().includes('misc'));
    return misc ? misc.id : 1;
  }

  /**
   * Map freight class string to Loadsure format
   * @param {string} freightClass - Freight class (e.g., "65" or "65.5")
   * @returns {string} Formatted freight class (e.g., "class65" or "class65_5")
   */
  async formatFreightClass(freightClass) {
    // Get freight classes to check proper format
    const freightClasses = await this.getFreightClasses();
    
    // If the freight class already matches a known ID, return it
    if (freightClasses.find(fc => fc.id === freightClass)) {
      return freightClass;
    }
    
    // Otherwise format it according to Loadsure's convention
    return `class${freightClass.replace('.', '_')}`;
  }
  
  /**
   * Close connections gracefully
   * @returns {Promise<void>}
   */
  async close() {
    try {
      // Close Redis connection
      await this.redis.quit();
      console.log('Support Data Service: Redis connection closed');
    } catch (error) {
      console.error('Error closing Support Data Service connections:', error);
    }
  }
}

// Export singleton instance
const supportDataService = new SupportDataService(
  config.LOADSURE_API_KEY,
  config.LOADSURE_BASE_URL,
  {
    cacheTTL: parseInt(process.env.SUPPORT_DATA_CACHE_TTL || '3600', 10) // 1 hour cache TTL
  }
);

export default supportDataService;