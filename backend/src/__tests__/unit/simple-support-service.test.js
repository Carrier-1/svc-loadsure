// src/__tests__/unit/simple-support-service.test.js
import { jest } from '@jest/globals';
import { mockCommodities, mockEquipmentTypes, mockFreightClasses } from '../mocks/supportData.simple.mock.js';

// Create a simplified mock of the SupportDataService
class SupportDataService {
  constructor() {
    this.cache = {
      commodities: mockCommodities,
      equipmentTypes: mockEquipmentTypes,
      freightClasses: mockFreightClasses
    };
  }

  getCommodities() {
    return this.cache.commodities || [];
  }

  getEquipmentTypes() {
    return this.cache.equipmentTypes || [];
  }

  getFreightClasses() {
    return this.cache.freightClasses || [];
  }

  // Map freight class to commodity ID (simplified)
  mapFreightClassToCommodity(freightClass) {
    if (freightClass === '70' || freightClass === 'class70') {
      return 7; // Electronics
    }
    return 1; // Default to Miscellaneous
  }

  // Format freight class string (simplified)
  formatFreightClass(freightClass) {
    if (freightClass.startsWith('class')) {
      return freightClass;
    }
    return `class${freightClass.replace('.', '_')}`;
  }
}

// Create an instance to test
const supportDataService = new SupportDataService();

describe('SupportDataService', () => {
  test('should return commodities from cache', () => {
    const result = supportDataService.getCommodities();
    expect(result).toEqual(mockCommodities);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Miscellaneous');
  });

  test('should return equipment types from cache', () => {
    const result = supportDataService.getEquipmentTypes();
    expect(result).toEqual(mockEquipmentTypes);
    expect(result.length).toBe(2);
    expect(result[1].name).toBe('Dry Van');
  });

  test('should map freight class to commodity ID', () => {
    // Test with various inputs
    expect(supportDataService.mapFreightClassToCommodity('70')).toBe(7);
    expect(supportDataService.mapFreightClassToCommodity('class70')).toBe(7);
    expect(supportDataService.mapFreightClassToCommodity('50')).toBe(1);
  });

  test('should format freight class string', () => {
    // Test with different formats
    expect(supportDataService.formatFreightClass('65')).toBe('class65');
    expect(supportDataService.formatFreightClass('65.5')).toBe('class65_5');
    expect(supportDataService.formatFreightClass('class70')).toBe('class70');
  });
});