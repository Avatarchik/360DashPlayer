<template>
  <a-scene embedded>
            <a-assets>
              <video id="dashjs" data-dashjs-player src="http://localhost/360DashPlayer/media/2019_Oberwiesenthal/h264/oberwiesenthal.mpd" class="player" controls autoplay webkit-playsinline></video>
            </a-assets>
            <a-videosphere id="videosphere" src="#dashjs"></a-videosphere>
          </a-scene>
 </template>

<script>
import 'aframe'
export default {
  name: "VRDashStreamer",
  mounted: function () {
      
      var playerElement = document.getElementById("dashjs");
      playerElement.play();
  }

};
</script>