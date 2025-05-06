// backend/src/controllers/supportDataController.js
import express from 'express';
import supportDataService from '../services/supportDataService.js';
import supportDataRefreshService from '../services/supportDataRefreshService.js';

const router = express.Router();

/**
 * @swagger
 * /support-data/commodities:
 *   get:
 *     summary: Get all commodities
 *     description: Returns a list of all available commodities from Loadsure
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: List of commodities successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Unique identifier for the commodity
 *                   name:
 *                     type: string
 *                     description: Name of the commodity
 *                   description:
 *                     type: string
 *                     description: Description of the commodity
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/commodities', async (req, res) => {
  try {
    const commodities = await supportDataService.getCommodities();
    res.json(commodities);
  } catch (error) {
    console.error('Error fetching commodities:', error);
    res.status(500).json({ error: 'Failed to fetch commodities' });
  }
});

/**
 * @swagger
 * /support-data/commodity-exclusions:
 *   get:
 *     summary: Get all commodity exclusions
 *     description: Returns a list of all commodity exclusions from Loadsure
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: List of commodity exclusions successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier for the exclusion
 *                   commodityId:
 *                     type: integer
 *                     description: ID of the commodity with exclusions
 *                   description:
 *                     type: string
 *                     description: Description of the exclusion
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/commodity-exclusions', async (req, res) => {
  try {
    const exclusions = await supportDataService.getCommodityExclusions();
    res.json(exclusions);
  } catch (error) {
    console.error('Error fetching commodity exclusions:', error);
    res.status(500).json({ error: 'Failed to fetch commodity exclusions' });
  }
});

/**
 * @swagger
 * /support-data/equipment-types:
 *   get:
 *     summary: Get all equipment types
 *     description: Returns a list of all available equipment types from Loadsure
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: List of equipment types successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Unique identifier for the equipment type
 *                   name:
 *                     type: string
 *                     description: Name of the equipment type
 *                   description:
 *                     type: string
 *                     description: Description of the equipment type
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/equipment-types', async (req, res) => {
  try {
    const equipmentTypes = await supportDataService.getEquipmentTypes();
    res.json(equipmentTypes);
  } catch (error) {
    console.error('Error fetching equipment types:', error);
    res.status(500).json({ error: 'Failed to fetch equipment types' });
  }
});

/**
 * @swagger
 * /support-data/load-types:
 *   get:
 *     summary: Get all load types
 *     description: Returns a list of all available load types from Loadsure
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: List of load types successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier for the load type
 *                   name:
 *                     type: string
 *                     description: Name of the load type
 *                   description:
 *                     type: string
 *                     description: Description of the load type
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/load-types', async (req, res) => {
  try {
    const loadTypes = await supportDataService.getLoadTypes();
    res.json(loadTypes);
  } catch (error) {
    console.error('Error fetching load types:', error);
    res.status(500).json({ error: 'Failed to fetch load types' });
  }
});

/**
 * @swagger
 * /support-data/freight-classes:
 *   get:
 *     summary: Get all freight classes
 *     description: Returns a list of all freight classes from Loadsure
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: List of freight classes successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier for the freight class
 *                   name:
 *                     type: string
 *                     description: Name of the freight class
 *                   description:
 *                     type: string
 *                     description: Description of the freight class
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/freight-classes', async (req, res) => {
  try {
    const freightClasses = await supportDataService.getFreightClasses();
    res.json(freightClasses);
  } catch (error) {
    console.error('Error fetching freight classes:', error);
    res.status(500).json({ error: 'Failed to fetch freight classes' });
  }
});

/**
 * @swagger
 * /support-data/terms-of-sales:
 *   get:
 *     summary: Get all terms of sales
 *     description: Returns a list of all terms of sales from Loadsure
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: List of terms of sales successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier for the terms of sale
 *                   name:
 *                     type: string
 *                     description: Name of the terms of sale
 *                   description:
 *                     type: string
 *                     description: Description of the terms of sale
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/terms-of-sales', async (req, res) => {
  try {
    const termsOfSales = await supportDataService.getTermsOfSales();
    res.json(termsOfSales);
  } catch (error) {
    console.error('Error fetching terms of sales:', error);
    res.status(500).json({ error: 'Failed to fetch terms of sales' });
  }
});

/**
 * @swagger
 * /support-data/status:
 *   get:
 *     summary: Get support data status
 *     description: Returns the current status of support data, including last update time
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: Support data status successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupportDataStatus'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/status', async (req, res) => {
  try {
    const lastUpdated = await supportDataService.getLastUpdated();
    const refreshActive = supportDataRefreshService.isActive();
    const refreshSchedule = supportDataRefreshService.getSchedule();
    
    // Get health status
    const healthStatus = await supportDataRefreshService.getHealthStatus();
    
    // Check data availability by getting counts
    const commodities = await supportDataService.getCommodities();
    const commodityExclusions = await supportDataService.getCommodityExclusions();
    const equipmentTypes = await supportDataService.getEquipmentTypes();
    const loadTypes = await supportDataService.getLoadTypes();
    const freightClasses = await supportDataService.getFreightClasses();
    const termsOfSales = await supportDataService.getTermsOfSales();
    
    res.json({
      lastUpdated,
      refreshActive,
      refreshSchedule,
      healthStatus,
      dataAvailable: {
        commodities: (commodities && commodities.length > 0),
        commodityExclusions: (commodityExclusions && commodityExclusions.length > 0),
        equipmentTypes: (equipmentTypes && equipmentTypes.length > 0),
        loadTypes: (loadTypes && loadTypes.length > 0),
        freightClasses: (freightClasses && freightClasses.length > 0),
        termsOfSales: (termsOfSales && termsOfSales.length > 0)
      },
      counts: {
        commodities: commodities ? commodities.length : 0,
        commodityExclusions: commodityExclusions ? commodityExclusions.length : 0,
        equipmentTypes: equipmentTypes ? equipmentTypes.length : 0,
        loadTypes: loadTypes ? loadTypes.length : 0,
        freightClasses: freightClasses ? freightClasses.length : 0,
        termsOfSales: termsOfSales ? termsOfSales.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching support data status:', error);
    res.status(500).json({ error: 'Failed to fetch support data status' });
  }
});

/**
 * @swagger
 * /support-data/refresh:
 *   post:
 *     summary: Manually refresh all support data
 *     description: Triggers a manual refresh of all support data from Loadsure
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: Support data refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                 dataCount:
 *                   type: object
 *                   properties:
 *                     commodities:
 *                       type: integer
 *                     commodityExclusions:
 *                       type: integer
 *                     equipmentTypes:
 *                       type: integer
 *                     loadTypes:
 *                       type: integer
 *                     freightClasses:
 *                       type: integer
 *                     termsOfSales:
 *                       type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', async (req, res) => {
  try {
    const result = await supportDataRefreshService.refreshNow();
    const lastUpdated = await supportDataService.getLastUpdated();
    
    res.json({
      success: true,
      message: 'Support data refreshed successfully',
      lastUpdated,
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
 * @swagger
 * /support-data/schedule:
 *   post:
 *     summary: Update the refresh schedule
 *     description: Updates the cron schedule for automatic support data refresh
 *     tags: [Support Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupportDataRefreshRequest'
 *     responses:
 *       200:
 *         description: Refresh schedule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 schedule:
 *                   type: string
 *                 active:
 *                   type: boolean
 *       400:
 *         description: Bad request, schedule is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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

/**
 * @swagger
 * /support-data/health:
 *   get:
 *     summary: Get system health status
 *     description: Returns the health status of the support data system
 *     tags: [Support Data]
 *     responses:
 *       200:
 *         description: Health status successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isRunning:
 *                   type: boolean
 *                 schedule:
 *                   type: string
 *                 dbHealth:
 *                   type: boolean
 *                 redisHealth:
 *                   type: boolean
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                 currentTime:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await supportDataRefreshService.getHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    console.error('Error fetching health status:', error);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

export default router;