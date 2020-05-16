'use strict';
console.clear();

/* Debugging Code */

/**
 * Useful when no console is available. Remember to create fakeconsole in html
 */
//function reportError(errMessage) {
//  console.log(`Error ${errMessage.name}: ${errMessage.message}`);
//  let fakeconsole = document.querySelector('#fakeconsole');
//  fakeconsole.innerText += `Error ${errMessage.name}: ${errMessage.message}\n`;
//}
//let fakeconsole = document.querySelector('#fakeconsole');
//fakeconsole.innerText += `Starting...`;

/* UI Code */

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

  setSignalingServer(signalingServer) {
    this.signalingServer = signalingServer;
  }

  async beep() {
    let snd = new Audio('/sound/disconnect.mp3');
    return snd.play();
  }

  async setStatus(connectionState) {
    let connectionStateIndicator = document.querySelector('#connection-state');
    connectionStateIndicator.innerHTML = `Status: <strong>${connectionState}</strong>`;

    switch (connectionState) {
      case 'connected':
        alert('Connected!');
        break;
      case 'disconnected':
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
    this.setStatus('initiating call');

    conn = new Connection(null); // no source because we're initiating the call
    connections[null] = conn;  // TODO maybe retrieve seer socket id from server?
    //conn.destructionCallback = () => new Promise(async (resolve, reject) => { // FIXME should i follow the interface?
    //  resolve(null); // we don't need to do anything after the connection is destroyed
    //};

    console.log('[PROCTOR] Calling...');
    console.log(connections, this.signalingServer.connections);
    console.log('connection is now %o', conn);

    this.localStreams.forEach(stream => stream.getTracks().forEach(track => conn.peerConnection.addTrack(track, stream)));
  }

  async stop() {
    let conn = connections[Object.keys(connections)[0]]; // we only have 1 connection now
    if (conn && conn.peerConnection) {
      this.setStatus('terminating call');
      conn.stop();
    }
  }
};

let ui = null;  // we will use this instance in the rest of the code

/* Signaling Server */
import { SignalingServer } from './webrtcSignaling.js';

let signalingServer = null; // we will use this instance in the rest of the code

/* WebRTC Peer Connection */
import { Connection } from './webrtcConnection.js';

let connections = {}; // object, easier to extend in the futureo

/* Main Logic */
(async function() { 
  SignalingServer.prototype.Connection = Connection;
  signalingServer = new SignalingServer();

  ui = new UI();
  ui.setSignalingServer(signalingServer);
  signalingServer.setUi(ui);

  Connection.prototype.signalingServer = signalingServer;
  Connection.prototype.ui = ui;
  signalingServer.setConnections(connections);

  signalingServer.init();
})();
