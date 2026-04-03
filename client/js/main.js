// 메인 진입점: UI 이벤트 바인딩 + 네트워크 연결
const network = new Network();
const game = new Game(document.getElementById('game-canvas'));
let editor = null;

// DOM 요소
const lobbyEl = document.getElementById('lobby');
const waitingRoomEl = document.getElementById('waiting-room');
const gameScreenEl = document.getElementById('game-screen');
const errorMsgEl = document.getElementById('error-msg');

const nicknameInput = document.getElementById('nickname');
const roomCodeInput = document.getElementById('room-code');
const maxPlayersSelect = document.getElementById('max-players');

const createOptionsEl = document.getElementById('create-options');
const joinOptionsEl = document.getElementById('join-options');

const displayRoomCodeEl = document.getElementById('display-room-code');
const playerCountEl = document.getElementById('player-count');
const playerListEl = document.getElementById('player-list');
const btnStart = document.getElementById('btn-start');
const waitingMsgEl = document.getElementById('waiting-msg');

const editorScreenEl = document.getElementById('editor-screen');

let currentRoomCode = null;
let isHost = false;

// === 로비 UI ===

document.getElementById('btn-create').addEventListener('click', () => {
  createOptionsEl.classList.toggle('hidden');
  joinOptionsEl.classList.add('hidden');
  hideError();
});

document.getElementById('btn-join-toggle').addEventListener('click', () => {
  joinOptionsEl.classList.toggle('hidden');
  createOptionsEl.classList.add('hidden');
  hideError();
});

// 방 생성
document.getElementById('btn-create-confirm').addEventListener('click', async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return showError('닉네임을 입력해주세요.');

  const maxPlayers = parseInt(maxPlayersSelect.value);

  try {
    const { roomCode, player } = await network.createRoom(nickname, maxPlayers);
    currentRoomCode = roomCode;
    isHost = true;
    enterWaitingRoom(roomCode, [player], maxPlayers);
  } catch (err) {
    showError(err);
  }
});

// 방 참가
document.getElementById('btn-join-confirm').addEventListener('click', async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return showError('닉네임을 입력해주세요.');

  const roomCode = roomCodeInput.value.trim().toUpperCase();
  if (!roomCode) return showError('방 코드를 입력해주세요.');

  try {
    const { player, players, maxPlayers } = await network.joinRoom(roomCode, nickname);
    currentRoomCode = roomCode;
    isHost = false;
    enterWaitingRoom(roomCode, players, maxPlayers);
  } catch (err) {
    showError(err);
  }
});

// === 대기실 ===

function enterWaitingRoom(roomCode, players, maxPlayers) {
  lobbyEl.classList.add('hidden');
  waitingRoomEl.classList.remove('hidden');

  displayRoomCodeEl.textContent = roomCode;
  updatePlayerList(players, maxPlayers);

  if (isHost) {
    btnStart.classList.remove('hidden');
    document.getElementById('btn-editor').classList.remove('hidden');
    waitingMsgEl.classList.add('hidden');
  }
}

function updatePlayerList(players, maxPlayers) {
  playerCountEl.textContent = `플레이어: ${players.length} / ${maxPlayers || '?'}명`;
  playerListEl.innerHTML = '';
  for (const p of players) {
    const li = document.createElement('li');
    li.style.color = p.color;
    li.textContent = p.nickname + (p.isHost ? ' 👑' : '');
    playerListEl.appendChild(li);
  }
}

// 새 플레이어 참가
network.onPlayerJoined = ({ player, players }) => {
  updatePlayerList(players);
};

// 플레이어 퇴장
network.onPlayerLeft = ({ players, newHost }) => {
  updatePlayerList(players);
  if (newHost && newHost === network.getSocketId()) {
    isHost = true;
    btnStart.classList.remove('hidden');
    document.getElementById('btn-editor').classList.remove('hidden');
    waitingMsgEl.classList.add('hidden');
  }
};

// 게임 시작 버튼
btnStart.addEventListener('click', async () => {
  try {
    await network.startGame();
  } catch (err) {
    showError(err);
  }
});

// === 맵 에디터 ===

document.getElementById('btn-editor').addEventListener('click', () => {
  waitingRoomEl.classList.add('hidden');
  editorScreenEl.classList.remove('hidden');

  if (!editor) {
    editor = new MapEditor(document.getElementById('editor-canvas'));
  }
});

// 블록 선택 버튼들
document.querySelectorAll('.block-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.block-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    if (editor) editor.selectType(btn.dataset.type);
  });
});

// 전체 지우기
document.getElementById('btn-editor-clear').addEventListener('click', () => {
  if (editor) editor.clearAll();
});

// 돌아가기
document.getElementById('btn-editor-back').addEventListener('click', () => {
  editorScreenEl.classList.add('hidden');
  waitingRoomEl.classList.remove('hidden');
});

// 저장하고 플레이
document.getElementById('btn-editor-save').addEventListener('click', async () => {
  if (!editor) return;
  const mapNameInput = document.getElementById('editor-map-name');
  editor.mapName = mapNameInput.value.trim() || '커스텀 맵';
  const mapData = editor.exportMap();

  try {
    await network.startCustomGame(mapData);
  } catch (err) {
    showError(err);
    // 에러 시 대기실로 돌아감
    editorScreenEl.classList.add('hidden');
    waitingRoomEl.classList.remove('hidden');
  }
});

// === 게임 ===

network.onGameStarted = ({ players, stage }) => {
  waitingRoomEl.classList.add('hidden');
  editorScreenEl.classList.add('hidden');
  gameScreenEl.classList.remove('hidden');
  game.updateState(players, stage);
  game.start(network.getSocketId());
};

network.onGameState = ({ players, stage }) => {
  game.updateState(players, stage);
};

// 게임 나가기 버튼
document.getElementById('btn-leave-game').addEventListener('click', async () => {
  try {
    const { players, maxPlayers, roomCode } = await network.leaveGame();
    game.running = false;
    gameScreenEl.classList.add('hidden');
    waitingRoomEl.classList.remove('hidden');
    updatePlayerList(players, maxPlayers);
  } catch (err) {
    showError(err);
  }
});

// 다른 사람이 나가기 눌렀을 때 전원 대기실로 복귀
network.onGameStopped = ({ players, maxPlayers }) => {
  game.running = false;
  gameScreenEl.classList.add('hidden');
  waitingRoomEl.classList.remove('hidden');
  updatePlayerList(players, maxPlayers);
};

// 키보드 입력
const keys = { left: false, right: false, jump: false };

document.addEventListener('keydown', (e) => {
  let changed = false;
  if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; changed = true; }
  if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; changed = true; }
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') { keys.jump = true; changed = true; }
  if (changed) network.sendInput({ ...keys });
});

document.addEventListener('keyup', (e) => {
  let changed = false;
  if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = false; changed = true; }
  if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = false; changed = true; }
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') { keys.jump = false; changed = true; }
  if (changed) network.sendInput({ ...keys });
});

// === 유틸 ===

function showError(msg) {
  errorMsgEl.textContent = msg;
  errorMsgEl.classList.remove('hidden');
}

function hideError() {
  errorMsgEl.classList.add('hidden');
}
