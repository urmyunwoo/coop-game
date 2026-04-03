const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { RoomManager } = require('./game/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 클라이언트 정적 파일 제공
app.use(express.static(path.join(__dirname, '..', 'client')));

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`[접속] ${socket.id}`);

  // 방 생성
  socket.on('create-room', ({ nickname, maxPlayers }, callback) => {
    const room = roomManager.createRoom(maxPlayers);
    const player = room.addPlayer(socket.id, nickname);
    roomManager.addPlayerToRoom(socket.id, room.code);
    socket.join(room.code);
    console.log(`[방 생성] ${room.code} (최대 ${maxPlayers}명) by ${nickname}`);
    callback({ roomCode: room.code, player });
  });

  // 방 참가
  socket.on('join-room', ({ roomCode, nickname }, callback) => {
    const room = roomManager.getRoom(roomCode);

    if (!room) {
      return callback({ error: '존재하지 않는 방입니다.' });
    }
    if (room.isFull()) {
      return callback({ error: '방이 가득 찼습니다.' });
    }
    if (room.state !== 'waiting') {
      return callback({ error: '이미 게임이 시작된 방입니다.' });
    }

    const player = room.addPlayer(socket.id, nickname);
    roomManager.addPlayerToRoom(socket.id, roomCode);
    socket.join(roomCode);

    // 기존 플레이어들에게 새 플레이어 알림
    socket.to(roomCode).emit('player-joined', { player, players: room.getPlayers() });
    console.log(`[참가] ${nickname} → ${roomCode} (${room.getPlayerCount()}/${room.maxPlayers}명)`);

    callback({ player, players: room.getPlayers(), maxPlayers: room.maxPlayers });
  });

  // 게임 시작 (방장만)
  socket.on('start-game', (_, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room) return callback({ error: '방을 찾을 수 없습니다.' });
    if (room.host !== socket.id) return callback({ error: '방장만 게임을 시작할 수 있습니다.' });
    if (room.getPlayerCount() < 2) return callback({ error: '최소 2명이 필요합니다.' });

    room.startGame();
    io.to(room.code).emit('game-started', {
      players: room.getPlayers(),
      stage: room.stage,
    });
    console.log(`[게임 시작] ${room.code}`);
    callback({ success: true });
  });

  // 커스텀 맵으로 게임 시작 (방장만)
  socket.on('start-custom-game', ({ mapData }, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room) return callback({ error: '방을 찾을 수 없습니다.' });
    if (room.host !== socket.id) return callback({ error: '방장만 게임을 시작할 수 있습니다.' });
    if (room.getPlayerCount() < 2) return callback({ error: '최소 2명이 필요합니다.' });

    room.startCustomGame(mapData);
    io.to(room.code).emit('game-started', {
      players: room.getPlayers(),
      stage: room.stage,
    });
    console.log(`[커스텀 게임 시작] ${room.code} - ${mapData.name}`);
    callback({ success: true });
  });

  // 게임 중 나가기 (방은 유지, 대기실로 복귀)
  socket.on('leave-game', (_, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room) return callback({ error: '방을 찾을 수 없습니다.' });

    // 게임 중이면 대기 상태로 되돌림
    if (room.state === 'playing') {
      room.state = 'waiting';
    }

    callback({
      success: true,
      players: room.getPlayers(),
      maxPlayers: room.maxPlayers,
      roomCode: room.code,
    });

    // 같은 방의 다른 플레이어들도 대기실로 돌려보냄
    socket.to(room.code).emit('game-stopped', {
      players: room.getPlayers(),
      maxPlayers: room.maxPlayers,
    });

    console.log(`[게임 나가기] ${socket.id} → ${room.code} (대기실로 복귀)`);
  });

  // 플레이어 입력 처리
  socket.on('player-input', (input) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room || room.state !== 'playing') return;

    room.handleInput(socket.id, input);
  });

  // 접속 해제
  socket.on('disconnect', () => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room) {
      const wasHost = room.host === socket.id;
      room.removePlayer(socket.id);
      roomManager.removePlayerFromRoom(socket.id);

      if (room.getPlayerCount() === 0) {
        roomManager.removeRoom(room.code);
        console.log(`[방 삭제] ${room.code}`);
      } else {
        io.to(room.code).emit('player-left', {
          playerId: socket.id,
          players: room.getPlayers(),
          newHost: wasHost ? room.host : null,
        });
      }
    }
    console.log(`[접속 해제] ${socket.id}`);
  });
});

// 게임 루프: 60fps로 모든 방의 상태를 업데이트하고 브로드캐스트
const TICK_RATE = 1000 / 60;

setInterval(() => {
  for (const room of roomManager.getAllRooms()) {
    if (room.state !== 'playing') continue;

    room.update();

    io.to(room.code).emit('game-state', {
      players: room.getPlayers(),
      stage: room.stage,
    });
  }
}, TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
