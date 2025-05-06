// backend/src/services/supportDataRefreshService.js
import schedule from 'node-schedule';
import supportDataService from './supportDataService.js';
import { sequelize } from '../../database/index.js';
import Redis from 'ioredis';

/**
 * Service for scheduling periodic updates of Loadsure support data
 * Enhanced to work with the PostgreSQL and Redis based SupportDataService
 */
class SupportDataRefreshService {
  constructor(options = {}) {
    this.schedule = options.schedule || '0 0 * * *'; // Default: daily at midnight
    this.job = null;
    this.isRunning = false;
    
    // Initialize Redis for distributed locking
    this.redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      keyPrefix: 'loadsure:refresh:',
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true, // Don't connect immediately
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      }
    });
    
    // Lock TTL in seconds
    this.lockTTL = options.lockTTL || 3600; // 1 hour
  }

  /**
   * Start the refresh service
   */
  async start() {
    if (this.isRunning) {
      console.warn('Support data refresh service is already running');
      return;
    }

    try {
      // Connect to Redis
      await this.redis.connect().catch(err => {
        console.warn('Could not connect to Redis for locking:', err.message);
        console.warn('SupportDataRefreshService will continue without distributed locking');
      });
      
      console.log(`Starting support data refresh service with schedule: ${this.schedule}`);
      
      // Schedule the job
      this.job = schedule.scheduleJob(this.schedule, async () => {
        console.log('Running scheduled support data update...');
        try {
          // Try to acquire a distributed lock for refresh operation
          const lockAcquired = await this.acquireLock();
          
          if (lockAcquired) {
            console.log('Lock acquired for scheduled refresh');
            await supportDataService.fetchAndUpdateAllSupportData();
            console.log('Scheduled support data update completed successfully');
            
            // Release the lock
            await this.releaseLock();
          } else {
            console.log('Another instance is already refreshing support data, skipping');
          }
        } catch (error) {
          console.error('Error during scheduled support data update:', error);
          
          // Always try to release the lock in case of error
          await this.releaseLock().catch(e => {
            console.warn('Error releasing lock after refresh error:', e.message);
          });
        }
      });
      
      this.isRunning = true;
      console.log('Support data refresh service started successfully');
    } catch (error) {
      console.error('Error starting support data refresh service:', error);
    }
  }

  /**
   * Stop the refresh service
   */
  async stop() {
    if (!this.isRunning) {
      console.warn('Support data refresh service is not running');
      return;
    }

    console.log('Stopping support data refresh service');
    
    if (this.job) {
      this.job.cancel();
      this.job = null;
    }
    
    // Close Redis connection
    try {
      await this.redis.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
    
    this.isRunning = false;
    console.log('Support data refresh service stopped');
  }

  /**
   * Acquire a distributed lock for the refresh operation
   * @returns {Promise<boolean>} Whether the lock was acquired
   */
  async acquireLock() {
    try {
      // Use Redis SET with NX (Only set if key doesn't exist) and EX (expiry)
      const lockKey = 'refresh_lock';
      const lockValue = Date.now().toString();
      const result = await this.redis.set(lockKey, lockValue, 'NX', 'EX', this.lockTTL);
      
      // If result is 'OK', the lock was acquired
      return result === 'OK';
    } catch (error) {
      console.warn('Error acquiring lock:', error.message);
      // Return true if Redis is not available to allow refresh to proceed
      return true;
    }
  }
  
  /**
   * Release the distributed lock
   * @returns {Promise<void>}
   */
  async releaseLock() {
    try {
      // Simply delete the lock key
      await this.redis.del('refresh_lock');
    } catch (error) {
      console.warn('Error releasing lock:', error.message);
    }
  }

  /**
   * Run a manual refresh
   * @returns {Promise<Object>} The result of the refresh operation
   */
  async refreshNow() {
    console.log('Running manual support data update...');
    
    try {
      // Try to acquire a distributed lock for refresh operation
      const lockAcquired = await this.acquireLock();
      
      if (lockAcquired) {
        console.log('Lock acquired for manual refresh');
        const result = await supportDataService.fetchAndUpdateAllSupportData();
        console.log('Manual support data update completed successfully');
        
        // Release the lock
        await this.releaseLock();
        
        return result;
      } else {
        console.log('Another instance is already refreshing support data');
        throw new Error('Another refresh operation is already in progress');
      }
    } catch (error) {
      console.error('Error during manual support data update:', error);
      
      // Always try to release the lock in case of error
      await this.releaseLock().catch(e => {
        console.warn('Error releasing lock after refresh error:', e.message);
      });
      
      throw error;
    }
  }
  
  /**
   * Check if the service is running
   * @returns {boolean} True if running, false otherwise
   */
  isActive() {
    return this.isRunning;
  }
  
  /**
   * Get the current schedule
   * @returns {string} The schedule expression
   */
  getSchedule() {
    return this.schedule;
  }
  
  /**
   * Set a new schedule
   * @param {string} schedule - The new cron schedule expression
   */
  setSchedule(schedule) {
    if (this.isRunning) {
      this.stop();
      this.schedule = schedule;
      this.start();
    } else {
      this.schedule = schedule;
    }
  }
  
  /**
   * Check database health
   * @returns {Promise<boolean>} Database health status
   */
  async checkDatabaseHealth() {
    try {
      await sequelize.authenticate();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
  
  /**
   * Check Redis health
   * @returns {Promise<boolean>} Redis health status
   */
  async checkRedisHealth() {
    try {
      const pingResult = await this.redis.ping();
      return pingResult === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get system health status
   * @returns {Promise<Object>} Health status information
   */
  async getHealthStatus() {
    const dbHealth = await this.checkDatabaseHealth();
    const redisHealth = await this.checkRedisHealth();
    const lastUpdated = await supportDataService.getLastUpdated();
    
    return {
      isRunning: this.isRunning,
      schedule: this.schedule,
      dbHealth,
      redisHealth,
      lastUpdated,
      currentTime: new Date().toISOString()
    };
  }
}

// Export singleton instance
const supportDataRefreshService = new SupportDataRefreshService({
  schedule: process.env.SUPPORT_DATA_REFRESH_SCHEDULE || '0 0 * * *', // Default: daily at midnight
  lockTTL: parseInt(process.env.SUPPORT_DATA_LOCK_TTL || '3600', 10) // Default: 1 hour
});

export default supportDataRefreshService;