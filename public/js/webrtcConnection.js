'use strict';

const { RTCPeerConnection, RTCSessionDescription } = window;

/**
 * Connection class to handle WebRTC PeerConnections.
 *
 * The following needs to be done for created connections to work properly:
 *
 *   1. Set Connection.prototype.signalingServer: Object
 *     a. An implementation on an appropriate signaling server is provided in ./webrtcSignaling.js
 *     b. However, any other signaling servers can be used, as long as it provides the methods:
 *       * signalingServer.submitOffer(offer: JSON)
 *       * signalingServer.submitCandidate(candidate: JSON)
 *
 *   2. Set Connection.prototype.ui: Object
 *     a. An implementation for this must provide the methods:
 *       * ui.setStatus(status: String)
 *
 * The ICE Servers are not provided in this implementation. To set ICE Servers, one must call
 *
 *   1. Connection.setIceServers(iceServers: [JSON])
 *     This function sets Connection.prototype.configuration.iceServers
 */

class Connection {
  /**
   * from: socket id
   * eventHandler: some object which handles events emitted by the connection
   */
  constructor(from) {
    this.peerConnection = new RTCPeerConnection(this.configuration);
    this.timeoutHandle = null;

    this.from = from;

    this.peerConnection.onicecandidate = this.handleICECandidateEvent.bind(this);
    this.peerConnection.ontrack = this.handleOnTrackEvent.bind(this);
    this.peerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent.bind(this);
    // myPeerConnection.onremovetrack = handleRemoveTrackEvent;                           // TODO: need renegotiation
    this.peerConnection.onconnectionstatechange = this.handleConnectionStateChangeEvent.bind(this);
    // myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent; // older functions
    // myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;   // same purpose
    // myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;         // TODO: backward comptability?
    console.log('[PROCTOR] Created new connection.');

    this.video = []; // needed by ./seer.js
  }

  static setIceServers(iceServers) {
    this.prototype.configuration.iceServers = iceServers; // TODO: is there a better way?
  }

  async stop() {
    if (!this.peerConnection) return; // not calling
    this.peerConnection.close();
    if (this.timeoutHandle) window.clearTimeout(this.timeoutHandle);

    this.ui.setStatus('disconnected');
    console.warn('[PROCTOR] Disconnected from remote stream.');

    this.peerConnection = null;  // this connection is now useless
    this.timeoutHandle = null;
  }

  handleICECandidateEvent({candidate}) {
    console.log('[PROCTOR] Obtained an ICE Candidate %o.', candidate);
    if (candidate === null) return; // useless
    if (candidate.candidate === '') return;
    this.signalingServer.submitCandidate(candidate, this.from);
  }

  handleOnTrackEvent({ streams: [stream] }) {
    console.log('[PROCTOR] Received stream. %o', stream);
    if (!stream) return; // ??? firefox 76.0+ is giving undefined streams
    // i dont know why it happens, but this fixes it
    let remoteAudio = document.getElementById("remote-audio");
    if (remoteAudio) {
      remoteAudio.srcObject = stream;
      //remoteAudio.load();
      remoteAudio.play()
        .then(() => {
          console.log('[PROCTOR] Playing remote audio');
        }).catch(err => {
          console.error('[PROCTOR] Failed to play remote audio: %o', err);
        });
    }
  }

  handleNegotiationNeededEvent() {
    this.peerConnection.createOffer({
      //offerToReceiveVideo: true,
      offerToReceiveAudio: true
    }).then(offer => {
      console.log('[PROCTOR] Created offer.');
      return this.peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    }).then(() => {
      console.log('[PROCTOR] Local description set.');
      console.log('[PROCTOR] Submitting offer.');

      this.signalingServer.submitOffer(this.peerConnection.localDescription, this.from);
    }).catch(err => {
      console.error('[PROCTOR] Failed to negotiate a connection: %o', err);
    });
  }

  handleConnectionStateChangeEvent(event) {
    console.log('[PROCTOR] Connection has changed: %o', event);
    console.log('[PROCTOR] Connection state:', this.peerConnection.connectionState);
    console.assert(event.srcElement === this.peerConnection);
    // connection state: new, connecting, connected, disconnected, failed or closed
    switch (this.peerConnection.connectionState) {
      case 'connected':
        // Peers connected!
        console.log('[PROCTOR] Connected to remote stream.');
        if (this.timeoutHandle) {
          window.clearTimeout(this.timeoutHandle);
          this.ui.setStatus('reconnected');
        } else {
          this.ui.setStatus('connected');
        }
        break;
      case 'disconnected':
        this.ui.setStatus('reconnecting');
        this.timeoutHandle = window.setTimeout(() => {
          console.warn('[PROCTOR] Connection is unstable.');
          this.stop();
        }, this.MAX_TIMEOUT);
        break;
      case 'failed':
        this.ui.setStatus('failed');
        console.warn('[PROCTOR] Connection failed.');
        this.stop();
        break;
      case 'closed':
        // this is NOT fired on chrome, as per design specs
        // https://github.com/w3c/webrtc-pc/issues/1020
        // https://bugs.chromium.org/p/chromium/issues/detail?id=699036
        // so I will be ignoring this from now on
        break;
      default:
        this.ui.setStatus(this.peerConnection.connectionState);
    }
  }

  /**
   * Additional events called by the signaling server
   */
  handleAnswer(answer) {
    this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    ).then(() => {
      console.log('[PROCTOR] Remote description set.');
    }).catch(err => {
      console.log('[PROCTOR] Failed to set remote description: %o', err);
    });
  }

  handleCandidate(candidate) {
    this.peerConnection.addIceCandidate(candidate);
  }

};

// static variables
Connection.prototype.configuration = {
  iceServers: null,
  iceTransportPolicy: 'relay',  // relay for TURN only
  iceCandidatePoolSize: 0
};

Connection.prototype.MAX_TIMEOUT = 15000; // 15 second to reconnect

export { Connection };
