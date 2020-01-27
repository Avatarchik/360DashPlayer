<template>
  <mdb-container>
    <mdb-row>
      <mdb-col md="6" v-bind:key="video.id" v-for="video in media.h264">
        <div class="embed-responsive embed-responsive-16by9" style="margin: 10px;">
            <div class="embed-responsive-item">
            <div v-if="is360Video == true">
              <VRDashStreamer></VRDashStreamer>
            </div>
           <div v-else>
                <video
            id="video.id"
            data-dashjs-player
            controls
            webkit-playsinline
            allowfullscreen
            v-bind:src="video.url"
          ></video>
          <div v-if="video.omnidirectional" class="embed-responsive-item">
           <b-button class="float-right " :pressed.sync="is360Video">View in VR</b-button>
          </div> 
           </div>
           </div>     
        </div>
      </mdb-col>
    </mdb-row>
  </mdb-container>
</template>
<script src="https://code.jquery.com/jquery-3.4.1.min.js"></script>
<script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>	

<script>
import "@/../node_modules/video.js/dist/video-js.css";
import videojs from "video.js";
import "dashjs";
import "videojs-contrib-dash";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import { mdbContainer, mdbRow, mdbCol } from "mdbvue";
import VRDashStreamer from "./VRDashStreamer.vue";

export default {
  name: "AVCDashStreamer",
  props: {
     is360Video: {
    default: false,
  },
  media: {
    default: "http://localhost/360DashPlayer/media/2019_Oberwiesenthal/h264/oberwiesenthal.mpd"
  }
  },

  components: {
    mdbContainer,
    mdbRow,
    mdbCol,
    VRDashStreamer
  },
  methods: {
    startVideo : function(video){
      console.log("video: ",video);
      if (video.omnidirectional) {
       this.is360Video = true;
      } else {
        this.is360Video = false;
      }
    }
  }
};
</script>