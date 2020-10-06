import Vue from 'vue';
import api from './api';
import App from './App.vue';
import router from './router';
import store from './store';

api.connectSocket();
new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app');
