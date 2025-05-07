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
    
    // Initialize models - will be populated in ensureDatabaseTables
    this.models = {};
    
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
    
    try {
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
    } catch (error) {
      console.error('Error during initialization, will continue with Redis-only mode:', error);
      // Try to use just Redis data or fetch from API
      await this.ensureRedisData();
    }
    
    console.log('Support Data Service initialized successfully');
  }

  /**
   * Ensure Redis has data, fetching from API if needed
   */
  async ensureRedisData() {
    try {
      // Check if we have data in Redis
      const hasData = await this.checkRedisDataExists();
      if (!hasData) {
        console.log('No data found in Redis, fetching from API directly...');
        await this.fetchAndUpdateRedisOnly();
      } else {
        console.log('Data found in Redis cache, using cached data');
      }
    } catch (error) {
      console.error('Error ensuring Redis data:', error);
    }
  }

  /**
   * Fetch data from API and update Redis only (no database)
   */
  async fetchAndUpdateRedisOnly() {
    console.log('Fetching all support data from Loadsure API (Redis-only mode)...');
    
    try {
      // Define data types and endpoints
      const dataTypes = [
        { key: 'commodities', endpoint: '/api/commodities' },
        { key: 'commodityExclusions', endpoint: '/api/commodityExclusions' },
        { key: 'equipmentTypes', endpoint: '/api/equipmentTypes' },
        { key: 'loadTypes', endpoint: '/api/loadTypes' },
        { key: 'freightClasses', endpoint: '/api/freightClasses' },
        { key: 'termsOfSales', endpoint: '/api/termsOfSales' }
      ];
      
      // Fetch and process each data type
      for (const { key, endpoint } of dataTypes) {
        try {
          console.log(`Fetching from endpoint ${endpoint}...`);
          let data = await this.fetchFromLoadsureAPI(endpoint);
          
          // Process data if needed
          if (key === 'termsOfSales') {
            data = this.processTermsOfSales(data);
          }
          
          // Update Redis cache
          await this.redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
          console.log(`Successfully fetched and cached ${data.length} items from ${endpoint}`);
        } catch (error) {
          console.error(`Error processing ${key}:`, error);
        }
      }
      
      // Update last updated timestamp
      const now = new Date().toISOString();
      await this.redis.set('lastUpdated', now, 'EX', CACHE_TTL);
      
      console.log('All support data updated successfully in Redis');
    } catch (error) {
      console.error('Error updating support data in Redis:', error);
      throw error;
    }
  }
  
  /**
   * Check if data is stale based on last update time
   * @param {string} lastUpdated - ISO datetime string of last update
   * @returns {boolean} True if data is stale
   */
  isDataStale(lastUpdated) {
    try {
      const lastUpdateTime = new Date(lastUpdated).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastUpdateTime;
      
      // Consider data stale if older than 24 hours
      return timeDiff > 24 * 60 * 60 * 1000;
    } catch (error) {
      console.error('Error checking if data is stale:', error);
      return true; // If there's an error, consider it stale
    }
  }
  
  /**
   * Ensure database tables exist for support data
   * @returns {Promise<void>}
   */
  async ensureDatabaseTables() {
    try {
      // Define models if they don't exist yet
      this.models = {
        SupportCommodity: sequelize.define('SupportCommodity', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, { timestamps: true }),
        
        SupportCommodityExclusion: sequelize.define('SupportCommodityExclusion', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          commodityId: Sequelize.INTEGER,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, { timestamps: true }),
        
        SupportEquipmentType: sequelize.define('SupportEquipmentType', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, { timestamps: true }),
        
        SupportLoadType: sequelize.define('SupportLoadType', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, { timestamps: true }),
        
        SupportFreightClass: sequelize.define('SupportFreightClass', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.JSONB
        }, { timestamps: true }),
        
        SupportTermOfSale: sequelize.define('SupportTermOfSale', {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          name: Sequelize.STRING,
          description: Sequelize.TEXT,
          data: Sequelize.TEXT
        }, { timestamps: true }),
        
        SupportDataMetadata: sequelize.define('SupportDataMetadata', {
          key: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          value: Sequelize.TEXT
        }, { timestamps: true })
      };
      
      // Sync models to create tables if they don't exist
      await Promise.all(Object.values(this.models).map(model => 
        model.sync({ alter: false })
      ));
      
      console.log('Support data database tables verified');
    } catch (error) {
      console.error('Error ensuring support data tables:', error);
      throw error;
    }
  }
  
  /**
   * Check if Redis has the required data
   * @returns {Promise<boolean>} True if data exists in Redis
   */
  async checkRedisDataExists() {
    try {
      const keys = [
        'commodities',
        'equipmentTypes',
        'freightClasses',
        'loadTypes',
        'termsOfSales'
      ];
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (!data) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking Redis data:', error);
      return false;
    }
  }
  
  /**
   * Warm up Redis cache from database
   * @returns {Promise<void>}
   */
  async warmupCache() {
    try {
      // First check if Redis already has data
      const hasData = await this.checkRedisDataExists();
      if (hasData) {
        console.log('Redis cache already has data, skipping warmup');
        return;
      }
      
      // Load all data types from database to Redis cache
      await Promise.all([
        this.loadToCache('commodities', this.models.SupportCommodity),
        this.loadToCache('commodityExclusions', this.models.SupportCommodityExclusion),
        this.loadToCache('equipmentTypes', this.models.SupportEquipmentType),
        this.loadToCache('loadTypes', this.models.SupportLoadType),
        this.loadToCache('freightClasses', this.models.SupportFreightClass),
        this.loadToCache('termsOfSales', this.models.SupportTermOfSale)
      ]);
      
      console.log('Redis cache warmed up with support data from database');
    } catch (error) {
      console.error('Error warming up Redis cache:', error);
      // Continue execution - we'll fetch on demand if needed
    }
  }
  
  /**
   * Load data from database to Redis cache
   * @param {string} dataType - Type of data to load
   * @param {Object} model - Sequelize model
   * @returns {Promise<void>}
   */
  async loadToCache(dataType, model) {
    try {
      if (!model) {
        console.warn(`No model provided for ${dataType}, skipping cache load`);
        return;
      }
      
      // Get data from database
      const records = await model.findAll();
      
      // If data is found, convert to plain objects and cache in Redis
      if (records && records.length > 0) {
        const plainData = records.map(item => item.get({ plain: true }));
        await this.redis.set(dataType, JSON.stringify(plainData), 'EX', CACHE_TTL);
        console.log(`Loaded ${plainData.length} ${dataType} from database to Redis cache`);
      } else {
        console.log(`No ${dataType} found in database`);
      }
    } catch (error) {
      console.error(`Error loading ${dataType} to cache:`, error);
      // Don't throw here, let the system continue
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
      
      // Define data types and their corresponding models and endpoints
      const dataTypes = [
        { key: 'commodities', endpoint: '/api/commodities', model: this.models.SupportCommodity },
        { key: 'commodityExclusions', endpoint: '/api/commodityExclusions', model: this.models.SupportCommodityExclusion },
        { key: 'equipmentTypes', endpoint: '/api/equipmentTypes', model: this.models.SupportEquipmentType },
        { key: 'loadTypes', endpoint: '/api/loadTypes', model: this.models.SupportLoadType },
        { key: 'freightClasses', endpoint: '/api/freightClasses', model: this.models.SupportFreightClass },
        { key: 'termsOfSales', endpoint: '/api/termsOfSales', model: this.models.SupportTermOfSale }
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
          
          // Update database if model exists
          if (model) {
            try {
              await this.updateDatabase(model, data);
            } catch (dbError) {
              console.error(`Error updating database for ${key}:`, dbError);
            }
          }
          
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
      await this.updateLastUpdated(now);
      
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
    if (!model) {
      console.warn('Model not provided for database update');
      return;
    }
    
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
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching from endpoint ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Update last updated timestamp in both database and Redis
   * @param {string} timestamp - ISO string timestamp
   * @returns {Promise<void>}
   */
  async updateLastUpdated(timestamp) {
    try {
      // Update in database if metadata model exists
      if (this.models.SupportDataMetadata) {
        try {
          await this.models.SupportDataMetadata.upsert({
            key: 'lastUpdated',
            value: timestamp
          });
        } catch (dbError) {
          console.error('Error updating lastUpdated in database:', dbError);
        }
      }
      
      // Update in Redis
      await this.redis.set('lastUpdated', timestamp, 'EX', CACHE_TTL);
      
      console.log(`Updated last updated timestamp to ${timestamp}`);
    } catch (error) {
      console.error('Error updating last updated timestamp:', error);
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
      
      // Fallback to database if metadata model exists
      if (this.models.SupportDataMetadata) {
        try {
          const record = await this.models.SupportDataMetadata.findOne({
            where: { key: 'lastUpdated' }
          });
          
          if (record) {
            // Cache the result for future use
            await this.redis.set('lastUpdated', record.value, 'EX', CACHE_TTL);
            return record.value;
          }
        } catch (dbError) {
          console.error('Error getting lastUpdated from database:', dbError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting last updated timestamp:', error);
      return null;
    }
  }

  /**
   * Get commodities
   * @returns {Promise<Array>} Commodities
   */
  async getCommodities() {
    try {
      const data = await this.redis.get('commodities');
      if (data) {
        return JSON.parse(data);
      }
      
      // If not in Redis, try to fetch from database
      if (this.models.SupportCommodity) {
        try {
          const records = await this.models.SupportCommodity.findAll();
          const commodities = records.map(item => item.get({ plain: true }));
          
          // Cache for next time
          if (commodities.length > 0) {
            await this.redis.set('commodities', JSON.stringify(commodities), 'EX', CACHE_TTL);
          }
          
          return commodities;
        } catch (dbError) {
          console.error('Error fetching commodities from database:', dbError);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting commodities:', error);
      return [];
    }
  }

  /**
   * Get commodity exclusions
   * @returns {Promise<Array>} Commodity exclusions
   */
  async getCommodityExclusions() {
    try {
      const data = await this.redis.get('commodityExclusions');
      if (data) {
        return JSON.parse(data);
      }
      
      // If not in Redis, try to fetch from database
      if (this.models.SupportCommodityExclusion) {
        try {
          const records = await this.models.SupportCommodityExclusion.findAll();
          const exclusions = records.map(item => item.get({ plain: true }));
          
          // Cache for next time
          if (exclusions.length > 0) {
            await this.redis.set('commodityExclusions', JSON.stringify(exclusions), 'EX', CACHE_TTL);
          }
          
          return exclusions;
        } catch (dbError) {
          console.error('Error fetching commodity exclusions from database:', dbError);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting commodity exclusions:', error);
      return [];
    }
  }

  /**
   * Get equipment types
   * @returns {Promise<Array>} Equipment types
   */
  async getEquipmentTypes() {
    try {
      const data = await this.redis.get('equipmentTypes');
      if (data) {
        return JSON.parse(data);
      }
      
      // If not in Redis, try to fetch from database
      if (this.models.SupportEquipmentType) {
        try {
          const records = await this.models.SupportEquipmentType.findAll();
          const equipmentTypes = records.map(item => item.get({ plain: true }));
          
          // Cache for next time
          if (equipmentTypes.length > 0) {
            await this.redis.set('equipmentTypes', JSON.stringify(equipmentTypes), 'EX', CACHE_TTL);
          }
          
          return equipmentTypes;
        } catch (dbError) {
          console.error('Error fetching equipment types from database:', dbError);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting equipment types:', error);
      return [];
    }
  }

  /**
   * Get load types
   * @returns {Promise<Array>} Load types
   */
  async getLoadTypes() {
    try {
      const data = await this.redis.get('loadTypes');
      if (data) {
        return JSON.parse(data);
      }
      
      // If not in Redis, try to fetch from database
      if (this.models.SupportLoadType) {
        try {
          const records = await this.models.SupportLoadType.findAll();
          const loadTypes = records.map(item => item.get({ plain: true }));
          
          // Cache for next time
          if (loadTypes.length > 0) {
            await this.redis.set('loadTypes', JSON.stringify(loadTypes), 'EX', CACHE_TTL);
          }
          
          return loadTypes;
        } catch (dbError) {
          console.error('Error fetching load types from database:', dbError);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting load types:', error);
      return [];
    }
  }

  /**
   * Get freight classes
   * @returns {Promise<Array>} Freight classes
   */
  async getFreightClasses() {
    try {
      const data = await this.redis.get('freightClasses');
      if (data) {
        return JSON.parse(data);
      }
      
      // If not in Redis, try to fetch from database
      if (this.models.SupportFreightClass) {
        try {
          const records = await this.models.SupportFreightClass.findAll();
          const freightClasses = records.map(item => item.get({ plain: true }));
          
          // Cache for next time
          if (freightClasses.length > 0) {
            await this.redis.set('freightClasses', JSON.stringify(freightClasses), 'EX', CACHE_TTL);
          }
          
          return freightClasses;
        } catch (dbError) {
          console.error('Error fetching freight classes from database:', dbError);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting freight classes:', error);
      return [];
    }
  }

  /**
   * Get terms of sales
   * @returns {Promise<Array>} Terms of sales
   */
  async getTermsOfSales() {
    try {
      const data = await this.redis.get('termsOfSales');
      if (data) {
        return JSON.parse(data);
      }
      
      // If not in Redis, try to fetch from database
      if (this.models.SupportTermOfSale) {
        try {
          const records = await this.models.SupportTermOfSale.findAll();
          const termsOfSales = records.map(item => item.get({ plain: true }));
          
          // Cache for next time
          if (termsOfSales.length > 0) {
            await this.redis.set('termsOfSales', JSON.stringify(termsOfSales), 'EX', CACHE_TTL);
          }
          
          return termsOfSales;
        } catch (dbError) {
          console.error('Error fetching terms of sales from database:', dbError);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting terms of sales:', error);
      return [];
    }
  }

  /**
   * Map a freight class to a commodity ID
   * @param {string} freightClass - Freight class from our system
   * @returns {number} Mapped commodity ID
   */
  mapFreightClassToCommodity(freightClass) {
    try {
      // Strip 'class' prefix if present
      const classNumber = freightClass.replace('class', '').replace('_', '.');
      
      // Default mapping based on known patterns
      const defaultMappings = config.LOADSURE_COMMODITY_MAPPINGS || {
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
      
      return defaultMappings[classNumber] || 1; // Default to miscellaneous
    } catch (error) {
      console.error('Error mapping freight class to commodity:', error);
      return 1; // Default to miscellaneous on error
    }
  }

  /**
   * Format freight class string to Loadsure format
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