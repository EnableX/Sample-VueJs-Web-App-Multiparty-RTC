<template>
  <div class="container-fluid">
    <div class="col-md-12">
      <div class="video_container_div">
        <div class="row">
          <div class="col-lg-3 col-md-3 col-sm-12">
            <div id="local_video_div"></div>
          </div>
          <div class="col-lg-9 col-md-9 col-sm-9" id="multi_video_container_div"></div>
        </div>
      </div>
      <div class="row" id="controls-div">
        <div class="controls" id="controls">
          <img
            v-bind:src="[isAudioMuted ? '/img/mute-mike.png' : '/img/mike.png']"
            class="cus_img_icon icon-confo-mute actions"
            @click="audioToggle"
            v-bind:title="[isAudioMuted ? 'Un-mute audio' : 'Mute audio']"
          />
          <img
            class="cus_img_icon icon-confo-video-mute actions"
            v-bind:src="[isVideoMuted ? '/img/mute-video.png' : '/img/video.png']"
            v-bind:title="[isVideoMuted ? 'Un-mute video' : 'Mute video']"
            @click="videoToggle"
          />
          <img
            src="/img/end-call.png"
            class="cus_img_icon end_call actions"
            title="End call"
            @click="endCall"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Api from "../Api";
export default {
  name: "room",
  data() {
    return {
      SUPPORT_URL: "https://developer.enablex.io",
      loaded: false,
      localStream: null,
      room: null,
      username: null,
      isVideoMuted: false,
      isAudioMuted: false,
      options: {
        attachMode: "",
        player: {
          autoplay: "",
          name: "",
          nameDisplayMode: "",
          frameFitMode: "bestFit",
          skin: "classic",
          class: "player_mode",
          aspectRatio: "",
          volume: 0,
          media: "",
          loader: {
            show: false,
            url: "/img/loader.gif",
            style: "default",
            class: ""
          },
          backgroundImg: "/img/player-bg.gif"
        },
        toolbar: {
          displayMode: "auto",
          autoDisplayTimeout: 0,
          position: "top",
          skin: "default",
          iconset: "default",
          class: "",
          buttons: {
            play: false,
            share: false,
            mic: false,
            resize: false,
            volume: false,
            mute: false,
            record: false,
            playtime: false,
            zoom: false
          },
          branding: {
            display: false,
            clickthru: "https://www.enablex.io",
            target: "new",
            logo: "/img/enablex.png",
            title: "EnableX",
            position: "right"
          }
        }
      },
      config: {
        audio: true,
        video: true,
        data: true,
        videoSize: [1280, 720, 1280, 720],
        attributes: {
          name: name
        },
        options: this.options
      },
      ATList: [],
      countStream: 0
    };
  },
  mounted() {
    this.loaded = true;
    let routeData = this.$router.currentRoute.params;
    this.username = routeData.userRef;
    if (!this.room) {
      this.createToken({
        name: routeData.userRef,
        role: routeData.userType,
        roomId: routeData.roomId,
        user_ref: routeData.userRef
      });
    }
  },
  methods: {
    joinRoom(token) {
      const _this = this;
      EnxRtc.Logger.setLogLevel(4);

      let reconnectInfo = {
        allow_reconnect: false,
        number_of_attempts: 3,
        timeout_interval: 45000
      }

      _this.localStream = EnxRtc.joinRoom(
        token,
        _this.config,
        function(success, error) {
          if (error) {
          }
          if (success && success != null) {
            _this.room = success.room;

            let ownId = success.publishId;
            _this.setLiveStream(_this.localStream);

            for (let i = 0; i < success.streams.length; i++) {
              _this.room.subscribe(success.streams[i]);
            }

            // Active Talker list is updated
            _this.room.addEventListener("active-talkers-updated", function(
              event
            ) {
              _this.ATList = event.message.activeList;
              let video_player_len = document.querySelector(
                "#multi_video_container_div"
              ).childNodes;
              if (
                event.message &&
                event.message !== null &&
                event.message.activeList &&
                event.message.activeList !== null
              ) {
                if (_this.ATList.length == video_player_len.length) {
                  return;
                } else {
                  document.querySelector(
                    "#multi_video_container_div"
                  ).innerHTML = "";

                  for (let stream in _this.room.remoteStreams.getAll()) {
                    let st = _this.room.remoteStreams.getAll()[stream];
                    for (let j = 0; j < _this.ATList.length; j++) {
                      if (_this.ATList[j].streamId == st.getID()) {
                        _this.setLiveStream(st, _this.ATList[j].name);
                      }
                    }
                  }
                }
              }
              console.log("Active Talker List :- " + JSON.stringify(event));
            });

            // Stream has been subscribed successfully
            _this.room.addEventListener("stream-subscribed", function(
              streamEvent
            ) {
              let stream =
                streamEvent.data && streamEvent.data.stream
                  ? streamEvent.data.stream
                  : streamEvent.stream;
              for (let k = 0; k < _this.ATList.length; k++) {
                if (_this.ATList[k].streamId == stream.getID()) {
                  _this.setLiveStream(stream, _this.ATList[k].name);
                }
              }
            });

            // Listening to Incoming Data
            _this.room.addEventListener("active-talker-data-in", function(
              data
            ) {
              console.log("active-talker-data-in" + data);
              let obj = {
                msg: data.message.message,
                timestamp: data.message.timestamp,
                username: data.message.from
              };
              // Handle UI to display message
            });

            // Stream went out of Room
            _this.room.addEventListener("stream-removed", function(event) {
              console.log(event);
            });

            _this.room.addEventListener("room-disconnected", function(event) {
              window.location.href = _this.SUPPORT_URL;
            });
          }
        },
        reconnectInfo // reconnect flag set to false
      );
    },

    createToken(data) {
      Api.post("/createToken", data)
        .then(response => {
          if (response.data.result === 0) {
            this.joinRoom(response.data.token);
          } else {
            this.$notify({
              group: "error",
              type: "error",
              text: response.data.error
            });
          }
        })
        .catch(err => {
          console.log(err);
          this.$notify({
            group: "error",
            type: "error",
             text: response.data.error
          });
        });
    },

    setLiveStream(stream, userName) {
      const _this = this;
      stream.addEventListener("stream-data", function(e) {
        let text = e.msg.textMessage;
        let html = document.querySelector("#multi_text_container_div").html();
        document
          .querySelector("#multi_text_container_div")
          .html(html + text + "<br>");
      });

      if (!stream.local) {
        let newStreamDiv = document.createElement("div");
        newStreamDiv.setAttribute("id", "liveStream_" + _this.countStream);
        newStreamDiv.setAttribute("class", "live_stream_div");
        document
          .getElementById("multi_video_container_div")
          .appendChild(newStreamDiv);
        stream.show("liveStream_" + _this.countStream, _this.options);
        let node = document.createElement("div");
        if (userName !== "") {
          node.innerHTML = userName;
          node.classList.add("name-div");
          newStreamDiv.appendChild(node);
        }

        _this.countStream++;
      } else {
        _this.options.player.loader.class = "";
        _this.options.player.loader.show = false;
        stream.show("local_video_div", _this.options);
        let node = document.createElement("div");
        node.innerHTML = _this.username;
        node.classList.add("name-div");
        document.getElementById("local_video_div").appendChild(node);
      }
    },

    audioToggle() {
      const _this = this;
      if (_this.isAudioMuted) {
        _this.localStream.unmuteAudio(function(arg) {
          _this.isAudioMuted = false;
        });
      } else {
        _this.localStream.muteAudio(function(arg) {
          _this.isAudioMuted = true;
        });
      }
    },

    videoToggle() {
      const _this = this;
      if (_this.isVideoMuted) {
        _this.localStream.unmuteVideo(function(res) {
          var streamId = _this.localStream.getID();
          var player = document.getElementById("stream" + streamId);
          player.srcObject = _this.localStream.stream;
          player.play();
          _this.isVideoMuted = false;
        });
      } else {
        _this.localStream.muteVideo(function(res) {
          _this.isVideoMuted = true;
        });
      }
    },

    endCall() {
      var r = confirm("You want to quit?");
      if (r == true) {
        this.room.disconnect();
      }
    }
  }
};
</script>

<style scoped lang="scss">
@import url("../assets/scss/room.scss");
</style>
