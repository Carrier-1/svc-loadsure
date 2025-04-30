// backend/src/services/queueMonitorService.js
import * as amqp from 'amqplib';
import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config.js';

const execPromise = promisify(exec);

/**
 * Service for monitoring queue depths and auto-scaling worker processes
 */
class QueueMonitorService {
  constructor(options = {}) {
    this.rabbitMqUrl = options.rabbitMqUrl || config.RABBITMQ_URL;
    this.queues = options.queues || [
      config.QUEUE_QUOTE_REQUESTED,
      config.QUEUE_BOOKING_REQUESTED
    ];
    this.checkInterval = options.checkInterval || 10000; // Default: check every 10 seconds
    this.scaleUpThreshold = options.scaleUpThreshold || 10; // Scale up when queue depth reaches this value
    this.scaleDownThreshold = options.scaleDownThreshold || 2; // Scale down when queue depth falls below this value
    this.maxWorkers = options.maxWorkers || 5; // Maximum number of worker processes
    this.minWorkers = options.minWorkers || 1; // Minimum number of worker processes
    this.isRunning = false;
    this.checkTimer = null;
    this.connection = null;
    this.channel = null;
    this.workerProcesses = new Map(); // Track worker processes by ID
    this.currentWorkerCount = 0;
  }

  /**
   * Start the queue monitor service
   */
  async start() {
    if (this.isRunning) {
      console.log('Queue monitor service is already running');
      return;
    }

    try {
      console.log('Starting queue monitor service...');
      
      // Connect to RabbitMQ
      this.connection = await amqp.connect(this.rabbitMqUrl);
      this.channel = await this.connection.createChannel();
      
      // Set up monitoring interval
      this.checkTimer = setInterval(() => this.checkQueueDepths(), this.checkInterval);
      this.isRunning = true;
      
      // Start minimum number of workers
      await this.ensureMinimumWorkers();
      
      // Handle connection close
      this.connection.on('close', async (err) => {
        console.error('Queue monitor: RabbitMQ connection closed', err);
        clearInterval(this.checkTimer);
        this.isRunning = false;
        
        // Attempt to reconnect
        console.log('Queue monitor: Attempting to reconnect in 5 seconds...');
        setTimeout(() => this.start(), 5000);
      });
      
      console.log('Queue monitor service started');
    } catch (error) {
      console.error('Error starting queue monitor service:', error);
      
      // Clean up if error during startup
      if (this.connection) {
        try {
          await this.connection.close();
        } catch (closeError) {
          console.error('Error closing connection:', closeError);
        }
      }
      
      this.isRunning = false;
      
      // Attempt to restart
      console.log('Queue monitor: Attempting to restart in 5 seconds...');
      setTimeout(() => this.start(), 5000);
    }
  }

  /**
   * Stop the queue monitor service
   */
  async stop() {
    if (!this.isRunning) {
      console.log('Queue monitor service is not running');
      return;
    }

    console.log('Stopping queue monitor service...');
    
    clearInterval(this.checkTimer);
    this.checkTimer = null;
    
    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('Error closing connection:', error);
    }
    
    // Stop all worker processes
    await this.stopAllWorkers();
    
    this.isRunning = false;
    console.log('Queue monitor service stopped');
  }

  /**
   * Check the depth of all monitored queues
   */
  async checkQueueDepths() {
    if (!this.isRunning || !this.channel) return;
    
    try {
      let totalMessages = 0;
      
      // Check each queue and sum the total messages
      for (const queueName of this.queues) {
        const queueInfo = await this.channel.assertQueue(queueName, { durable: true });
        const messageCount = queueInfo.messageCount;
        totalMessages += messageCount;
        
        console.log(`Queue ${queueName}: ${messageCount} messages`);
      }
      
      console.log(`Total messages across all queues: ${totalMessages}`);
      
      // Determine if scaling is needed
      if (totalMessages > this.scaleUpThreshold && this.currentWorkerCount < this.maxWorkers) {
        // Scale up: add more workers
        await this.scaleUp(Math.min(
          this.maxWorkers - this.currentWorkerCount,
          Math.ceil(totalMessages / this.scaleUpThreshold)
        ));
      } else if (totalMessages < this.scaleDownThreshold && this.currentWorkerCount > this.minWorkers) {
        // Scale down: remove excess workers
        await this.scaleDown(Math.min(
          this.currentWorkerCount - this.minWorkers,
          Math.ceil((this.scaleDownThreshold - totalMessages) / this.scaleDownThreshold)
        ));
      }
    } catch (error) {
      console.error('Error checking queue depths:', error);
    }
  }

  /**
   * Ensure the minimum number of workers are running
   */
  async ensureMinimumWorkers() {
    if (this.currentWorkerCount < this.minWorkers) {
      await this.scaleUp(this.minWorkers - this.currentWorkerCount);
    }
  }

  /**
   * Scale up by starting new worker processes
   * @param {number} count - Number of workers to add
   */
  async scaleUp(count) {
    console.log(`Scaling up: adding ${count} workers`);
    
    for (let i = 0; i < count; i++) {
      const workerId = `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      try {
        // In production, would use Docker or K8s APIs to start new containers
        // For local development, we'll just spawn new Node processes
        
        // For Docker environments:
        if (process.env.DOCKER_SCALE === 'true') {
          await execPromise(
            `docker-compose up -d --scale loadsure-service=$((${this.currentWorkerCount + 1}))`
          );
        } else {
          // For local development, spawn a Node process
          const { spawn } = await import('child_process');
          
          const workerProcess = spawn('node', ['src/services/loadsureService.js'], {
            env: { ...process.env, WORKER_ID: workerId },
            detached: true,
            stdio: 'inherit'
          });
          
          // Keep track of the worker process
          this.workerProcesses.set(workerId, workerProcess);
          
          workerProcess.on('exit', (code) => {
            console.log(`Worker ${workerId} exited with code ${code}`);
            this.workerProcesses.delete(workerId);
            this.currentWorkerCount--;
            
            // Ensure minimum workers
            this.ensureMinimumWorkers();
          });
        }
        
        this.currentWorkerCount++;
        console.log(`Worker ${workerId} started (total: ${this.currentWorkerCount})`);
      } catch (error) {
        console.error(`Error starting worker ${workerId}:`, error);
      }
    }
  }

  /**
   * Scale down by stopping excess worker processes
   * @param {number} count - Number of workers to remove
   */
  async scaleDown(count) {
    if (this.currentWorkerCount <= this.minWorkers) return;
    
    const actualCount = Math.min(count, this.currentWorkerCount - this.minWorkers);
    console.log(`Scaling down: removing ${actualCount} workers`);
    
    // For Docker environments:
    if (process.env.DOCKER_SCALE === 'true') {
      await execPromise(
        `docker-compose up -d --scale loadsure-service=$((${this.currentWorkerCount - actualCount}))`
      );
      this.currentWorkerCount -= actualCount;
    } else {
      // For local development, stop Node processes
      // Get the most recent workers (last added, first removed - LIFO)
      const workerIds = [...this.workerProcesses.keys()];
      const workersToStop = workerIds.slice(-actualCount);
      
      for (const workerId of workersToStop) {
        const workerProcess = this.workerProcesses.get(workerId);
        
        try {
          console.log(`Stopping worker ${workerId}...`);
          // Send SIGTERM signal to let the process exit gracefully
          process.kill(-workerProcess.pid, 'SIGTERM');
          
          // Clean up tracking
          this.workerProcesses.delete(workerId);
          this.currentWorkerCount--;
          
          console.log(`Worker ${workerId} stopped (total: ${this.currentWorkerCount})`);
        } catch (error) {
          console.error(`Error stopping worker ${workerId}:`, error);
        }
      }
    }
  }

  /**
   * Stop all worker processes
   */
  async stopAllWorkers() {
    console.log(`Stopping all ${this.currentWorkerCount} workers...`);
    
    for (const [workerId, workerProcess] of this.workerProcesses.entries()) {
      try {
        process.kill(-workerProcess.pid, 'SIGTERM');
        this.workerProcesses.delete(workerId);
        console.log(`Worker ${workerId} stopped`);
      } catch (error) {
        console.error(`Error stopping worker ${workerId}:`, error);
      }
    }
    
    this.currentWorkerCount = 0;
    console.log('All workers stopped');
  }
}

export default QueueMonitorService;