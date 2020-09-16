<script>
export default {
  data: function() {
    return {
      search: '',
    };
  },
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
    <div class="search">Search for room: <input placeholder="Search..." v-model="search" /></div>
    <div class="list">
      <template v-for="room in rooms">
        <div v-if="room.name.includes(search)" class="room" @click="connectToRoom(room.id)" :key="room.id">
          <img
            class="padlock"
            :src="
              room.needPassword ? require('../assets/padlock_locked.png') : require('../assets/padlock_unlocked.png')
            "
          />
          <div class="title">{{ room.name }}</div>
          <div class="subtitle">Status: {{ room.status }}</div>
          <div class="subtitle">Members:</div>
          <div class="users">
            <span v-for="(member, i) in room.members" :key="i">{{ member }}</span>
          </div>
        </div>
      </template>
    </div>
    <div @click="connectToRoom(Math.floor(Math.random() * 1000000))" class="create-room">Create room</div>
  </div>
</template>
<style lang="scss" scoped>
@import '../index.scss';
.rooms {
  .search {
    color: $text;
    font-size: 32px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    input {
      font-size: 20px;
    }
  }
  .list {
    display: flex;
    flex-wrap: wrap;
    @media screen and (max-width: 992px) {
      flex-direction: column;
      justify-content: stretch;
    }
    .room {
      margin: 20px;
      overflow: hidden;
      border-radius: 20px;
      cursor: pointer;
      background: $main;
      color: $text;
      transition: 0.5s;
      box-shadow: 0 0 12px black;
      position: relative;
      min-width: 160px;
      &:hover {
        transform: scale(1.1);
      }
      .title {
        font-size: 32px;
        padding: 4px 12px;
        background: $dark;
        position: relative;
      }
      .subtitle {
        font-size: 24px;
        padding: 4px 12px;
        position: relative;
      }
      .users {
        padding: 0 20px;
        position: relative;
        margin-bottom: 8px;
      }
      .padlock {
        height: 48px;
        position: absolute;
        bottom: 8px;
        right: 8px;
      }
    }
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
