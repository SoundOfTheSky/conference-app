/*
  HOW TO SET UP SERVER TO WORK WITH THIS MODULE

  Server must listen to "RTCSendDescription" and send to "socketId" data like {sender: this.socket.id, offer: offer}
  Server must listen to "RTCSendCandidate" and send to "socketId" data like {sender: this.socket.id, candidate: candidate}
  Events sent to client has same name as events sent to server
*/
import 'webrtc-adapter';
import { EventEmitter } from 'events';
const { RTCPeerConnection } = window;
export class webRTC extends EventEmitter {
  constructor(socket, RTCConfig) {
    super();
    this.socket = socket;
    this.RTCConfig = RTCConfig;
    this.socket.on('RTCSendDescription', async payload => {
      console.log('[webRTC] Got ' + payload.offer.type);
      const peer = this.getRTCPeerConnection(payload.sender, true);
      await peer.setRemoteDescription(payload.offer);
      if (payload.offer.type === 'offer') {
        console.log('[webRTC] Sending answer');
        await peer.setLocalDescription(await peer.createAnswer());
        this.socket.emit('RTCSendDescription', {
          socketId: payload.sender,
          offer: peer.localDescription,
        });
      }
    });
    this.socket.on('RTCSendCandidate', payload => {
      console.log('[webRTC] Got candidate:', payload.candidate);
      this.peers[payload.sender].addIceCandidate(payload.candidate);
    });
  }
  peers = {};
  dataChannels = {};
  stream = new MediaStream();
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
    console.log(
      `[webRTC] CONNECTION STATE CHANGE
      signaling: ${peer.signalingState}
      peer: ${peer.connectionState}
      data channel: ${this.dataChannels[socketId].readyState}`,
    );
    if (peer.signalingState !== 'stable') return this.emit('statusChange', { socketId, status: peer.signalingState });
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
  getRTCPeerConnection(socketId, offered) {
    if (this.peers[socketId]) return this.peers[socketId];
    console.log('[webRTC] Creating new connection');
    this.peers[socketId] = new RTCPeerConnection(this.RTCConfig);
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
    this.peers[socketId].ontrack = e => {
      console.log('[webRTC] ' + socketId + ': stream', e);
      this.emit('stream', { socketId, stream: e.streams[0] });
    };
    this.peers[socketId].onconnectionstatechange = () => this.checkConnectionStatus(socketId);
    this.peers[socketId].onsignalingstatechange = () => this.checkConnectionStatus(socketId);
    this.peers[socketId].onicecandidate = e => {
      console.log('[webRTC] Send candidate:', e.candidate);
      //if (!e.candidate) return;
      this.socket.emit('RTCSendCandidate', {
        socketId: socketId,
        candidate: e.candidate,
      });
    };
    if (!offered)
      this.peers[socketId].onnegotiationneeded = async () => {
        if (this.peers[socketId].signalingState != 'stable') return;
        console.log('[webRTC] Sending offer');
        await this.peers[socketId].setLocalDescription(
          await this.peers[socketId].createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true }),
        );
        this.socket.emit('RTCSendDescription', {
          socketId: socketId,
          offer: this.peers[socketId].localDescription,
        });
      };
    this.updateStream(socketId);
    this.checkConnectionStatus(socketId);
    return this.peers[socketId];
  }
  // Update peers stream
  updateStream(socketId) {
    const peer = this.peers[socketId];
    const senders = peer.getSenders();
    const tracks = this.stream.getTracks();
    const senderAudio = senders.find(el => el.track && el.track.kind === 'audio');
    const senderVideo = senders.find(el => el.track && el.track.kind === 'video');
    const trackAudio = tracks.find(el => el.kind === 'audio');
    const trackVideo = tracks.find(el => el.kind === 'video');
    if (trackAudio) {
      if (senderAudio) senderAudio.replaceTrack(trackAudio);
      else peer.addTrack(trackAudio, this.stream);
    }
    if (trackVideo) {
      if (senderVideo) senderVideo.replaceTrack(trackVideo);
      else peer.addTrack(trackVideo, this.stream);
    }
  }
  // Changing this.stream and reconnecting
  async setStream(myStream) {
    this.stopStream();
    this.stream = myStream;
    Object.keys(this.peers).forEach(socketId => this.updateStream(socketId));
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
export function checkAvailability() {
  return new Promise((r, j) => {
    try {
      let candidates = [];
      let pc = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun1.l.google.com:19302',
          },
          {
            urls: 'stun:stun2.l.google.com:19302',
          },
        ],
      });
      const timeout = setTimeout(check, 5000);
      // eslint-disable-next-line no-inner-declarations
      function check() {
        console.log(candidates);
        clearTimeout(timeout);
        pc.close();
        if (candidates.length === 0)
          j(`WTF?
It looks like your browser doesn't want to establish a WebRTC connection.
What can you do?
1. Update your browser.
2. Install Chrome or Mozilla Firefox.
3. Check your internet connection and firewall.

Or just ignore this error, but there are 90% chance that you won't be able to connect.
Unless you're in lan.`);
        else if (candidates.length === 1) r('Normal NAT');
        else if (candidates.some(cand => candidates.some(cand2 => cand.port !== cand2.port))) {
          j(`Unfortunately, you cannot use this application because you are behind symmetric NAT.
This means your internet provider is saving money on you.
What can you do?
1. Use a VPN. I recommend to use Radmin.
2. Change your internet provider.
3. Buy static ip from your provider.

Or just ignore this error, but there are 90% chance that you won't be able to connect.
Unless you're in lan.`);
        } else r('Maybe normal NAT');
      }
      pc.createDataChannel('checkAvailabilty');
      pc.onicecandidate = e => {
        if (e.candidate && e.candidate.type === 'srflx') candidates.push(e.candidate);
        else if (!e.candidate) check();
      };
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
    } catch (e) {
      console.error(e);
      j(`Ugh...
Something bad happened while we were checking your browser.
Don't panic. There is something you can do.
1. Update your browser.
2. Install Chrome or Mozilla Firefox.
3. Right click -> Inspect element -> Console. Google it.`);
    }
  });
}
