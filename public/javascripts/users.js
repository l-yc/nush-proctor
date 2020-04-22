'use strict';
console.clear();

/* Peer Connection */
const { RTCPeerConnection, RTCSessionDescription } = window;
const configuration = {'iceServers': [
    {'urls': 'stun:stun.l.google.com:19302'}
    //{'urls': 'stun:stun1.l.google.com:19302'}
]}

class Student {
    constructor(username) {
        this.username = username;

        this.peerConnection = new RTCPeerConnection(configuration);

        this.peerConnection.onicecandidate = ({candidate}) => {
            console.log('obtained candidate ' + JSON.stringify(candidate));
            socket.emit('submit candidate', { 
                candidate: candidate,
                from: socket.id
            });
        };

        this.peerConnection.addEventListener('connectionstatechange', event => {
            console.log('event! ' + JSON.stringify(event));
            console.log('state! ' + this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                // Peers connected!
                alert('connected!');
            }
        });

        this.DOMContainer = null;
        this.addedStreams = {};
        this.peerConnection.ontrack = ({ streams: [stream] }) => {  // called once per track
            // stream is the MediaStream that the current track (event.track) belongs to
            console.log('got stream wow %o', stream.getTracks());
            //const remoteVideo = document.getElementById("remote-video");
            //if (remoteVideo) {
            //    remoteVideo.srcObject = stream;
            //}
            console.log('added streams: %o', this.addedStreams);
            if (stream.id in this.addedStreams) return;  // this stream is already added
            if (this.DOMContainer === null) {
                let s = document.createElement('div');
                s.classList.add('student');
                s.innerHTML = `<p>${this.username}</p>`;

                let div = document.createElement('div');
                div.classList.add('remote-video-container');
                let videoContainer = document.querySelector('#video-container');
                this.DOMContainer = div;

                s.appendChild(div);
                videoContainer.appendChild(s);
            }
            this.addedStreams[stream.id] = true;

            let remoteVideo = document.createElement('video');
            remoteVideo.classList.add('remote-video');
            remoteVideo.autoplay = true;
            //vid.load(); 
            remoteVideo.srcObject = stream;

            console.log('appending child ' + remoteVideo);
            this.DOMContainer.appendChild(remoteVideo);
        };
        console.log('added track listener');
    }
};

let students = {};

/* Signaling Server */
const socket = io({
    autoConnect: false
});

socket.on('connect', () => {
    socket.emit('whos online');
});

let connectButton = document.querySelector('#connect');
connectButton.addEventListener('click', e => {
    socket.connect();
    console.log('connected');
    //socket.emit('what offers');
});

socket.on('online users', data => {
    let ul = document.querySelector('#online-users');

    let obj = JSON.parse(data);
    console.log('[OK] Online users: ' + JSON.stringify(obj));
    while (ul.firstChild) { ul.removeChild(ul.firstChild); }
    Object.keys(obj).forEach(async (key) => {
        let li = document.createElement('li');
        li.classList.add('list-item');
        li.innerHTML = obj[key];
        li.dataset.id = key;
        ul.appendChild(li);
    });
});

socket.on('candidate available', data => {
    console.log('received candidate ' + JSON.stringify(data.candidate));
    if (data.candidate === null) return;
    students[data.from].peerConnection.addIceCandidate(data.candidate);
});

socket.on('available offer', async (data) => {
    console.log('offer ', data.offer);

    let s = new Student(data.from);
    students[data.from] = s;

    await s.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );
    const answer = await s.peerConnection.createAnswer();
    await s.peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit('accept offer', {
        answer: answer,
        to: data.from
    });

    console.log('[OK] Accepted offer.');
});
