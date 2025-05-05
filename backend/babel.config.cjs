// backend/babel.config.cjs
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        }
      },
    ],
  ],
  plugins: [
    // Transform ESM modules to CommonJS for testing
    '@babel/plugin-transform-modules-commonjs',
    // Support for dynamic imports
    '@babel/plugin-syntax-dynamic-import',
    // Support for import.meta
    '@babel/plugin-syntax-import-meta'
  ]
};