// __tests__/services/queueMonitorService.test.js

import { jest } from '@jest/globals';
import QueueMonitorService from '../../src/services/queueMonitorService.js';

// Mock dependencies
jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertQueue: jest.fn().mockResolvedValue({}),
      prefetch: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      sendToQueue: jest.fn(),
      close: jest.fn()
    }),
    on: jest.fn(),
    close: jest.fn()
  })
}));

jest.mock('child_process', () => ({
  exec: jest.fn((command, callback) => {
    if (callback) callback(null, { stdout: '2\n', stderr: '' });
    return { stdout: '2\n', stderr: '' };
  })
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    ping: jest.fn().mockResolvedValue('PONG')
  }));
});

describe('QueueMonitorService', () => {
  let queueMonitorService;
  let mockChannel;
  let mockConnection;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create instance with test configuration
    queueMonitorService = new QueueMonitorService({
      rabbitMqUrl: 'amqp://test',
      queues: ['test-queue-1', 'test-queue-2'],
      checkInterval: 1000,
      scaleUpThreshold: 10,
      scaleDownThreshold: 2,
      maxWorkers: 5,
      minWorkers: 1
    });
    
    // Set up mock connection and channel
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue({}),
      prefetch: jest.fn(),
      consume: jest.fn(),
      close: jest.fn()
    };
    
    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      on: jest.fn(),
      close: jest.fn()
    };
    
    // Mock amqplib.connect to return our mock connection
    const amqplib = require('amqplib');
    amqplib.connect.mockResolvedValue(mockConnection);
  });

  test('should initialize with correct config', () => {
    expect(queueMonitorService.rabbitMqUrl).toBe('amqp://test');
    expect(queueMonitorService.queues).toEqual(['test-queue-1', 'test-queue-2']);
    expect(queueMonitorService.checkInterval).toBe(1000);
    expect(queueMonitorService.scaleUpThreshold).toBe(10);
    expect(queueMonitorService.scaleDownThreshold).toBe(2);
    expect(queueMonitorService.maxWorkers).toBe(5);
    expect(queueMonitorService.minWorkers).toBe(1);
    expect(queueMonitorService.isRunning).toBe(false);
  });

  test('should connect to RabbitMQ when starting', async () => {
    const amqplib = require('amqplib');
    
    await queueMonitorService.start();
    
    expect(amqplib.connect).toHaveBeenCalledWith('amqp://test');
    expect(mockConnection.createChannel).toHaveBeenCalled();
    expect(queueMonitorService.isRunning).toBe(true);
  });

  test('should check queue depths and scale up when needed', async () => {
    // Setup
    const mockQueueInfo = { messageCount: 15 }; // Above threshold of 10
    mockChannel.assertQueue = jest.fn().mockResolvedValue(mockQueueInfo);
    
    // Mock exec for the Docker scale command
    const childProcess = require('child_process');
    childProcess.exec.mockImplementation((command, callback) => {
      if (callback) callback(null, { stdout: 'Scaled', stderr: '' });
      return { stdout: 'Scaled', stderr: '' };
    });
    
    // Action
    await queueMonitorService.start();
    queueMonitorService.currentWorkerCount = 2; // Set current worker count
    await queueMonitorService.checkQueueDepths();
    
    // Assertions
    // Should have been scaled up because message count (15) > threshold (10)
    expect(childProcess.exec).toHaveBeenCalled();
    const scaleCommand = childProcess.exec.mock.calls[0][0];
    expect(scaleCommand).toContain('docker-compose up -d --scale');
    expect(scaleCommand).toContain('loadsure-service=3'); // From 2 to 3
  });

  test('should check queue depths and scale down when needed', async () => {
    // Setup
    const mockQueueInfo = { messageCount: 1 }; // Below threshold of 2
    mockChannel.assertQueue = jest.fn().mockResolvedValue(mockQueueInfo);
    
    // Mock exec for the Docker scale command
    const childProcess = require('child_process');
    childProcess.exec.mockImplementation((command, callback) => {
      if (callback) callback(null, { stdout: 'Scaled', stderr: '' });
      return { stdout: 'Scaled', stderr: '' };
    });
    
    // Action
    await queueMonitorService.start();
    queueMonitorService.currentWorkerCount = 3; // Set current worker count
    await queueMonitorService.checkQueueDepths();
    
    // Assertions
    // Should have been scaled down because message count (1) < threshold (2)
    expect(childProcess.exec).toHaveBeenCalled();
    const scaleCommand = childProcess.exec.mock.calls[0][0];
    expect(scaleCommand).toContain('docker-compose up -d --scale');
    expect(scaleCommand).toContain('loadsure-service=2'); // From 3 to 2
  });

  test('should gracefully shut down', async () => {
    // Setup
    await queueMonitorService.start();
    
    // Action
    await queueMonitorService.stop();
    
    // Assertions
    expect(mockConnection.close).toHaveBeenCalled();
    expect(queueMonitorService.isRunning).toBe(false);
  });

  test('should not scale below minWorkers', async () => {
    // Setup
    const mockQueueInfo = { messageCount: 0 }; // Below threshold of 2
    mockChannel.assertQueue = jest.fn().mockResolvedValue(mockQueueInfo);
    
    // Mock exec for the Docker scale command
    const childProcess = require('child_process');
    
    // Action
    await queueMonitorService.start();
    queueMonitorService.currentWorkerCount = 1; // Already at minWorkers (1)
    await queueMonitorService.checkQueueDepths();
    
    // Assertions
    // Should not scale down below minWorkers
    expect(childProcess.exec).not.toHaveBeenCalled();
  });

  test('should not scale above maxWorkers', async () => {
    // Setup
    const mockQueueInfo = { messageCount: 100 }; // Well above threshold of 10
    mockChannel.assertQueue = jest.fn().mockResolvedValue(mockQueueInfo);
    
    // Mock exec for the Docker scale command
    const childProcess = require('child_process');
    
    // Action
    await queueMonitorService.start();
    queueMonitorService.currentWorkerCount = 5; // Already at maxWorkers (5)
    await queueMonitorService.checkQueueDepths();
    
    // Assertions
    // Should not scale up above maxWorkers
    expect(childProcess.exec).not.toHaveBeenCalled();
  });
});