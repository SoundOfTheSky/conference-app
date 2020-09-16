/*
  HOW TO SET UP SERVER TO WORK WITH THIS MODULE

  Server must listen to "RTCSendDescription" and send to "socketId" data like {sender: socket.id, offer: offer}
  Server must listen to "RTCSendCandidate" and send to "socketId" data like {sender: socket.id, candidate: candidate}
  Events sent to client has same name as events sent to server
*/

import config from '../config';
const { RTCPeerConnection, RTCSessionDescription } = window;
const MAX_CHANNEL_DATA_SIZE = 32768;
export let peers = {};
export let dataChannels = {};
export let stream = null;
export let socket = null;
export let onTrack = null;
export let onMessage = null;
export let onDisconnect = null;
export let onConnection = null;
let dataChannelInputStreams = {};
// Register socket, as pairable client
export async function register(mySocket, myStream, myOntrack, myOnMessage, myOnDisconnect, myOnConnection) {
  stream = myStream;
  socket = mySocket;
  onTrack = myOntrack;
  onMessage = myOnMessage;
  onDisconnect = myOnDisconnect;
  onConnection = myOnConnection;
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
// Get peer, or create new if don't exist
export function getRTCPeerConnection(socketId, connectTo) {
  if (peers[socketId]) return peers[socketId];
  peers[socketId] = new RTCPeerConnection(config.RTCConfig);
  stream.getTracks().forEach(track => peers[socketId].addTrack(track, stream));
  dataChannels[socketId] = peers[socketId].createDataChannel('main', { negotiated: true, id: 0 });
  dataChannels[socketId].onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.id !== undefined) {
      if (!dataChannelInputStreams[data.id]) dataChannelInputStreams[data.id] = '';
      dataChannelInputStreams[data.id] += data.data;
      if (data.lastPiece) {
        onMessage(JSON.parse(dataChannelInputStreams[data.id]));
        delete dataChannelInputStreams[data.id];
      }
    } else onMessage(data);
  };
  dataChannels[socketId].onopen = () => onConnection(socketId);
  peers[socketId].ontrack = e => onTrack(socketId, e.streams[0]);
  peers[socketId].onconnectionstatechange = () => {
    if (['disconnected', 'failed', 'closed'].includes(peers[socketId].connectionState)) {
      console.log('disconnected with status: ' + peers[socketId].connectionState);
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
// Send content description
export async function sendDescription(socketId) {
  const offer = await peers[socketId].createOffer();
  await peers[socketId].setLocalDescription(new RTCSessionDescription(offer));
  socket.emit('RTCSendDescription', {
    socketId: socketId,
    offer,
  });
}
// Changing stream and reconnecting
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
// Send data to every connected peer
export function broadcast(data) {
  Object.keys(dataChannels).forEach(socketId => {
    send(socketId, data);
  });
}
// Send data to exact peer
export function send(socketId, payload) {
  const data = JSON.stringify(payload);
  if (data.length > MAX_CHANNEL_DATA_SIZE) {
    const id = Math.floor(Math.random() * 1000000) + '';
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (offset + MAX_CHANNEL_DATA_SIZE > data.length) {
        dataChannels[socketId].send(
          JSON.stringify({ id, data: data.slice(offset, offset + MAX_CHANNEL_DATA_SIZE), lastPiece: true }),
        );
        break;
      }
      dataChannels[socketId].send(JSON.stringify({ id, data: data.slice(offset, offset + MAX_CHANNEL_DATA_SIZE) }));
      offset += MAX_CHANNEL_DATA_SIZE;
    }
  } else dataChannels[socketId].send(data);
}
// Close exact peer
export function closePeer(socketId) {
  if (dataChannels[socketId]) dataChannels[socketId].close();
  if (peers[socketId]) peers[socketId].close();
  delete peers[socketId];
}
// Self explanatory
export function closeAllPeers() {
  Object.values(peers).forEach(peer => peer.close());
  peers = {};
}
// Stop current stream
export function stopStream() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
}
