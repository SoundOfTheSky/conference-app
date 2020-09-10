import Vue from 'vue';
import Vuex from 'vuex';
import api from '../api';
import io from 'socket.io-client';
import config from '../config';
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
    mutations.setSocket(io(config.url + ':3001'));
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
