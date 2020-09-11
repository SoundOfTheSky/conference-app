import Vue from 'vue';
import Vuex from 'vuex';
import api from '../api';
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
    mutations.setSocket(api.connectSocket());
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
