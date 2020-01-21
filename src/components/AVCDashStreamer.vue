<template>
  <mdb-container>
    <mdb-row>
      <mdb-col md="6" v-bind:key="video.id" v-for="video in media.h264">
        <div v-if="is360Video(video)" class="embed-responsive embed-responsive-16by9" style="margin: 10px;">
            <video
            class="embed-responsive-item"
            data-dashjs-player
            controls
            v-bind:src="video.url"
            webkit-playsinline
            allowfullscreen
            v-on:click="start360Video"
          ></video>
            <div v-if="is360Video == true">
                <VRDashStreamer class="embed-responsive-item" ></VRDashStreamer>
            </div>
        </div>
        <div v-else class="embed-responsive embed-responsive-16by9" style="margin: 10px;">
          <video
            class="embed-responsive-item"
            data-dashjs-player
            controls
            v-bind:src="video.url"
            webkit-playsinline
            allowfullscreen
          ></video>
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
  mounted : function(){
    is360Video = false;
  },
  methods: {
    is360Video: function(video) {
      if (video.omnidirectional) {
        console.log("video: ",video.omnidirectional);
        return true;
      } else {
         console.log("video: ",video.omnidirectional);
        return false;
      }
    },
    start360Video : function(){
      console.log("Start 360 Video");
    }
  }
};
</script>