const PLAYER_SPEED = 5;
const ICE_ACCEL = 0.3;
const ICE_FRICTION = 0.98;
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const BOUNCE_FORCE = -20;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

// 색상 팔레트 (플레이어별 색상)
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
];

// 스테이지 데이터
const STAGES = [
  {
    name: '스테이지 1 - 함께 건너기',
    platforms: [
      { x: 0, y: 550, w: 300, h: 50 },        // 시작 플랫폼
      { x: 400, y: 500, w: 150, h: 50 },       // 중간 발판 1
      { x: 650, y: 440, w: 150, h: 50 },       // 중간 발판 2
      { x: 900, y: 380, w: 300, h: 50 },       // 도착 플랫폼
    ],
    spawnX: 50,
    spawnY: 500,
    goalX: 1100,
    goalY: 330,
    goalW: 60,
    goalH: 50,
  },
  {
    name: '스테이지 2 - 높이 올라가기',
    platforms: [
      { x: 0, y: 550, w: 1200, h: 50 },       // 바닥
      { x: 100, y: 430, w: 200, h: 20 },
      { x: 400, y: 340, w: 200, h: 20 },
      { x: 700, y: 250, w: 200, h: 20 },
      { x: 950, y: 160, w: 200, h: 20 },
    ],
    spawnX: 50,
    spawnY: 500,
    goalX: 1050,
    goalY: 110,
    goalW: 60,
    goalH: 50,
  },
];

class Room {
  constructor(code, maxPlayers) {
    this.code = code;
    this.maxPlayers = maxPlayers;
    this.players = new Map();
    this.host = null;
    this.state = 'waiting'; // waiting, playing, cleared
    this.stageIndex = 0;
    this.stage = null;
    this.playersAtGoal = new Set();
    this.checkpointX = null;
    this.checkpointY = null;
  }

  addPlayer(socketId, nickname) {
    const playerIndex = this.players.size;
    const player = {
      id: socketId,
      nickname,
      color: COLORS[playerIndex % COLORS.length],
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      onGround: false,
      input: { left: false, right: false, jump: false },
    };

    this.players.set(socketId, player);

    // 첫 번째 플레이어가 방장
    if (!this.host) {
      this.host = socketId;
    }

    return { id: player.id, nickname: player.nickname, color: player.color };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.playersAtGoal.delete(socketId);

    // 방장이 나가면 다음 사람에게 넘김
    if (this.host === socketId && this.players.size > 0) {
      this.host = this.players.keys().next().value;
    }
  }

  getPlayers() {
    const result = [];
    for (const [id, p] of this.players) {
      result.push({
        id,
        nickname: p.nickname,
        color: p.color,
        x: p.x,
        y: p.y,
        isHost: id === this.host,
      });
    }
    return result;
  }

  getPlayerCount() {
    return this.players.size;
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  startGame() {
    this.state = 'playing';
    this.stageIndex = 0;
    this.customMap = null;
    this.loadStage();
  }

  startCustomGame(mapData) {
    this.state = 'playing';
    this.customMap = mapData;
    this.stage = { ...mapData };
    this.playersAtGoal.clear();
    this.checkpointX = null;
    this.checkpointY = null;
    this.initMovingPlatforms();

    let i = 0;
    for (const [, player] of this.players) {
      player.x = this.stage.spawnX + i * (PLAYER_WIDTH + 10);
      player.y = this.stage.spawnY;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
      player.onIce = false;
      i++;
    }
  }

  loadStage() {
    if (this.customMap) {
      // 커스텀 맵은 스테이지가 하나뿐
      this.state = 'cleared';
      this.stage = { name: '맵 클리어!', platforms: [], cleared: true };
      return;
    }

    if (this.stageIndex >= STAGES.length) {
      this.state = 'cleared';
      this.stage = { name: '모든 스테이지 클리어!', platforms: [], cleared: true };
      return;
    }

    this.stage = { ...STAGES[this.stageIndex] };
    this.stage.platforms = STAGES[this.stageIndex].platforms.map(p => ({ ...p }));
    this.playersAtGoal.clear();
    this.checkpointX = null;
    this.checkpointY = null;
    this.initMovingPlatforms();

    // 플레이어 위치 초기화 (옆으로 나란히)
    let i = 0;
    for (const [, player] of this.players) {
      player.x = this.stage.spawnX + i * (PLAYER_WIDTH + 10);
      player.y = this.stage.spawnY;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
      player.onIce = false;
      i++;
    }
  }

  initMovingPlatforms() {
    if (!this.stage || !this.stage.platforms) return;
    for (const plat of this.stage.platforms) {
      if (plat.type === 'moving') {
        plat.originX = plat.x;
        plat.moveDir = 1;
        plat.moveRange = 120; // 좌우 120px 이동
        plat.moveSpeed = 2;
      }
    }
  }

  updateMovingPlatforms() {
    if (!this.stage || !this.stage.platforms) return;
    for (const plat of this.stage.platforms) {
      if (plat.type !== 'moving') continue;
      plat.x += plat.moveSpeed * plat.moveDir;
      if (plat.x > plat.originX + plat.moveRange) plat.moveDir = -1;
      if (plat.x < plat.originX - plat.moveRange) plat.moveDir = 1;
    }
  }

  resetAllPlayers() {
    this.playersAtGoal.clear();
    const respawnX = this.checkpointX != null ? this.checkpointX : this.stage.spawnX;
    const respawnY = this.checkpointY != null ? this.checkpointY : this.stage.spawnY;
    let i = 0;
    for (const [, player] of this.players) {
      player.x = respawnX + i * (PLAYER_WIDTH + 10);
      player.y = respawnY;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
      i++;
    }
  }

  resolvePlayerCollisions() {
    const players = [...this.players.values()];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i];
        const b = players[j];

        // AABB 충돌 체크
        const overlapX = Math.min(a.x + PLAYER_WIDTH, b.x + PLAYER_WIDTH) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + PLAYER_HEIGHT, b.y + PLAYER_HEIGHT) - Math.max(a.y, b.y);

        if (overlapX <= 0 || overlapY <= 0) continue;

        // 겹침이 적은 축으로 밀어냄
        if (overlapX < overlapY) {
          // 좌우로 밀어냄
          const pushX = overlapX / 2;
          if (a.x < b.x) {
            a.x -= pushX;
            b.x += pushX;
          } else {
            a.x += pushX;
            b.x -= pushX;
          }
        } else {
          // 위아래로 밀어냄
          const pushY = overlapY / 2;
          if (a.y < b.y) {
            // a가 위에 있음 → a는 b 위에 착지
            a.y -= pushY;
            b.y += pushY;
            a.onGround = true;
            a.vy = 0;
          } else {
            b.y -= pushY;
            a.y += pushY;
            b.onGround = true;
            b.vy = 0;
          }
        }
      }
    }
  }

  handleInput(socketId, input) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.input = input;
  }

  update() {
    if (this.state !== 'playing' || !this.stage) return;

    // 이동발판 업데이트
    this.updateMovingPlatforms();

    for (const [socketId, player] of this.players) {
      // 좌우 이동 (얼음 위에서는 미끄러짐)
      if (player.onIce) {
        if (player.input.left) player.vx -= ICE_ACCEL;
        if (player.input.right) player.vx += ICE_ACCEL;
        player.vx *= ICE_FRICTION;
        if (Math.abs(player.vx) > PLAYER_SPEED) {
          player.vx = player.vx > 0 ? PLAYER_SPEED : -PLAYER_SPEED;
        }
      } else {
        player.vx = 0;
        if (player.input.left) player.vx = -PLAYER_SPEED;
        if (player.input.right) player.vx = PLAYER_SPEED;
      }

      // 점프
      if (player.input.jump && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
      }

      // 중력
      player.vy += GRAVITY;

      // X축 이동 후 충돌
      player.x += player.vx;
      player.onIce = false;
      for (const plat of this.stage.platforms) {
        const platType = plat.type || 'normal';

        // 가시: 히트박스 축소 (좌우 30%, 위 40% 영역만 판정)
        if (platType === 'spike') {
          const spikeMarginX = plat.w * 0.3;
          const spikeTop = plat.y + plat.h * 0.1;
          const spikeBottom = plat.y + plat.h * 0.5;
          if (
            player.x + PLAYER_WIDTH > plat.x + spikeMarginX &&
            player.x < plat.x + plat.w - spikeMarginX &&
            player.y + PLAYER_HEIGHT > spikeTop &&
            player.y < spikeBottom
          ) {
            this.resetAllPlayers();
            return;
          }
          continue;
        }

        if (
          player.x + PLAYER_WIDTH > plat.x &&
          player.x < plat.x + plat.w &&
          player.y + PLAYER_HEIGHT > plat.y &&
          player.y < plat.y + plat.h
        ) {
          // 점프대는 옆에서 막히지 않음
          if (platType === 'bounce') continue;

          // 좌우 벽 충돌
          if (player.vx > 0) {
            player.x = plat.x - PLAYER_WIDTH;
          } else if (player.vx < 0) {
            player.x = plat.x + plat.w;
          }
          player.vx = 0;
        }
      }

      // Y축 이동 후 충돌
      player.y += player.vy;
      player.onGround = false;
      for (const plat of this.stage.platforms) {
        const platType = plat.type || 'normal';

        // 가시: 히트박스 축소
        if (platType === 'spike') {
          const spikeMarginX = plat.w * 0.3;
          const spikeTop = plat.y + plat.h * 0.1;
          const spikeBottom = plat.y + plat.h * 0.5;
          if (
            player.x + PLAYER_WIDTH > plat.x + spikeMarginX &&
            player.x < plat.x + plat.w - spikeMarginX &&
            player.y + PLAYER_HEIGHT > spikeTop &&
            player.y < spikeBottom
          ) {
            this.resetAllPlayers();
            return;
          }
          continue;
        }

        if (
          player.x + PLAYER_WIDTH > plat.x &&
          player.x < plat.x + plat.w &&
          player.y + PLAYER_HEIGHT > plat.y &&
          player.y < plat.y + plat.h
        ) {

          // 점프대: 강하게 튕김
          if (platType === 'bounce' && player.vy >= 0) {
            player.vy = BOUNCE_FORCE;
            player.onGround = false;
            continue;
          }

          if (player.vy >= 0) {
            // 위에서 착지
            player.y = plat.y - PLAYER_HEIGHT;
            player.vy = 0;
            player.onGround = true;

            if (platType === 'ice') {
              player.onIce = true;
            }
            if (platType === 'moving') {
              player.x += plat.moveSpeed * plat.moveDir;
            }
          } else {
            // 아래에서 머리 부딪힘
            player.y = plat.y + plat.h;
            player.vy = 0;
          }
        }
      }

      // 화면 밖으로 떨어지면 전체 리셋
      if (player.y > CANVAS_HEIGHT + 100) {
        this.resetAllPlayers();
        return;
      }

      // 화면 좌우 경계
      if (player.x < 0) player.x = 0;
      if (player.x + PLAYER_WIDTH > CANVAS_WIDTH) player.x = CANVAS_WIDTH - PLAYER_WIDTH;

      // 체크포인트 체크
      for (const plat of this.stage.platforms) {
        if ((plat.type || 'normal') !== 'checkpoint') continue;
        if (
          player.x + PLAYER_WIDTH > plat.x &&
          player.x < plat.x + plat.w &&
          player.y + PLAYER_HEIGHT > plat.y &&
          player.y < plat.y + plat.h
        ) {
          // 새 체크포인트 활성화
          if (this.checkpointX !== plat.x || this.checkpointY !== plat.y - PLAYER_HEIGHT) {
            this.checkpointX = plat.x;
            this.checkpointY = plat.y - PLAYER_HEIGHT;
            plat.activated = true;
          }
        }
      }

      // 골 체크
      if (
        this.stage.goalX &&
        player.x + PLAYER_WIDTH > this.stage.goalX &&
        player.x < this.stage.goalX + this.stage.goalW &&
        player.y + PLAYER_HEIGHT > this.stage.goalY &&
        player.y < this.stage.goalY + this.stage.goalH
      ) {
        this.playersAtGoal.add(socketId);
      } else {
        this.playersAtGoal.delete(socketId);
      }
    }

    // 플레이어 간 충돌 처리 (서로 통과 불가)
    this.resolvePlayerCollisions();

    // 모든 플레이어가 골에 도달하면 다음 스테이지
    if (this.playersAtGoal.size === this.players.size && this.players.size > 0) {
      this.stageIndex++;
      this.loadStage();
    }
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerToRoom = new Map();
  }

  createRoom(maxPlayers = 4) {
    const code = this.generateCode();
    const room = new Room(code, maxPlayers);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  getRoomByPlayer(socketId) {
    const code = this.playerToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  removeRoom(code) {
    this.rooms.delete(code);
  }

  getAllRooms() {
    return this.rooms.values();
  }

  generateCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10);
      }
    } while (this.rooms.has(code));
    return code;
  }

  // addPlayer와 removePlayer에서 playerToRoom 매핑도 관리
  addPlayerToRoom(socketId, roomCode) {
    this.playerToRoom.set(socketId, roomCode);
  }

  removePlayerFromRoom(socketId) {
    this.playerToRoom.delete(socketId);
  }
}

module.exports = { Room, RoomManager, CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT };
