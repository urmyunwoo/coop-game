function setupGameUI({ network, game, MapEditor }) {
  const lobbyEl = document.getElementById('lobby');
  const waitingRoomEl = document.getElementById('waiting-room');
  const gameScreenEl = document.getElementById('game-screen');
  const editorScreenEl = document.getElementById('editor-screen');
  const loadMapScreenEl = document.getElementById('load-map-screen');
  const errorMsgEl = document.getElementById('error-msg');
  const roomCodeInput = document.getElementById('room-code');
  const maxPlayersSelect = document.getElementById('max-players');
  const colorButtonsEl = document.getElementById('color-buttons');
  const createOptionsEl = document.getElementById('create-options');
  const joinOptionsEl = document.getElementById('join-options');
  const nicknameInput = document.getElementById('nickname');
  const displayRoomCodeEl = document.getElementById('display-room-code');
  const playerCountEl = document.getElementById('player-count');
  const playerListEl = document.getElementById('player-list');
  const btnStart = document.getElementById('btn-start');
  const btnEditor = document.getElementById('btn-editor');
  const btnLoadMap = document.getElementById('btn-load-map');
  const waitingMsgEl = document.getElementById('waiting-msg');
  const mapListEl = document.getElementById('map-list');
  const mapNameInput = document.getElementById('editor-map-name');
  const savedMapsPanel = document.getElementById('saved-maps-panel');
  const savedMapsList = document.getElementById('saved-maps-list');
  const noSavedMapsEl = document.getElementById('no-saved-maps');

  const LOBBY_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
  ];

  let selectedColor = LOBBY_COLORS[0];
  let isHost = false;
  let editor = null;
  let currentMaxPlayers = null;

  function showError(msg) {
    errorMsgEl.textContent = msg;
    errorMsgEl.classList.remove('hidden');
  }

  function hideError() {
    errorMsgEl.textContent = '';
    errorMsgEl.classList.add('hidden');
  }

  function createColorButtons() {
    colorButtonsEl.innerHTML = '';
    LOBBY_COLORS.forEach((color) => {
      const button = document.createElement('button');
      button.className = 'color-button';
      button.style.backgroundColor = color;
      button.dataset.color = color;
      if (color === selectedColor) {
        button.classList.add('selected');
      }
      button.addEventListener('click', () => {
        document.querySelectorAll('.color-button').forEach((btn) => btn.classList.remove('selected'));
        button.classList.add('selected');
        selectedColor = color;
      });
      colorButtonsEl.appendChild(button);
    });
  }

  function setHostControlsVisible(visible) {
    btnStart.classList.toggle('hidden', !visible);
    btnEditor.classList.toggle('hidden', !visible);
    btnLoadMap.classList.toggle('hidden', !visible);
    waitingMsgEl.classList.toggle('hidden', visible);
  }

  function updatePlayerList(players, maxPlayers = currentMaxPlayers) {
    playerCountEl.textContent = `플레이어: ${players.length} / ${maxPlayers || '?'}명`;
    playerListEl.innerHTML = '';
    for (const player of players) {
      const li = document.createElement('li');
      li.style.color = player.color;
      li.textContent = player.nickname + (player.isHost ? ' 👑' : '');
      playerListEl.appendChild(li);
    }
  }

  function enterWaitingRoom(roomCode, players, maxPlayers) {
    currentMaxPlayers = maxPlayers;
    lobbyEl.classList.add('hidden');
    waitingRoomEl.classList.remove('hidden');
    editorScreenEl.classList.add('hidden');
    loadMapScreenEl.classList.add('hidden');
    displayRoomCodeEl.textContent = roomCode;
    updatePlayerList(players, maxPlayers);
    setHostControlsVisible(isHost);
  }

  function showLobby() {
    gameScreenEl.classList.add('hidden');
    editorScreenEl.classList.add('hidden');
    loadMapScreenEl.classList.add('hidden');
    waitingRoomEl.classList.add('hidden');
    lobbyEl.classList.remove('hidden');
  }

  function ensureEditor() {
    if (!editor) {
      editor = new MapEditor(document.getElementById('editor-canvas'));
    }
    return editor;
  }

  function showMapList() {
    const maps = MapEditor.getSavedMaps();
    const mapNames = Object.keys(maps);

    if (mapNames.length === 0) {
      mapListEl.innerHTML = '<li style="color: #888; border: none; cursor: default;">저장된 맵이 없습니다.</li>';
      return;
    }

    mapListEl.innerHTML = '';
    mapNames.forEach((mapName) => {
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
        const activeEditor = ensureEditor();
        activeEditor.loadFromLocalStorage(mapName);
        mapNameInput.value = mapName;
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

  function refreshSavedMapsList() {
    if (!editor) return;

    const maps = Object.values(MapEditor.getSavedMaps());
    savedMapsList.innerHTML = '';

    if (maps.length === 0) {
      noSavedMapsEl.classList.remove('hidden');
      return;
    }

    noSavedMapsEl.classList.add('hidden');

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
      savedMapsList.appendChild(li);
    });

    savedMapsList.querySelectorAll('.saved-map-load').forEach((btn) => {
      btn.addEventListener('click', () => {
        const map = maps[parseInt(btn.dataset.idx, 10)];
        if (map && editor.loadFromLocalStorage(map.name)) {
          mapNameInput.value = map.name;
          savedMapsPanel.classList.add('hidden');
        }
      });
    });

    savedMapsList.querySelectorAll('.saved-map-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const map = maps[parseInt(btn.dataset.idx, 10)];
        if (map) {
          MapEditor.deleteMap(map.name);
        }
        refreshSavedMapsList();
      });
    });
  }

  function showEditorScreen() {
    ensureEditor();
    waitingRoomEl.classList.add('hidden');
    loadMapScreenEl.classList.add('hidden');
    editorScreenEl.classList.remove('hidden');
  }

  function showLoadMapScreen() {
    waitingRoomEl.classList.add('hidden');
    loadMapScreenEl.classList.remove('hidden');
    showMapList();
  }

  function returnToWaitingRoom() {
    editorScreenEl.classList.add('hidden');
    loadMapScreenEl.classList.add('hidden');
    waitingRoomEl.classList.remove('hidden');
  }

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

  document.getElementById('btn-create-confirm').addEventListener('click', async () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) return showError('닉네임을 입력해주세요.');

    const maxPlayers = parseInt(maxPlayersSelect.value, 10);

    try {
      const { roomCode, player } = await network.createRoom(nickname, maxPlayers, selectedColor);
      isHost = true;
      enterWaitingRoom(roomCode, [player], maxPlayers);
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('btn-solo').addEventListener('click', async () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) return showError('닉네임을 입력해주세요.');

    try {
      const { roomCode, player } = await network.createRoom(nickname, 1, selectedColor);
      isHost = true;
      enterWaitingRoom(roomCode, [player], 1);
      await network.startGame();
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('btn-join-confirm').addEventListener('click', async () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) return showError('닉네임을 입력해주세요.');

    const roomCode = roomCodeInput.value.trim();
    if (!roomCode) return showError('방 번호를 입력해주세요.');
    if (!/^\d+$/.test(roomCode)) return showError('방 번호는 숫자만 입력해주세요.');

    try {
      const { players, maxPlayers } = await network.joinRoom(roomCode, nickname, selectedColor);
      isHost = false;
      enterWaitingRoom(roomCode, players, maxPlayers);
    } catch (err) {
      showError(err);
    }
  });

  network.onPlayerJoined = ({ players }) => {
    updatePlayerList(players);
  };

  network.onPlayerLeft = ({ players, newHost }) => {
    updatePlayerList(players);
    if (newHost && newHost === network.getSocketId()) {
      isHost = true;
      setHostControlsVisible(true);
    } else if (isHost && newHost && newHost !== network.getSocketId()) {
      isHost = false;
      setHostControlsVisible(false);
    }
  };

  network.onConnectError = () => {
    showError('서버에 연결할 수 없습니다. 콘솔을 확인해주세요.');
  };

  network.onConnect = () => {
    hideError();
  };

  btnStart.addEventListener('click', async () => {
    try {
      await network.startGame();
    } catch (err) {
      showError(err);
    }
  });

  btnEditor.addEventListener('click', () => {
    showEditorScreen();
  });

  btnLoadMap.addEventListener('click', () => {
    showLoadMapScreen();
  });

  document.getElementById('btn-load-map-back').addEventListener('click', () => {
    loadMapScreenEl.classList.add('hidden');
    waitingRoomEl.classList.remove('hidden');
  });

  document.querySelectorAll('.block-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.block-btn').forEach((item) => item.classList.remove('selected'));
      btn.classList.add('selected');
      if (editor) editor.selectType(btn.dataset.type);
    });
  });

  document.getElementById('btn-editor-clear').addEventListener('click', () => {
    if (editor) editor.clearAll();
  });

  document.getElementById('btn-editor-back').addEventListener('click', () => {
    returnToWaitingRoom();
  });

  document.getElementById('btn-editor-save-map').addEventListener('click', () => {
    if (!editor) return;
    const name = mapNameInput.value.trim() || '커스텀 맵';
    editor.mapName = name;
    const savedMap = editor.saveToLocalStorage(name);
    alert(`"${savedMap.name}" 맵이 저장되었습니다!`);
  });

  document.getElementById('btn-editor-load-toggle').addEventListener('click', () => {
    savedMapsPanel.classList.toggle('hidden');
    if (!savedMapsPanel.classList.contains('hidden')) {
      refreshSavedMapsList();
    }
  });

  document.getElementById('btn-close-saved-maps').addEventListener('click', () => {
    savedMapsPanel.classList.add('hidden');
  });

  document.getElementById('btn-editor-save').addEventListener('click', async () => {
    if (!editor) return;

    const mapName = mapNameInput.value.trim() || '커스텀 맵';
    editor.mapName = mapName;
    editor.saveToLocalStorage(mapName);

    try {
      await network.startCustomGame(editor.exportMap());
    } catch (err) {
      showError(err);
      returnToWaitingRoom();
    }
  });

  network.onGameStarted = ({ players, stage }) => {
    waitingRoomEl.classList.add('hidden');
    editorScreenEl.classList.add('hidden');
    loadMapScreenEl.classList.add('hidden');
    gameScreenEl.classList.remove('hidden');
    game.updateState(players, stage);
    game.start(network.getSocketId());
  };

  network.onGameState = ({ players, stage, stageIndex }) => {
    game.updateState(players, stage, stageIndex);
  };

  document.getElementById('btn-leave-game').addEventListener('click', async () => {
    try {
      const { players, maxPlayers } = await network.leaveGame();
      game.running = false;
      gameScreenEl.classList.add('hidden');
      waitingRoomEl.classList.remove('hidden');
      updatePlayerList(players, maxPlayers);
    } catch (err) {
      showError(err);
    }
  });

  document.getElementById('btn-quit-game').addEventListener('click', async () => {
    if (!confirm('정말 게임을 나가시겠습니까?')) return;

    try {
      await network.leaveGame();
      showLobby();
      game.running = false;
      nicknameInput.value = '';
      roomCodeInput.value = '';
      isHost = false;
      setHostControlsVisible(false);
    } catch (err) {
      showError(err);
    }
  });

  network.onGameStopped = ({ players, maxPlayers }) => {
    game.running = false;
    gameScreenEl.classList.add('hidden');
    waitingRoomEl.classList.remove('hidden');
    updatePlayerList(players, maxPlayers);
  };

  createColorButtons();
}