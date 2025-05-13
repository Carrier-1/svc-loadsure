// frontend/vue.config.js
module.exports = {
  devServer: {
    port: 8080,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3001',
        changeOrigin: true
      },
      '/api-docs': {
        target: process.env.API_URL || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  // Optional: define environment variables for the frontend
  chainWebpack: config => {
    config.plugin('define').tap(definitions => {
      Object.assign(definitions[0]['process.env'], {
        // If API_URL is set, use it, otherwise use the default development proxy
        API_BASE_URL: JSON.stringify(process.env.API_URL || '/api')
      });
      return definitions;
    });
  }
}