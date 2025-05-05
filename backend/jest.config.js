// backend/jest.config.js
export default {
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  rootDir: './',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: false, // Set to false initially for faster testing
  testPathIgnorePatterns: ['/node_modules/'],
  
  // Add setup file to run before tests
  setupFilesAfterEnv: ['./jest.setup.js'],
  
  // Fix module resolution for ES modules
  moduleNameMapper: {
    "/^(\.{1,2}\/.*)\.js$/": "$1"   
  },
  
  // Handle ESM dependencies
  transformIgnorePatterns: [
    '/node_modules/(?!node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)'
  ],
  
  // Increase timeout for tests
  testTimeout: 10000,

  // Set module directories to help with path resolution
  moduleDirectories: ['node_modules', 'src'],
  
  // Root directories for module resolution
  roots: ['<rootDir>/src']
}