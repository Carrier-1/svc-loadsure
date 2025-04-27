// File: src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import store from './store/supportDataStore'
import './assets/main.css'

// Create the Vue application
const app = createApp(App)

// Add global error handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err);
  console.error('Info:', info);
};

// Use the store and mount
app.use(store)
app.mount('#app')