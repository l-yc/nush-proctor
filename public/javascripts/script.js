'use strict';
console.clear();

/* Networking Setup */
const socket = io({
    autoConnect: false
});
const { RTCPeerConnection, RTCSessionDescription } = window;
//const configuration = {'iceServers': [{'urls': 'stun:localhost:8080'}]}
const configuration = {'iceServers': [
    {'urls': 'stun:stun.l.google.com:19302'}
    //{'urls': 'stun:stun1.l.google.com:19302'}
]}

let peerConnection = new RTCPeerConnection(configuration);
let localStreams = [];
let connectButton = document.querySelector('#connect');
connectButton.addEventListener('click', event => {
    socket.open();
});

socket.on('connect', async () => {
    console.log('[OK] Connected to the signaling server.');
    console.log('[..] Registering username...');
    socket.emit('login', {  // TODO: this needs to be secured for practical use
        username: username
    });
});

async function call() {
    localStreams.forEach(stream => stream.getTracks().forEach(track => peerConnection.addTrack(track, stream)));
    console.log('added all tracks');

    const offer = await peerConnection.createOffer();
    console.log('[OK] Created offer.');
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    console.log('[OK] Local description set.');

    socket.emit('submit offer', {
        offer: offer,
        to: null
    });
    console.log('[..] Submitting offer.');

    socket.on('offer accepted', async data => {
        console.log('[OK] Offer accepted.');
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
        console.log('[OK] Remote description set.');
    });

    socket.on('candidate available', data => {
        console.log('[OK] Received an ICE Candidate: ' + JSON.stringify(data));
        if (data.candidate === null) return;
        peerConnection.addIceCandidate(data.candidate);
    });

    peerConnection.onicecandidate = ({candidate}) => {
        console.log('[OK] Registered an ICE Candidate: ' + JSON.stringify(candidate));
        socket.emit('submit candidate', { 
            candidate: candidate,
            to: null
        });
    };

    peerConnection.ontrack = function({ streams: [stream] }) {
        console.log('[OK] Received stream.');
        const remoteVideo = document.getElementById("remote-video");
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
        }
    };

    // Listen for connectionstatechange on the local RTCPeerConnection
    peerConnection.addEventListener('connectionstatechange', event => {
        console.log('event! ' + JSON.stringify(event));
        console.log('state! ' + peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            // Peers connected!
            alert('connected!');
        }
    });
}

async function stop() {
    peerConnection.close();
}

/* UI Code */
let username = window.prompt('username');

(async function() {
    let message = document.querySelector('#message');
    message.innerHTML = `Logged in as <strong>${username}</strong>`;

    const callButton = document.getElementById('call');
    callButton.addEventListener('click', call);
    const stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', stop);

    // Grab elements, create settings, etc.

    // Get access to the camera!
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let userList = document.querySelector('#user-list');

        let cameraVideo = null;
        let shareCamera = document.getElementById('share-camera');
        shareCamera.addEventListener('click', e => {
            cameraVideo = document.getElementById('camera');
            // Not adding `{ audio: true }` since we only want video now
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
                //cameraVideo.src = window.URL.createObjectURL(stream);
                cameraVideo.srcObject = stream;
                cameraVideo.play();

                localStreams.push(stream);
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

                localStreams.push(stream);
            }).catch(err => {
                console.log(err);
            });
        });

        // Taking snapshots
        let photoGallery = document.getElementById('photo-gallery');

        // Trigger photo take
        document.getElementById("snap").addEventListener("click", function() {
            var canvas = document.createElement('canvas');
            canvas.classList.add('photo');

            var context = canvas.getContext('2d');
            var video = document.getElementById('video');
            //context.drawImage(cameraVideo, 0, 0, 640, 480);

            let dim = cameraVideo.getBoundingClientRect();
            canvas.width = dim.width;
            canvas.height = dim.height;

            context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
            photoGallery.appendChild(canvas);
        });
    } else {
        alert('your device is not supported');
    }

})();
