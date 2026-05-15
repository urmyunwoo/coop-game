// 플레이어 렌더링 (피코파크 스타일)
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;
const PIXEL = 2; // 픽셀 단위 (16x16 해상도로 그려서 2배 확대)

// 플레이어별 애니메이션 상태
const playerAnimState = {};

function getAnimState(id) {
  if (!playerAnimState[id]) {
    playerAnimState[id] = {
      lastX: 0,
      lastY: 0,
      facing: 1,
      runFrame: 0,
      runTimer: 0,
    };
  }
  return playerAnimState[id];
}

// 픽셀 스프라이트 정의 (16x16 그리드)
// '#' = 실루엣(컬러), '.' = 투명
const SPRITES = {
  idle: [
    "................",
    "................",
    "....######......",
    "....######......",
    "....######......",
    "....######......",
    "...########.....",
    "...########.....",
    "...########.....",
    "...########.....",
    "....######......",
    "....######......",
    "....##..##......",
    "....##..##......",
    "....##..##......",
    "....##..##......",
  ],
  run1: [
    "................",
    "................",
    "....######......",
    "....######......",
    "....######......",
    "....######......",
    "...########.....",
    "..#########.....",
    "..#########.....",
    "...########.....",
    "....######......",
    "....######......",
    "...###.###......",
    "..##....##......",
    ".##......##.....",
    "##........##....",
  ],
  run2: [
    "................",
    "................",
    "....######......",
    "....######......",
    "....######......",
    "....######......",
    "...########.....",
    "...########.....",
    "...########.....",
    "...########.....",
    "....######......",
    "....######......",
    "....##..##......",
    "...###..###.....",
    "...##....##.....",
    "..##......##....",
  ],
  run3: [
    "................",
    "................",
    "....######......",
    "....######......",
    "....######......",
    "....######......",
    "...########.....",
    "...##########...",
    "...##########...",
    "...########.....",
    "....######......",
    "....######......",
    "....###.###.....",
    "....##...##.....",
    "...##.....##....",
    "..##.......##...",
  ],
  jump: [
    "................",
    "..##........##..",
    "..##.######.##..",
    "..##.######.##..",
    "...########.....",
    "...########.....",
    "...########.....",
    "..##########....",
    "..##########....",
    "...########.....",
    "....######......",
    "....######......",
    "....##..##......",
    "....##..##......",
    "...##....##.....",
    "..##......##....",
  ],
};

// 색상을 어둡게 만드는 헬퍼
function darkenColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) - amount;
  let g = ((num >> 8) & 0xFF) - amount;
  let b = (num & 0xFF) - amount;
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  return `rgb(${r},${g},${b})`;
}

// 각 플레이어의 이전 위치 기억 (걷기 애니메이션용)
const playerAnimState = {};
let animTick = 0;

function drawPlayer(ctx, player, isMe) {
  const anim = getAnimState(player.id);

  const dx = player.x - anim.lastX;
  const dy = player.y - anim.lastY;
  if (dx > 0.5) anim.facing = 1;
  else if (dx < -0.5) anim.facing = -1;

  const isMoving = Math.abs(dx) > 0.3;
  const isJumping = Math.abs(dy) > 1.5;

  if (isMoving && !isJumping) {
    anim.runTimer++;
    if (anim.runTimer >= 10) {
      anim.runFrame = (anim.runFrame + 1) % 4;
      anim.runTimer = 0;
    }
  } else {
    anim.runFrame = 0;
    anim.runTimer = 0;
  }

  anim.lastX = player.x;
  anim.lastY = player.y;

  // 프레임 선택
  let sprite;
  if (isJumping) {
    sprite = SPRITES.jump;
  } else if (isMoving) {
    sprite = [SPRITES.run1, SPRITES.run2, SPRITES.run3, SPRITES.run2][anim.runFrame];
  } else {
    sprite = SPRITES.idle;
  }

  const px = player.x;
  const py = player.y;

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT + 2, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 좌우 반전
  ctx.save();
  if (anim.facing === -1) {
    ctx.translate(px + PLAYER_WIDTH, py);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(px, py);
  }

  // 플레이어 색상 (메인 실루엣) - 사진은 검정이지만 플레이어마다 구분되도록 본인 색상 사용
  // 본인이면 외곽선으로 색상 표시
  ctx.fillStyle = '#1a1a1a';
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      if (sprite[r][c] === '#') {
        ctx.fillRect(c * PIXEL, r * PIXEL, PIXEL, PIXEL);
      }
    }
  }

  // 플레이어 색상 외곽선 (구분용)
  ctx.fillStyle = player.color;
  roundRect(ctx, x, y, w, bodyH, 8);
  ctx.fill();

  // 몸체 테두리
  ctx.strokeStyle = darkenColor(player.color, 60);
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, bodyH, 8);
  ctx.stroke();

  // 몸체 하이라이트 (왼쪽 위 광택)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  roundRect(ctx, x + 3, y + 3, w * 0.4, bodyH * 0.3, 5);
  ctx.fill();

  // === 눈 ===
  const eyeY = y + bodyH * 0.35;
  const eyeW = 9;
  const eyeH = 10;
  const eyeGap = 2;
  const eyeLeftX = x + w / 2 - eyeW - eyeGap / 2;
  const eyeRightX = x + w / 2 + eyeGap / 2;

  // 흰자
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, eyeLeftX, eyeY, eyeW, eyeH, 3);
  ctx.fill();
  roundRect(ctx, eyeRightX, eyeY, eyeW, eyeH, 3);
  ctx.fill();

  // 눈동자 (이동 방향에 따라 이동)
  const pupilSize = 4;
  const pupilOffsetX = anim.facing * 1.5;
  const pupilOffsetY = isInAir ? (player.vy > 0 ? 1.5 : -1.5) : 0;

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(
    eyeLeftX + eyeW / 2 + pupilOffsetX,
    eyeY + eyeH / 2 + pupilOffsetY,
    pupilSize / 2 + 0.5, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    eyeRightX + eyeW / 2 + pupilOffsetX,
    eyeY + eyeH / 2 + pupilOffsetY,
    pupilSize / 2 + 0.5, 0, Math.PI * 2
  );
  ctx.fill();

  // === 볼 터치 (귀여움) ===
  ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 4, eyeY + eyeH + 1, 3.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w - 4, eyeY + eyeH + 1, 3.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      if (sprite[r][c] !== '#') continue;
      // 외곽선 픽셀만 (상하좌우 중 하나라도 비어있으면)
      const up    = r > 0 && sprite[r-1][c] === '#';
      const down  = r < sprite.length-1 && sprite[r+1][c] === '#';
      const left  = c > 0 && sprite[r][c-1] === '#';
      const right = c < sprite[r].length-1 && sprite[r][c+1] === '#';
      if (up && down && left && right) continue;
      // 외곽 픽셀 위에 색상을 살짝 덮어씀
      ctx.fillRect(c * PIXEL, r * PIXEL, PIXEL, PIXEL);
    }
  }

  // 내부를 다시 검정으로 채움
  ctx.fillStyle = '#1a1a1a';
  for (let r = 1; r < sprite.length - 1; r++) {
    for (let c = 1; c < sprite[r].length - 1; c++) {
      if (sprite[r][c] !== '#') continue;
      const up    = sprite[r-1][c] === '#';
      const down  = sprite[r+1][c] === '#';
      const left  = sprite[r][c-1] === '#';
      const right = sprite[r][c+1] === '#';
      if (up && down && left && right) {
        ctx.fillRect(c * PIXEL, r * PIXEL, PIXEL, PIXEL);
      }
    }
  }

  ctx.restore();

  // === 닉네임 ===
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px Arial';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  const label = isMe ? `★ ${player.nickname}` : player.nickname;

  // 글자 배경
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, x + w / 2 - textWidth / 2 - 4, y - 20, textWidth + 8, 15, 4);
  ctx.fill();

  ctx.fillStyle = isMe ? '#FFD700' : '#FFFFFF';
  ctx.fillText(label, x + w / 2, y - 9);
  ctx.restore();
}

// 둥근 사각형 그리기 헬퍼
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.strokeText(label, px + PLAYER_WIDTH / 2, py - 6);
  ctx.fillText(label, px + PLAYER_WIDTH / 2, py - 6);
}
