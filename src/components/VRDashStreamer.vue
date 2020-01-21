<template>


  <a-scene >
            <a-assets>
               <video data-dashjs-player id="dashjs" class="player" src="http://localhost/360DashPlayer/media/2019_Oberwiesenthal/h264/oberwiesenthal.mpd" controls autoplay="" webkit-playsinline></video>
          
            </a-assets>
           <a-videosphere id="videosphere" src="#dashjs"></a-videosphere>
          </a-scene>

          
 </template>

<script>
import 'aframe'

export default {
  name: "VRDashStreamer",
  mounted : function(){

  }

};
</script>