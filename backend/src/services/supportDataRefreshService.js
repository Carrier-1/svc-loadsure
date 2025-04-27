// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
import schedule from 'node-schedule';
import supportDataService from './supportDataService.js';

/**
 * Service for scheduling periodic updates of Loadsure support data
 */
class SupportDataRefreshService {
  constructor(options = {}) {
    this.schedule = options.schedule || '0 0 * * *'; // Default: daily at midnight
    this.job = null;
    this.isRunning = false;
  }

  /**
   * Start the refresh service
   */
  start() {
    if (this.isRunning) {
      console.warn('Support data refresh service is already running');
      return;
    }

    console.log(`Starting support data refresh service with schedule: ${this.schedule}`);
    
    // Schedule the job
    this.job = schedule.scheduleJob(this.schedule, async () => {
      console.log('Running scheduled support data update...');
      try {
        await supportDataService.fetchAndUpdateAllSupportData();
        console.log('Scheduled support data update completed successfully');
      } catch (error) {
        console.error('Error during scheduled support data update:', error);
      }
    });
    
    this.isRunning = true;
  }

  /**
   * Stop the refresh service
   */
  stop() {
    if (!this.isRunning) {
      console.warn('Support data refresh service is not running');
      return;
    }

    console.log('Stopping support data refresh service');
    
    if (this.job) {
      this.job.cancel();
      this.job = null;
    }
    
    this.isRunning = false;
  }

  /**
   * Run a manual refresh
   * @returns {Promise<Object>} The result of the refresh operation
   */
  async refreshNow() {
    console.log('Running manual support data update...');
    try {
      const result = await supportDataService.fetchAndUpdateAllSupportData();
      console.log('Manual support data update completed successfully');
      return result;
    } catch (error) {
      console.error('Error during manual support data update:', error);
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
}

// Export singleton instance
const supportDataRefreshService = new SupportDataRefreshService({
  schedule: process.env.SUPPORT_DATA_REFRESH_SCHEDULE || '0 0 * * *' // Default: daily at midnight
});

export default supportDataRefreshService;