// 서버와의 소켓 통신 관리
class Network {
  constructor() {
    this.socket = io();
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onGameStarted = null;
    this.onGameState = null;

    this.setupListeners();
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
  }

  createRoom(nickname, maxPlayers) {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-room', { nickname, maxPlayers }, (response) => {
        if (response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  joinRoom(roomCode, nickname) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join-room', { roomCode, nickname }, (response) => {
        if (response.error) reject(response.error);
        else resolve(response);
      });
    });
  }

  startGame() {
    return new Promise((resolve, reject) => {
      this.socket.emit('start-game', null, (response) => {
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

  getSocketId() {
    return this.socket.id;
  }
}
