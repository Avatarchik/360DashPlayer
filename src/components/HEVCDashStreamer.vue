<template> 
<mdb-container>
    <mdb-row>
      <mdb-col md="6" v-bind:key="video.id" v-for="video in media.h265">
        <div class="embed-responsive embed-responsive-16by9">
          <video class="embed-responsive-item" data-dashjs-player controls v-bind:src="video.url" webkit-playsinline allowfullscreen></video>
        </div>
      </mdb-col>
    </mdb-row>
  </mdb-container>
</template>
<script src="https://code.jquery.com/jquery-3.4.1.min.js"></script>
<script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>	

<script>
import '@/../node_modules/video.js/dist/video-js.css'
import videojs from 'video.js'
import 'dashjs'
import 'videojs-contrib-dash'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import { mdbContainer, mdbRow, mdbCol } from 'mdbvue';


export default {
    name : "HEVCDashStreamer",
    props: ["media"],
      components: {
    mdbContainer,
    mdbRow,
    mdbCol
  }
}
</script>