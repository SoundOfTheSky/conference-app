<script>
import api from '../api';
import webRTC from '../utils/webRTC.js';
import Utils from '../utils';
import config from '../config';
export default {
  data: function() {
    return {
      room: null,
      members: {},
      chatMessage: '',
      messages: [],
      sideBarTab: 'chat',
      audio: true,
      video: false,
      enabledVideo: {},
      deviceSettingsOpen: false,
      deviceSettings: {
        selectedAudioinput: localStorage.getItem('selectedAudioinput'),
        selectedVideoinput: localStorage.getItem('selectedVideoinput'),
        autoGainControl: !(localStorage.getItem('autoGainControl') === 'false'),
        echoCancellation: !(localStorage.getItem('echoCancellation') === 'false'),
        noiseSuppression: !(localStorage.getItem('noiseSuppression') === 'false'),
      },
      devices: {
        audioinput: [],
        audiooutput: [],
        videoinput: [],
      },
      loginForm: {
        avatar: localStorage.getItem('avatar') || '',
        name: '',
        username: localStorage.getItem('username') || '',
        password: '',
        visible: true,
        needPassword: true,
        needCreation: false,
        loading: true,
        loginError: '',
      },
      webRTC: null,
    };
  },
  methods: {
    // send room settings
    settingsChange() {
      this.socket.emit('changeRoomSettings', this.room);
    },
    // connect to existing room and register all events
    connectToRoom() {
      this.loginForm.loading = true;
      this.socket.emit(
        'joinRoom',
        {
          roomId: this.$route.params.id,
          password: this.loginForm.password,
          username: this.loginForm.username,
        },
        response => {
          this.loginForm.loading = false;
          if (!response) return (this.loginForm.loginError = 'But nobody came...');
          if (response.error) return (this.loginForm.loginError = response.error);
          localStorage.setItem('avatar', this.loginForm.avatar);
          localStorage.setItem('username', this.loginForm.username);
          this.roomChange(response);
          this.socket.on('roomChange', this.roomChange);
          this.updateMedia();
        },
      );
    },
    // create room while logging in
    createRoom() {
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
    // send message
    sendChatMessage() {
      const data = {
        text: this.chatMessage,
        username: this.loginForm.username,
      };
      this.webRTC.broadcast({
        event: 'chatMessage',
        data,
      });
      this.messages.push(data);
      this.chatMessage = '';
      this.$nextTick(function() {
        this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
      });
    },
    // update all data about room. Includes users joining and leaving
    roomChange(room) {
      this.room = room;
      const memberIds = this.room.members.map(member => member.socketId);
      Object.keys(this.members).forEach(key => {
        const i = memberIds.indexOf(key);
        if (i === -1) delete this.members[key];
        else memberIds.splice(i, 1);
      });
      memberIds.forEach(memberId => (this.members[memberId] = {}));
      this.members[this.socket.id] = {
        avatar: this.loginForm.avatar,
        video: this.video,
      };
    },
    // update user devices (micro, video)
    async updateDevices() {
      this.devices = {
        audioinput: [],
        audiooutput: [],
        videoinput: [],
      };
      const devices = await navigator.mediaDevices.enumerateDevices();
      devices.forEach(device => this.devices[device.kind].push(device));
      if (!this.devices.audioinput.length) this.audio = undefined;
      if (!this.devices.videoinput.length) this.video = undefined;
    },
    registerWebRTC(stream) {
      this.webRTC = new webRTC(this.socket, config.RTCConfig);
      this.webRTC.setStream(stream);
      this.webRTC.on('statusChange', payload => {
        this.members = {
          ...this.members,
          [payload.socketId]: {
            ...this.members[payload.socketId],
            connectionStatus: payload.status,
          },
        };
        if (payload.status === 'connected') {
          this.webRTC.send(payload.socketId, { event: 'avatar', avatar: this.loginForm.avatar });
          this.webRTC.send(payload.socketId, { event: 'toggleAudio', audio: this.audio });
          this.webRTC.send(payload.socketId, { event: 'toggleVideo', video: this.video });
        }
      });
      this.webRTC.on('message', payload => {
        switch (payload.event) {
          case 'chatMessage':
            this.messages.push(payload.data);
            this.$nextTick(function() {
              this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
            });
            break;
          case 'avatar':
            this.members = {
              ...this.members,
              [payload.socketId]: {
                ...this.members[payload.socketId],
                avatar: payload.avatar || require('../assets/user.png'),
              },
            };
            break;
          case 'toggleVideo':
            this.members = {
              ...this.members,
              [payload.socketId]: {
                ...this.members[payload.socketId],
                video: payload.video,
              },
            };
            break;
          case 'toggleAudio':
            this.members = {
              ...this.members,
              [payload.socketId]: {
                ...this.members[payload.socketId],
                audio: payload.audio,
              },
            };
            break;
        }
      });
      this.webRTC.on('stream', data => (this.$refs['video_' + data.socketId][0].srcObject = data.stream));
      this.room.members.forEach(
        async member => member.socketId !== this.socket.id && this.webRTC.getRTCPeerConnection(member.socketId),
      );
    },
    // get user media and connect to everyone
    async updateMedia() {
      // Get user devices
      await this.updateDevices();
      const constraints = {};
      if (this.devices.audioinput.length) {
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
      if (this.devices.videoinput.length) {
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
      localStorage.setItem('selectedAudioinput', this.deviceSettings.selectedAudioinput);
      localStorage.setItem('selectedVideoinput', this.deviceSettings.selectedVideoinput);
      localStorage.setItem('autoGainControl', this.deviceSettings.autoGainControl);
      localStorage.setItem('echoCancellation', this.deviceSettings.echoCancellation);
      localStorage.setItem('noiseSuppression', this.deviceSettings.noiseSuppression);
      // Restart user stream with new settings
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getAudioTracks()[0].enabled = this.audio;
        stream.getVideoTracks()[0].enabled = this.video;
        this.$refs['video_' + this.socket.id][0].srcObject = stream;
        if (!this.webRTC) this.registerWebRTC(stream);
        else this.webRTC.setStream(stream);
        this.updateDevices();
      } catch (e) {
        this.audio = undefined;
        this.video = undefined;
        console.log('No audio/video permission', e);
        if (!this.webRTC) this.registerWebRTC();
      }
    },
    // toggle audio and send info about it to everyone
    toggleAudio() {
      if (!this.webRTC?.stream?.getAudioTracks().length) return;
      this.audio = !this.audio;
      this.webRTC.stream.getAudioTracks()[0].enabled = this.audio;
      this.webRTC.broadcast({ event: 'toggleAudio', audio: this.audio });
      this.members[this.socket.id].audio = this.audio;
    },
    // toggle video and send info about it to everyone
    toggleVideo() {
      if (!this.webRTC?.stream?.getVideoTracks().length) return;
      this.video = !this.video;
      this.webRTC.stream.getVideoTracks()[0].enabled = this.video;
      this.webRTC.broadcast({ event: 'toggleVideo', video: this.video });
      this.members[this.socket.id].video = this.video;
    },
    // On avatar drop while login
    async dropAvatar(e) {
      const image = await Utils.fileToBase64(e.dataTransfer.files[0]);
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
    api.getRoom(this.$route.params.id).then(async room => {
      this.loginForm.loading = false;
      if (!room) this.loginForm.needCreation = true;
      else this.loginForm.needPassword = room.needPassword;
    });
  },
  beforeDestroy() {
    this.webRTC.closeAllPeers();
    this.webRTC.stopStream();
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
          <template v-for="member in room.members">
            <div v-if="member.socketId === socket.id" class="member" :key="member.socketId">
              <img :src="members[member.socketId].avatar || require('../assets/user.png')" class="avatar" />
              <video v-show="members[member.socketId].video" autoplay muted :ref="'video_' + member.socketId" />
              <div class="username">
                <div>{{ member.username }}</div>
                <div class="skew"></div>
              </div>
            </div>
            <div v-else class="member" :key="member.socketId">
              <img :src="members[member.socketId].avatar" class="avatar" />
              <video v-show="members[member.socketId].video" autoplay :ref="'video_' + member.socketId" />
              <div class="username">
                <div>{{ member.username }}</div>
                <div class="skew"></div>
              </div>
              <transition name="fade">
                <div
                  class="connectionStatus"
                  v-if="members[member.socketId].connectionStatus !== 'connected' && members[member.socketId].avatar"
                >
                  {{
                    members[member.socketId].connectionStatus
                      ? members[member.socketId].connectionStatus === 'connected'
                        ? 'LOADING AVATAR'
                        : members[member.socketId].connectionStatus.toUpperCase()
                      : 'INITIATING'
                  }}
                </div>
              </transition>
            </div>
          </template>
        </div>
        <div class="actions">
          <template v-if="deviceSettingsOpen">
            <div class="line">
              <select v-model="deviceSettings.selectedAudioinput" @change="updateMedia">
                <option :value="null">Auto</option>
                <option v-for="device in devices.audioinput" :value="device.deviceId" :key="device.deviceId">{{
                  device.label
                }}</option>
              </select>
              <select v-model="deviceSettings.selectedVideoinput" @change="updateMedia">
                <option :value="null">Auto</option>
                <option v-for="device in devices.videoinput" :value="device.deviceId" :key="device.deviceId">{{
                  device.label
                }}</option>
              </select>
            </div>
            <div class="line">
              <label
                ><input type="checkbox" v-model="deviceSettings.autoGainControl" @change="updateMedia" />Auto gain
                control</label
              >
              <label
                ><input type="checkbox" v-model="deviceSettings.echoCancellation" @change="updateMedia" />Echo
                cancellation</label
              >
              <label
                ><input type="checkbox" v-model="deviceSettings.noiseSuppression" @change="updateMedia" />Noise
                suppression</label
              >
            </div>
            <div class="line button" @click="deviceSettingsOpen = false">Close settings</div>
          </template>
          <div class="line" v-else>
            <div
              v-if="audio !== undefined"
              @click="toggleAudio"
              :style="{ 'text-decoration': audio ? 'unset' : 'line-through' }"
              class="button"
            >
              Audio
            </div>
            <div
              v-if="video !== undefined"
              @click="toggleVideo"
              :style="{ 'text-decoration': video ? 'unset' : 'line-through' }"
              class="button"
            >
              Video
            </div>
            <div @click="$router.push({ path: '../rooms' })" class="button">Disconnect</div>
            <div @click="deviceSettingsOpen = true" class="button">Settings</div>
          </div>
        </div>
      </div>
      <div class="sidebar">
        <div class="tab">
          <div @click="sideBarTab = 'chat'" :style="{ background: sideBarTab === 'chat' ? '#858585' : 'unset' }">
            Chat
          </div>
          <div
            @click="sideBarTab = 'settings'"
            :style="{ background: sideBarTab === 'settings' ? '#858585' : 'unset' }"
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
          <div>
            <label
              ><input type="checkbox" v-model="room.visible" @change="settingsChange" />Is room visible in rooms
              list</label
            >
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<style lang="scss" scoped>
@import '../index.scss';
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
.room {
  display: flex;
  color: $text;
  .login {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    .dropzone {
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
    width: 300px;
    background: $dark;
    border-left: 1px solid black;
    display: flex;
    flex-direction: column;
    transition: 0.5s;
    z-index: 2;
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
      overflow: hidden;
      .messages {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 20px;
        overflow-y: auto;
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
    @media screen and (max-width: 992px) {
      height: calc(100% - 32px);
      position: fixed;
      top: 0;
      right: 0;
      transform: translateX(calc(100% - 16px));
      width: 90vw;
      &:hover {
        transform: translateX(0);
      }
    }
  }
  .playground {
    width: 100%;
    height: 100%;
    position: relative;
    .actions {
      position: absolute;
      bottom: 0;
      left: 50%;
      min-width: 50%;
      max-width: 90%;
      transform: translateX(-50%);
      background: $main;
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
      border-radius: 20px 20px 0 0;
      .button {
        transition: 0.5s;
        cursor: pointer;
        &:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      }
      .line {
        padding: 8px;
        display: flex;
        justify-content: space-evenly;
        flex-wrap: wrap;
        & > * {
          flex: auto;
          text-align: center;
          max-width: 40%;
        }
      }
      .line.button {
        border-top: 1px solid black;
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
        .username {
          display: flex;
          position: absolute;
          bottom: 0;
          left: 0;
          text-align: center;
          color: #fff;
          font-size: 18px;
          div:first-child {
            background: $dark;
            padding: 2px 16px;
          }
          .skew {
            background: $dark;
            width: 25px;
            height: 25px;
            border-right: 8px solid rgb(255, 145, 0);
            transform: skewX(45deg);
            transform-origin: bottom;
          }
        }
        .connectionStatus {
          width: 100%;
          height: 100%;
          position: absolute;
          display: grid;
          place-items: center;
          background: rgba(0, 0, 0, 0.8);
        }
      }
      @media screen and (max-width: 992px) {
        flex-direction: column;
        align-items: center;
        .member {
          width: 90%;
          margin: 20px 12px 0 0;
        }
      }
    }
  }
}
</style>
