// File: src/main.js
import Vue from 'vue'
import App from './App.vue'
import store from './store/supportDataStore'
import './assets/main.css'

// Global error handler
Vue.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err);
  console.error('Info:', info);
};

// Create the Vue instance with store
new Vue({
  store, // Add Vuex store
  render: h => h(App),
}).$mount('#app')