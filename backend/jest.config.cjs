// backend/jest.config.cjs
module.exports = {
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
  
  // Mocks need to be hoisted to the top to ensure they're used
  injectGlobals: true,

  // Handle ESM dependencies
  transformIgnorePatterns: [
    '/node_modules/(?!node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)'
  ],
  
  // Increase timeout for tests
  testTimeout: 10000,

  // Use CommonJS for tests (easier with Jest) even though our app is ESM
  transform: {
    '^.+\\.js$': [
      'babel-jest',
      {
        targets: {
          node: 'current'
        },
        plugins: [
          '@babel/plugin-transform-modules-commonjs'
        ]
      }
    ]
  }
};