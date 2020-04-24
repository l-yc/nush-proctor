'use strict';
console.clear();

/* Peer Connection */
const { RTCPeerConnection, RTCSessionDescription } = window;
const configuration = {'iceServers': [
  {'urls': 'stun:stun.l.google.com:19302'}
  //{'urls': 'stun:stun1.l.google.com:19302'}
  //{'urls': 'stun:localhost:8080'}
]}

class Student {
  constructor(username) {
    this.username = username;

    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = ({candidate}) => {
      console.log('[PROCTOR] Obtained an ICE Candidate: %o.', candidate);
      if (candidate === null) return; // useless
      socket.emit('submit candidate', { 
        candidate: candidate,
        from: socket.id
      });
    };

    this.peerConnection.addEventListener('connectionstatechange', event => {
      console.log('[PROCTOR] Connection has changed: %o.', event);
      console.log('[PROCTOR] Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'connected') {
        // Peers connected!
        console.log('[PROCTOR] %s has connected to remote stream.', this.username);
        alert('Connected!');
      } else if (['disconnected', 'failed', 'closed'].includes(this.peerConnection.connectionState)) {
        if (this.peerConnection.connectionState !== 'closed') {
          this.peerConnection.close();
          this.peerConnection = null;
        } else {
          console.warn('[PROCTOR] %s has disconnected from remote stream.', this.username);
          alert(this.username + ' has disconnected.');
          this.destroy();
        }
      }
    });

    this.DOMContainer = null;
    this.addedStreams = {};
    this.peerConnection.ontrack = ({ streams: [stream] }) => {  // called once per track
      // stream is the MediaStream that the current track (event.track) belongs to
      console.log('[PROCTOR] Received stream %o.', stream.getTracks());
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
      //remoteVideo.load(); 
      remoteVideo.srcObject = stream;

      this.DOMContainer.appendChild(remoteVideo);
    };
  }

  destroy() {
    let box = this.DOMContainer.parentNode;
    console.log(box);
    if (box) box.parentNode.removeChild(box);
    delete this;
  }
};

let students = {};

/* Signaling Server */
const socket = io({
  autoConnect: false
});

socket.on('connect', () => {
  console.log('[PROCTOR] Connected.');
  socket.emit('login', {
    secret: 'AWTX2fBlP+6CDYamKfPZ+A=='
  });
});

let connectButton = document.querySelector('#connect');
connectButton.addEventListener('click', e => {
  socket.open();
});

let onlineUsers = {};
socket.on('online users', data => {
  console.log('[PROCTOR] Online users: %o', data);
  onlineUsers = data;

  let ul = document.querySelector('#online-users');
  while (ul.firstChild) { ul.removeChild(ul.firstChild); }
  Object.keys(data).forEach(async (key) => {
    let li = document.createElement('li');
    li.classList.add('list-item');
    li.innerHTML = data[key];
    li.dataset.id = key;
    ul.appendChild(li);
  });
});

socket.on('candidate available', data => {
  console.log('[PROCTOR] Received candidate %o.', data);
  if (!students[data.from]) return;
  students[data.from].peerConnection.addIceCandidate(data.candidate);
});

socket.on('available offer', async (data) => {
  console.log('[PROCTOR] Received an offer %o.', data);

  //if (students.has(data.from)) {}
  let s = new Student(onlineUsers[data.from]); // get username
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

  console.log('[PROCTOR] Accepted offer.');
});
