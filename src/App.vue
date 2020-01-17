<template>
  <div id="app">
    <HEVCStreamer v-bind:media="media" />
  </div>
</template>

<script>
//import HelloWorld from './components/HelloWorld.vue'
import HEVCStreamer from "./components/HEVCStreamer.vue";

export default {
  name: 'app',
  components: {
    HEVCStreamer
  },
  data() {
    return {
      media: [
       {    
            id: 1,
            omnidirectional : false,
            url : "http://localhost/360DashPlayer/media/2019_Fehrbellin/h265/fehrbellin.mpd",
            playing: false,
            showScene : false
         },
        { 
            id: 2,
            omnidirectional: false,
            url : "http://localhost/360DashPlayer/media/2019_Fuerteventura/h265/fuerteventura.mpd",
            playing: false,
            showScene : false
        }
    ]
    }
  }
}
</script>

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
