import axios from 'axios';
import io from 'socket.io-client';
import config from '../config';
import store from '../store';
const host = config.protocol + config.host + config.port + '/api/';
function getConstructor(url) {
  return (params = {}) => {
    return new Promise((r, j) => {
      axios
        .get(host + url, { params })
        .then(response => {
          r(response.data);
        })
        .catch(e => j(e.response.data));
    });
  };
}
function postConstructor(url) {
  return (params = {}) => {
    return new Promise((r, j) => {
      axios
        .post(host + url, params)
        .then(response => {
          r(response.data);
        })
        .catch(e => j(e.response.data));
    });
  };
}
function paramConstructor(url) {
  return (param = '') => {
    return new Promise((r, j) => {
      axios
        .get(host + url + '/' + param)
        .then(response => {
          r(response.data);
        })
        .catch(e => j(e.response.data));
    });
  };
}
export default {
  getRooms: getConstructor('rooms'),
  getRoom: paramConstructor('rooms'),
  createRoom: postConstructor('rooms'),
  connectSocket: () => {
    const socket = io(config.protocol + window.location.hostname + config.socketPort);
    store.commit('setSocket', socket);
    socket.once('authorization', key => store.commit('setToken', key));
  },
};
