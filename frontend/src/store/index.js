import Vue from 'vue';
import Vuex from 'vuex';
import api from '../api';
Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    rooms: [],
    socket: null,
    token: '',
  },
  getters: {
    authorization: state => state.socket.id + ' ' + state.token,
  },
  mutations: {
    setToken(state, token) {
      state.token = token;
    },
    setRooms(state, rooms) {
      state.rooms = rooms;
    },
    setSocket(state, socket) {
      state.socket = socket;
    },
  },
  actions: {
    loadRooms({ commit }) {
      api.getRooms().then(el => commit('setRooms', el));
    },
  },
});
