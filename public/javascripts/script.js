'use strict';

console.clear();

const { RTCPeerConnection, RTCSessionDescription } = window;
const socket = io();
//const configuration = {'iceServers': [{'urls': 'stun:localhost:8080'}]}
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
let peerConnection = new RTCPeerConnection(configuration);

let localStream = null;

async function call() {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    console.log('added all tracks');

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
    console.log('making offer ' + JSON.stringify(offer));

    socket.emit('offer stream', {
        offer: offer,
        from: socket.id
    });

    socket.on("youre accepted", async data => {
        console.log('owo i am accepted ');
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
        console.log('yay set');

        /*if (!isAlreadyCalling) {
            callUser(data.socket);
            isAlreadyCalling = true;
        }*/
    });

    socket.on('heres the candidate', data => {
        console.log('got data ' + JSON.stringify(data));
        if (data.candidate === null) return;
        peerConnection.addIceCandidate(data.candidate);
    });

    peerConnection.onicecandidate = ({candidate}) => {
        console.log('got candidate ' + JSON.stringify(candidate));
        socket.emit('sending candidate', { 
            candidate: candidate,
            to: null
        });
    };

    peerConnection.ontrack = function({ streams: [stream] }) {
        console.log('bleh ' + stream);
        const remoteVideo = document.getElementById("remote-video");
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
        }
    };

    //// Listen for local ICE candidates on the local RTCPeerConnection
    //peerConnection.addEventListener('icecandidate', event => {
    //    if (event.candidate) {
    //        signalingChannel.send({'new-ice-candidate': event.candidate});
    //    }
    //});

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

(async function() {
    const callButton = document.getElementById('call');
    callButton.addEventListener('click', call);
    const stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', stop);

    socket.on('connect', async () => {
        console.log('ready');
    });

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

                localStream = stream;
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

/*this.io = io();
navigator.mediaDevices.getUserMedia(
    { video: true, audio: true },
    stream => {
        const localVideo = document.getElementById("local-video");
        if (localVideo) {
            localVideo.srcObject = stream;
        }
    },
    error => {
        console.warn(error.message);
    }
);

this.io.on("connection", socket => {
    const existingSocket = this.activeSockets.find(
        existingSocket => existingSocket === socket.id
    );

    if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
            users: this.activeSockets.filter(
                existingSocket => existingSocket !== socket.id
            )
        });

        socket.broadcast.emit("update-user-list", {
            users: [socket.id]
        });
    }

    socket.on("update-user-list", ({ users }) => {
        console.log(users);
        //updateUserList(users);
    });

    socket.on("remove-user", ({ socketId }) => {
        const elToRemove = document.getElementById(socketId);

        if (elToRemove) {
            elToRemove.remove();
        }
    });
});

const { RTCPeerConnection, RTCSessionDescription } = window;

async function callUser(socketId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
        offer,
        to: socketId
    });
}*/
