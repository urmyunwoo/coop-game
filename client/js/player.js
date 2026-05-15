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

  const baseColor = player.color || '#FFFFFF';
  const outlineColor = darkenColor(baseColor, 50);

  // 몸체 채우기
  ctx.fillStyle = baseColor;
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      if (sprite[r][c] === '#') {
        ctx.fillRect(c * PIXEL, r * PIXEL, PIXEL, PIXEL);
      }
    }
  }

  // 외곽선
  ctx.fillStyle = outlineColor;
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      if (sprite[r][c] !== '#') continue;
      const up = r > 0 && sprite[r - 1][c] === '#';
      const down = r < sprite.length - 1 && sprite[r + 1][c] === '#';
      const left = c > 0 && sprite[r][c - 1] === '#';
      const right = c < sprite[r].length - 1 && sprite[r][c + 1] === '#';
      if (up && down && left && right) continue;
      ctx.fillRect(c * PIXEL, r * PIXEL, PIXEL, PIXEL);
    }
  }

  ctx.restore();

  // 닉네임
  const label = isMe ? `★ ${player.nickname}` : player.nickname;
  ctx.save();
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(px + PLAYER_WIDTH / 2 - textWidth / 2 - 4, py - 20, textWidth + 8, 15);
  ctx.fillStyle = isMe ? '#FFD700' : '#FFFFFF';
  ctx.fillText(label, px + PLAYER_WIDTH / 2, py - 9);
  ctx.restore();
}
