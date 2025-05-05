// backend/jest.config.js
export default {
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  rootDir: './',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/swagger.js',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  clearMocks: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
  
  // Fix module resolution - this handles explicit .js extensions in imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Critical for handling node-fetch and other ESM dependencies
  transformIgnorePatterns: [
    "/node_modules/(?!node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)"
  ],
  
  // Exclude node_modules from test search
  testPathIgnorePatterns: [
    "/node_modules/"
  ],
  
  // Increase timeout for tests
  testTimeout: 30000
}