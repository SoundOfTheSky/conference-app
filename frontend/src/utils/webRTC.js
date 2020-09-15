import config from '../config';
const { RTCPeerConnection, RTCSessionDescription } = window;
export let peers = {};
export let dataChannels = {};
export let stream = null;
export let socket = null;
export let onTrack = null;
export let onMessage = null;
export let onDisconnect = null;
export function getRTCPeerConnection(socketId, connectTo) {
  if (peers[socketId]) return peers[socketId];
  console.log('crateNewPeer', socketId);
  peers[socketId] = new RTCPeerConnection(config.RTCConfig);
  stream.getTracks().forEach(track => peers[socketId].addTrack(track, stream));
  dataChannels[socketId] = peers[socketId].createDataChannel('main', { negotiated: true, id: 0 });
  dataChannels[socketId].onmessage = e => onMessage(JSON.parse(e.data));
  peers[socketId].ontrack = e => onTrack(socketId, e.streams[0]);
  peers[socketId].onconnectionstatechange = () => {
    if (['disconnected', 'failed', 'closed'].includes(peers[socketId].connectionState)) {
      console.log('disconnected wiht status: ' + peers[socketId].connectionState);
      closePeer(socketId);
      onDisconnect(socketId);
    }
  };
  peers[socketId].onicecandidate = e => {
    socket.emit('RTCSendCandidate', {
      socketId: socketId,
      candidate: e.candidate,
    });
  };
  if (!connectTo) sendDescription(socketId);
  return peers[socketId];
}
export async function sendDescription(socketId) {
  const offer = await peers[socketId].createOffer();
  await peers[socketId].setLocalDescription(new RTCSessionDescription(offer));
  socket.emit('RTCSendDescription', {
    socketId: socketId,
    offer,
  });
}
export async function changeStream(myStream) {
  stream = myStream;
  Object.keys(peers).forEach(socketId => {
    const peer = peers[socketId];
    const senders = peer.getSenders();
    const tracks = stream.getTracks();
    const senderAudio = senders.find(el => el.track && el.track.kind === 'audio');
    const senderVideo = senders.find(el => el.track && el.track.kind === 'video');
    const trackAudio = tracks.find(el => el.kind === 'audio');
    const trackVideo = tracks.find(el => el.kind === 'video');
    if (senderAudio && trackAudio) senderAudio.replaceTrack(trackAudio);
    if (senderVideo && trackVideo) senderVideo.replaceTrack(trackVideo);
    sendDescription(socketId);
  });
}
export function broadcast(data) {
  Object.keys(dataChannels).forEach(socketId => {
    send(socketId, data);
  });
}
export function send(socketId, payload) {
  dataChannels[socketId].send(JSON.stringify(payload));
}
export async function register(mySocket, myStream, myOntrack, myOnMessage, myOnDisconnect) {
  stream = myStream;
  socket = mySocket;
  onTrack = myOntrack;
  onMessage = myOnMessage;
  onDisconnect = myOnDisconnect;
  socket.on('RTCSendDescription', async payload => {
    const peer = getRTCPeerConnection(payload.sender, true);
    await peer.setRemoteDescription(new RTCSessionDescription(payload.offer));
    if (payload.offer.type === 'offer') {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(new RTCSessionDescription(answer));
      socket.emit('RTCSendDescription', {
        socketId: payload.sender,
        offer: answer,
      });
    }
  });
  socket.on('RTCSendCandidate', payload => {
    if (!payload.candidate) return;
    const peer = getRTCPeerConnection(payload.sender);
    const interval = setInterval(() => {
      if (peer.remoteDescription && peer.remoteDescription.type) {
        peer.addIceCandidate(payload.candidate);
        clearInterval(interval);
      }
    }, 100);
  });
}
export function closePeer(socketId) {
  if (dataChannels[socketId]) dataChannels[socketId].close();
  if (peers[socketId]) peers[socketId].close();
  delete peers[socketId];
}
export function closeAllPeers() {
  Object.values(peers).forEach(peer => peer.close());
  peers = {};
}
export function stopStream() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
}
