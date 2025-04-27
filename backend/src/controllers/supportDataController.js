// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
import express from 'express';
import supportDataService from '../services/supportDataService.js';
import supportDataRefreshService from '../services/supportDataRefreshService.js';

const router = express.Router();

/**
 * @route GET /api/support-data/commodities
 * @desc Get all commodities
 * @access Public
 */
router.get('/commodities', (req, res) => {
  try {
    const commodities = supportDataService.getCommodities();
    res.json(commodities);
  } catch (error) {
    console.error('Error fetching commodities:', error);
    res.status(500).json({ error: 'Failed to fetch commodities' });
  }
});

/**
 * @route GET /api/support-data/commodity-exclusions
 * @desc Get all commodity exclusions
 * @access Public
 */
router.get('/commodity-exclusions', (req, res) => {
  try {
    const exclusions = supportDataService.getCommodityExclusions();
    res.json(exclusions);
  } catch (error) {
    console.error('Error fetching commodity exclusions:', error);
    res.status(500).json({ error: 'Failed to fetch commodity exclusions' });
  }
});

/**
 * @route GET /api/support-data/equipment-types
 * @desc Get all equipment types
 * @access Public
 */
router.get('/equipment-types', (req, res) => {
  try {
    const equipmentTypes = supportDataService.getEquipmentTypes();
    res.json(equipmentTypes);
  } catch (error) {
    console.error('Error fetching equipment types:', error);
    res.status(500).json({ error: 'Failed to fetch equipment types' });
  }
});

/**
 * @route GET /api/support-data/load-types
 * @desc Get all load types
 * @access Public
 */
router.get('/load-types', (req, res) => {
  try {
    const loadTypes = supportDataService.getLoadTypes();
    res.json(loadTypes);
  } catch (error) {
    console.error('Error fetching load types:', error);
    res.status(500).json({ error: 'Failed to fetch load types' });
  }
});

/**
 * @route GET /api/support-data/freight-classes
 * @desc Get all freight classes
 * @access Public
 */
router.get('/freight-classes', (req, res) => {
  try {
    const freightClasses = supportDataService.getFreightClasses();
    res.json(freightClasses);
  } catch (error) {
    console.error('Error fetching freight classes:', error);
    res.status(500).json({ error: 'Failed to fetch freight classes' });
  }
});

/**
 * @route GET /api/support-data/terms-of-sales
 * @desc Get all terms of sales
 * @access Public
 */
router.get('/terms-of-sales', (req, res) => {
  try {
    const termsOfSales = supportDataService.getTermsOfSales();
    res.json(termsOfSales);
  } catch (error) {
    console.error('Error fetching terms of sales:', error);
    res.status(500).json({ error: 'Failed to fetch terms of sales' });
  }
});

/**
 * @route GET /api/support-data/status
 * @desc Get support data status
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const lastUpdated = supportDataService.getLastUpdated();
    const refreshActive = supportDataRefreshService.isActive();
    const refreshSchedule = supportDataRefreshService.getSchedule();
    
    res.json({
      lastUpdated,
      refreshActive,
      refreshSchedule,
      dataAvailable: {
        commodities: (supportDataService.getCommodities().length > 0),
        commodityExclusions: (supportDataService.getCommodityExclusions().length > 0),
        equipmentTypes: (supportDataService.getEquipmentTypes().length > 0),
        loadTypes: (supportDataService.getLoadTypes().length > 0),
        freightClasses: (supportDataService.getFreightClasses().length > 0),
        termsOfSales: (supportDataService.getTermsOfSales().length > 0)
      }
    });
  } catch (error) {
    console.error('Error fetching support data status:', error);
    res.status(500).json({ error: 'Failed to fetch support data status' });
  }
});

/**
 * @route POST /api/support-data/refresh
 * @desc Manually refresh all support data
 * @access Private (should be secured in production)
 */
router.post('/refresh', async (req, res) => {
  try {
    const result = await supportDataRefreshService.refreshNow();
    res.json({
      success: true,
      message: 'Support data refreshed successfully',
      lastUpdated: supportDataService.getLastUpdated(),
      dataCount: {
        commodities: result.commodities?.length || 0,
        commodityExclusions: result.commodityExclusions?.length || 0,
        equipmentTypes: result.equipmentTypes?.length || 0,
        loadTypes: result.loadTypes?.length || 0,
        freightClasses: result.freightClasses?.length || 0,
        termsOfSales: result.termsOfSales?.length || 0
      }
    });
  } catch (error) {
    console.error('Error refreshing support data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to refresh support data',
      message: error.message
    });
  }
});

/**
 * @route POST /api/support-data/schedule
 * @desc Update the refresh schedule
 * @access Private (should be secured in production)
 */
router.post('/schedule', (req, res) => {
  try {
    const { schedule } = req.body;
    
    if (!schedule) {
      return res.status(400).json({ 
        success: false,
        error: 'Schedule is required'
      });
    }
    
    supportDataRefreshService.setSchedule(schedule);
    
    res.json({
      success: true,
      message: 'Refresh schedule updated successfully',
      schedule: supportDataRefreshService.getSchedule(),
      active: supportDataRefreshService.isActive()
    });
  } catch (error) {
    console.error('Error updating refresh schedule:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update refresh schedule',
      message: error.message
    });
  }
});

export default router;