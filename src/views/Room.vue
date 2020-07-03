<template>
  <div>
    <v-row justify="center">

      <!-- 接続時の通知など -->
      <v-snackbar
        top
        v-model="snack.display"
        :color="snack.color"
        :timeout="2000"
        class="snack"
      >
        {{ snack.text }}
      </v-snackbar>

      <!-- ビデオ画面 -->
      <v-row dense justify="center">
        <video
          id="local"
          :srcObject.prop="localStream"
          autoplay muted playsinline
          @click="playVideo('local')"
        />
        
        <video
          id="remote"
          :srcObject.prop="remoteStream"
          autoplay playsinline
          @click="playVideo('remote')"
        />
      </v-row>
    </v-row>

    <!-- 読み込みの可視化（ロードバー）--> 
    <v-progress-linear
      v-if="progress"
      indeterminate
      color="green darken-4"
      height="2"
      rounded
    ></v-progress-linear>
     

    <!-- 下タブ -->
    <v-bottom-navigation
      :value="activeBtn"
      fixed
      horizontal
      color="green darken-4"
    >
      <v-row  align="center" justify="center">
        <!-- Master ボタン -->
        <v-btn @click="selectRole('Master')">
          <v-row dense>
            <v-col>
              <v-icon large>mdi-account</v-icon>
              <div class="caption">Master</div>
            </v-col>
          </v-row> 
        </v-btn>

        <!-- Viewer ボタン -->
        <v-btn @click="selectRole('Viewer')">
          <v-row dense>
            <v-col>
              <v-icon large>mdi-account-group-outline</v-icon>
              <div class="caption">Viewer</div>
            </v-col>
          </v-row>
        </v-btn>

        <!-- ビデオ通話停止ボタン -->
        <div v-if="this.localStream">
          <v-btn @click="stopAndSignOut()">
            <v-row dense>
              <v-col>
                <v-icon>mdi-stop-circle</v-icon>
                <div class="caption">停止</div>
              </v-col>
            </v-row>
          </v-btn>
        </div>

        <!-- ミュートボタン -->
        <div v-if="this.localStream">
          <v-btn @click="audioMute()">
            <v-row dense>
              <v-col>
                <v-icon>{{ audioMuteIcon }}</v-icon>
                <div class="caption">{{ audioMuteText }}</div>
              </v-col>
            </v-row>
          </v-btn>
        </div>

        <!-- 映像切替（on off） -->
        <div v-if="this.localStream">
          <v-btn @click="videoSwitch()">
            <v-row dense>
              <v-col>
                <v-icon>{{ videoSwitchIcon }}</v-icon>
                <div class="caption">{{ videoSwitchText }}</div>
              </v-col>
            </v-row>
          </v-btn>
        </div>
      </v-row>
    </v-bottom-navigation>
  </div>
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
      activeBtn: 5,
      isMaster: false,

      // シグナリングサーバに送る情報関係
      signalingClient: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,

      // 音声と映像の状態
      isAudioMute: false,
      isVideoSwitch: false
    }
  },
  computed: {
    audioMuteIcon() {
      return this.isAudioMute ? 'mdi-volume-off' : 'mdi-volume-high'
    },
    audioMuteText() {
      return this.isAudioMute ? 'ミュート解除' : 'ミュート'
    },
    videoSwitchIcon() {
      return this.isVideoSwitch ? 'mdi-video-off' : 'mdi-video'
    },
    videoSwitchText() {
      return this.isVideoSwitch ? 'ON' : 'OFF'
    }
  },
  methods: {
    audioMute() {
      if (this.localStream) {
        const audioTrack = this.localStream.getTracks()[0]
        this.isAudioMute = !this.isAudioMute
        audioTrack.enabled = !this.isAudioMute
        console.log(audioTrack)
      }
    },
    videoSwitch() {
      if (this.localStream) {
        const videoTrack = this.localStream.getTracks()[1]
        this.isVideoSwitch = !this.isVideoSwitch
        videoTrack.enabled = !this.isVideoSwitch
        console.log(videoTrack)
      }
    },
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
video#remote {
  max-width: 200px;
  height: auto;
  position: absolute;
  right: 0px;
  bottom: 56px;
}

video#local {
  max-width: 600px;
  height: auto;
}

</style>

