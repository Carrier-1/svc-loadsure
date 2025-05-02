// backend/src/__tests__/unit/services/supportDataService.test.js
import { jest } from '@jest/globals';
import { mockCommodities, mockEquipmentTypes, mockFreightClasses } from '../../../mocks/supportData.mock.js';

// Mock fs and node-fetch modules
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockImplementation((path) => {
      if (path.includes('commodities.json')) {
        return Promise.resolve(JSON.stringify(mockCommodities));
      } else if (path.includes('equipmentTypes.json')) {
        return Promise.resolve(JSON.stringify(mockEquipmentTypes));
      } else if (path.includes('freightClasses.json')) {
        return Promise.resolve(JSON.stringify(mockFreightClasses));
      } else if (path.includes('lastUpdated.json')) {
        return Promise.resolve(JSON.stringify({ timestamp: new Date().toISOString() }));
      }
      return Promise.resolve('{}');
    })
  }
}));

// Mock node-fetch
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('/api/commodities')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockCommodities)
    });
  } else if (url.includes('/api/equipmentTypes')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockEquipmentTypes)
    });
  } else if (url.includes('/api/freightClasses')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockFreightClasses)
    });
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  });
});

// Mock NodeCache
jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => {
    const cache = {};
    return {
      set: jest.fn((key, value) => {
        cache[key] = value;
        return true;
      }),
      get: jest.fn((key) => cache[key]),
      del: jest.fn(),
      keys: jest.fn(() => Object.keys(cache)),
      has: jest.fn((key) => key in cache),
      flushAll: jest.fn(() => {
        Object.keys(cache).forEach(key => delete cache[key]);
      })
    };
  });
});

// Import the service to test after mocking
import supportDataService from '../../../../services/supportDataService.js';

describe('SupportDataService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Flush the cache
    supportDataService.cache.flushAll();
  });

  describe('initialize', () => {
    it('should initialize support data from persistent storage', async () => {
      // Call initialize
      await supportDataService.initialize();
      
      // Check that the cache was populated from the filesystem
      expect(supportDataService.cache.set).toHaveBeenCalledTimes(expect.any(Number));
      expect(supportDataService.cache.get('loadsure_commodities')).toEqual(mockCommodities);
      expect(supportDataService.cache.get('loadsure_equipment_types')).toEqual(mockEquipmentTypes);
      expect(supportDataService.cache.get('loadsure_freight_classes')).toEqual(mockFreightClasses);
    });

    it('should fetch fresh data if persistent storage is empty', async () => {
      // Mock fs.readFile to return null for all files
      const fs = await import('fs');
      fs.promises.readFile.mockRejectedValue(new Error('File not found'));
      
      // Call initialize
      await supportDataService.initialize();
      
      // Check that the fetch API was called to get fresh data
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('fetchAndUpdateAllSupportData', () => {
    it('should fetch data from the API and update cache and storage', async () => {
      // Call the method
      const result = await supportDataService.fetchAndUpdateAllSupportData();
      
      // Check that fetch was called for all endpoints
      expect(global.fetch).toHaveBeenCalledTimes(expect.any(Number));
      
      // Check that cache was updated
      expect(supportDataService.cache.set).toHaveBeenCalledTimes(expect.any(Number));
      
      // Check that data was persisted
      const fs = await import('fs');
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(expect.any(Number));
      
      // Check the returned data
      expect(result).toHaveProperty('commodities');
      expect(result).toHaveProperty('equipmentTypes');
      expect(result).toHaveProperty('freightClasses');
    });

    it('should handle API fetch errors gracefully', async () => {
      // Mock fetch to throw an error
      global.fetch.mockRejectedValueOnce(new Error('API Error'));
      
      // Call the method and expect it to throw
      await expect(supportDataService.fetchAndUpdateAllSupportData()).rejects.toThrow();
    });
  });

  describe('data retrieval methods', () => {
    beforeEach(async () => {
      // Set up cache with test data
      supportDataService.cache.set('loadsure_commodities', mockCommodities);
      supportDataService.cache.set('loadsure_equipment_types', mockEquipmentTypes);
      supportDataService.cache.set('loadsure_freight_classes', mockFreightClasses);
      supportDataService.cache.set('loadsure_support_data_last_updated', new Date().toISOString());
    });

    it('should return commodities from cache', () => {
      const result = supportDataService.getCommodities();
      expect(result).toEqual(mockCommodities);
      expect(supportDataService.cache.get).toHaveBeenCalledWith('loadsure_commodities');
    });

    it('should return equipment types from cache', () => {
      const result = supportDataService.getEquipmentTypes();
      expect(result).toEqual(mockEquipmentTypes);
      expect(supportDataService.cache.get).toHaveBeenCalledWith('loadsure_equipment_types');
    });

    it('should return freight classes from cache', () => {
      const result = supportDataService.getFreightClasses();
      expect(result).toEqual(mockFreightClasses);
      expect(supportDataService.cache.get).toHaveBeenCalledWith('loadsure_freight_classes');
    });

    it('should return last updated timestamp from cache', () => {
      const timestamp = new Date().toISOString();
      supportDataService.cache.set('loadsure_support_data_last_updated', timestamp);
      
      const result = supportDataService.getLastUpdated();
      expect(result).toEqual(timestamp);
      expect(supportDataService.cache.get).toHaveBeenCalledWith('loadsure_support_data_last_updated');
    });

    it('should return empty arrays when data is not in cache', () => {
      // Clear specific cache entry
      supportDataService.cache.get.mockReturnValueOnce(null);
      
      const result = supportDataService.getCommodities();
      expect(result).toEqual([]);
    });
  });

  describe('mapping methods', () => {
    beforeEach(async () => {
      // Set up cache with test data
      supportDataService.cache.set('loadsure_commodities', mockCommodities);
      supportDataService.cache.set('loadsure_equipment_types', mockEquipmentTypes);
      supportDataService.cache.set('loadsure_freight_classes', mockFreightClasses);
      supportDataService.cache.set('loadsure_support_data_last_updated', new Date().toISOString());
    });

    it('should map freight class to commodity ID', () => {
      // Test with a variety of inputs
      expect(supportDataService.mapFreightClassToCommodity('70')).toBe(1);  // Default mapping
      expect(supportDataService.mapFreightClassToCommodity('class70')).toBe(1);  // Default mapping
    });

    it('should format freight class string', () => {
      // Test with various input formats
      expect(supportDataService.formatFreightClass('65')).toBe('class65');
      expect(supportDataService.formatFreightClass('65.5')).toBe('class65_5');
      expect(supportDataService.formatFreightClass('class70')).toBe('class70');  // Already formatted
    });
  });
});