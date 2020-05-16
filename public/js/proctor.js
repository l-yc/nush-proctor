'use strict';
console.clear();

function reportError(errMessage) {
  console.log(`Error ${errMessage.name}: ${errMessage.message}`);
  //let fakeconsole = document.querySelector('#fakeconsole');
  //fakeconsole.innerText += `Error ${errMessage.name}: ${errMessage.message}\n`;
}

//let fakeconsole = document.querySelector('#fakeconsole');
//fakeconsole.innerText += `Starting...`;

/* UI Code */
// this may seem like an unnecessary abstraction, but it's meant to keep this
// more organised
/**
 * This class handles the UI, Camera and Screen
 */
class UI {
  constructor() {
    this.localStreams = [];

    let connectButton = document.querySelector('#connect');
    let disconnectButton = document.querySelector('#disconnect');
    let pingButton = document.querySelector('#ping');
    let videoContainer = document.querySelector('#video-container');
    let shareCamera = document.getElementById('share-camera');
    let shareScreen = document.getElementById('share-screen');

    connectButton.disabled = true;
    disconnectButton.disabled = true;
    pingButton.disabled = true;

    connectButton.addEventListener('click', e => {
      connectButton.disabled = true;
      shareCamera.disabled = true;
      shareScreen.disabled = true;
      disconnectButton.disabled = false;
      pingButton.disabled = false;
      this.call();
    });

    disconnectButton.addEventListener('click', e => {
      connectButton.disabled = false;
      shareCamera.disabled = false;
      shareScreen.disabled = false;
      disconnectButton.disabled = true;
      pingButton.disabled = true;
      this.stop();
    });

    pingButton.addEventListener('click', e => {
      console.log('[PROCTOR] Pinging proctor...');
      this.signalingServer.pingProctor();
      alert('Pinged!');
    });

    shareCamera.addEventListener('click', e => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your device is not supported.');
        shareCamera.disabled = true;
        return;
      }
      navigator.mediaDevices.getUserMedia({ 
        video: { aspectRatio: 1920/1080, facingMode: 'user' }, 
        audio: { noiseSuppression: true, echoCancellation: true }
      }).then(stream => {
        let cameraVideo = document.createElement('video');
        cameraVideo.id = 'camera';
        cameraVideo.autoplay = true;
        cameraVideo.muted = true;
        videoContainer.replaceChild(cameraVideo, shareCamera);
        cameraVideo.srcObject = stream;
        cameraVideo.play();

        cameraVideo.addEventListener('dblclick', function (e) {
          cameraVideo.classList.toggle('invert'); // FIXME: facingMode api doesn't work
        });                                       // so we're using this temporary hack

        console.log('got stream %o', stream)
        connectButton.disabled = false;
        this.addStream(stream);
        alert('Double click the video to reverse video');
      }).catch(this.handleGetUserMediaError);
    });

    shareScreen.addEventListener('click', e => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Your device is not supported.');
        shareScreen.disabled = true;
        return;
      }
      navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
        let screenVideo = document.createElement('video');
        screenVideo.id = 'screen';
        screenVideo.autoplay = true;
        screenVideo.muted = true;
        videoContainer.replaceChild(screenVideo, shareScreen);
        screenVideo.srcObject = stream
        screenVideo.play();

        connectButton.disabled = false;
        this.addStream(stream);
      }).catch(this.handleGetUserMediaError);
    });
  }

  async beep() {
    let snd = new Audio('/sound/disconnect.mp3');
    return snd.play();
  }

  async setStatus(connectionState) {
    let connectionStateIndicator = document.querySelector('#connection-state');
    connectionStateIndicator.innerHTML = `Status: <strong>${connectionState}</strong>`;

    switch (connectionState) {
      case 'closed':
        await ui.beep();
        alert('Disconnected! Your proctor has been notified.');
        document.querySelector('#disconnect').click();
        break;
    }
  }

  setUsername(username) {
    let signalingStateIndicator = document.querySelector('#signaling-state');
    signalingStateIndicator.innerHTML = `Logged in as <strong>${username}</strong>`;
  }

  handleGetUserMediaError(err) {
    reportError(err);
    console.log('error: ' + err);
    switch(err.name) {
      case 'NotFoundError':
        alert('Unable to open your call because no camera and/or microphone' +
          ' were found.');
        break;
      case 'NotAllowedError':
      case 'SecurityError':
      case 'PermissionDeniedError':
        alert('You must enable your camera/microphone/screen to use this app.');
        break;
      default:
        alert('Error opening your camera/microphone/screen: ' + err.message);
        break;
    }
  }

  addStream(stream) {
    this.localStreams.push(stream);
    // if (conn) { // TODO: need to renegotiate for this to work
    //   console.log('[PROCTOR] Adding stream... %o', stream);
    //   stream.getTracks().forEach(track => conn.peerConnection.addTrack(track, stream));
    // }
  }

  async call() {
    let conn = connections[Object.keys(connections)[0]]; // we only have 1 connection now, it's ok if there's no connections yet
    if (conn && conn.peerConnection) return; // already calling
    ui.setStatus('initiating call');

    conn = new Connection(null); // no source because we're initiating the call
    connections[null] = conn;  // TODO maybe retrieve seer socket id from server?
    console.log('[PROCTOR] Calling...');
    console.log(connections, signalingServer.connections);
    console.log('connection is now %o', conn);

    this.localStreams.forEach(stream => stream.getTracks().forEach(track => conn.peerConnection.addTrack(track, stream)));
  }

  async stop() {
    let conn = connections[Object.keys(connections)[0]]; // we only have 1 connection now
    ui.setStatus('termianting call');

    conn.stop();
  }
};

let ui = null;  // we will use this instance in the rest of the code

/* Signaling Server */
class SignalingServer {
  constructor() {
    this.ready = false; // we need to wait until we have the connections
  }

  setConnections(connections) { // yes this should be a setter, but I dont want to rename
    this.connections = connections; // all my variables now to avoid infinite recursion
    
    this.ready = true;
  }

  init() {
    if (!this.ready) return; // there's no connections to monitor for!

    let socket = io({
      autoConnect: true // no need to call socket.open()
    });
    this.socket = socket;

    socket.on('connect', event => {
      console.log('[PROCTOR] Connected to the signaling server.');
      socket.emit('login');
      console.log('[PROCTOR] Registered user.');
    });

    socket.on('disconnect', () => {
      console.warn('[PROCTOR] Disconnected from signaling server.');
      alert('You have been disconnected. Please reload the page.');
    });

    socket.on('config', data => {
      console.log('[PROCTOR] Obtained config: %o', data);
      this.Connection.setIceServers(data.iceServers);
      //configuration.iceServers = data.iceServers;

      ui.setUsername(data.username);
    });

    socket.on('offer accepted', data => {
      console.log('[PROCTOR] Offer accepted.');
      let conn = this.connections[null]; // find the unassigned connection
      this.connections[data.from.socket] = conn; // assign it correctly!

      conn.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      ).then(() => {
        console.log('[PROCTOR] Remote description set.');
      }).catch(reportError);
    });

    socket.on('candidate available', data => {
      console.log('[PROCTOR] Received an ICE Candidate: %o', data);
      if (data.candidate === null) return; // end of candidate stream

      let conn = this.connections[data.from.socket];
      conn.peerConnection.addIceCandidate(data.candidate);
    }); 
  }

  submitOffer(offer) {
    this.socket.emit('submit offer', {
      offer: offer,
      to: null
    });
  }

  submitCandidate(candidate) {
    this.socket.emit('submit candidate', { 
      candidate: candidate,
      to: null
    });
  }

  pingProctor() {
    this.socket.emit('ping proctor');
  }
};

let signalingServer = null; // we will use this instance in the rest of the code

/* WebRTC Peer Connection */
const { RTCPeerConnection, RTCSessionDescription } = window;

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
  }

  static setIceServers(iceServers) {
    this.prototype.configuration.iceServers = iceServers; // TODO: is there a better way?
  }

  async stop() {
    if (!this.peerConnection) return; // not calling
    this.peerConnection.close();
    if (this.timeoutHandle) window.clearTimeout(this.timeoutHandle);

    console.log('con state is now', this.peerConnection.connectionState);
    ui.setStatus('closed');
    console.warn('[PROCTOR] Disconnected from remote stream.');

    this.peerConnection = null;  // this connection is now useless
    this.timeoutHandle = null;
  }

  handleICECandidateEvent({candidate}) {
    console.log('[PROCTOR] Obtained an ICE Candidate %o.', candidate);
    if (candidate === null) return; // useless
    if (candidate.candidate === '') return;
    this.signalingServer.submitCandidate(candidate);
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
          console.log('playing');
        }).catch(reportError);
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

      this.signalingServer.submitOffer(this.peerConnection.localDescription);
    }).catch(reportError);
  }

  handleConnectionStateChangeEvent(event) {
    console.log('[PROCTOR] Connection has changed: %o', event);
    console.log('[PROCTOR] Connection state:', this.peerConnection.connectionState);
    console.assert(event.srcElement === this.peerConnection);
    // connection state: new, connecting, connected, disconnected, failed or closed
    ui.setStatus(this.peerConnection.connectionState);
    switch (this.peerConnection.connectionState) {
      case 'connected':
        // Peers connected!
        console.log('[PROCTOR] Connected to remote stream.');
        if (this.timeoutHandle) {
          window.clearTimeout(this.timeoutHandle);
        } else {
          alert('Connected!');
        }
        break;
      case 'disconnected':
        this.timeoutHandle = window.setTimeout(() => {
          console.warn('[PROCTOR] Connection is unstable.');
          this.stop();
        }, this.MAX_TIMEOUT);
        break;
      case 'failed':
        console.warn('[PROCTOR] Connection failed.');
        this.stop();
        break;
      case 'closed':
        // this is NOT fired on chrome, as per design specs
        // https://github.com/w3c/webrtc-pc/issues/1020
        // https://bugs.chromium.org/p/chromium/issues/detail?id=699036
        // so I will be ignoring this from now on
        break;
    }
  }
};
// static variables
Connection.prototype.configuration = {
  iceServers: null,
  iceTransportPolicy: 'relay',  // relay for TURN only
  iceCandidatePoolSize: 0
};

Connection.prototype.MAX_TIMEOUT = 15000; // 15 second to reconnect

let connections = {}; // object, easier to extend in the futureo

/* Main Logic */
(async function() { 
  SignalingServer.prototype.Connection = Connection;

  signalingServer = new SignalingServer();
  signalingServer.setConnections(connections);

  UI.prototype.signalingServer = signalingServer;
  Connection.prototype.signalingServer = signalingServer;

  ui = new UI();

  signalingServer.init();
})();
