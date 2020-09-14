<script>
import api from '../api';
import * as webRTC from '../utils/webRTC.js';
import { toBase64 } from '../utils';
export default {
  data: function() {
    return {
      room: null,
      chatMessage: '',
      messages: [],
      sideBarTab: 'chat',
      audio: true,
      video: false,
      deviceSettings: {
        selectedAudioinput: localStorage.getItem('selectedAudioinput'),
        selectedVideoinput: localStorage.getItem('selectedVideoinput'),
        autoGainControl: localStorage.getItem('autoGainControl') || true,
        echoCancellation: localStorage.getItem('echoCancellation') || true,
        noiseSuppression: localStorage.getItem('noiseSuppression') || true,
      },
      devices: {
        audioinput: [],
        audiooutput: [],
        videoinput: [],
      },
      loginForm: {
        avatar: localStorage.getItem('avatar'),
        name: '',
        username: localStorage.getItem('username'),
        password: '',
        visible: true,
        needPassword: true,
        needCreation: false,
        loading: true,
        loginError: '',
      },
    };
  },
  methods: {
    settingsChange() {
      this.socket.emit('changeRoomSettings', this.room);
    },
    connectToRoom() {
      if (!this.socket) this.$store.dispatch('connectSocket');
      this.loginForm.loading = true;
      this.socket.emit(
        'joinRoom',
        {
          roomId: this.$route.params.id,
          password: this.loginForm.password,
          username: this.loginForm.username,
          avatar: this.loginForm.avatar,
        },
        response => {
          this.loginForm.loading = false;
          if (!response) return (this.loginForm.loginError = 'But nobody came...');
          if (response.error) return (this.loginForm.loginError = response.error);
          this.room = response;
          this.registerEvents();
        },
      );
    },
    createRoom() {
      if (!this.socket) this.$store.dispatch('connectSocket');
      this.loginForm.loading = true;
      api
        .createRoom({
          name: this.loginForm.name,
          password: this.loginForm.password,
          id: this.$route.params.id,
          visible: this.loginForm.visible,
        })
        .then(response => {
          this.loginForm.loading = false;
          if (!response) return (this.loginForm.loginError = 'But nobody came...');
          if (response.error) return (this.loginForm.loginError = response.error);
          this.connectToRoom();
        });
    },
    sendChatMessage() {
      this.socket.emit('sendChatMessage', {
        roomId: this.$route.params.id,
        text: this.chatMessage,
        username: this.loginForm.username,
      });
      this.chatMessage = '';
    },
    registerEvents() {
      this.socket.on('sendChatMessage', msg => {
        this.messages.push(msg);
        this.$nextTick(function() {
          this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
        });
      });
      this.socket.on('roomChange', room => {
        this.room = room;
      });
      this.updateMedia();
    },
    async updateDevices() {
      this.devices = {
        audioinput: [],
        audiooutput: [],
        videoinput: [],
      };
      const devices = await navigator.mediaDevices.enumerateDevices();
      devices.forEach(device => this.devices[device.kind].push(device));
    },
    onNewStream(socketId, stream) {
      this.$refs['video_' + socketId][0].srcObject = stream;
    },
    onStreamStop(socketId) {
      console.log('stream stopped: ' + socketId);
    },
    async updateMedia() {
      webRTC.closeAllPeers();
      webRTC.stopStream();
      await this.updateDevices();
      const constraints = {};
      if (this.audio && this.devices.audioinput.length) {
        let deviceId = this.deviceSettings.selectedAudioinput;
        if (!this.devices.audioinput.find(el => el.deviceId === deviceId)) {
          const defaultDevice = this.devices.audioinput.find(el => el.deviceId === 'default');
          if (defaultDevice) deviceId = defaultDevice.deviceId;
          else deviceId = this.devices.audioinput[0].deviceId;
        }
        constraints.audio = {
          deviceId: deviceId,
          autoGainControl: this.deviceSettings.autoGainControl,
          echoCancellation: this.deviceSettings.echoCancellation,
          noiseSuppression: this.deviceSettings.noiseSuppression,
        };
      }
      if (this.video && this.devices.videoinput.length) {
        let deviceId = this.deviceSettings.selectedVideoinput;
        if (!this.devices.videoinput.find(el => el.deviceId === deviceId)) {
          const defaultDevice = this.devices.videoinput.find(el => el.deviceId === 'default');
          if (defaultDevice) deviceId = defaultDevice.deviceId;
          else deviceId = this.devices.videoinput[0].deviceId;
        }
        constraints.video = {
          deviceId: deviceId,
          width: { min: 256, ideal: 1280, max: 1920 },
          height: { min: 144, ideal: 720, max: 1080 },
          frameRate: 30,
        };
      }
      console.log('Set constraints: ', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.$refs['video_' + this.socket.id][0].srcObject = stream;
      webRTC.register(this.socket, stream, this.onNewStream, this.onStreamStop);
      this.room.members.forEach(
        async member => member.socketId !== this.socket.id && webRTC.connectToUser(member.socketId),
      );
    },
    toggleAudio() {
      this.audio = !this.audio;
      this.updateMedia();
    },
    toggleVideo() {
      this.video = !this.video;
      this.updateMedia();
    },
    async dropAvatar(e) {
      const image = await toBase64(e.dataTransfer.files[0]);
      if (image.length * 0.75 > 1024 * 1024 * 8)
        return (this.loginForm.loginError = 'File size is too big. It must be 8mb or less.');
      this.loginForm.avatar = image;
    },
  },
  computed: {
    socket: function() {
      return this.$store.state.socket;
    },
  },
  async created() {
    this.loginForm.loading = true;
    this.$store.dispatch('connectSocket');
    api.getRoom(this.$route.params.id).then(async room => {
      this.loginForm.loading = false;
      if (!room) this.loginForm.needCreation = true;
      else this.loginForm.needPassword = room.needPassword;
    });
  },
  beforeDestroy() {
    if (this.socket) this.$store.dispatch('disconnectSocket');
    webRTC.closeAllPeers();
    webRTC.stopStream();
  },
};
</script>
<template>
  <div class="room">
    <div class="login" v-if="!room">
      <div v-if="loginForm.loading">Loading...</div>
      <template v-else>
        <template v-if="loginForm.needCreation">
          <img
            class="dropzone avatar"
            :src="loginForm.avatar || require('../assets/user.png')"
            @drop.prevent="dropAvatar"
            @dragover.prevent
          />
          <input v-model="loginForm.username" placeholder="Username" />
          <input v-model="loginForm.name" placeholder="Name of room" />
          <input v-model="loginForm.password" placeholder="Password for room" />
          <label><input type="checkbox" v-model="loginForm.visible" />Is room visible in rooms list</label>
          <div class="login-button" @click="createRoom">Connect</div>
        </template>
        <template v-else>
          <img
            class="dropzone avatar"
            :src="loginForm.avatar || require('../assets/user.png')"
            @drop.prevent="dropAvatar"
            @dragover.prevent
          />
          <input v-model="loginForm.username" placeholder="Username..." />
          <input v-if="loginForm.needPassword" v-model="loginForm.password" placeholder="Password for room..." />
          <div class="login-button" @click="connectToRoom">Connect</div>
        </template>
        <div class="error">{{ loginForm.loginError }}</div>
      </template>
    </div>
    <template v-else>
      <div class="playground">
        <div class="members">
          <div class="member" v-for="member in room.members" :key="member.socketId">
            <img :src="member.avatar" class="avatar" />
            <video autoplay :muted="member.socketId === socket.id" :ref="'video_' + member.socketId" />
            <span> {{ member.username }}</span>
          </div>
        </div>
        <div class="actions">
          <div v-if="audio !== undefined" @click="toggleAudio" :style="{ background: audio ? 'green' : 'red' }">
            Audio
          </div>
          <div v-if="video !== undefined" @click="toggleVideo" :style="{ background: video ? 'green' : 'red' }">
            Video
          </div>
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
    .dropzone {
      width: 128px;
      height: 128px;
    }
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
          position: absolute;
        }
        .avatar {
          position: absolute;
          height: 180px;
          left: 50%;
          transform: translateX(-50%);
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
