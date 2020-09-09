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
      video: false,
      needPassword: true,
      loginError: '',
    };
  },
  methods: {
    settingsChange() {
      this.socket.emit('changeRoomSettings', this.room);
    },
    connectToRoom() {
      if (!this.socket) return (this.loginError = 'Try again...');
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
      this.socket.on('sendChatMessage', msg => {
        this.messages.push(msg);
        this.$nextTick(function() {
          this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
        });
      });
      this.socket.on('changeRoomSettings', room => {
        console.log('settingsChange');
        this.room = room;
      });
      this.updateMedia();
    },
    updateMedia() {
      navigator.getUserMedia(
        {
          audio: true,
          video: {
            width: { min: 1024, max: 1920 },
            height: { min: 776, max: 1080 },
          },
        },
        stream => {
          this.$refs['video_' + this.userId][0].srcObject = stream;
        },
        error => {
          console.warn(error.message);
        },
      );
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
        this.passwordJoin = Math.floor(Math.random() * 1000000);
        await api.createRoom({ name: 'sampleName', password: this.passwordJoin, id: this.$route.params.id });
        this.connectToRoom();
      } else this.needPassword = room.needPassword;
    });
  },
  beforeDestroy() {
    if (this.socket) this.$store.dispatch('disconnectSocket');
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
      .member {
        width: 320px;
        height: 180px;
        position: relative;
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
