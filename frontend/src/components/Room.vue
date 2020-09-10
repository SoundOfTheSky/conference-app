<template>
  <div class="room">
    <div class="login" v-if="!room">
      <input v-model="username" placeholder="Username..." />
      <input v-if="needPassword" v-model="passwordJoin" placeholder="Password for room..." />
      <div class="login-button" @click="connectToRoom">Connect</div>
      <div class="error">{{ loginError }}</div>
    </div>
    <template v-else>
      <div class="playground">
        <div class="members">
          <div class="member" v-for="member in room.members" :key="member.userId">
            <video autoplay :muted="member.userId === userId" :ref="'video_' + member.userId" />
            <span> {{ member.username }}</span>
          </div>
        </div>
        <div class="actions">
          <div @click="audio = !audio" :style="{ background: audio ? 'green' : 'red' }">Audio</div>
          <div @click="video = !video" :style="{ background: video ? 'green' : 'red' }">Video</div>
          <div @click="$router.push({ path: '../rooms' })">Disconnect</div>
        </div>
      </div>
      <div class="sidebar">
        <div class="tab">
          <div
            @click="sideBarTab = 'chat'"
            :style="{ background: sideBarTab === 'chat' ? 'rgba(0,0,0,0.2)' : 'white' }"
          >
            Chat
          </div>
          <div
            @click="sideBarTab = 'settings'"
            :style="{ background: sideBarTab === 'settings' ? 'rgba(0,0,0,0.2)' : 'white' }"
          >
            Settings
          </div>
        </div>
        <div class="chat" v-if="sideBarTab === 'chat'">
          <div class="messages" ref="messages">
            <div class="message" v-for="message in messages" :key="message.id">
              {{ message.username + ': ' + message.text }}
            </div>
          </div>
          <div class="input">
            <input v-model="chatMessage" @keydown.enter="sendChatMessage" />
            <div class="send-button" @click="sendChatMessage">=></div>
          </div>
        </div>
        <div class="settings" v-else-if="sideBarTab === 'settings'">
          <div>
            <span>Name:</span>
            <input v-model="room.name" @change="settingsChange" />
          </div>
          <div>
            <span>Password:</span>
            <input v-model="room.password" @change="settingsChange" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script>
import api from '../api';
const { RTCPeerConnection, RTCSessionDescription } = window;

export default {
  data: function() {
    return {
      peer: null,
      passwordJoin: '',
      room: null,
      username: 'ban',
      userId: null,
      chatMessage: '',
      messages: [],
      sideBarTab: 'chat',
      audio: true,
      video: true,
      needPassword: true,
      loginError: '',
      peers: {},
      stream: null,
    };
  },
  methods: {
    settingsChange() {
      this.socket.emit('changeRoomSettings', this.room);
    },
    connectToRoom() {
      if (!this.socket) this.$store.dispatch('connectSocket');
      this.socket.emit(
        'joinRoom',
        {
          roomId: this.$route.params.id,
          password: this.passwordJoin,
          username: this.username,
        },
        response => {
          if (!response) return (this.loginError = 'Wrong password');
          this.room = response;
          this.userId = response.members[response.members.length - 1].userId;
          this.registerEvents();
        },
      );
    },
    sendChatMessage() {
      this.socket.emit('sendChatMessage', {
        roomId: this.$route.params.id,
        text: this.chatMessage,
        username: this.username,
      });
      this.chatMessage = '';
    },
    registerEvents() {
      Object.values(this.peers).forEach(peer => peer.close());
      this.peers = {};
      this.socket.on('sendChatMessage', msg => {
        this.messages.push(msg);
        this.$nextTick(function() {
          this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
        });
      });
      this.socket.on('roomChange', room => {
        this.room = room;
      });
      this.socket.on('RTCSendDescription', async payload => {
        const peer = this.getRTCPeerConnection(payload.id1);
        await peer.setRemoteDescription(new RTCSessionDescription(payload.offer));
        if (payload.offer.type === 'offer') {
          this.stream.getTracks().forEach(track => peer.addTrack(track, this.stream));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(new RTCSessionDescription(answer));
          this.socket.emit('RTCSendDescription', {
            id1: this.userId,
            id2: payload.id1,
            roomId: this.$route.params.id,
            offer: answer,
          });
        }
      });
      this.socket.on('RTCSendCandidate', payload => {
        const peer = this.getRTCPeerConnection(payload.id1);
        if (payload.candidate) peer.addIceCandidate(payload.candidate);
      });
      this.updateMedia();
    },
    updateMedia() {
      navigator.getUserMedia(
        {
          audio: this.audio,
          video: this.video,
        },
        async stream => {
          this.$refs['video_' + this.userId][0].srcObject = stream;
          this.stream = stream;
          this.room.members.forEach(async member => {
            if (member.userId === this.userId) return;
            const peer = this.getRTCPeerConnection(member.userId);
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
            const offer = await peer.createOffer();
            await peer.setLocalDescription(new RTCSessionDescription(offer));
            this.socket.emit('RTCSendDescription', {
              id1: this.userId,
              id2: member.userId,
              roomId: this.$route.params.id,
              offer,
            });
          });
        },
        error => {
          console.warn(error);
        },
      );
    },
    getRTCPeerConnection(userId) {
      if (this.peers[userId]) return this.peers[userId];
      this.peers[userId] = new RTCPeerConnection();
      this.peers[userId].ontrack = ({ streams: [stream] }) => (this.$refs['video_' + userId][0].srcObject = stream);
      this.peers[userId].onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(this.peers[userId].connectionState)) {
          if (this.peers[userId]) this.peers[userId].close();
          this.peers[userId] = null;
        }
      };
      this.peers[userId].onicecandidate = e => {
        this.socket.emit('RTCSendCandidate', {
          id1: this.userId,
          id2: userId,
          roomId: this.$route.params.id,
          candidate: e.candidate,
        });
      };
      return this.peers[userId];
    },
  },
  computed: {
    socket: function() {
      return this.$store.state.socket;
    },
  },
  async created() {
    this.$store.dispatch('connectSocket');
    api.getRoom(this.$route.params.id).then(async room => {
      if (!room) {
        this.passwordJoin = Math.floor(Math.random() * 1000000) + '';
        await api.createRoom({ name: 'sampleName', password: this.passwordJoin, id: this.$route.params.id });
        this.connectToRoom();
      } else this.needPassword = room.needPassword;
    });
  },
  beforeDestroy() {
    if (this.socket) this.$store.dispatch('disconnectSocket');
    Object.values(this.peers).forEach(peer => {
      if (!peer) return;
      if (peer[0]) peer[0].close();
      if (peer[1]) peer[1].close();
    });
  },
};
</script>
<style lang="scss" scoped>
.room {
  display: flex;
  .login {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    & > * {
      margin-top: 8px;
    }
    .error {
      color: red;
    }
    .login-button {
      cursor: pointer;
      padding: 4px 16px;
      background: rgb(86, 86, 207);
      color: #fff;
      border-radius: 20px;
    }
  }
  .sidebar {
    height: 100%;
    max-height: 100%;
    width: 300px;
    border-left: 1px solid black;
    display: flex;
    flex-direction: column;
    .tab {
      display: flex;
      border-bottom: 1px solid black;
      div {
        width: 100%;
        cursor: pointer;
        text-align: center;
      }
    }
    .chat {
      width: 100%;
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: space-between;
      overflow: auto;
      .messages {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 20px;
        overflow-y: scroll;
        height: 100%;
        .message {
          width: 100%;
        }
      }
      .input {
        border-top: 1px solid black;
        width: 100%;
        display: flex;
        padding: 20px;
        input {
          width: 100%;
        }
        .send-button {
          cursor: pointer;
          background: blue;
          color: white;
        }
      }
    }
  }
  .playground {
    width: 100%;
    height: 100%;
    position: relative;
    .actions {
      position: absolute;
      bottom: 16px;
      left: 0;
      width: 100%;
      display: flex;
      justify-content: center;
      & > * {
        margin: 0 8px;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 20px;
      }
    }
    .members {
      display: flex;
      flex-wrap: wrap;
      .member {
        width: 320px;
        height: 180px;
        position: relative;
        background: #302c2c;
        margin: 20px;
        video {
          width: 100%;
          height: 100%;
        }
        span {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          text-align: center;
          color: #fff;
        }
      }
    }
  }
}
</style>
