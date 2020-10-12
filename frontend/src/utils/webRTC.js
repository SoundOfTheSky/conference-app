/*
  HOW TO SET UP SERVER TO WORK WITH THIS MODULE

  Server must listen to "RTCSendDescription" and send to "socketId" data like {sender: this.socket.id, offer: offer}
  Server must listen to "RTCSendCandidate" and send to "socketId" data like {sender: this.socket.id, candidate: candidate}
  Events sent to client has same name as events sent to server
*/
import 'webrtc-adapter';
import { EventEmitter } from 'events';
const { RTCPeerConnection, RTCSessionDescription } = window;
export default class webRTC extends EventEmitter {
  constructor(socket, RTCConfig) {
    super();
    this.socket = socket;
    this.RTCConfig = RTCConfig;
    this.socket.on('RTCSendDescription', async payload => {
      const peer = this.getRTCPeerConnection(payload.sender, true);
      const asnwerWithDescription = !peer.currentRemoteDescription;
      await peer.setRemoteDescription(new RTCSessionDescription(payload.offer));
      if (payload.offer.type === 'offer') {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(new RTCSessionDescription(answer));
        this.socket.emit('RTCSendDescription', {
          socketId: payload.sender,
          offer: answer,
        });
        if (asnwerWithDescription) this.sendDescription(payload.sender);
      }
    });
    this.socket.on('RTCSendCandidate', payload => {
      if (!payload.candidate) return;
      const peer = this.getRTCPeerConnection(payload.sender);
      const interval = setInterval(() => {
        if (peer.remoteDescription && peer.remoteDescription.type) {
          peer.addIceCandidate(payload.candidate);
          clearInterval(interval);
        }
      }, 100);
    });
  }
  peers = {};
  dataChannels = {};
  stream = null;
  socket = null;
  dataChannelInputStreams = {};
  MAX_CHANNEL_DATA_SIZE = 32768;
  RTCConfig = {};
  // connect to socket. Returns promise that resolves then connected
  connect(socketId) {
    return new Promise((r, j) => {
      function onDisconnect(sid) {
        if (socketId !== sid) return;
        this.removeListener('connected', onConnect);
        j();
      }
      function onConnect(sid) {
        if (socketId !== sid) return;
        this.removeListener('disconnected', onDisconnect);
        r();
      }
      if (
        this.peers[socketId] &&
        this.peers[socketId].connectionState === 'connected' &&
        this.dataChannels[socketId].readyState === 'open'
      )
        r();
      else {
        this.once('disconnected', onDisconnect);
        this.once('connected', onConnect);
        this.getRTCPeerConnection(socketId);
      }
    });
  }
  checkConnectionStatus(socketId) {
    const peer = this.peers[socketId];
    if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) {
      this.emit('statusChange', { socketId, status: peer.connectionState });
      return this.closePeer(socketId);
    }
    if (!peer.connectionState !== 'connected')
      return this.emit('statusChange', { socketId, status: peer.connectionState });
    if (this.dataChannels[socketId].readyState !== 'open')
      return this.emit('statusChange', { socketId, status: 'opening' });
    this.emit('connected', socketId);
  }
  // Get peer, or create new if don't exist
  getRTCPeerConnection(socketId, dontSendDescription) {
    if (this.peers[socketId]) return this.peers[socketId];
    this.peers[socketId] = new RTCPeerConnection(this.RTCConfig);
    if (!this.dataChannels[socketId]) {
      this.dataChannels[socketId] = this.peers[socketId].createDataChannel('main', { negotiated: true, id: 0 });
      this.dataChannels[socketId].onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.id === undefined) return this.emit('message', { ...data, socketId });
        if (!this.dataChannelInputStreams[data.id]) this.dataChannelInputStreams[data.id] = '';
        this.dataChannelInputStreams[data.id] += data.data;
        if (data.lastPiece) {
          this.emit('message', { ...JSON.parse(this.dataChannelInputStreams[data.id]), socketId });
          delete this.dataChannelInputStreams[data.id];
        }
      };
      this.dataChannels[socketId].onopen = () => this.checkConnectionStatus(socketId);
      this.dataChannels[socketId].onerror = () => this.closePeer(socketId);
      this.dataChannels[socketId].onclose = () => this.closePeer(socketId);
    }
    if (this.stream) this.stream.getTracks().forEach(track => this.peers[socketId].addTrack(track, this.stream));
    this.peers[socketId].ontrack = e => {
      console.log(socketId + ': stream');
      this.emit('stream', { socketId, stream: e.streams[0] });
    };
    this.peers[socketId].onconnectionstatechange = () => this.checkConnectionStatus(socketId);
    this.peers[socketId].onicecandidate = e => {
      this.socket.emit('RTCSendCandidate', {
        socketId: socketId,
        candidate: e.candidate,
      });
    };
    if (!dontSendDescription) this.sendDescription(socketId);
    return this.peers[socketId];
  }
  // Send content description
  async sendDescription(socketId) {
    const offer = await this.peers[socketId].createOffer();
    await this.peers[socketId].setLocalDescription(new RTCSessionDescription(offer));
    this.socket.emit('RTCSendDescription', {
      socketId: socketId,
      offer,
    });
  }
  // Changing this.stream and reconnecting
  async setStream(myStream) {
    this.stopStream();
    this.stream = myStream;
    Object.keys(this.peers).forEach(socketId => {
      const peer = this.peers[socketId];
      const senders = peer.getSenders();
      const tracks = this.stream.getTracks();
      const senderAudio = senders.find(el => el.track && el.track.kind === 'audio');
      const senderVideo = senders.find(el => el.track && el.track.kind === 'video');
      const trackAudio = tracks.find(el => el.kind === 'audio');
      const trackVideo = tracks.find(el => el.kind === 'video');
      if (senderAudio && trackAudio) senderAudio.replaceTrack(trackAudio);
      if (senderVideo && trackVideo) senderVideo.replaceTrack(trackVideo);
      this.sendDescription(socketId);
    });
  }
  // Send data to every connected peer
  broadcast(data) {
    Object.keys(this.dataChannels).forEach(socketId => this.send(socketId, data));
  }
  // Send data to exact peer
  send(socketId, payload) {
    if (this.dataChannels[socketId].readyState !== 'open') return;
    const data = JSON.stringify(payload);
    if (data.length > this.MAX_CHANNEL_DATA_SIZE) {
      const id = Math.floor(Math.random() * 1000000) + '';
      let offset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (offset + this.MAX_CHANNEL_DATA_SIZE > data.length) {
          this.dataChannels[socketId].send(
            JSON.stringify({ id, data: data.slice(offset, offset + this.MAX_CHANNEL_DATA_SIZE), lastPiece: true }),
          );
          break;
        }
        this.dataChannels[socketId].send(
          JSON.stringify({ id, data: data.slice(offset, offset + this.MAX_CHANNEL_DATA_SIZE) }),
        );
        offset += this.MAX_CHANNEL_DATA_SIZE;
      }
    } else this.dataChannels[socketId].send(data);
  }
  // Close exact peer
  closePeer(socketId) {
    if (this.dataChannels[socketId]) this.dataChannels[socketId].close();
    delete this.dataChannels[socketId];
    if (this.peers[socketId]) this.peers[socketId].close();
    delete this.peers[socketId];
  }
  // Self explanatory
  closeAllPeers() {
    Object.values(this.peers).forEach(peer => peer.close());
    this.peers = {};
  }
  // Stop current this.stream
  stopStream() {
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    this.stream = null;
  }
}
