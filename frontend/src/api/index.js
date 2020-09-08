import axios from 'axios';
const host = 'http://localhost:3000/api/';
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
};
