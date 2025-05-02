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
  // Add these new settings
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',  // Handle ES modules
  },
  transformIgnorePatterns: [
    "/node_modules/(?!node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/"
  ]
}
