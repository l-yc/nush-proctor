'use strict';
console.clear();

async function beep() {
  // https://freesound.org/data/previews/467/467882_5487341-lq.mp3
  let snd = new Audio('data:audio/mpeg;base64,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');
  return snd.play();
}

function setStatus(connectionState) {
  let connectionStateIndicator = document.querySelector('#connection-state');
  connectionStateIndicator.innerHTML = `Status: <strong>${connectionState}</strong>`;
}

let username = window.prompt('Enter username:');

/* Signaling Server */
const socket = io({
  autoConnect: true // no need to call socket.open()
});

socket.on('connect', event => {
  console.log('[PROCTOR] Connected to the signaling server.');
  console.log('[PROCTOR] Registering username "%s"..', username);
  socket.emit('login', {  // TODO: this needs to be secured for practical use
    username: username
  });
});

/* WebRTC Peer Connection */
const { RTCPeerConnection, RTCSessionDescription } = window;

let configuration = {
    iceServers: null,
    iceTransportPolicy: 'relay',
    iceCandidatePoolSize: 0
};

socket.on('iceServers', data => {
    configuration.iceServers = data.iceServers;
});
//const configuration = {iceServers: [
//  //{'urls': 'stun:stun.l.google.com:19302'},
//  //{'urls': 'stun:stun1.l.google.com:19302'}
//  { urls:['stun:mystun.sytes.net:3478'] },
//  {
//      urls:['turn:mystun.sytes.net:3478'],
//      credential:'test',
//      username:'test'
//  }
//],
//    iceTransportPolicy: 'relay',
//    iceCandidatePoolSize: 0
//};

let peerConnection = null;
let timeoutHandle = null;

function createNewConnection() {
  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.onicecandidate = ({candidate}) => {
    console.log('[PROCTOR] Obtained an ICE Candidate %o.', candidate);
    if (candidate === null) return; // useless
    if (candidate.candidate === '') return;
    socket.emit('submit candidate', { 
      candidate: candidate,
      to: null
    });
  };

  peerConnection.ontrack = function({ streams: [stream] }) {
    console.log('[PROCTOR] Received stream.');
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
    }
  };

  // Listen for connectionstatechange on the local RTCPeerConnection
  peerConnection.oniceconnectionstatechange = event => {
    console.log('cries %o', event);
  };

  peerConnection.onconnectionstatechange = event => {
    console.log('[PROCTOR] Connection has changed: %o', event);
    console.log('[PROCTOR] Connection state:', peerConnection.connectionState);
    console.assert(event.srcElement === peerConnection);
    // new, connecting, connected, disconnected, failed or closed
    setStatus(peerConnection.connectionState);
    switch (peerConnection.connectionState) {
      case 'connected':
        // Peers connected!
        console.log('[PROCTOR] Connected to remote stream.');
        if (timeoutHandle) {
          // in your click function, call clearTimeout
          window.clearTimeout(timeoutHandle);
        } else {
          alert('Connected!');
        }
        break;
      case 'disconnected':
        // in the example above, assign the result
        timeoutHandle = window.setTimeout(() => {
          console.warn('[PROCTOR] Connection is unstable.');
          stop();
        }, 15000);  // 15 second to reconnect
        break;
      case 'failed':
        console.warn('[PROCTOR] Connection failed.');
        stop();
        break;
      case 'closed':
        // this is NOT fired on chrome, as per design specs
        // https://github.com/w3c/webrtc-pc/issues/1020
        // https://bugs.chromium.org/p/chromium/issues/detail?id=699036
        // so I will be ignoring this from now on
        // beep();
        // console.warn('[PROCTOR] Disconnected from remote stream.');
        // alert('Disconnected! Your proctor has been notified.');
        // timeoutHandle = null;
    }
  };

  console.log('[PROCTOR] Created new connection.');
}

let localStreams = [];

async function call() {
  if (peerConnection) return; // already calling
  setStatus('initiating call');
  createNewConnection();

  localStreams.forEach(stream => stream.getTracks().forEach(track => peerConnection.addTrack(track, stream)));

  const offer = await peerConnection.createOffer({
    //offerToReceiveVideo: true,
    //offerToReceiveAudio: true
  });
  console.log('[PROCTOR] Created offer.');
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
  console.log('[PROCTOR] Local description set.');

  socket.emit('submit offer', {
    offer: offer,
    to: null
  });
  console.log('[PROCTOR] Submitting offer.');

  socket.on('offer accepted', async data => {
    console.log('[PROCTOR] Offer accepted.');
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );
    console.log('[PROCTOR] Remote description set.');
  });

  socket.on('candidate available', data => {
    console.log('[PROCTOR] Received an ICE Candidate: %o', data);
    if (data.candidate === null) return;
    peerConnection.addIceCandidate(data.candidate);
  }); 
}

async function stop() {
  if (!peerConnection) return; // not calling
  peerConnection.close();
  if (timeoutHandle) window.clearTimeout(timeoutHandle);

  await beep();
  console.warn('[PROCTOR] Disconnected from remote stream.');
  alert('Disconnected! Your proctor has been notified.');

  setStatus('closed');

  peerConnection = null;  // this connection is now useless
  timeoutHandle = null;
}

/* UI Code */
function addStream(stream) {
  localStreams.push(stream);
  if (peerConnection) {
    console.log('[PROCTOR] Adding stream... %o', stream);
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  }
}

(async function() {
  let message = document.querySelector('#message');
  message.innerHTML = `Logged in as <strong>${username}</strong>`;

  //let connectButton = document.querySelector('#connect');
  //connectButton.addEventListener('click', event => socket.open());
  let connectButton = document.querySelector('#connect');
  let disconnectButton = document.querySelector('#disconnect');
  connectButton.addEventListener('click', call);
  disconnectButton.addEventListener('click', stop);

  // Grab elements, create settings, etc.

  // Get access to the camera!
  // TODO: better compatibility? This only works on:
  // Chrome >= 47
  // Edge <= 18
  // Firefox >= 33
  // Opera >= 30
  // Safari >= 11
  // Android Webview >= 47
  // Chrome for Android >= 47
  // Firefox for Android >= 36
  // Opera for Android >= 30
  // Safari on iOS >= 11
  // Samsung Internet >= 5.0
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    let userList = document.querySelector('#user-list');

    let cameraVideo = null;
    let shareCamera = document.getElementById('share-camera');
    shareCamera.addEventListener('click', e => {
      cameraVideo = document.getElementById('camera');
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
        //cameraVideo.src = window.URL.createObjectURL(stream);
        cameraVideo.srcObject = stream;
        cameraVideo.play();

        console.log('got stream %o', stream)
        shareCamera.disabled = true;
        addStream(stream);
      }).catch(err => {
        console.log('error: ' + err);
      });
    });

    let screenVideo = null;
    let shareScreen = document.getElementById('share-screen');
    shareScreen.addEventListener('click', e => {
      screenVideo = document.getElementById('screen');
      navigator.mediaDevices.getDisplayMedia({ video: true }).then(function(stream) {
        screenVideo.srcObject = stream
        screenVideo.play();

        shareScreen.disabled = true;
        addStream(stream);
      }).catch(err => {
        console.log(err);
      });
    });
  } else {
    alert('your device is not supported');
  }
})();
