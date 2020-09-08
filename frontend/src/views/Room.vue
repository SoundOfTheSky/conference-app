<template>
  <div class="room">
    <input v-model="passwordJoin" placeholder="Password..." />
    <div @click="connectToRoom">Connect</div>
  </div>
</template>
<script>
import api from '../api';
import io from 'socket.io-client';
export default {
  data: function() {
    return {
      socket: null,
      peer: null,
      passwordJoin: '',
      room: null,
    };
  },
  methods: {
    connectToRoom() {
      this.socket.emit('joinRoom', { roomId: this.$route.params.id, password: this.passwordJoin, peer: this.peer.id });
    },
  },
  async created() {
    this.socket = io('localhost:80/api');
    api
      .getRoom(this.$route.params.id)
      .then(async room => {
        if (!room) await api.createRoom({ name: 'sampleName', password: '' });
        this.connectToRoom();
      })
      .catch(e => {
        if (e.message === 'Room not found') console.log('need to create room');
      });
  },
};
</script>
<style lang="scss" scoped></style>
