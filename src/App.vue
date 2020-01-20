<template>
  <div id="app">
    <h1 style="margin: 10px;">Meine Videos</h1>
    <div v-if="isHEVCSupported()">
    <HEVCDashStreamer v-bind:media="media" />
    </div>
    <div v-else>
      <AVCDashStreamer v-bind:media="media" />
    </div>
  </div>
</template>

<script src="./App.js"></script>	

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
