// 플레이어 렌더링 - 픽셀아트 검정 실루엣 스타일
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

  // 닉네임
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  const label = isMe ? `★ ${player.nickname}` : player.nickname;
  ctx.strokeText(label, px + PLAYER_WIDTH / 2, py - 6);
  ctx.fillText(label, px + PLAYER_WIDTH / 2, py - 6);
}
