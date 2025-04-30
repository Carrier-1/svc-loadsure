module.exports = {
    devServer: {
      proxy: {
        '/api': {
          target: 'http://api-service:3000',
          changeOrigin: true
        }
      }
    }
  }