'use strict';

/**
 * Signaling Server class to handle Web Sockets using Socket.io.
 *
 * The following needs to be done in order for created instances to work properly:
 *
 *   1. Set SignalingServer.prototype.Connection: Object
 *     a. An implementation on an appropriate connection is provided in ./webrtcConnection.js
 *     b. However, any other connection implementation can be used, as long as it provides the methods:
 *       * Connection.setIceServers(data.iceServers);
 *         This is called when the signaling server retrieves the ICE Server details.
 *
 *   2. Call signalingServer.setConnections(connections: JSON)
 *     a. connections will be used as a map of socket.id to connections
 *     b. created connections in other parts of the code MUST be added to this dictionary
 *     c. newly created connections (by the caller) MUST be assigned to connections[null]
 *
 *   3. Call signalingServer.setUi(ui: Object)
 *     a. An implementation for this must provide the methods:
 *       * ui.setUsername(username: String)
 */

class SignalingServer {
  constructor() { }

  setConnections(connections) { // yes this should be a setter, but I dont want to rename
    this.connections = connections; // all my variables now to avoid infinite recursion
  }

  setUi(ui) { // yes this should be a setter, but I dont want to rename
    this.ui = ui; // all my variables now to avoid infinite recursion
  }

  init() {
    if (!this.connections || !this.ui) return; // there's no connections to monitor for!

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

      this.ui.setUsername(data.username);
    });

    socket.on('offer accepted', data => {
      console.log('[PROCTOR] Offer accepted.');
      let conn = this.connections[null]; // find the unassigned connection
      conn.from = data.from.socket; // set the source as well
      this.connections[data.from.socket] = conn; // assign it correctly!

      conn.handleAnswer(data.answer);
    });

    socket.on('candidate available', data => {
      console.log('[PROCTOR] Received an ICE Candidate: %o', data);
      if (data.candidate === null) return; // end of candidate stream

      let conn = this.connections[data.from.socket];
      conn.handleCandidate(data.candidate);
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

export { SignalingServer };
