const config = {
  protocol: process.env.VUE_APP_PROTOCOL,
  port: process.env.VUE_APP_PROTOCOL === 'https://' ? '' : ':3000',
  socketPort: process.env.VUE_APP_PROTOCOL === 'https://' ? '' : ':3000',
  host: window.location.hostname,
  RTCConfig: {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  },
};
export default config;
