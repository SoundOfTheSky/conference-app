<template>
  <div class="room">
    <div class="login" v-if="!room">
      <input v-model="username" placeholder="Username..." />
      <input v-model="passwordJoin" placeholder="Password for room..." />
      <div class="login-button" @click="connectToRoom">Connect</div>
    </div>
    <template v-else>
      <div class="playground"></div>
      <div class="sidebar">
        <div class="chat">
          <div class="messages">
            <div class="message" v-for="message in messages" :key="message.id">{{ message.text }}</div>
          </div>
          <div class="input">
            <input v-model="chatMessage" />
            <div class="send-button" @click="sendChatMessage">=></div>
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
    };
  },
  methods: {
    connectToRoom() {
      this.socket.emit(
        'joinRoom',
        {
          roomId: this.$route.params.id,
          password: this.passwordJoin,
          username: this.username,
        },
        response => {
          this.room = response;
          this.userId = response.members[response.members.length - 1].userId;
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
      }
    });
    this.socket.on('sendChatMessage', msg => {
      console.log(msg);
      this.messages.push(msg);
    });
  },
};
</script>
<style lang="scss" scoped>
.room {
  .login {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    .login-button {
      cursor: pointer;
      padding: 4px;
    }
  }
  .sidebar {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 300px;
    .chat {
      height: 100%;
      width: 100%;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      .messages {
        display: flex;
        flex-direction: column;
        width: 100%;
        .message {
          width: 100%;
        }
      }
      .input {
        width: 100%;
        display: flex;
        .send-button {
          cursor: pointer;
          background: blue;
          color: white;
        }
      }
    }
  }
}
</style>
