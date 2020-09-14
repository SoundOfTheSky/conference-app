/*const config = {
  protocol: 'https://',
  port: '',
  socketPort: '',
  host: window.location.hostname,
  RTCConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
};*/
const config = {
  protocol: 'http://',
  port: ':3000',
  socketPort: ':3000',
  host: window.location.hostname,
  RTCConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
};
export default config;
