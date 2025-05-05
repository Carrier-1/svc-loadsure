// src/__tests__/unit/simple.test.js
import { mockConfig } from '../mocks/simple.mock.js';

describe('Basic Test Setup', () => {
  test('Jest is configured properly and imports work', () => {
    // This test just verifies that we can import and use our mock
    expect(mockConfig).toBeDefined();
    expect(mockConfig.PORT).toBe(3000);
    expect(mockConfig.LOADSURE_API_KEY).toBe('MiphvjLVlwfZHrfhGklLgHzvjxiTbzIunOCrIAizpjVFiiRSufowtNhGGCLAiSmN');
  });

  test('Environment variables are set correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.RABBITMQ_URL).toBe('amqp://localhost');
  });
});