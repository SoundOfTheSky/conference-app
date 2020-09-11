const { RTCPeerConnection, RTCSessionDescription } = window;
export let peers = {};
export let stream = null;
export let socket = null;
export let onTrack = null;
export let onDisconnect = null;
export function getRTCPeerConnection(socketId) {
  if (peers[socketId]) return peers[socketId];
  console.log('crateNewPeer', socketId, Object.keys(peers));
  peers[socketId] = new RTCPeerConnection();
  peers[socketId].ontrack = ({ streams: [stream] }) => onTrack(socketId, stream);
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
  return peers[socketId];
}
export async function register(mySocket, myStream, myOntrack, myOnDisconnect) {
  stream = myStream;
  socket = mySocket;
  onTrack = myOntrack;
  onDisconnect = myOnDisconnect;
  socket.on('RTCSendDescription', async payload => {
    const peer = getRTCPeerConnection(payload.sender);
    await peer.setRemoteDescription(new RTCSessionDescription(payload.offer));
    if (payload.offer.type === 'offer') {
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
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
export async function connectToUser(socketId) {
  const peer = getRTCPeerConnection(socketId);
  stream.getTracks().forEach(track => peer.addTrack(track, stream));
  const offer = await peer.createOffer();
  await peer.setLocalDescription(new RTCSessionDescription(offer));
  socket.emit('RTCSendDescription', {
    socketId: socketId,
    offer,
  });
}
export function closePeer(socketId) {
  if (peers[socketId]) peers[socketId].close();
  peers[socketId] = null;
}
export function closeAllPeers() {
  Object.values(peers).forEach(peer => peer.close());
  peers = {};
}
export function stopStream() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
}
