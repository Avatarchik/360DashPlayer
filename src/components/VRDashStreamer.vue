<template>
<div id='vrview'>
 
  <!--
  <a-scene embedded >
    
            <a-assets>
       
          
            </a-assets>
           <a-videosphere id="videosphere" src="#dashjs"></a-videosphere>
          </a-scene>-->
</div>

          
 </template>
<script src="https://storage.googleapis.com/vrview/2.0/build/vrview.min.js"></script>

<script>
import 'aframe'
export default {
  name: "VRDashStreamer",
  mounted: function () {
    window.addEventListener('load', onVrViewLoad);

function onVrViewLoad() {
  // Selector '#vrview' finds element with id 'vrview'.
  var vrView = new VRView.Player('#vrview', {
    video: 'http://localhost/360DashPlayer/media/2019_Oberwiesenthal/h264/oberwiesenthal.mpd',
    is_stereo: true
  });
}
  }

};
</script>