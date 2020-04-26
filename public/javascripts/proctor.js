'use strict';
console.clear();

let username = window.prompt('Enter username:');

/* Signaling Server Setup */
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

/* WebRTC Setup */
const { RTCPeerConnection, RTCSessionDescription } = window;
const configuration = {iceServers: [
  //{'urls': 'stun:stun.l.google.com:19302'},
  //{'urls': 'stun:stun1.l.google.com:19302'}
  { urls:['stun:mystun.sytes.net:3478'] },
  {
      urls:['turn:mystun.sytes.net:3478'],
      credential:'test',
      username:'test'
  }
],
    iceTransportPolicy: 'relay',
    iceCandidatePoolSize: 0
};

let peerConnection = null;

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
  peerConnection.addEventListener('connectionstatechange', event => {
    console.log('[PROCTOR] Connection has changed: %o', event);
    console.log('[PROCTOR] Connection state:', peerConnection.connectionState);
    // new, connecting, connected, disconnected, failed or closed
    if (peerConnection.connectionState === 'connected') {
      // Peers connected!
      console.log('[PROCTOR] Connected to remote stream.');
      alert('Connected!');
    } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
      if (peerConnection.connectionState !== 'closed') {
        stop();
      } else {
        console.warn('[PROCTOR] Disconnected from remote stream.');
        alert('Disconnected! Your proctor has been notified.');
      }
    }
  });

  console.log('[PROCTOR] Created new connection.');
}

let localStreams = [];

async function call() {
  if (peerConnection) return; // already calling
  createNewConnection();

  localStreams.forEach(stream => stream.getTracks().forEach(track => peerConnection.addTrack(track, stream)));

  const offer = await peerConnection.createOffer();
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
  peerConnection = null;  // this connection is now useless
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
