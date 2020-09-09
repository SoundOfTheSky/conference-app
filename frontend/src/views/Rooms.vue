<script>
export default {
  methods: {
    connectToRoom(roomId) {
      this.$router.push({ path: 'room/' + roomId });
    },
  },
  computed: {
    rooms: function() {
      return this.$store.state.rooms || [];
    },
  },
  created() {
    this.$store.dispatch('loadRooms');
  },
};
</script>
<template>
  <div class="rooms">
    <div class="room" v-for="room in rooms" @click="connectToRoom(room.id)" :key="room.id">
      {{ room.id + ' ' + room.name }}
    </div>
    <div @click="connectToRoom(Math.floor(Math.random() * 1000000))" class="create-room">Создать комнату</div>
  </div>
</template>
<style lang="scss" scoped>
.rooms {
  display: flex;
  flex-direction: column;
  height: 100%;
  .room {
    width: 100%;
    text-align: center;
    cursor: pointer;
  }
  .create-room {
    width: 100%;
    text-align: center;
    cursor: pointer;
    background: rgb(92, 103, 167);
    color: #fff;
    border-radius: 20px;
    padding: 8px;
  }
}
</style>
