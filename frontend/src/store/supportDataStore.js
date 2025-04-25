// Loadsure Service for handling insurance quotes and bookings
// This service connects to RabbitMQ for message handling and uses an in-memory store for quotes and bookings.
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

// Support data store module
const supportDataModule = {
  namespaced: true,
  
  state: {
    commodities: [],
    commodityExclusions: [],
    equipmentTypes: [],
    loadTypes: [],
    freightClasses: [],
    termsOfSales: [],
    
    loading: false,
    error: null,
    lastUpdated: null
  },
  
  getters: {
    getCommodities: state => state.commodities,
    getCommodityExclusions: state => state.commodityExclusions,
    getEquipmentTypes: state => state.equipmentTypes,
    getLoadTypes: state => state.loadTypes,
    getFreightClasses: state => state.freightClasses,
    getTermsOfSales: state => state.termsOfSales,
    
    isLoading: state => state.loading,
    getError: state => state.error,
    getLastUpdated: state => state.lastUpdated,
    
    getCommodityById: state => id => {
      return state.commodities.find(c => c.id === id) || null;
    },
    
    getFreightClassById: state => id => {
      return state.freightClasses.find(fc => fc.id === id) || null;
    },
    
    getEquipmentTypeById: state => id => {
      return state.equipmentTypes.find(et => et.id === id) || null;
    },
    
    getLoadTypeById: state => id => {
      return state.loadTypes.find(lt => lt.id === id) || null;
    }
  },
  
  mutations: {
    SET_COMMODITIES(state, commodities) {
      state.commodities = commodities;
    },
    
    SET_COMMODITY_EXCLUSIONS(state, exclusions) {
      state.commodityExclusions = exclusions;
    },
    
    SET_EQUIPMENT_TYPES(state, types) {
      state.equipmentTypes = types;
    },
    
    SET_LOAD_TYPES(state, types) {
      state.loadTypes = types;
    },
    
    SET_FREIGHT_CLASSES(state, classes) {
      state.freightClasses = classes;
    },
    
    SET_TERMS_OF_SALES(state, terms) {
      state.termsOfSales = terms;
    },
    
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    
    SET_ERROR(state, error) {
      state.error = error;
    },
    
    SET_LAST_UPDATED(state) {
      state.lastUpdated = new Date();
    }
  },
  
  actions: {
    async fetchSupportData({ commit, dispatch }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      
      try {
        // Fetch all support data in parallel
        await Promise.all([
          dispatch('fetchCommodities'),
          dispatch('fetchCommodityExclusions'),
          dispatch('fetchEquipmentTypes'),
          dispatch('fetchLoadTypes'),
          dispatch('fetchFreightClasses'),
          dispatch('fetchTermsOfSales')
        ]);
        
        commit('SET_LAST_UPDATED');
      } catch (error) {
        console.error('Error fetching support data:', error);
        commit('SET_ERROR', 'Failed to load support data. Please try again later.');
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    async fetchCommodities({ commit }) {
      try {
        const response = await fetch('/api/support-data/commodities');
        if (!response.ok) throw new Error('Failed to fetch commodities');
        
        const data = await response.json();
        commit('SET_COMMODITIES', data);
      } catch (error) {
        console.error('Error fetching commodities:', error);
        throw error;
      }
    },
    
    async fetchCommodityExclusions({ commit }) {
      try {
        const response = await fetch('/api/support-data/commodity-exclusions');
        if (!response.ok) throw new Error('Failed to fetch commodity exclusions');
        
        const data = await response.json();
        commit('SET_COMMODITY_EXCLUSIONS', data);
      } catch (error) {
        console.error('Error fetching commodity exclusions:', error);
        throw error;
      }
    },
    
    async fetchEquipmentTypes({ commit }) {
      try {
        const response = await fetch('/api/support-data/equipment-types');
        if (!response.ok) throw new Error('Failed to fetch equipment types');
        
        const data = await response.json();
        commit('SET_EQUIPMENT_TYPES', data);
      } catch (error) {
        console.error('Error fetching equipment types:', error);
        throw error;
      }
    },
    
    async fetchLoadTypes({ commit }) {
      try {
        const response = await fetch('/api/support-data/load-types');
        if (!response.ok) throw new Error('Failed to fetch load types');
        
        const data = await response.json();
        commit('SET_LOAD_TYPES', data);
      } catch (error) {
        console.error('Error fetching load types:', error);
        throw error;
      }
    },
    
    async fetchFreightClasses({ commit }) {
      try {
        const response = await fetch('/api/support-data/freight-classes');
        if (!response.ok) throw new Error('Failed to fetch freight classes');
        
        const data = await response.json();
        commit('SET_FREIGHT_CLASSES', data);
      } catch (error) {
        console.error('Error fetching freight classes:', error);
        throw error;
      }
    },
    
    async fetchTermsOfSales({ commit }) {
      try {
        const response = await fetch('/api/support-data/terms-of-sales');
        if (!response.ok) throw new Error('Failed to fetch terms of sales');
        
        const data = await response.json();
        commit('SET_TERMS_OF_SALES', data);
      } catch (error) {
        console.error('Error fetching terms of sales:', error);
        throw error;
      }
    },
    
    async refreshSupportData({ commit, dispatch }) {
      commit('SET_LOADING', true);
      commit('SET_ERROR', null);
      
      try {
        const response = await fetch('/api/support-data/refresh', {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to refresh support data');
        
        // Reload all data
        await dispatch('fetchSupportData');
        
      } catch (error) {
        console.error('Error refreshing support data:', error);
        commit('SET_ERROR', 'Failed to refresh support data. Please try again later.');
      } finally {
        commit('SET_LOADING', false);
      }
    }
  }
};

// Create and export the store
export default new Vuex.Store({
  modules: {
    supportData: supportDataModule
  }
});