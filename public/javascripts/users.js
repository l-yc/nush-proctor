console.clear();

const { RTCPeerConnection, RTCSessionDescription } = window;
let socket = io();

socket.on('connect', () => {
    socket.emit('whos online');
});

let button = document.querySelector('#clickme');
button.addEventListener('click', e => {
    socket.emit('what offers');
});

socket.on('online users', data => {
    let div = document.querySelector('#content');

    console.log(data);
    let obj = JSON.parse(data);
    console.log(obj);
    div.innerHTML = '';
    for (let i = 0; i < obj.length; ++i) {
        div.innerHTML += obj[i] + '<br>';
    }
});

const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
peerConnection = new RTCPeerConnection(configuration);

socket.on('heres the candidate', data => {
    console.log('got a candidate ' + JSON.stringify(data.candidate));
    if (data.candidate === null) return;
    peerConnection.addIceCandidate(data.candidate);
});

peerConnection.onicecandidate = ({candidate}) => {
    console.log('got candidate ' + JSON.stringify(candidate));
    socket.emit('sending candidate', { 
        candidate: candidate,
        from: socket.id
    });
};

peerConnection.addEventListener('connectionstatechange', event => {
    console.log('event! ' + JSON.stringify(event));
    console.log('state! ' + peerConnection.connectionState);
    if (peerConnection.connectionState === 'connected') {
        // Peers connected!
        alert('connected!');
    }
});

peerConnection.ontrack = function({ streams: [stream] }) {
    console.log('got stream wow ' + stream);
    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
        remoteVideo.srcObject = stream;
    }
};

socket.on('pending offers', data => {
    let div = document.querySelector('#content2');

    let obj = JSON.parse(data);
    div.innerHTML = '';
    Object.keys(obj).forEach(async (key) => {
        //div.innerHTML += key + ': ' + obj[key] + '<br>';
        //const configuration = {'iceServers': [{'urls': 'stun:localhost:8080'}]}

        console.log('offer ', obj[key]);
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(obj[key].offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

        socket.emit('accepted offer', {
            answer: answer,
            to: obj[key].from
        });

        console.log('accepted offer ');
    });
});
