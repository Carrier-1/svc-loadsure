// backend/__tests__/controllers/supportDataController.test.js

// Mock dependencies
jest.mock('../../src/services/supportDataService.js', () => ({
    getCommodities: jest.fn(),
    getCommodityExclusions: jest.fn(),
    getEquipmentTypes: jest.fn(),
    getLoadTypes: jest.fn(),
    getFreightClasses: jest.fn(),
    getTermsOfSales: jest.fn(),
    getLastUpdated: jest.fn()
  }));
  
  jest.mock('../../src/services/supportDataRefreshService.js', () => ({
    refreshNow: jest.fn(),
    isActive: jest.fn(),
    getSchedule: jest.fn(),
    setSchedule: jest.fn()
  }));
  
  // Import the controller (after mocks are set up)
  import supportDataController from '../../src/controllers/supportDataController.js';
  import supportDataService from '../../src/services/supportDataService.js';
  import supportDataRefreshService from '../../src/services/supportDataRefreshService.js';
  
  // Mock Express request/response objects
  const mockRequest = (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query
  });
  
  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };
  
  describe('Support Data Controller', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });
  
    // Helper function to get handler from route stack
    const getHandler = (path, method = 'get') => {
      const route = supportDataController.stack.find(layer => 
        layer.route && layer.route.path === path && layer.route.methods[method]
      );
      return route ? route.handle : null;
    };
  
    describe('GET /commodities', () => {
      test('should return commodities list', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        const mockCommodities = [
          { id: 1, name: 'Electronics' },
          { id: 2, name: 'Food Items' }
        ];
        
        supportDataService.getCommodities.mockReturnValue(mockCommodities);
        
        // Get the controller's handler function
        const handler = getHandler('/commodities');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataService.getCommodities).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockCommodities);
      });
      
      test('should handle errors', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        supportDataService.getCommodities.mockImplementation(() => {
          throw new Error('Service error');
        });
        
        // Get the controller's handler function
        const handler = getHandler('/commodities');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Failed to fetch commodities'
        }));
      });
    });
  
    describe('GET /commodity-exclusions', () => {
      test('should return commodity exclusions list', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        const mockExclusions = [
          { id: 'exclusion-1', commodityId: 1, description: 'No batteries' },
          { id: 'exclusion-2', commodityId: 2, description: 'No perishables' }
        ];
        
        supportDataService.getCommodityExclusions.mockReturnValue(mockExclusions);
        
        // Get the controller's handler function
        const handler = getHandler('/commodity-exclusions');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataService.getCommodityExclusions).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockExclusions);
      });
    });
  
    describe('GET /equipment-types', () => {
      test('should return equipment types list', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        const mockEquipmentTypes = [
          { id: 1, name: 'Dry Van' },
          { id: 2, name: 'Reefer' }
        ];
        
        supportDataService.getEquipmentTypes.mockReturnValue(mockEquipmentTypes);
        
        // Get the controller's handler function
        const handler = getHandler('/equipment-types');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataService.getEquipmentTypes).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockEquipmentTypes);
      });
    });
  
    describe('GET /load-types', () => {
      test('should return load types list', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        const mockLoadTypes = [
          { id: 'FULL_TRUCKLOAD_1', name: 'Full Truckload' },
          { id: 'LESS_THAN_TRUCKLOAD_1', name: 'Less Than Truckload' }
        ];
        
        supportDataService.getLoadTypes.mockReturnValue(mockLoadTypes);
        
        // Get the controller's handler function
        const handler = getHandler('/load-types');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataService.getLoadTypes).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockLoadTypes);
      });
    });
  
    describe('GET /freight-classes', () => {
      test('should return freight classes list', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        const mockFreightClasses = [
          { id: 'class50', name: 'Class 50' },
          { id: 'class55', name: 'Class 55' }
        ];
        
        supportDataService.getFreightClasses.mockReturnValue(mockFreightClasses);
        
        // Get the controller's handler function
        const handler = getHandler('/freight-classes');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataService.getFreightClasses).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockFreightClasses);
      });
    });
  
    describe('GET /terms-of-sales', () => {
      test('should return terms of sales list', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        const mockTermsOfSales = [
          { id: 'FOB', name: 'FOB - Free On Board' },
          { id: 'CIF', name: 'CIF - Cost, Insurance & Freight' }
        ];
        
        supportDataService.getTermsOfSales.mockReturnValue(mockTermsOfSales);
        
        // Get the controller's handler function
        const handler = getHandler('/terms-of-sales');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataService.getTermsOfSales).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockTermsOfSales);
      });
    });
  
    describe('GET /status', () => {
      test('should return support data status', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        // Mock return values
        const mockLastUpdated = '2023-01-01T00:00:00.000Z';
        const mockRefreshActive = true;
        const mockRefreshSchedule = '0 0 * * *';
        
        supportDataService.getLastUpdated.mockReturnValue(mockLastUpdated);
        supportDataRefreshService.isActive.mockReturnValue(mockRefreshActive);
        supportDataRefreshService.getSchedule.mockReturnValue(mockRefreshSchedule);
        
        // Mock data availability
        supportDataService.getCommodities.mockReturnValue([{}, {}]);
        supportDataService.getCommodityExclusions.mockReturnValue([{}]);
        supportDataService.getEquipmentTypes.mockReturnValue([{}, {}, {}]);
        supportDataService.getLoadTypes.mockReturnValue([{}, {}]);
        supportDataService.getFreightClasses.mockReturnValue([{}, {}, {}, {}]);
        supportDataService.getTermsOfSales.mockReturnValue([{}]);
        
        // Get the controller's handler function
        const handler = getHandler('/status');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataService.getLastUpdated).toHaveBeenCalled();
        expect(supportDataRefreshService.isActive).toHaveBeenCalled();
        expect(supportDataRefreshService.getSchedule).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          lastUpdated: mockLastUpdated,
          refreshActive: mockRefreshActive,
          refreshSchedule: mockRefreshSchedule,
          dataAvailable: {
            commodities: true,
            commodityExclusions: true,
            equipmentTypes: true,
            loadTypes: true,
            freightClasses: true,
            termsOfSales: true
          }
        });
      });
      
      test('should handle empty data', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        // Mock return values for empty data
        supportDataService.getCommodities.mockReturnValue([]);
        supportDataService.getCommodityExclusions.mockReturnValue([]);
        
        // Get the controller's handler function
        const handler = getHandler('/status');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          dataAvailable: expect.objectContaining({
            commodities: false,
            commodityExclusions: false
          })
        }));
      });
    });
  
    describe('POST /refresh', () => {
      test('should trigger manual refresh of support data', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        // Mock the refresh service
        const refreshResult = {
          commodities: [{}],
          commodityExclusions: [{}],
          equipmentTypes: [{}, {}],
          loadTypes: [{}],
          freightClasses: [{}, {}],
          termsOfSales: [{}]
        };
        
        supportDataRefreshService.refreshNow.mockResolvedValue(refreshResult);
        supportDataService.getLastUpdated.mockReturnValue('2023-01-01T12:00:00.000Z');
        
        // Get the controller's handler function
        const handler = getHandler('/refresh', 'post');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataRefreshService.refreshNow).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Support data refreshed successfully',
          lastUpdated: '2023-01-01T12:00:00.000Z',
          dataCount: {
            commodities: 1,
            commodityExclusions: 1,
            equipmentTypes: 2,
            loadTypes: 1,
            freightClasses: 2,
            termsOfSales: 1
          }
        });
      });
      
      test('should handle refresh errors', async () => {
        // Arrange
        const req = mockRequest();
        const res = mockResponse();
        
        // Mock the refresh service to throw an error
        const refreshError = new Error('Refresh failed');
        supportDataRefreshService.refreshNow.mockRejectedValue(refreshError);
        
        // Get the controller's handler function
        const handler = getHandler('/refresh', 'post');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to refresh support data',
          message: 'Refresh failed'
        });
      });
    });
  
    describe('POST /schedule', () => {
      test('should update refresh schedule', async () => {
        // Arrange
        const newSchedule = '0 12 * * *'; // Noon every day
        const req = mockRequest({ schedule: newSchedule });
        const res = mockResponse();
        
        // Mock the refresh service
        supportDataRefreshService.setSchedule.mockImplementation(() => {});
        supportDataRefreshService.getSchedule.mockReturnValue(newSchedule);
        supportDataRefreshService.isActive.mockReturnValue(true);
        
        // Get the controller's handler function
        const handler = getHandler('/schedule', 'post');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(supportDataRefreshService.setSchedule).toHaveBeenCalledWith(newSchedule);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Refresh schedule updated successfully',
          schedule: newSchedule,
          active: true
        });
      });
      
      test('should validate schedule is required', async () => {
        // Arrange
        const req = mockRequest({ /* No schedule */ });
        const res = mockResponse();
        
        // Get the controller's handler function
        const handler = getHandler('/schedule', 'post');
        
        // Act
        await handler(req, res);
        
        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Schedule is required'
        });
        expect(supportDataRefreshService.setSchedule).not.toHaveBeenCalled();
      });
    });
  });