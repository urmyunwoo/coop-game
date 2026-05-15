// 블록 타입별 색상 (에디터와 동일)
const BLOCK_COLORS = {
  normal: { fill: '#16213e', stroke: '#0f3460' },
  ice:    { fill: '#a8d8ea', stroke: '#6bb3d9' },
  spike:  { fill: '#ff4757', stroke: '#c0392b' },
  bounce: { fill: '#2ecc71', stroke: '#27ae60' },
  moving:     { fill: '#9b59b6', stroke: '#8e44ad' },
  checkpoint: { fill: '#f39c12', stroke: '#e67e22' },
};

// 게임 캔버스 렌더링
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.players = [];
    this.stage = null;
    this.myId = null;
    this.running = false;
  }

  start(myId) {
    this.myId = myId;
    this.running = true;
    this.render();
  }

  updateState(players, stage, stageIndex) {
    this.players = players;
    this.stage = stage;
    this.stageIndex = stageIndex;
  }

  drawPlatform(ctx, plat) {
    const type = plat.type || 'normal';
    const colors = BLOCK_COLORS[type] || BLOCK_COLORS.normal;

    if (type === 'spike') {
      // 가시: 삼각형 반복
      const triWidth = 20;
      const count = Math.floor(plat.w / triWidth);
      ctx.fillStyle = colors.fill;
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1;
      for (let i = 0; i < count; i++) {
        const tx = plat.x + i * triWidth;
        ctx.beginPath();
        ctx.moveTo(tx, plat.y + plat.h);
        ctx.lineTo(tx + triWidth / 2, plat.y + 4);
        ctx.lineTo(tx + triWidth, plat.y + plat.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

    ctx.fillStyle = colors.fill;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

    // 얼음 반짝임 효과
    if (type === 'ice') {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < plat.w; i += 30) {
        ctx.fillRect(plat.x + i + 4, plat.y + 3, 12, 3);
      }
    }

    // 점프대 화살표
    if (type === 'bounce') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      const arrows = Math.floor(plat.w / 40);
      for (let i = 0; i < arrows; i++) {
        ctx.fillText('↑', plat.x + 20 + i * 40, plat.y + plat.h / 2 + 6);
      }
    }

    // 이동발판 화살표
    if (type === 'moving') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('↔', plat.x + plat.w / 2, plat.y + plat.h / 2 + 6);
    }

    // 체크포인트 깃발
    if (type === 'checkpoint') {
      const cx = plat.x + plat.w / 2;
      const activated = plat.activated;
      // 깃대
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, plat.y + plat.h);
      ctx.lineTo(cx, plat.y + 4);
      ctx.stroke();
      // 깃발
      ctx.fillStyle = activated ? '#2ecc71' : '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(cx, plat.y + 4);
      ctx.lineTo(cx + 14, plat.y + 12);
      ctx.lineTo(cx, plat.y + 20);
      ctx.closePath();
      ctx.fill();
    }
  }

  render() {
    if (!this.running) return;

    const ctx = this.ctx;
    const canvas = this.canvas;

    // 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.stage) {
      // 클리어 화면
      if (this.stage.cleared) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('모든 스테이지 클리어!', canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(() => this.render());
        return;
      }

      // 스테이지 이름
      const stageNameEl = document.getElementById('stage-name');
      if (stageNameEl) stageNameEl.textContent = this.stage.name;

      // 플랫폼 그리기 (타입별)
      if (this.stage.platforms) {
        for (const plat of this.stage.platforms) {
          this.drawPlatform(ctx, plat);
        }
      }

      // 골 그리기
      if (this.stage.goalX != null) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.fillRect(this.stage.goalX, this.stage.goalY, this.stage.goalW, this.stage.goalH);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL', this.stage.goalX + this.stage.goalW / 2, this.stage.goalY - 5);
      }
    }

    // 플레이어 그리기
    for (const player of this.players) {
      const isMe = player.id === this.myId;
      drawPlayer(ctx, player, isMe);
    }

    requestAnimationFrame(() => this.render());
  }
}
