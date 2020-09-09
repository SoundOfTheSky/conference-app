import Vue from 'vue';
import Vuex from 'vuex';
import api from '../api';
import io from 'socket.io-client';
Vue.use(Vuex);
const state = {
  rooms: [],
  socket: null,
};
const mutations = {
  setRooms(rooms) {
    state.rooms = rooms;
  },
  setSocket(socket) {
    state.socket = socket;
  },
};
const actions = {
  loadRooms() {
    api.getRooms().then(el => mutations.setRooms(el));
  },
  connectSocket() {
    mutations.setSocket(io('localhost:80'));
  },
  disconnectSocket() {
    state.socket.disconnect();
    mutations.setSocket(null);
  },
};

export default new Vuex.Store({
  state,
  mutations,
  actions,
});
