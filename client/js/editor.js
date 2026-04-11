// 맵 에디터
const GRID_SIZE = 40; // 40x40 그리드
const EDITOR_WIDTH = 1200;
const EDITOR_HEIGHT = 600;
const COLS = EDITOR_WIDTH / GRID_SIZE;  // 30
const ROWS = EDITOR_HEIGHT / GRID_SIZE; // 15

// 블록 타입 정의
const BLOCK_TYPES = {
  normal: { name: '일반', color: '#16213e', border: '#0f3460' },
  ice:    { name: '얼음', color: '#a8d8ea', border: '#6bb3d9' },
  spike:  { name: '가시', color: '#ff4757', border: '#c0392b' },
  bounce: { name: '점프대', color: '#2ecc71', border: '#27ae60' },
  moving:     { name: '이동발판', color: '#9b59b6', border: '#8e44ad' },
  checkpoint: { name: '체크포인트', color: '#f39c12', border: '#e67e22' },
};

class MapEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = []; // 2D 배열: grid[row][col] = blockType or null
    this.selectedType = 'normal';
    this.spawnPos = { col: 1, row: 13 }; // 기본 스폰
    this.goalPos = { col: 28, row: 13 };  // 기본 골
    this.isDrawing = false;
    this.isErasing = false;
    this.mapName = '';

    this.initGrid();
    this.setupEvents();
    this.render();
  }

  initGrid() {
    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.grid[r][c] = null;
      }
    }
    // 기본 바닥
    for (let c = 0; c < COLS; c++) {
      this.grid[ROWS - 1][c] = 'normal';
    }
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isErasing = true;
      } else {
        this.isDrawing = true;
      }
      this.handleMouse(e);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDrawing || this.isErasing) {
        this.handleMouse(e);
      }
      // 호버 효과를 위한 렌더링
      this.mouseX = e.offsetX;
      this.mouseY = e.offsetY;
      this.render();
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDrawing = false;
      this.isErasing = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDrawing = false;
      this.isErasing = false;
      this.mouseX = -1;
      this.mouseY = -1;
      this.render();
    });

    // 우클릭 메뉴 방지
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  handleMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / GRID_SIZE);
    const row = Math.floor(y / GRID_SIZE);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    if (this.isErasing || this.selectedType === 'eraser') {
      this.grid[row][col] = null;
      // 스폰/골 위에 지우개 사용 시 제거하지 않음
    } else if (this.selectedType === 'spawn') {
      this.spawnPos = { col, row };
    } else if (this.selectedType === 'goal') {
      this.goalPos = { col, row };
    } else {
      this.grid[row][col] = this.selectedType;
    }

    this.render();
  }

  selectType(type) {
    this.selectedType = type;
  }

  clearAll() {
    this.initGrid();
    this.spawnPos = { col: 1, row: 13 };
    this.goalPos = { col: 28, row: 13 };
    this.render();
  }

  // 맵을 localStorage에 저장
  saveMap(name) {
    const saveData = {
      name: name || this.mapName || '커스텀 맵',
      grid: this.grid,
      spawnPos: this.spawnPos,
      goalPos: this.goalPos,
      savedAt: new Date().toLocaleString(),
    };
    const savedMaps = this.getSavedMaps();
    // 같은 이름이면 덮어쓰기
    const idx = savedMaps.findIndex(m => m.name === saveData.name);
    if (idx >= 0) {
      savedMaps[idx] = saveData;
    } else {
      savedMaps.push(saveData);
    }
    localStorage.setItem('saved-maps', JSON.stringify(savedMaps));
    return saveData.name;
  }

  // 저장된 맵 목록 가져오기
  getSavedMaps() {
    try {
      return JSON.parse(localStorage.getItem('saved-maps')) || [];
    } catch {
      return [];
    }
  }

  // 저장된 맵 불러오기
  loadMap(index) {
    const savedMaps = this.getSavedMaps();
    if (index < 0 || index >= savedMaps.length) return false;
    const data = savedMaps[index];
    this.grid = data.grid;
    this.spawnPos = data.spawnPos;
    this.goalPos = data.goalPos;
    this.mapName = data.name;
    this.render();
    return data.name;
  }

  // 저장된 맵 삭제
  deleteMap(index) {
    const savedMaps = this.getSavedMaps();
    if (index < 0 || index >= savedMaps.length) return;
    savedMaps.splice(index, 1);
    localStorage.setItem('saved-maps', JSON.stringify(savedMaps));
  }

  // 맵 데이터를 서버에 보낼 형식으로 변환
  exportMap() {
    const platforms = [];

    // 같은 행에서 연속된 같은 타입 블록을 하나의 플랫폼으로 합침
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        if (this.grid[r][c]) {
          const type = this.grid[r][c];
          const startCol = c;
          while (c < COLS && this.grid[r][c] === type) {
            c++;
          }
          platforms.push({
            x: startCol * GRID_SIZE,
            y: r * GRID_SIZE,
            w: (c - startCol) * GRID_SIZE,
            h: GRID_SIZE,
            type: type,
          });
        } else {
          c++;
        }
      }
    }

    return {
      name: this.mapName || '커스텀 맵',
      platforms,
      spawnX: this.spawnPos.col * GRID_SIZE + 4,
      spawnY: this.spawnPos.row * GRID_SIZE,
      goalX: this.goalPos.col * GRID_SIZE,
      goalY: this.goalPos.row * GRID_SIZE,
      goalW: GRID_SIZE,
      goalH: GRID_SIZE,
    };
  }

  render() {
    const ctx = this.ctx;

    // 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, EDITOR_WIDTH, EDITOR_HEIGHT);

    // 그리드 선
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * GRID_SIZE, 0);
      ctx.lineTo(c * GRID_SIZE, EDITOR_HEIGHT);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * GRID_SIZE);
      ctx.lineTo(EDITOR_WIDTH, r * GRID_SIZE);
      ctx.stroke();
    }

    // 블록 그리기
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = this.grid[r][c];
        if (!type) continue;

        const bx = c * GRID_SIZE;
        const by = r * GRID_SIZE;
        const info = BLOCK_TYPES[type];

        if (type === 'spike') {
          // 가시는 삼각형으로 그리기
          ctx.fillStyle = info.color;
          ctx.beginPath();
          ctx.moveTo(bx, by + GRID_SIZE);
          ctx.lineTo(bx + GRID_SIZE / 2, by + 4);
          ctx.lineTo(bx + GRID_SIZE, by + GRID_SIZE);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = info.border;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = info.color;
          ctx.fillRect(bx, by, GRID_SIZE, GRID_SIZE);
          ctx.strokeStyle = info.border;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, GRID_SIZE, GRID_SIZE);

          // 이동발판 화살표
          if (type === 'moving') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('↔', bx + GRID_SIZE / 2, by + GRID_SIZE / 2 + 6);
          }
          // 얼음 효과
          if (type === 'ice') {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(bx + 4, by + 4, GRID_SIZE - 8, 3);
            ctx.fillRect(bx + 10, by + 12, GRID_SIZE - 20, 2);
          }
          // 점프대 화살표
          if (type === 'bounce') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('↑', bx + GRID_SIZE / 2, by + GRID_SIZE / 2 + 6);
          }
          // 체크포인트 깃발
          if (type === 'checkpoint') {
            const cx = bx + GRID_SIZE / 2;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, by + GRID_SIZE);
            ctx.lineTo(cx, by + 4);
            ctx.stroke();
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.moveTo(cx, by + 4);
            ctx.lineTo(cx + 12, by + 11);
            ctx.lineTo(cx, by + 18);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // 스폰 위치
    const sx = this.spawnPos.col * GRID_SIZE;
    const sy = this.spawnPos.row * GRID_SIZE;
    ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
    ctx.fillRect(sx, sy, GRID_SIZE, GRID_SIZE);
    ctx.fillStyle = '#4ECDC4';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPAWN', sx + GRID_SIZE / 2, sy + GRID_SIZE / 2 + 4);

    // 골 위치
    const gx = this.goalPos.col * GRID_SIZE;
    const gy = this.goalPos.row * GRID_SIZE;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.fillRect(gx, gy, GRID_SIZE, GRID_SIZE);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', gx + GRID_SIZE / 2, gy + GRID_SIZE / 2 + 4);

    // 마우스 호버 효과
    if (this.mouseX >= 0 && this.mouseY >= 0) {
      const hCol = Math.floor(this.mouseX / GRID_SIZE);
      const hRow = Math.floor(this.mouseY / GRID_SIZE);
      if (hCol >= 0 && hCol < COLS && hRow >= 0 && hRow < ROWS) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(hCol * GRID_SIZE, hRow * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    }
  }
}
