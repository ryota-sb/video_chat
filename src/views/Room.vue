<template>
  <v-container>
    <v-row justify="center">
      <v-snackbar
        top
        v-model="snack.display"
        :color="snack.color"
        :timeout="2000"
        class="snack"
      >
        {{ snack.text }}
      </v-snackbar>

     <!-- 読み込みの可視化（ロードバー）-->
      <v-progress-linear
        v-if="progress"
        indeterminate
        color="green darken-4"
        height="10"
        rounded
      ></v-progress-linear>

      <!-- ビデオ設定？ -->
      <v-row dense justify="center">
        <v-col :cols="5">
          <v-card>
            <v-toolbar dense>
              <v-toolbar-title>
                Master
              </v-toolbar-title>  
            </v-toolbar>
            <video
              id="local"
              :srcObject.prop="localStream"
              autoplay muted playsinline
              @click="playVideo('local')"
            />
          </v-card>
        </v-col>
        
        <v-col :cols="5">
          <v-card>
            <v-toolbar dense>
              <v-toolbar-title>
                Viewer
              </v-toolbar-title>  
            </v-toolbar>
            <video
              id="remote"
              :srcObject.prop="remoteStream"
              autoplay playsinline
              @click="playVideo('remote')"
            />
          </v-card>
        </v-col>
      </v-row>
    </v-row>

    <!-- 下タブ -->
    <v-bottom-navigation
      :value="activeBtn"
      fixed
      horizontal
      color="green darken-4"
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
        color: 'green darken-4',
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
      this.displayInfo('リモートストリームを開始します')
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
        this.displayInfo('サインインしてください')
        return
      }
      this.displayInfo('ピア接続を取得しています')
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
        this.displayInfo('シグナリングサービスに接続されています')
        this.localStream = localStream
      });
      scEmitter.on('sdpOffer', () => this.displayInfo('SDP offerの送信'))
      scEmitter.on('sdpAnswer', () => this.displayInfo('SDP answerを受け取りました'))
      scEmitter.on('icecandidate', () => this.displayInfo('ICE candidateをクライアントに送信しています'))
      scEmitter.on('track', (remoteStream) => {
        this.displayInfo('Recieved remote track.')
        this.remoteStream = remoteStream
      })
      scEmitter.on('iceCandidate', () => this.displayInfo('クライアントからICE candidateを受け取りました'))
      scEmitter.on('close', () => {})
      scEmitter.on('error', () => this.displayInfo('クライアントエラーの通知'))

      const rolename = isMaster ? 'master' : 'viewer'
      this.displayInfo('Starting' + rolename + 'connection.')
      this.signalingClient.open()
      this.progress = true
    }
  }
}
</script>

<style>
video#local {
  width: 100%;
  height: auto;
}

video#remote {
  width: 100%;
  height: auto;
}
</style>

