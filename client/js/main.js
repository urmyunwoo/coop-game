// 메인 진입점: UI 이벤트 바인딩 + 네트워크 연결
const network = new Network();
network.setupListeners();
const game = new Game(document.getElementById('game-canvas'));
let editor = null;

// 색상 팔레트 (플레이어별 색상)
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
];

// DOM 요소
const lobbyEl = document.getElementById('lobby');
const waitingRoomEl = document.getElementById('waiting-room');
const gameScreenEl = document.getElementById('game-screen');
const errorMsgEl = document.getElementById('error-msg');
const editorScreenEl = document.getElementById('editor-screen');
const loadMapScreenEl = document.getElementById('load-map-screen');
const roomCodeInput = document.getElementById('room-code');
const maxPlayersSelect = document.getElementById('max-players');
const colorButtonsEl = document.getElementById('color-buttons');

const createOptionsEl = document.getElementById('create-options');
const joinOptionsEl = document.getElementById('join-options');
const nicknameInput = document.getElementById('nickname');

let selectedColor = COLORS[0]; // 기본 색상

const displayRoomCodeEl = document.getElementById('display-room-code');
const playerCountEl = document.getElementById('player-count');
const playerListEl = document.getElementById('player-list');
const btnStart = document.getElementById('btn-start');
const waitingMsgEl = document.getElementById('waiting-msg');

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
    const { roomCode, player } = await network.createRoom(nickname, maxPlayers, selectedColor);
    currentRoomCode = roomCode;
    isHost = true;
    enterWaitingRoom(roomCode, [player], maxPlayers);
  } catch (err) {
    showError(err);
  }
});

// 혼자 플레이
document.getElementById('btn-solo').addEventListener('click', async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return showError('닉네임을 입력해주세요.');

  try {
    const { roomCode, player } = await network.createRoom(nickname, 1, selectedColor);
    currentRoomCode = roomCode;
    isHost = true;
    enterWaitingRoom(roomCode, [player], 1);
    await network.startGame();
  } catch (err) {
    showError(err);
  }
});

// 방 참가
document.getElementById('btn-join-confirm').addEventListener('click', async () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) return showError('닉네임을 입력해주세요.');

  const roomCode = roomCodeInput.value.trim();
  if (!roomCode) return showError('방 번호를 입력해주세요.');
  if (!/^\d+$/.test(roomCode)) return showError('방 번호는 숫자만 입력해주세요.');

  try {
    const { player, players, maxPlayers } = await network.joinRoom(roomCode, nickname, selectedColor);
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
    document.getElementById('btn-load-map').classList.remove('hidden');
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
    document.getElementById('btn-load-map').classList.remove('hidden');
    waitingMsgEl.classList.add('hidden');
  }
};

network.onConnectError = (err) => {
  showError('서버에 연결할 수 없습니다. 콘솔을 확인해주세요.');
};

network.onConnect = () => {
  hideError();
};

// 게임 시작 버튼
btnStart.addEventListener('click', async () => {
  try {
    await network.startGame();
  } catch (err) {
    showError(err);
  }
});

// 맵 에디터
document.getElementById('btn-editor').addEventListener('click', () => {
  waitingRoomEl.classList.add('hidden');
  editorScreenEl.classList.remove('hidden');

  if (!editor) {
    editor = new MapEditor(document.getElementById('editor-canvas'));
  }
});

// 맵 불러오기
document.getElementById('btn-load-map').addEventListener('click', () => {
  waitingRoomEl.classList.add('hidden');
  loadMapScreenEl.classList.remove('hidden');
  showMapList();
});

// 저장된 맵 목록 표시
function showMapList() {
  const mapListEl = document.getElementById('map-list');
  const maps = MapEditor.getSavedMaps();
  const mapNames = Object.keys(maps);

  if (mapNames.length === 0) {
    mapListEl.innerHTML = '<li style="color: #888; border: none; cursor: default;">저장된 맵이 없습니다.</li>';
    return;
  }

  mapListEl.innerHTML = '';
  mapNames.forEach(mapName => {
    const mapData = maps[mapName];
    const li = document.createElement('li');
    
    const info = document.createElement('div');
    info.className = 'map-item-info';
    info.innerHTML = `
      <div class="map-item-name">${mapName}</div>
      <div class="map-item-time">${mapData.timestamp}</div>
    `;
    
    const buttons = document.createElement('div');
    buttons.className = 'map-item-buttons';
    
    const loadBtn = document.createElement('button');
    loadBtn.className = 'map-load-btn';
    loadBtn.textContent = '로드';
    loadBtn.addEventListener('click', () => {
      if (!editor) {
        editor = new MapEditor(document.getElementById('editor-canvas'));
      }
      editor.loadFromLocalStorage(mapName);
      document.getElementById('editor-map-name').value = mapName;
      
      loadMapScreenEl.classList.add('hidden');
      editorScreenEl.classList.remove('hidden');
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'map-delete-btn';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`"${mapName}" 맵을 삭제하시겠습니까?`)) {
        MapEditor.deleteMap(mapName);
        showMapList();
      }
    });
    
    buttons.appendChild(loadBtn);
    buttons.appendChild(deleteBtn);
    
    li.appendChild(info);
    li.appendChild(buttons);
    mapListEl.appendChild(li);
  });
}

// 맵 불러오기 화면에서 돌아가기
document.getElementById('btn-load-map-back').addEventListener('click', () => {
  loadMapScreenEl.classList.add('hidden');
  waitingRoomEl.classList.remove('hidden');
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

// 맵 저장
document.getElementById('btn-editor-save-map').addEventListener('click', () => {
  if (!editor) return;
  const mapNameInput = document.getElementById('editor-map-name');
  const name = mapNameInput.value.trim() || '커스텀 맵';
  editor.mapName = name;
  const savedName = editor.saveMap(name);
  alert(`"${savedName}" 맵이 저장되었습니다!`);
});

// 불러오기 토글
document.getElementById('btn-editor-load-toggle').addEventListener('click', () => {
  const panel = document.getElementById('saved-maps-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    refreshSavedMapsList();
  }
});

// 닫기
document.getElementById('btn-close-saved-maps').addEventListener('click', () => {
  document.getElementById('saved-maps-panel').classList.add('hidden');
});

function refreshSavedMapsList() {
  if (!editor) return;
  const list = document.getElementById('saved-maps-list');
  const noMaps = document.getElementById('no-saved-maps');
  const maps = editor.getSavedMaps();

  list.innerHTML = '';
  if (maps.length === 0) {
    noMaps.classList.remove('hidden');
    return;
  }
  noMaps.classList.add('hidden');

  maps.forEach((map, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="saved-map-name">${map.name}</span>
      <span class="saved-map-date">${map.savedAt || ''}</span>
      <div class="saved-map-actions">
        <button class="saved-map-load" data-idx="${idx}">불러오기</button>
        <button class="saved-map-delete" data-idx="${idx}">삭제</button>
      </div>
    `;
    list.appendChild(li);
  });

  // 불러오기 버튼
  list.querySelectorAll('.saved-map-load').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = editor.loadMap(parseInt(btn.dataset.idx));
      if (name) {
        document.getElementById('editor-map-name').value = name;
        document.getElementById('saved-maps-panel').classList.add('hidden');
      }
    });
  });

  // 삭제 버튼
  list.querySelectorAll('.saved-map-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      editor.deleteMap(parseInt(btn.dataset.idx));
      refreshSavedMapsList();
    });
  });
}

// 저장하고 플레이
document.getElementById('btn-editor-save').addEventListener('click', async () => {
  if (!editor) return;
  const mapNameInput = document.getElementById('editor-map-name');
  const mapName = mapNameInput.value.trim() || '커스텀 맵';
  editor.mapName = mapName;
  
  // 로컬 스토리지에 맵 저장
  editor.saveToLocalStorage(mapName);
  
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
  loadMapScreenEl.classList.add('hidden');
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
const mouse = { x: 0, y: 0, pulling: false };

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
  if (changed) network.sendInput({ ...keys, mouse });
});

// 마우스 입력 (스테이지 2에서만)
const canvas = document.getElementById('game-canvas');

// 나가기 버튼
document.getElementById('btn-quit-game').addEventListener('click', async () => {
  if (confirm('정말 게임을 나가시겠습니까?')) {
    try {
      await network.leaveGame();
      gameScreenEl.classList.add('hidden');
      lobbyEl.classList.remove('hidden');
      game.running = false;
      nicknameInput.value = '';
      roomCodeInput.value = '';
      currentRoomCode = null;
      isHost = false;
    } catch (err) {
      showError(err);
    }
  }
});

gameScreenEl.addEventListener('mousedown', (e) => {
  if (game.stageIndex === 1) { // 스테이지 2
    mouse.pulling = true;
    updateMousePosition(e);
    network.sendInput({ ...keys, mouse });
  }
});

gameScreenEl.addEventListener('mousemove', (e) => {
  if (game.stageIndex === 1) {
    updateMousePosition(e);
    if (mouse.pulling) {
      network.sendInput({ ...keys, mouse });
    }
  }
});

gameScreenEl.addEventListener('mouseup', (e) => {
  if (game.stageIndex === 1) {
    mouse.pulling = false;
    network.sendInput({ ...keys, mouse });
  }
});

function updateMousePosition(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
}

// === 유틸 ===

function showError(msg) {
  errorMsgEl.textContent = msg;
  errorMsgEl.classList.remove('hidden');
}

function hideError() {
  errorMsgEl.textContent = '';
  errorMsgEl.classList.add('hidden');
}

// 색상 버튼 생성
function createColorButtons() {
  colorButtonsEl.innerHTML = '';
  COLORS.forEach(color => {
    const button = document.createElement('button');
    button.className = 'color-button';
    button.style.backgroundColor = color;
    button.dataset.color = color;
    if (color === selectedColor) {
      button.classList.add('selected');
    }
    button.addEventListener('click', () => {
      document.querySelectorAll('.color-button').forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      selectedColor = color;
    });
    colorButtonsEl.appendChild(button);
  });
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  createColorButtons();
});
