<template>
  <v-container>
    <v-row justify="center">
      <h1>Video Chat Room</h1>

      <v-snackbar
        top
        v-model="snack.display"
        :color="snack.color"
        :timeout="1000"
        class="snack"
      >
        {{ snack.text }}
      </v-snackbar>

      <!-- 読み込みの可視化（ロードバー）-->
      <v-progress-linear
        v-if="progress"
        indeterminate
        color="info"
        height="15"
        rounded
      ></v-progress-linear>

      <!-- ビデオ設定？ -->
      <video
        id="local"
        :srcObject.prop="localStream"
        autoplay muted playsinline
        @click="playVideo(local)"
      />

      <video
        id="remote"
        :srcObject.prop="remoteStream"
        autoplay playsinline
        @click="playVideo(remote)"
      />

      <v-scroll-y-reverse-transition>
        <!-- 下タブ -->
        <v-bottom-navigation
          :value="activeBtn"
          fixed
          horizontal
          color="orange"
        >
          <v-row align="center" justify="center">
            <v-btn @click="selectRole('Master')">
              <span>Master</span>
              <v-icon large>mdi-account</v-icon>      
            </v-btn>

            <v-btn @click="selectRole('Viewer')">
              <span>Viewer</span>
              <v-icon large>mdi-account-group-outline</v-icon> 
            </v-btn>

            <v-btn @click="stopAndSignOut()">
              <v-icon>mdi-stop-circle</v-icon>
            </v-btn>
          </v-row>
        </v-bottom-navigation>
      </v-scroll-y-reverse-transition>
    </v-row>
  </v-container>
</template>

<script>
import { connectSignalingChannel, generateSignalingClientMaster, generateSignalingClientViewer } from '../aws-webrtc-exports.js'

export default {
  data() {
    return {
      progress: false,
      snack: {
        display: false,
        color: 'info',
        text: null,
      },
      activeBtn: 3,
      isMaster: false,

      // シグナリングサーバに送る情報関係
      signalingClient: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null
    }
  },
  methods: {
    displayInfo(text) {
      this.snack.display = true
      this.snack.text = text
    },
    stopAndSignOut() {
     this.clearConnection()
    },
    selectRole(role) {
      this.isMaster = (role == 'Master')
      this.clearConnection()
      this.startConnect(this.isMaster)
    },
    playVideo(id) {
      this.displayInfo('Starting remote stream.')
      const remoteVideo = document.getElementById(id)
      remoteVideo.play()
    },
    clearConnection() {
      // 接続停止
      if (this.signalingClient) {
        this.signalingClient.close()
        this.peerConnection.close()
      }
      // カメラ停止
      if (this.localStream) {
        let tracks = this.localStream.getTracks()
        tracks.forEach((track) => {
          track.stop()
        })
      }
      this.progress = false
      this.signalingClient = null
      this.localStream = null
      this.remoteStream = null
      this.peerConnection = null
    },
    startConnect: async function(isMaster) {
      const role = isMaster ? 'MASTER' : 'VIEWER'
      this.peerConnection = await connectSignalingChannel(role)
      if (!this.peerConnection) {
        this.displayInfo('Please sign in')
        return
      }
      this.displayInfo('Getting peer connection.')
      this.generateSignalingClient(isMaster)
    },
    generateSignalingClient(isMaster) {
      const mediaConf = {
        audio: true,
        video: {
          width: { min: 320, max: 640 },
          facingMode: {
            exact: "user"
          }
        }
      }
      const generateFunc = isMaster ? generateSignalingClientMaster : generateSignalingClientViewer
      const { signalingClient, scEmitter } = generateFunc(mediaConf, this.peerConnection)
      this.signalingClient = signalingClient

      scEmitter.on('open', (localStream) => {
        this.progress = false
        this.displayInfo('Connected to signaling service.')
        this.localStream = localStream
      });
      scEmitter.on('sdpOffer', () => this.displayInfo('Sending SDP offer.'))
      scEmitter.on('sdpAnswer', () => this.displayInfo('Received SDP answer.'))
      scEmitter.on('icecandidate', () => this.displayInfo('Sending ICE candidate to client.'))
      scEmitter.on('track', (remoteStream) => {
        this.displayInfo('Recieved remote track.')
        this.remoteStream = remoteStream
      })
      scEmitter.on('iceCandidate', () => this.displayInfo('Received ICE candidate from client.'))
      scEmitter.on('close', () => {})
      scEmitter.on('error', () => this.displayInfo('Signaling client error.'))

      const rolename = isMaster ? 'master' : 'viewer'
      this.displayInfo('Starting' + rolename + 'connection.')
      this.signalingClient.open()
      this.progress = true
    }
  }
}
</script>

<style>
div {
  padding: 0;
}

video#local {
  top:2px;
  left:2px;
  width: 20%;
  height: auto;
  position: absolute;
  z-index: 100;
}

video#remote {
  width: 100%;
  height: auto;
  position: relative;
  z-index: 1;
}

.auth div {
  min-width: 100% !important;
  background-color: transparent;
  color: white
}

.snack {
  max-width: 80% !important;
  text-align: center;
}
</style>

