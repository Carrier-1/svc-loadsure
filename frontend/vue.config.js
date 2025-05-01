
// frontend/vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://api-service:3000',
        changeOrigin: true
      },
      '/api-docs': {
        target: 'http://api-service:3000',
        changeOrigin: true
      }
    }
  }
}