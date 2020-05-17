'use strict';
console.clear();

// FIXME: this code is really messy...can we do something?

/* UI Code */

class UI {
  constructor() {
    this.localStreams = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your device is not supported.');
    }

    let connectButton = document.querySelector('#connect');
    let disconnectButton = document.querySelector('#disconnect');
    disconnectButton.disabled = true;

    connectButton.addEventListener('click', e => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        console.log('got stream %o', stream)
        this.addStream(stream);
      })
        .then(() => {
          connectButton.disabled = true;
          disconnectButton.disabled = false;
          socket.open();
        })
        .catch(err => {
          console.log('error: ' + err);
          switch(err.name) {
            case 'NotFoundError':
              alert('Unable to open your call because no camera and/or microphone' +
                ' were found.');
              break;
            case 'NotAllowedError':
            case 'SecurityError':
            case 'PermissionDeniedError':
              // Do nothing; this is the same as the user canceling the call.
              alert('You must enable your microphone to use this app.');
              break;
            default:
              alert('Error opening your camera and/or microphone: ' + err.message);
              break;
          }
        });
    });

    disconnectButton.addEventListener('click', e => {
      connectButton.disabled = false;
      disconnectButton.disabled = true;
      socket.close();
      Object.keys(students).forEach(key => {
        let s = students[key];
        Object.keys(s.connections).forEach(key2 => {
          let conn = s.connections[key2];
          conn.stop();
        });
      });
    });

    // removes visual bell of a student when you click anywhere inside the student div
    let studentContainer = document.querySelector('#student-container');
    studentContainer.addEventListener('click', e => {
      console.log(e.target);
      let p = e.target.closest('.student');
      if (p) {
        p.classList.remove('highlight');
      }
    });
  }

  setUsername(username) {
    let signalingStateIndicator = document.querySelector('#signaling-state');
    signalingStateIndicator.innerHTML = `Logged in as <strong>${username}</strong>`;
  }

  setOnlineUsers(users) {
    let div = document.querySelector('#online-users');
    while (div.firstChild) { div.removeChild(div.firstChild); }
    Object.keys(users).forEach(async (key) => {
      let i = document.createElement('div');
      i.classList.add('list-item');
      i.innerHTML = users[key].username;
      i.dataset.id = key;
      div.appendChild(i);
    });
  }

  addStream(stream) {
    this.localStreams.push(stream);
    // if (conn) { // TODO: need to renegotiate for this to work
    //   console.log('[PROCTOR] Adding stream... %o', stream);
    //   stream.getTracks().forEach(track => conn.peerConnection.addTrack(track, stream));
    // }
  }

  async beep() {
    let snd = new Audio('/sound/disconnect.mp3');
    return snd.play();
  }
};

let ui = null;

/* Signaling Server */
const socket = io({
  autoConnect: false
});

socket.on('connect', () => {
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
  ui.setUsername(data.username);
  Connection.setIceServers(data.iceServers);
});

/* WebRTC Peer Connection */
const { RTCPeerConnection, RTCSessionDescription } = window;

import { Connection as _Connection } from './webrtcConnection.js';

class Connection extends _Connection {
  async stop() { // override this
    this.peerConnection.close();
    if (this.timeoutHandle) window.clearTimeout(this.timeoutHandle);

    console.log('destroying a remote stream...');
    let cb = await this.destructionCallback();
    console.log('deleting the remote stream...');
    delete this;
    if (cb) cb();
  }
};

Connection.prototype.signalingServer = { // FIXME: temporary glue
  submitOffer: function (offer, to) {
  },
  submitCandidate: function (candidate, to) {
    socket.emit('submit candidate', { 
      candidate: candidate,
      to: to
    });
  }
};

Connection.prototype.ui = {
  setStatus: function () {} // we don't actually monitor status closely here
};

class Student {
  constructor(from, username) {
    this.from = from;
    this.username = username;

    this.connections = {};

    let s = document.createElement('div');
    s.classList.add('student');

    s.innerHTML = `<p class="student-info">${this.username}</p>
      <button class="talk btn">
        <i class="las la-microphone la-lg"></i>
        <span class="text">talk</button>
      </button>`;

    // Local muting
    let talkButton = s.querySelector('.talk');
    talkButton.onclick = evt => {
      talkButton.querySelector('i').classList.toggle('la-microphone');
      talkButton.querySelector('i').classList.toggle('la-microphone-slash');
      if (talkButton.querySelector('span').innerText == 'talk') {
        Object.keys(this.connections).forEach(key => {
          let conn = this.connections[key];
          conn.rtpSender.replaceTrack(conn.track);
          //conn.rtpSender.track.enabled = true;
        });
        talkButton.querySelector('span').innerText = 'mute';
      } else {
        Object.keys(this.connections).forEach(key => {
          let conn = this.connections[key];
          conn.rtpSender.replaceTrack(null);
          //conn.rtpSender.track.enabled = false;
        });
        talkButton.querySelector('span').innerText = 'talk';
      }
    };

    let div = document.createElement('div');
    div.classList.add('video-container');
    let videoContainer = document.querySelector('#student-container');
    this.DOMContainer = div;

    s.appendChild(div);
    videoContainer.appendChild(s);

    this.DOMNode = s;
  }

  createNewConnection(src) {
    let conn = new Connection(src);

    conn.addedStreams = {};
    conn.peerConnection.ontrack = ({ streams: [stream] }) => {  // called once per track
      // stream is the MediaStream that the current track (event.track) belongs to
      console.log('[PROCTOR] Received stream %o.', stream.getTracks());
      if (stream.id in conn.addedStreams) return;  // this stream is already added
      conn.addedStreams[stream.id] = true;

      let remoteVideo = document.createElement('video');
      remoteVideo.autoplay = true;
      remoteVideo.controls = true;
      remoteVideo.playsInline = true;
      //remoteVideo.load(); 
      remoteVideo.srcObject = stream;

      conn.video.push(remoteVideo);

      this.DOMContainer.appendChild(remoteVideo);
    };

    conn.destructionCallback = () => new Promise(async (resolve, reject) => {
      await ui.beep();
      console.warn('[PROCTOR] %s has disconnected a remote stream.', this.username);
      //alert(this.username + ' has disconnected a stream.');

      conn.video.forEach(remoteVideo => {
        this.DOMContainer.removeChild(remoteVideo);
      });

      console.log('maybe deleting connection with %s', conn.from);
      if (this.connections[conn.from] === conn) delete this.connections[conn.from];
      let cb = () => {};
      console.log('i have %d connections', Object.keys(this.connections).length);
      if (Object.keys(this.connections).length === 0) {
        cb = () => this.stop();
      }
      console.log('passing cb %o', cb);
      resolve(cb);
    });

    console.log('created connection %o', conn);
    console.log('added connection with %s', conn.from);
    let oldConn = this.connections[src];
    this.connections[src] = conn;
    if (oldConn) oldConn.stop();

    return conn;
  }

  async stop() { 
    //this.peerConnection.close();
    //if (this.timeoutHandle) window.clearTimeout(this.timeoutHandle);

    //await beep();
    console.warn('[PROCTOR] %s has disconnected from remote stream.', this.username);
    //alert(this.username + ' has disconnected.');

    let box = this.DOMContainer.parentNode;
    if (box && box.parentNode) box.parentNode.removeChild(box);

    delete students[this.from];
    delete this; // delete all references
  }
};

let students = {};

let onlineUsers = {};
socket.on('online users', data => {
  console.log('[PROCTOR] Online users: %o', data);
  onlineUsers = data;

  ui.setOnlineUsers(data);
});

socket.on('candidate available', data => {
  console.log('[PROCTOR] Received candidate %o.', data);
  if (!students[data.from.user]) return;
  students[data.from.user].connections[data.from.socket].peerConnection.addIceCandidate(data.candidate);
});

socket.on('available offer', async (data) => {
  console.log('[PROCTOR] Received an offer %o.', data);

  console.log('[PROCTOR] Current student is %o', students[data.from.user]);
  if (!students.hasOwnProperty(data.from.user) || !students[data.from.user]) {
    students[data.from.user] = new Student(data.from.user, onlineUsers[data.from.user].username); // get username
    console.log('[PROCTOR] Created new student %s.', data.from.user)
  }
  let s = students[data.from.user];
  let conn = s.createNewConnection(data.from.socket);
  console.log('[PROCTOR] Created new connection for student %s.', data.from.user);

  await conn.peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );

  ui.localStreams.forEach(stream => stream.getTracks().forEach(track => {
    console.log('add track %o of stream %o', track, stream);
    conn.rtpSender = conn.peerConnection.addTrack(track, stream)
    //conn.rtpSender.track.enabled = false;
    conn.track = conn.rtpSender.track;
    conn.rtpSender.replaceTrack(null, stream);
  }));

  const answer = await conn.peerConnection.createAnswer({}); // no options yet
  await conn.peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit('accept offer', {
    answer: answer,
    to: data.from.socket
  });

  console.log('[PROCTOR] Accepted offer.');
});

socket.on('student ping', async (data) => {
  console.log('[PROCTOR] Pinged by %o.', data);

  console.log('[PROCTOR] Current student is %o', students[data.from.user]);
  if (!students.hasOwnProperty(data.from.user) || !students[data.from.user]) {
    console.log('[PROCTOR] Student not found!');
  }
  let s = students[data.from.user];
  s.DOMNode.classList.add('highlight');
  console.log('[PROCTOR] Highlighting user.', data.from.user);
});

(async function() {
  ui = new UI();
})();
