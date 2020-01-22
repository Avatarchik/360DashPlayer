<template>


  <a-scene v-on:click="startVideo()">
            <a-assets>
               <video data-dashjs-player id="dashjs" class="player" webkit-playsinline></video>
          
            </a-assets>
           <a-videosphere id="videosphere" src="#dashjs"></a-videosphere>
          </a-scene>

          
 </template>

<script>
import 'aframe'
import videojs from "video.js";
import "dashjs";
import "videojs-contrib-dash";
export default {
  name: "VRDashStreamer",
  mounted : function(){

  },
  methods: {
    startVideo: function(){
       var player = videojs('dashjs')
    player.ready(function () {
      player.src({
        src: 'http://localhost/360DashPlayer/media/2019_Oberwiesenthal/h264/oberwiesenthal.mpd',
        type: 'application/dash+xml'
      })
      player.play()
    })
    }
  }

};
</script>