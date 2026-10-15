const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const rooms = new Map(); // roomId -> { players: [{ws, name, id}], createdAt }

function genId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj, exceptWs = null) {
  for (const p of room.players) {
    if (p.ws !== exceptWs) send(p.ws, obj);
  }
}

function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const p of room.players) {
    try { p.ws.close(); } catch (_) {}
  }
  rooms.delete(roomId);
  console.log(`[ROOM] deleted ${roomId}`);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Chess5D Relay OK\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let myRoom = null;
  let myId = null;
  let myName = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'create') {
      if (myRoom) return;
      let id;
      do { id = genId(); } while (rooms.has(id));
      myRoom = id;
      myId = 1;
      myName = (msg.name || 'Host').slice(0, 20);
      rooms.set(id, {
        players: [{ ws, name: myName, id: myId }],
        createdAt: Date.now()
      });
      send(ws, { type: 'created', room: id, playerId: myId, name: myName });
      console.log(`[CREATE] ${id} by ${myName}`);
      return;
    }

    if (msg.type === 'join') {
      if (myRoom) return;
      const id = (msg.room || '').toUpperCase().trim();
      const room = rooms.get(id);
      if (!room) {
        send(ws, { type: 'error', message: 'Phòng không tồn tại' });
        return;
      }
      if (room.players.length >= 2) {
        send(ws, { type: 'error', message: 'Phòng đã đầy' });
        return;
      }
      myRoom = id;
      myId = 2;
      myName = (msg.name || 'Guest').slice(0, 20);
      room.players.push({ ws, name: myName, id: myId });
      send(ws, { type: 'joined', room: id, playerId: myId, name: myName, opponent: room.players[0].name });
      // Notify host
      send(room.players[0].ws, {
        type: 'opponent_joined',
        name: myName,
        playerId: myId
      });
      // Both ready
      broadcast(room, { type: 'start', hostName: room.players[0].name, guestName: myName });
      console.log(`[JOIN] ${myName} -> ${id}`);
      return;
    }

    // Forward mọi tin nhắn game giữa 2 người trong phòng (move, submit, resign...)
    if (myRoom && msg.type && msg.type !== 'create' && msg.type !== 'join') {
      const room = rooms.get(myRoom);
      if (!room) return;
      msg.from = myId;
      msg.fromName = myName;
      broadcast(room, msg, ws);
      return;
    }
  });

  ws.on('close', () => {
    if (!myRoom) return;
    const room = rooms.get(myRoom);
    if (!room) return;
    room.players = room.players.filter(p => p.ws !== ws);
    if (room.players.length === 0) {
      cleanupRoom(myRoom);
    } else {
      // Notify remaining player
      send(room.players[0].ws, { type: 'opponent_left', name: myName });
      console.log(`[LEAVE] ${myName} left ${myRoom}`);
    }
  });

  ws.on('error', () => {});
});

// Auto cleanup empty/old rooms every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (room.players.length === 0 || now - room.createdAt > 2 * 60 * 60 * 1000) {
      cleanupRoom(id);
    }
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Chess5D Relay listening on :${PORT}`);
});
