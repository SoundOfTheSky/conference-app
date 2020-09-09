<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link>
      <router-link to="/rooms">Rooms</router-link>
    </div>
    <router-view id="view" />
  </div>
</template>
<style lang="scss">
html,
body,
#app {
  height: 100%;
}
body {
  margin: 0;
}
* {
  box-sizing: border-box;
}
a {
  text-decoration: none;
  color: unset;
}
#nav {
  position: fixed;
  height: 100vh;
  background: #302c2c;
  color: #dfdfdf;
  width: 64px;
  a {
    display: block;
    width: 100%;
    padding: 4px;
    transition: 0.5s;
    &:hover {
      background: #423d3d;
    }
  }
}
#view {
  margin-left: 64px;
  height: 100%;
}
.router-is-active {
  background: #423d3d;
}
</style>
