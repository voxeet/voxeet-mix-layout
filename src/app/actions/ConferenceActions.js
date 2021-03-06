import VoxeetSDK from "@voxeet/voxeet-web-sdk";
import bowser from "bowser";
import axios from "axios";
import { Actions as ConferenceActions } from "./ConferenceActions";
import { Actions as ParticipantActions } from "./ParticipantActions";
import { Actions as ParticipantWaitingActions } from "./ParticipantWaitingActions";
import { Actions as VideoPresentationActions } from "./VideoPresentationActions";

export const Types = {
  CONFERENCE_LEAVE: "CONFERENCE_LEAVE",
  CONFERENCE_START_SCREENSHARE: "CONFERENCE_START_SCREENSHARE",
  CONFERENCE_START_FILE_PRESENTATION: "CONFERENCE_START_FILE_PRESENTATION",
  CONFERENCE_START_VIDEO_PRESENTATION: "CONFERENCE_START_VIDEO_PRESENTATION",
  CONFERENCE_UPDATE_FILE_PRESENTATION: "CONFERENCE_UPDATE_FILE_PRESENTATION",
  CONFERENCE_STOP_SCREENSHARE: "CONFERENCE_STOP_SCREENSHARE",
  CONFERENCE_STOP_VIDEO_PRESENTATION: "CONFERENCE_STOP_VIDEO_PRESENTATION",
  CONFERENCE_STOP_FILE_PRESENTATION: "CONFERENCE_STOP_FILE_PRESENTATION",
  CONFERENCE_ENDED: "CONFERENCE_ENDED",
};

export class Actions {
  static initialize(consumerKey, consumerSecret) {
    return (dispatch) => {
      return this._initializeListeners(dispatch)
        .then(
          () =>
            VoxeetSDK.session.participant ||
            VoxeetSDK.initialize(consumerKey, consumerSecret)
        )
        .then()
        .catch((err) => {
          console.log(err);
          dispatch(this._conferenceEnded());
        });
    };
  }

  static initializeWithToken(token, refreshToken, refreshUrl) {
    return (dispatch) => {
      return this._initializeListeners(dispatch)
        .then(
          () =>
            VoxeetSDK.session.participant ||
            VoxeetSDK.initializeToken(token, () => {
              return axios
                .post(
                  refreshUrl + "/v1/oauth2/mixer/refresh",
                  { refresh_token: refreshToken },
                  { headers: { Authorization: "Bearer " + token } }
                )
                .then((res) => {
                  return res.data.access_token;
                });
            })
        )
        .then()
        .catch(() => {
          dispatch(this._conferenceEnded());
        });
    };
  }

  static join(
    conferenceId,
    constraints,
    catToken,
    userInfo,
    userData,
    userParams,
    mediaRecordedUrl,
    thirdPartyId,
    language
  ) {
    return (dispatch, getState) => {
      return VoxeetSDK.session
        .open({ ...userInfo, thirdPartyId: thirdPartyId })
        .then(() => {
          return VoxeetSDK.conference
            .create({
              alias: conferenceId,
            })
            .then((conference) => {
              return VoxeetSDK.conference
                .join(conference, {
                  constraints,
                  conferenceAccessToken:
                    catToken && catToken.length > 0 ? catToken : null,
                  mixing: {
                    enabled: true,
                  },
                  userParams,
                })
                .then((payload) => {
                  console.log("Media Recorded Url : " + mediaRecordedUrl);
                  console.log("User Params : " + userParams);
                  console.log("User Data : " + userData);
                })
                .catch();
            })
            .catch();
        })
        .catch();
    };
  }

  static replay(
    conferenceId,
    offset,
    catToken,
    userInfo,
    userData,
    userParams,
    mediaRecordedUrl,
    thirdPartyId,
    language
  ) {
    return (dispatch) => {
      return VoxeetSDK.session
        .open({ ...userInfo, thirdPartyId: thirdPartyId })
        .then(() => {
          return VoxeetSDK.conference
            .fetch(conferenceId)
            .then((conference) => {
              return VoxeetSDK.conference
                .replay(
                  conference,
                  {
                    offset: offset,
                    conferenceAccessToken:
                      catToken && catToken.length > 0 ? catToken : null,
                  },
                  { enabled: true }
                )
                .then((payload) => {})
                .catch();
            })
            .catch();
        })
        .catch();
    };
  }

  static startVideoPresentationMode() {
    return {
      type: Types.CONFERENCE_START_VIDEO_PRESENTATION,
    };
  }

  static stopVideoPresentationMode() {
    return {
      type: Types.CONFERENCE_STOP_VIDEO_PRESENTATION,
    };
  }

  static startScreenShareMode() {
    return {
      type: Types.CONFERENCE_START_SCREENSHARE,
    };
  }

  static startFilePresentationMode() {
    return {
      type: Types.CONFERENCE_START_FILE_PRESENTATION,
    };
  }

  static stopScreenShareMode() {
    return {
      type: Types.CONFERENCE_STOP_SCREENSHARE,
    };
  }

  static stopFilePresentationMode() {
    return {
      type: Types.CONFERENCE_STOP_FILE_PRESENTATION,
    };
  }

  static leave() {
    return (dispatch) => {
      return VoxeetSDK.conference.leave().then(() => {
        dispatch({
          type: Types.CONFERENCE_LEAVE,
        });
      });
    };
  }

  static checkIfUpdateStatusUser(userId, status) {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      const index = participants.participants.findIndex(
        (p) => p.participant_id === userId
      );
      if (index != -1) {
        const {
          voxeet: { participantsWaiting },
        } = getState();
        const index = participantsWaiting.participants.findIndex(
          (p) => p.participant_id === userId
        );
        dispatch(
          ParticipantActions.onParticipantStatusUpdated(
            userId,
            participantsWaiting.participants[index],
            status
          )
        );
      }
      dispatch(
        ParticipantWaitingActions.onParticipantWaitingStatusUpdated(
          userId,
          status
        )
      );
    };
  }

  static checkIfUpdateUser(userId, stream) {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      const index = participants.participants.findIndex(
        (p) => p.participant_id === userId
      );
      if (index == -1) {
        const {
          voxeet: { participantsWaiting },
        } = getState();
        const index = participantsWaiting.participants.findIndex(
          (p) => p.participant_id === userId
        );
        dispatch(
          ParticipantActions.onParticipantStatusUpdated(
            userId,
            participantsWaiting.participants[index],
            "Connecting"
          )
        );
      }
      dispatch(ParticipantActions.onParticipantUpdated(userId, stream));
    };
  }

  static checkIfUserExistScreenShareStart(userId, stream) {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      const index = participants.participants.findIndex(
        (p) => p.participant_id === userId
      );
      if (index == -1) {
        const {
          voxeet: { participantsWaiting },
        } = getState();
        const index = participantsWaiting.participants.findIndex(
          (p) => p.participant_id === userId
        );
        dispatch(
          ParticipantActions.onParticipantStatusUpdated(
            userId,
            participantsWaiting.participants[index],
            "Connecting"
          )
        );
      }
      dispatch(this.startScreenShareMode());
      dispatch(
        ParticipantActions.onParticipantStartScreenShare(userId, stream)
      );
    };
  }

  static checkIfUserExistFilePresentationStart(userId, data) {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      const index = participants.participants.findIndex(
        (p) => p.participant_id === userId
      );
      if (index == -1) {
        const {
          voxeet: { participantsWaiting },
        } = getState();
        const index = participantsWaiting.participants.findIndex(
          (p) => p.participant_id === userId
        );
        dispatch(
          ParticipantActions.onParticipantStatusUpdated(
            userId,
            participantsWaiting.participants[index],
            "Connecting"
          )
        );
      }
      VoxeetSDK.filePresentation.image(data.position).then((res) => {
        dispatch(this.startFilePresentationMode());
        dispatch(
          ParticipantActions.onParticipantStartFilePresentation(
            data.ownerId,
            data.position,
            res
          )
        );
      });
    };
  }

  static checkIfUserExistVideoPresentationStart(userId, data) {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      const index = participants.participants.findIndex(
        (p) => p.participant_id === userId
      );
      if (index == -1) {
        const {
          voxeet: { participantsWaiting },
        } = getState();
        const index = participantsWaiting.participants.findIndex(
          (p) => p.participant_id === userId
        );
        dispatch(
          ParticipantActions.onParticipantStatusUpdated(
            userId,
            participantsWaiting.participants[index],
            "Connecting"
          )
        );
      }
      dispatch(this.startVideoPresentationMode());
      dispatch(
        ParticipantActions.onParticipantStartVideoPresentation(
          userId,
          data.url,
          data.timestamp / 1000
        )
      );
      dispatch(VideoPresentationActions.play());
      setTimeout(() => {
        dispatch(VideoPresentationActions.seek(data.timestamp / 1000));
      }, 250);
    };
  }

  static checkIfUserExistFilePresentationUpdated(userId, data) {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      const index = participants.participants.findIndex(
        (p) => p.participant_id === userId
      );
      if (index == -1) {
        const {
          voxeet: { participantsWaiting },
        } = getState();
        const index = participantsWaiting.participants.findIndex(
          (p) => p.participant_id === userId
        );
        dispatch(
          ParticipantActions.onParticipantStatusUpdated(
            userId,
            participantsWaiting.participants[index],
            "Connecting"
          )
        );
      }
      VoxeetSDK.filePresentation.image(data.position).then((res) => {
        dispatch(
          ParticipantActions.onParticipantUpdateFilePresentation(
            data.ownerId,
            data.position,
            res
          )
        );
      });
    };
  }

  static checkIfUserJoined(userId, stream) {
    return (dispatch, getState) => {
      const {
        voxeet: { participants },
      } = getState();
      const index = participants.participants.findIndex(
        (p) => p.participant_id === userId
      );
      if (index == -1) {
        const {
          voxeet: { participantsWaiting },
        } = getState();
        const index = participantsWaiting.participants.findIndex(
          (p) => p.participant_id === userId
        );
        dispatch(
          ParticipantActions.onParticipantStatusUpdated(
            userId,
            participantsWaiting.participants[index],
            "Connecting"
          )
        );
      }
      dispatch(ParticipantActions.onParticipantJoined(userId, stream));
    };
  }

  static _initializeListeners(dispatch) {
    return new Promise((resolve, reject) => {
      VoxeetSDK.conference.on("participantAdded", (participant) => {
        dispatch(
          ParticipantWaitingActions.onParticipantWaitingAdded(
            participant.id,
            participant
          )
        );
      });

      VoxeetSDK.conference.on("left", () => {
        console.log("CONFERENCE LEFT");
        dispatch(this._conferenceEnded());
      });

      VoxeetSDK.conference.on("ended", (data) => {
        console.log("CONFERENCE ENDED");
        dispatch(this._conferenceEnded());
      });

      VoxeetSDK.videoPresentation.on("started", (data) => {
        console.log(
          "VIDEO PRESENTATION STARTED: " +
            data.ownerId +
            " / " +
            data.url +
            " / " +
            data.timestamp
        );
        dispatch(
          this.checkIfUserExistVideoPresentationStart(data.ownerId, data)
        );
      });

      VoxeetSDK.recording.on("stop", () => {
        console.log("RECORDING STOPPED");
      });

      VoxeetSDK.videoPresentation.on("stopped", () => {
        console.log("VIDEO PRESENTATION STOPPED");
        dispatch(this.stopVideoPresentationMode());
        dispatch(ParticipantActions.onParticipantStopVideoPresentation());
      });

      VoxeetSDK.videoPresentation.on("played", (data) => {
        console.log("VIDEO PRESENTATION PLAY: " + data.timestamp);
        dispatch(VideoPresentationActions.play());
        setTimeout(() => {
          dispatch(VideoPresentationActions.seek(data.timestamp / 1000));
        }, 250);
      });

      VoxeetSDK.videoPresentation.on("paused", (data) => {
        console.log("VIDEO PRESENTATION PAUSE: " + data.timestamp);
        dispatch(VideoPresentationActions.pause());
      });

      VoxeetSDK.videoPresentation.on("sought", (data) => {
        console.log("VIDEO PRESENTATION SEEK: " + data.timestamp);
        dispatch(VideoPresentationActions.seek(data.timestamp / 1000));
      });

      VoxeetSDK.conference.on("error", (error) => {
        if (error.name === "PeerConnectionDisconnectedError") {
          console.log("AN ERROR HAS BEEN HANDLED ON PEER CONNECTION");
          // console.log("CONFERENCE ENDED");
          // dispatch(this.killAllRecord());
          // dispatch(this._conferenceEnded());
        }
      });

      VoxeetSDK.conference.on("streamAdded", (participant, stream) => {
        if (stream && stream.type === "ScreenShare") {
          dispatch(
            this.checkIfUserExistScreenShareStart(participant.id, stream)
          );
        } else {
          dispatch(
            ParticipantWaitingActions.onParticipantWaitingJoined(
              participant.id,
              stream
            )
          );
          dispatch(this.checkIfUserJoined(participant.id, stream));
        }
      });

      VoxeetSDK.conference.on("streamUpdated", (participant, stream) => {
        console.log("PARTICIPANT UPDATED: " + participant.id);
        dispatch(this.checkIfUpdateUser(participant.id, stream));
      });

      VoxeetSDK.conference.on("streamRemoved", (participant, stream) => {
        if (stream.type === "ScreenShare") {
          console.log("SCREENSHARE STOPPED");
          dispatch(this.stopScreenShareMode());
          dispatch(ParticipantActions.onParticipantStopScreenShare());
        } else {
          console.log("PARTICIPANT LEFT: " + participant.id);
          dispatch(
            ParticipantWaitingActions.onParticipantWaitingLeft(participant.id)
          );
          dispatch(ParticipantActions.onParticipantLeft(participant.id));
        }
      });

      VoxeetSDK.conference.on("participantUpdated", (user) => {
        dispatch(
          ParticipantWaitingActions.onParticipantWaitingStatusUpdated(
            user.id,
            user.status
          )
        );
        dispatch(this.checkIfUpdateStatusUser(user.id, user.status));
      });

      VoxeetSDK.filePresentation.on("started", (filePresentation) => {
        console.log("FILE PRESENTATION STARTED: " + filePresentation.owner.id);
        dispatch(
          this.checkIfUserExistFilePresentationStart(
            filePresentation.owner.id,
            filePresentation
          )
        );
      });

      VoxeetSDK.filePresentation.on("updated", (filePresentation) => {
        console.log("FILE PRESENTATION UPDATED: " + filePresentation.owner.id);
        dispatch(
          this.checkIfUserExistFilePresentationUpdated(
            filePresentation.owner.id,
            filePresentation
          )
        );
      });

      VoxeetSDK.filePresentation.on("stopped", () => {
        console.log("FILE PRESENTATION STOPPED");
        dispatch(this.stopFilePresentationMode());
        dispatch(ParticipantActions.onParticipantStopFilePresentation());
      });
      resolve();
    });
  }

  static _conferenceEnded() {
    return {
      type: Types.CONFERENCE_ENDED,
    };
  }

  static _conferenceJoined(conferenceId) {
    return {};
  }
}
