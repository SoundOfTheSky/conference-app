import Vue from 'vue';
import Vuex from 'vuex';
import api from '../api';

Vue.use(Vuex);
const state = {
  rooms: [],
};
const mutations = {
  setRooms(rooms) {
    state.rooms = rooms;
  },
};
const actions = {
  loadRooms() {
    api.getRooms().then(el => mutations.setRooms(el));
  },
};

export default new Vuex.Store({
  state,
  mutations,
  actions,
});
