//import HelloWorld from './components/HelloWorld.vue'
import HEVCDashStreamer from "./components/HEVCDashStreamer.vue";
import AVCDashStreamer from "./components/AVCDashStreamer.vue";

export default {
    name: 'app',
    components: {
        HEVCDashStreamer,
        AVCDashStreamer
    },
    data() {
        return {
            media: {
                h265: [
                    {
                        id: 1,
                        omnidirectional: false,
                        url: "http://localhost/360DashPlayer/media/2019_Fehrbellin/h265/fehrbellin.mpd",
                        playing: false,
                        showScene: false
                    },
                    {
                        id: 2,
                        omnidirectional: false,
                        url: "http://localhost/360DashPlayer/media/2019_Fuerteventura/h265/fuerteventura.mpd",
                        playing: false,
                        showScene: false
                    }
                ],
                h264: [
                    {
                        id: 1,
                        omnidirectional: false,
                        url: "http://localhost/360DashPlayer/media/2019_Fehrbellin/h264/fehrbellin.mpd",
                        playing: false,
                        showScene: false
                    },
                    {
                        id: 2,
                        omnidirectional: false,
                        url: "http://localhost/360DashPlayer/media/2019_Fuerteventura/h264/fuerteventura.mpd",
                        playing: false,
                        showScene: false
                    }

                ]
            }
        }
    },
            methods : {
            isHEVCSupported: function() {
                let video;

                if (!video) {
                    video = document.createElement('video')
                }

                let h265 = video.canPlayType('video/mp4; codecs="hev1.1.6.L186.80"');
                if (h265 === 'probably' || h265 === 'maybe') {
                    //console.log("HEVC is supported.");
                    return true;
                }
                //console.log("H.265/HEVC is not supported. Use H.264/AVC.")
                return false;
            },
            is360Stream: function(stream) {
                // console.log(stream.omnidirectional);
                if (stream.omnidirectional) {
                    return true;
                } else {
                    return false;
                }

            }
        }
    }