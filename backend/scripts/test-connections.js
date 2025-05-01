// backend/scripts/test-connections.js
// A script to test connections between services and help troubleshoot issues

import * as amqp from 'amqplib';
import fetch from 'node-fetch';
import config from '../src/config.js';

// Test settings
const RABBITMQ_URL = process.env.RABBITMQ_URL || config.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const API_HOST = process.env.API_HOST || 'http://api-service:3000';
const LOADSURE_API_KEY = process.env.LOADSURE_API_KEY || config.LOADSURE_API_KEY;
const LOADSURE_BASE_URL = process.env.LOADSURE_BASE_URL || config.LOADSURE_BASE_URL;
const TEST_QUEUE_PREFIX = 'test-queue';

/**
 * Test RabbitMQ connection and basic pub/sub functionality
 */
async function testRabbitMQ() {
  console.log('\n===== RabbitMQ Connection Test =====');
  
  try {
    console.log('Connecting to RabbitMQ at', RABBITMQ_URL);
    const connection = await amqp.connect(RABBITMQ_URL);
    console.log('✅ Successfully connected to RabbitMQ');
    
    const channel = await connection.createChannel();
    console.log('✅ Successfully created channel');
    
    // Generate a unique test queue name
    const testQueueName = `${TEST_QUEUE_PREFIX}-${Date.now()}`;
    
    // Test queue creation
    await channel.assertQueue(testQueueName, { durable: false });
    console.log(`✅ Successfully created test queue: ${testQueueName}`);
    
    // Test queue status check
    const queueStatus = await channel.checkQueue(testQueueName);
    console.log(`✅ Queue status: ${queueStatus.messageCount} messages, ${queueStatus.consumerCount} consumers`);
    
    // Test send and receive
    console.log('Testing message round trip...');
    const testMessage = { test: true, timestamp: new Date().toISOString() };
    let messageReceived = false;
    
    // Set up consumer first
    await channel.consume(testQueueName, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        console.log('✅ Consumer received message:', content);
        messageReceived = true;
        channel.ack(msg);
      }
    });
    
    // Send test message
    channel.sendToQueue(testQueueName, Buffer.from(JSON.stringify(testMessage)));
    console.log('✅ Test message sent');
    
    // Wait for message to be received
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if message was received
    if (messageReceived) {
      console.log('✅ Message successfully published and consumed');
    } else {
      console.log('❌ Message was sent but not received by consumer');
    }
    
    // Test main application queues
    console.log('\nChecking production queue status:');
    for (const queueName of [
      config.QUEUE_QUOTE_REQUESTED,
      config.QUEUE_QUOTE_RECEIVED,
      config.QUEUE_BOOKING_REQUESTED,
      config.QUEUE_BOOKING_CONFIRMED
    ]) {
      try {
        const status = await channel.checkQueue(queueName);
        console.log(`✅ Queue ${queueName}: ${status.messageCount} messages, ${status.consumerCount} consumers`);
      } catch (error) {
        console.log(`❌ Queue ${queueName}: ${error.message}`);
      }
    }
    
    console.log('\nRabbitMQ connection test completed successfully');
    
    // Clean up
    await channel.deleteQueue(testQueueName);
    await connection.close();
  } catch (error) {
    console.error('❌ RabbitMQ test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection was refused. Ensure RabbitMQ is running and accessible.');
    }
  }
}

/**
 * Test API service connectivity and health
 */
async function testAPIService() {
  console.log('\n===== API Service Test =====');
  
  try {
    console.log(`Testing API health endpoint at ${API_HOST}/health`);
    const response = await fetch(`${API_HOST}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API service is healthy:', data);
    } else {
      console.log(`❌ API service returned status: ${response.status}`);
      console.log(await response.text());
    }
  } catch (error) {
    console.error('❌ API service test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection was refused. Ensure API service is running and accessible.');
    }
  }
}

/**
 * Test Loadsure API connectivity
 */
async function testLoadsureAPI() {
  console.log('\n===== Loadsure API Test =====');
  
  if (!LOADSURE_API_KEY) {
    console.log('❌ Loadsure API key not configured');
    return;
  }
  
  try {
    console.log(`Testing connection to Loadsure API at ${LOADSURE_BASE_URL}`);
    
    // Attempt to get support data (this should work even without a valid API key)
    const url = `${LOADSURE_BASE_URL}/api/commodities`;
    console.log(`Sending request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOADSURE_API_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Successfully connected to Loadsure API');
      // Get limited data to avoid flooding logs
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : 'unknown';
      console.log(`Received response with ${count} items`);
    } else {
      console.log(`❌ Loadsure API returned status: ${response.status}`);
      try {
        const errorText = await response.text();
        console.log('Error response:', errorText.substring(0, 500));
      } catch (e) {
        console.log('Could not read error response');
      }
    }
  } catch (error) {
    console.error('❌ Loadsure API test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection was refused. Check network connectivity and API URL.');
    }
  }
}

/**
 * Main function to run all tests
 */
async function runTests() {
  console.log('Starting connection tests...');
  console.log('Environment: ', process.env.NODE_ENV || 'development');
  
  await testRabbitMQ();
  await testAPIService();
  await testLoadsureAPI();
  
  console.log('\n===== All Tests Completed =====');
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});