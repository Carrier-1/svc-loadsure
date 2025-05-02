// backend/src/__tests__/unit/services/supportDataRefreshService.test.js
import { jest } from '@jest/globals';
import schedule from 'node-schedule';
import supportDataService from '../../../services/supportDataService.js';
import SupportDataRefreshService from '../../../services/supportDataRefreshService.js';

// Mock the dependencies
jest.mock('node-schedule');
jest.mock('../../../services/supportDataService.js');

describe('SupportDataRefreshService', () => {
  let refreshService;
  let mockJob;
  
  // Sample schedule
  const TEST_SCHEDULE = '0 0 * * *'; // Daily at midnight

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Mock the schedule job
    mockJob = {
      cancel: jest.fn()
    };
    schedule.scheduleJob.mockReturnValue(mockJob);
    
    // Mock supportDataService
    supportDataService.fetchAndUpdateAllSupportData = jest.fn().mockResolvedValue({
      commodities: [],
      equipmentTypes: [],
      freightClasses: []
    });
    
    // Create a new instance of the service for each test
    refreshService = new SupportDataRefreshService({
      schedule: TEST_SCHEDULE
    });
  });

  describe('constructor', () => {
    it('should initialize with the provided schedule', () => {
      expect(refreshService.schedule).toBe(TEST_SCHEDULE);
      expect(refreshService.isRunning).toBe(false);
      expect(refreshService.job).toBeNull();
    });
    
    it('should use default schedule if none is provided', () => {
      const service = new SupportDataRefreshService();
      expect(service.schedule).toBe('0 0 * * *'); // Default is daily at midnight
    });
  });

  describe('start', () => {
    it('should start the service with the configured schedule', () => {
      // Start the service
      refreshService.start();
      
      // Verify the service is running
      expect(refreshService.isRunning).toBe(true);
      
      // Verify scheduleJob was called with the correct parameters
      expect(schedule.scheduleJob).toHaveBeenCalledWith(TEST_SCHEDULE, expect.any(Function));
      
      // Verify the job is stored
      expect(refreshService.job).toBe(mockJob);
    });
    
    it('should log a warning if the service is already running', () => {
      // Set the service as already running
      refreshService.isRunning = true;
      
      // Mock console.warn
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();
      
      try {
        // Start the service
        refreshService.start();
        
        // Verify the warning was logged
        expect(console.warn).toHaveBeenCalledWith('Support data refresh service is already running');
        
        // Verify scheduleJob was not called
        expect(schedule.scheduleJob).not.toHaveBeenCalled();
      } finally {
        // Restore console.warn
        console.warn = originalConsoleWarn;
      }
    });
    
    it('should schedule the job to run the fetchAndUpdateAllSupportData method', () => {
      // Start the service
      refreshService.start();
      
      // Get the callback function that was passed to scheduleJob
      const callback = schedule.scheduleJob.mock.calls[0][1];
      
      // Call the callback
      callback();
      
      // Verify fetchAndUpdateAllSupportData was called
      expect(supportDataService.fetchAndUpdateAllSupportData).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      // Set the service as running
      refreshService.isRunning = true;
      refreshService.job = mockJob;
    });
    
    it('should stop the service and cancel the job', () => {
      // Stop the service
      refreshService.stop();
      
      // Verify the service is not running
      expect(refreshService.isRunning).toBe(false);
      
      // Verify the job was canceled
      expect(mockJob.cancel).toHaveBeenCalled();
      
      // Verify the job reference was removed
      expect(refreshService.job).toBeNull();
    });
    
    it('should log a warning if the service is not running', () => {
      // Set the service as not running
      refreshService.isRunning = false;
      
      // Mock console.warn
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();
      
      try {
        // Stop the service
        refreshService.stop();
        
        // Verify the warning was logged
        expect(console.warn).toHaveBeenCalledWith('Support data refresh service is not running');
        
        // Verify the job was not canceled
        expect(mockJob.cancel).not.toHaveBeenCalled();
      } finally {
        // Restore console.warn
        console.warn = originalConsoleWarn;
      }
    });
  });

  describe('refreshNow', () => {
    it('should call fetchAndUpdateAllSupportData immediately', async () => {
      // Set up mock return value
      supportDataService.fetchAndUpdateAllSupportData.mockResolvedValueOnce({
        commodities: [{ id: 1, name: 'Test Commodity' }],
        equipmentTypes: [{ id: 1, name: 'Test Equipment' }]
      });
      
      // Call refreshNow
      const result = await refreshService.refreshNow();
      
      // Verify fetchAndUpdateAllSupportData was called
      expect(supportDataService.fetchAndUpdateAllSupportData).toHaveBeenCalled();
      
      // Verify the result matches what fetchAndUpdateAllSupportData returned
      expect(result).toEqual({
        commodities: [{ id: 1, name: 'Test Commodity' }],
        equipmentTypes: [{ id: 1, name: 'Test Equipment' }]
      });
    });
    
    it('should propagate errors from fetchAndUpdateAllSupportData', async () => {
      // Set up mock to throw an error
      const mockError = new Error('API error');
      supportDataService.fetchAndUpdateAllSupportData.mockRejectedValueOnce(mockError);
      
      // Call refreshNow and expect it to throw
      await expect(refreshService.refreshNow()).rejects.toThrow(mockError);
    });
  });

  describe('isActive', () => {
    it('should return true if the service is running', () => {
      // Set the service as running
      refreshService.isRunning = true;
      
      // Verify isActive returns true
      expect(refreshService.isActive()).toBe(true);
    });
    
    it('should return false if the service is not running', () => {
      // Set the service as not running
      refreshService.isRunning = false;
      
      // Verify isActive returns false
      expect(refreshService.isActive()).toBe(false);
    });
  });

  describe('getSchedule', () => {
    it('should return the current schedule', () => {
      // Set a specific schedule
      refreshService.schedule = '0 12 * * *'; // Noon every day
      
      // Verify getSchedule returns the schedule
      expect(refreshService.getSchedule()).toBe('0 12 * * *');
    });
  });

  describe('setSchedule', () => {
    it('should update the schedule and restart the service if it was running', () => {
      // Set the service as running
      refreshService.isRunning = true;
      refreshService.job = mockJob;
      
      // Mock the start and stop methods
      refreshService.start = jest.fn();
      refreshService.stop = jest.fn();
      
      // Set a new schedule
      const newSchedule = '0 12 * * *'; // Noon every day
      refreshService.setSchedule(newSchedule);
      
      // Verify the schedule was updated
      expect(refreshService.schedule).toBe(newSchedule);
      
      // Verify the service was restarted
      expect(refreshService.stop).toHaveBeenCalled();
      expect(refreshService.start).toHaveBeenCalled();
    });
    
    it('should update the schedule without restarting if the service was not running', () => {
      // Set the service as not running
      refreshService.isRunning = false;
      
      // Mock the start and stop methods
      refreshService.start = jest.fn();
      refreshService.stop = jest.fn();
      
      // Set a new schedule
      const newSchedule = '0 12 * * *'; // Noon every day
      refreshService.setSchedule(newSchedule);
      
      // Verify the schedule was updated
      expect(refreshService.schedule).toBe(newSchedule);
      
      // Verify the service was not restarted
      expect(refreshService.stop).not.toHaveBeenCalled();
      expect(refreshService.start).not.toHaveBeenCalled();
    });
  });
});