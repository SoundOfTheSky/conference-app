const protocol = process.env.VUE_APP_PROTOCOL.replace('//', '');
if (location.protocol != protocol)
  location.href = protocol + window.location.href.substring(window.location.protocol.length);
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
