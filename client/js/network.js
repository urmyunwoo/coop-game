// 서버와의 소켓 통신 관리
class Network {
  constructor() {
    const origin = window.location.origin;
    const socketUrl = origin.startsWith('file://') ? 'http://localhost:3000' : origin;
    this.socket = io(socketUrl);
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onGameStarted = null;
    this.onGameState = null;
    this.onGameStopped = null;
    this.onConnect = null;
    this.onConnectError = null;

      this.onGameStopped = null;
      this.onConnect = null;
      this.onConnectError = null;
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      if (this.onConnect) this.onConnect();
    });
    this.socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
      if (this.onConnectError) this.onConnectError(err);
    });
  }

  setupListeners() {
    this.socket.on('player-joined', (data) => {
      if (this.onPlayerJoined) this.onPlayerJoined(data);
    });

    this.socket.on('player-left', (data) => {
      if (this.onPlayerLeft) this.onPlayerLeft(data);
    });

    this.socket.on('game-started', (data) => {
      if (this.onGameStarted) this.onGameStarted(data);
    });

    this.socket.on('game-state', (data) => {
      if (this.onGameState) this.onGameState(data);
    });

    this.socket.on('game-stopped', (data) => {
      if (this.onGameStopped) this.onGameStopped(data);
    });
  }

  createRoom(nickname, maxPlayers, color) {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-room', { nickname, maxPlayers, color }, (response) => {
        if (response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  joinRoom(roomCode, nickname, color) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join-room', { roomCode, nickname, color }, (response) => {
        if (response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  startGame() {
    return new Promise((resolve, reject) => {
      this.socket.emit('start-game', {}, (response) => {
        if (response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  leaveGame() {
    return new Promise((resolve, reject) => {
      this.socket.emit('leave-game', null, (response) => {
        if (response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  startCustomGame(mapData) {
    return new Promise((resolve, reject) => {
      this.socket.emit('start-custom-game', { mapData }, (response) => {
        if (response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  sendInput(input) {
    this.socket.emit('player-input', input);
  }

  leaveGame() {
    return new Promise((resolve, reject) => {
      this.socket.emit('leave-game', null, (response) => {
        if (response && response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  getSocketId() {
    return this.socket.id;
  }
}
