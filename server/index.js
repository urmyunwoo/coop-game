const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { RoomManager } = require('./game/Room');

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : '*';

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// 클라이언트 정적 파일 제공
app.use(express.static(path.join(__dirname, '..', 'client'), {
  etag: false,
  maxAge: 0,
}));

const roomManager = new RoomManager();

// 금지 단어 목록 (욕설, 성적 표현, 정치적 표현)
const BANNED_WORDS = [
  // 욕설
  '시발', '씨발', '시바', '씨바', '시빨', '씨빨', 'ㅅㅂ', 'ㅆㅂ',
  '개새끼', '새끼', 'ㅅㄲ', '병신', 'ㅂㅅ', '멍청', '바보',
  '지랄', 'ㅈㄹ', '닥쳐', '꺼져', '미친', 'ㅁㅊ',
  '존나', 'ㅈㄴ', '좆', 'ㅈ같', '엿먹', '썅', '쌍',
  '개같', '개년', '년', '놈', '느금마', '느금',
  '니미', '니엄마', '엠창', 'ㅄ', '빡대가리',
  '죽어', '뒤져', '뒈져', 'ㄲㅈ', '꺼지',
  // 성적 표현
  '섹스', 'sex', '야동', '포르노', 'porn',
  '가슴', '자지', '보지', '성인', '19금',
  '강간', '성폭', 'ㅅㅅ', '떡치', '박아',
  // 정치적 표현
  '윤석열', '이재명', '문재인', '박근혜',
  '국힘', '국민의힘', '더불어', '민주당',
  '좌파', '우파', '좌좀', '우좀',
  '빨갱이', '수꼴', '틀딱', '꼰대',
  '일베', '오유', '워마드', '메갈',
];

function isNicknameBanned(nickname) {
  const lower = nickname.toLowerCase();
  return BANNED_WORDS.some(word => lower.includes(word.toLowerCase()));
}

function isNicknameDuplicate(room, nickname) {
  for (const [, player] of room.players) {
    if (player.nickname === nickname) return true;
  }
  return false;
}
function isColorTaken(room, color) {
  if (!color) return false;
  for (const [, player] of room.players) {
    if (player.color === color) return true;
  }
  return false;
}
io.on('connection', (socket) => {
  console.log(`[접속] ${socket.id}`);

  // 방 생성
  socket.on('create-room', ({ nickname, maxPlayers, color }, callback) => {
    if (!nickname || !nickname.trim()) {
      return callback({ error: '닉네임을 입력해주세요.' });
    }
    if (isNicknameBanned(nickname)) {
      return callback({ error: '사용할 수 없는 닉네임입니다.' });
    }

    const room = roomManager.createRoom(maxPlayers);
    if (color && isColorTaken(room, color)) {
      return callback({ error: '선택한 색상이 이미 사용 중입니다.' });
    }
    const player = room.addPlayer(socket.id, nickname, color);
    roomManager.addPlayerToRoom(socket.id, room.code);
    socket.join(room.code);
    console.log(`[방 생성] ${room.code} (최대 ${maxPlayers}명) by ${nickname}`);
    callback({ roomCode: room.code, player });
  });

  // 방 참가
  socket.on('join-room', ({ roomCode, nickname, color }, callback) => {
    if (!nickname || !nickname.trim()) {
      return callback({ error: '닉네임을 입력해주세요.' });
    }
    if (isNicknameBanned(nickname)) {
      return callback({ error: '사용할 수 없는 닉네임입니다.' });
    }

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
    if (isNicknameDuplicate(room, nickname)) {
      return callback({ error: '이미 같은 닉네임이 사용 중입니다.' });
    }
    if (color && isColorTaken(room, color)) {
      return callback({ error: '선택한 색상이 이미 사용 중입니다.' });
    }

    const player = room.addPlayer(socket.id, nickname, color);
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
    if (room.getPlayerCount() < 1) return callback({ error: '최소 1명이 필요합니다.' });

    room.startGame();
    io.to(room.code).emit('game-started', {
      players: room.getPlayers(),
      stage: room.stage,
      stageIndex: room.stageIndex,
    });
    console.log(`[게임 시작] ${room.code}`);
    callback({ success: true });
  });

  // 커스텀 맵으로 게임 시작 (방장만)
  socket.on('start-custom-game', ({ mapData }, callback) => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room) return callback({ error: '방을 찾을 수 없습니다.' });
    if (room.host !== socket.id) return callback({ error: '방장만 게임을 시작할 수 있습니다.' });
    if (room.getPlayerCount() < 1) return callback({ error: '최소 1명이 필요합니다.' });

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

  // 게임 나가기
  socket.on('leave-game', (_, callback) => {
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
    callback({ success: true });
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
      stageIndex: room.stageIndex,
    });
  }
}, TICK_RATE);

const DEFAULT_PORT = process.env.PORT || 3000;
let port = DEFAULT_PORT;

server.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port === DEFAULT_PORT) {
    port = 3001;
    server.listen(port, () => {
      console.log(`기본 포트 3000이 사용 중이어서 3001에서 서버를 실행합니다: http://localhost:${port}`);
    });
  } else {
    throw err;
  }
});
