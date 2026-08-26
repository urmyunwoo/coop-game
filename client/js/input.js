function setupInputHandlers({ network, game, canvas }) {
  const keys = { left: false, right: false, jump: false };
  const mouse = { x: 0, y: 0, pulling: false };

  function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  document.addEventListener('keydown', (event) => {
    let changed = false;
    if (event.key === 'ArrowLeft' || event.key === 'a') { keys.left = true; changed = true; }
    if (event.key === 'ArrowRight' || event.key === 'd') { keys.right = true; changed = true; }
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === ' ') { keys.jump = true; changed = true; }
    if (changed) network.sendInput({ ...keys });
  });

  document.addEventListener('keyup', (event) => {
    let changed = false;
    if (event.key === 'ArrowLeft' || event.key === 'a') { keys.left = false; changed = true; }
    if (event.key === 'ArrowRight' || event.key === 'd') { keys.right = false; changed = true; }
    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === ' ') { keys.jump = false; changed = true; }
    if (changed) network.sendInput({ ...keys, mouse });
  });

  game.canvas.addEventListener('mousedown', (event) => {
    if (game.stageIndex === 1) {
      mouse.pulling = true;
      updateMousePosition(event);
      network.sendInput({ ...keys, mouse });
    }
  });

  game.canvas.addEventListener('mousemove', (event) => {
    if (game.stageIndex === 1) {
      updateMousePosition(event);
      if (mouse.pulling) {
        network.sendInput({ ...keys, mouse });
      }
    }
  });

  game.canvas.addEventListener('mouseup', () => {
    if (game.stageIndex === 1) {
      mouse.pulling = false;
      network.sendInput({ ...keys, mouse });
    }
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.pulling = false;
  });

  const mobileLeft = document.getElementById('btn-mobile-left');
  const mobileRight = document.getElementById('btn-mobile-right');
  const mobileJump = document.getElementById('btn-mobile-jump');

  if (mobileLeft) {
    mobileLeft.addEventListener('touchstart', () => {
      keys.left = true;
      network.sendInput({ ...keys, mouse });
    });
    mobileLeft.addEventListener('touchend', () => {
      keys.left = false;
      network.sendInput({ ...keys, mouse });
    });
  }

  if (mobileRight) {
    mobileRight.addEventListener('touchstart', () => {
      keys.right = true;
      network.sendInput({ ...keys, mouse });
    });
    mobileRight.addEventListener('touchend', () => {
      keys.right = false;
      network.sendInput({ ...keys, mouse });
    });
  }

  if (mobileJump) {
    mobileJump.addEventListener('touchstart', () => {
      keys.jump = true;
      network.sendInput({ ...keys, mouse });
    });
    mobileJump.addEventListener('touchend', () => {
      keys.jump = false;
      network.sendInput({ ...keys, mouse });
    });
  }
}