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
const network = new Network();
network.setupListeners();

const game = new Game(document.getElementById('game-canvas'));

setupGameUI({
  network,
  game,
  MapEditor,
});

setupInputHandlers({
  network,
  game,
  canvas: document.getElementById('game-canvas'),
});

