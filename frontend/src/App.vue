<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link>
      <router-link to="/rooms">Rooms</router-link>
    </div>
    <div id="view_wrapper">
      <router-view />
    </div>
  </div>
</template>
<style lang="scss">
@import './index.scss';
html,
body,
#app {
  min-height: 100vh;
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
  background: $dark;
  color: $text;
  width: 64px;
  left: 0;
  z-index: 10;
  a {
    display: block;
    width: 100%;
    padding: 4px;
    transition: 0.5s;
    &:hover {
      background: $main;
    }
  }
  @media screen and (max-width: 992px) {
    bottom: 0;
    display: flex;
    height: 32px;
    width: 100vw;
    a {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
#view_wrapper {
  margin-left: 64px;
  height: 100vh;
  overflow: hidden;
  @media screen and (max-width: 992px) {
    margin-left: 0;
    height: calc(100vh - 32px);
  }
  > * {
    background: $darker;
    height: 100%;
    overflow-y: auto;
  }
}
.router-is-active {
  background: $main;
}
</style>
