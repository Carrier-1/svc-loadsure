module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
  // Add this for ES modules support
  plugins: [
    ['@babel/plugin-transform-modules-commonjs']
  ]
};
