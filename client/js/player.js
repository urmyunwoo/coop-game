// 플레이어 렌더링
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;

function drawPlayer(ctx, player, isMe) {
  // 캐릭터 몸체
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);

  // 캐릭터 눈
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(player.x + 8, player.y + 8, 6, 6);
  ctx.fillRect(player.x + 18, player.y + 8, 6, 6);

  // 눈동자
  ctx.fillStyle = '#333333';
  ctx.fillRect(player.x + 10, player.y + 10, 3, 3);
  ctx.fillRect(player.x + 20, player.y + 10, 3, 3);

  // 닉네임
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';

  const label = isMe ? `★ ${player.nickname}` : player.nickname;
  ctx.fillText(label, player.x + PLAYER_WIDTH / 2, player.y - 8);
}
