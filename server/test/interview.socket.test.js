const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');

process.env.JWT_SECRET = 'test-jwt-secret';

const chatMessageModelPath = path.join(__dirname, '..', 'src', 'modules', 'interviews', 'chatMessage.model.js');
const interviewModelPath = path.join(__dirname, '..', 'src', 'modules', 'interviews', 'interview.model.js');
const auditLogModelPath = path.join(__dirname, '..', 'src', 'modules', 'audit', 'auditLog.model.js');
const whiteboardModelPath = path.join(__dirname, '..', 'src', 'modules', 'interviews', 'whiteboardEvent.model.js');

let chatMessages = [];
let auditLogs = [];

mockRequire(chatMessageModelPath, {
  find: () => {
    return {
      sort: () => {
        return {
          limit: () => Promise.resolve([])
        }
      }
    }
  },
  create: async (data) => {
    chatMessages.push(data);
    return data;
  }
});

mockRequire(interviewModelPath, {
  findById: async (id) => ({
    _id: id,
    roomMetadata: {},
    duration: 45,
    save: async function() { return this; }
  })
});

mockRequire(auditLogModelPath, {
  create: async (data) => {
    auditLogs.push(data);
    return data;
  }
});

mockRequire(whiteboardModelPath, {
  findOne: async () => null,
  findOneAndUpdate: async () => null
});

mockRequire('jsonwebtoken', {
  verify: (token, secret, cb) => {
    if (token === 'valid-token') {
      cb(null, { id: 'user-1' });
    } else {
      cb(new Error('Invalid token'));
    }
  }
});

const registerInterviewHandlers = require('../src/modules/interviews/interview.socket');

class MockSocket {
  constructor(token) {
    this.handshake = { auth: { token } };
    this.id = `socket-${Date.now()}`;
    this.rooms = new Set();
    this.emitted = [];
    this.broadcast = [];
    this.events = {};
  }
  join(room) {
    this.rooms.add(room);
  }
  emit(event, data) {
    this.emitted.push({ event, data });
  }
  on(event, handler) {
    this.events[event] = handler;
  }
  to(room) {
    return {
      emit: (event, data) => {
        this.broadcast.push({ room, event, data });
      }
    };
  }
}

class MockIO {
  constructor() {
    this.middlewares = [];
    this.connectionHandlers = [];
  }
  use(fn) {
    this.middlewares.push(fn);
  }
  on(event, handler) {
    if (event === 'connection') {
      this.connectionHandlers.push(handler);
    }
  }
  to(room) {
    return { emit: () => {} };
  }
  
  async connectSocket(socket) {
    for (const mw of this.middlewares) {
      await new Promise((resolve, reject) => {
        mw(socket, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    for (const handler of this.connectionHandlers) {
      handler(socket);
    }
  }
}

test('rejects connection without valid token', async () => {
  const io = new MockIO();
  registerInterviewHandlers(io);

  const socket = new MockSocket('invalid-token');
  await assert.rejects(
    () => io.connectSocket(socket),
    (error) => /Authentication error/.test(error.message)
  );
});

test('accepts connection and handles chat messages', async () => {
  chatMessages = [];
  auditLogs = [];
  
  const io = new MockIO();
  registerInterviewHandlers(io);

  const socket = new MockSocket('valid-token');
  await io.connectSocket(socket);

  assert.equal(socket.user.id, 'user-1');

  // Trigger chat_message event
  await socket.events['chat_message']({
    interviewId: 'int-1',
    senderId: 'user-1',
    content: 'Hello World'
  });

  // Verify broadcast
  assert.equal(socket.broadcast.length, 1);
  assert.equal(socket.broadcast[0].event, 'chat_message_received');
  assert.equal(socket.broadcast[0].data.content, 'Hello World');
  assert.equal(socket.broadcast[0].room, 'interview:int-1');

  // Verify persistence (need a tiny sleep for async persistence)
  await new Promise(r => setTimeout(r, 10));
  assert.equal(chatMessages.length, 1);
  assert.equal(chatMessages[0].content, 'Hello World');
});
