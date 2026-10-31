/**
 * TNK Cyber Neon Ludo Engine
 * - 15x15 Cyber Board Grid with 4 Corner Yard Pods & 3D Rolling Dice
 * - Step-by-step hopping pawn movement, safe star tiles & capture shockwaves
 * - 2P, 3P, 4P and Vs Computer (Bot AI) support
 */

const LudoGame = (function() {
  const MAIN_CIRCUIT = [
    {r: 6, c: 1}, {r: 6, c: 2}, {r: 6, c: 3}, {r: 6, c: 4}, {r: 6, c: 5},
    {r: 5, c: 6}, {r: 4, c: 6}, {r: 3, c: 6}, {r: 2, c: 6}, {r: 1, c: 6}, {r: 0, c: 6},
    {r: 0, c: 7}, {r: 0, c: 8},
    {r: 1, c: 8}, {r: 2, c: 8}, {r: 3, c: 8}, {r: 4, c: 8}, {r: 5, c: 8},
    {r: 6, c: 9}, {r: 6, c: 10}, {r: 6, c: 11}, {r: 6, c: 12}, {r: 6, c: 13}, {r: 6, c: 14},
    {r: 7, c: 14}, {r: 8, c: 14},
    {r: 8, c: 13}, {r: 8, c: 12}, {r: 8, c: 11}, {r: 8, c: 10}, {r: 8, c: 9},
    {r: 9, c: 8}, {r: 10, c: 8}, {r: 11, c: 8}, {r: 12, c: 8}, {r: 13, c: 8}, {r: 14, c: 8},
    {r: 14, c: 7}, {r: 14, c: 6},
    {r: 13, c: 6}, {r: 12, c: 6}, {r: 11, c: 6}, {r: 10, c: 6}, {r: 9, c: 6},
    {r: 8, c: 5}, {r: 8, c: 4}, {r: 8, c: 3}, {r: 8, c: 2}, {r: 8, c: 1}, {r: 8, c: 0},
    {r: 7, c: 0}, {r: 6, c: 0}
  ];

  const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

  const PLAYERS = [
    {
      id: 0, colorKey: 'red', name: 'Player 1', tag: 'Neon Red',
      borderHex: '#ff2a5f', glow: 'rgba(255,42,95,0.45)', bgPawn: 'pawn-red',
      startTrackIdx: 0,
      yardSlots: [{r: 2, c: 2}, {r: 2, c: 3}, {r: 3, c: 2}, {r: 3, c: 3}],
      homePath: [{r: 7, c: 1}, {r: 7, c: 2}, {r: 7, c: 3}, {r: 7, c: 4}, {r: 7, c: 5}, {r: 7, c: 6}]
    },
    {
      id: 1, colorKey: 'green', name: 'Player 2', tag: 'Neon Green',
      borderHex: '#00ff88', glow: 'rgba(0,255,136,0.45)', bgPawn: 'pawn-green',
      startTrackIdx: 13,
      yardSlots: [{r: 2, c: 11}, {r: 2, c: 12}, {r: 3, c: 11}, {r: 3, c: 12}],
      homePath: [{r: 1, c: 7}, {r: 2, c: 7}, {r: 3, c: 7}, {r: 4, c: 7}, {r: 5, c: 7}, {r: 6, c: 7}]
    },
    {
      id: 2, colorKey: 'yellow', name: 'Player 3', tag: 'Neon Yellow',
      borderHex: '#ffd000', glow: 'rgba(255,208,0,0.45)', bgPawn: 'pawn-yellow',
      startTrackIdx: 26,
      yardSlots: [{r: 11, c: 11}, {r: 11, c: 12}, {r: 12, c: 11}, {r: 12, c: 12}],
      homePath: [{r: 7, c: 13}, {r: 7, c: 12}, {r: 7, c: 11}, {r: 7, c: 10}, {r: 7, c: 9}, {r: 7, c: 8}]
    },
    {
      id: 3, colorKey: 'blue', name: 'Player 4', tag: 'Neon Cyan',
      borderHex: '#00e5ff', glow: 'rgba(0,229,255,0.45)', bgPawn: 'pawn-blue',
      startTrackIdx: 39,
      yardSlots: [{r: 11, c: 2}, {r: 11, c: 3}, {r: 12, c: 2}, {r: 12, c: 3}],
      homePath: [{r: 13, c: 7}, {r: 12, c: 7}, {r: 11, c: 7}, {r: 10, c: 7}, {r: 9, c: 7}, {r: 8, c: 7}]
    }
  ];

  let currentMode = '2p';
  let isVsComputer = false;
  let activePlayerIds = [0, 2];
  let playerRoles = { 0: 'human', 1: 'human', 2: 'human', 3: 'human' };

  let currentTurnIdx = 0;
  let currentDiceValue = 1;
  let isDiceRolled = false;
  let isRolling = false;
  let isAnimating = false;
  let consecutiveSixes = 0;
  let validPawnMoves = [];
  let matchOver = false;

  let stats = { captures: 0, sixes: 0, moves: 0 };
  let tokens = [];

  function init() {
    document.getElementById("arenaGameTitle").textContent = "Cyber Neon Ludo";
    document.getElementById("gridSizeSelector").style.display = "flex";
    document.getElementById("neonGridContainer").style.display = "none";
    document.getElementById("boardSvg").style.display = "none";
    document.getElementById("p2ActionSection").style.display = "none";
    document.getElementById("ludoStageWrapper").style.display = "block";

    // Setup mode buttons in gridSizeSelector
    const selector = document.getElementById("gridSizeSelector");
    selector.innerHTML = `
      <button class="size-btn ${currentMode === '2p' ? 'active' : ''}" onclick="LudoGame.setMode('2p')">2 Players</button>
      <button class="size-btn ${currentMode === '3p' ? 'active' : ''}" onclick="LudoGame.setMode('3p')">3 Players</button>
      <button class="size-btn ${currentMode === '4p' ? 'active' : ''}" onclick="LudoGame.setMode('4p')">4 Players</button>
    `;

    document.getElementById("badgeP1Role").textContent = "Neon Red (P1)";
    document.getElementById("badgeP2Role").textContent = isVsComputer ? "Bot AI" : "Neon Yellow (P2)";

    setMode('2p');
    reset();
  }

  function setAiMode(aiEnabled) {
    isVsComputer = aiEnabled;
    activePlayerIds.forEach((pid, idx) => {
      playerRoles[pid] = (isVsComputer && idx > 0) ? 'bot' : 'human';
    });
    document.getElementById("badgeP2Role").textContent = isVsComputer ? "Bot AI" : PLAYERS[activePlayerIds[1]].tag;
    reset();
  }

  function initTokens() {
    tokens = [];
    for (let p = 0; p < 4; p++) {
      tokens[p] = [];
      for (let t = 0; t < 4; t++) {
        tokens[p][t] = { id: t, player: p, status: 'yard', stepCount: 0 };
      }
    }
  }

  function getTokenCoord(tok) {
    const p = PLAYERS[tok.player];
    if (tok.status === 'yard') return p.yardSlots[tok.id];
    if (tok.status === 'finished') return { r: 7, c: 7 };
    if (tok.status === 'homepath') return p.homePath[tok.stepCount - 52];
    const circuitIdx = (p.startTrackIdx + (tok.stepCount - 1)) % 52;
    return MAIN_CIRCUIT[circuitIdx];
  }

  function renderBoard() {
    const board = document.getElementById('board-grid');
    board.innerHTML = '';

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cell = document.createElement('div');
        cell.id = `ludo-cell-${r}-${c}`;
        cell.className = 'grid-cell';

        if (r < 6 && c < 6) cell.classList.add('yard-red');
        else if (r < 6 && c >= 9) cell.classList.add('yard-green');
        else if (r >= 9 && c < 6) cell.classList.add('yard-cyan');
        else if (r >= 9 && c >= 9) cell.classList.add('yard-yellow');
        else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cell.classList.add('center-hub');
        else if (r === 7 && c >= 1 && c <= 5) cell.classList.add('path-red');
        else if (c === 7 && r >= 1 && r <= 5) cell.classList.add('path-green');
        else if (r === 7 && c >= 9 && c <= 13) cell.classList.add('path-yellow');
        else if (c === 7 && r >= 9 && r <= 13) cell.classList.add('path-cyan');
        else if (r === 6 && c === 1) { cell.classList.add('start-red'); cell.innerHTML = '★'; }
        else if (r === 1 && c === 8) { cell.classList.add('start-green'); cell.innerHTML = '★'; }
        else if (r === 8 && c === 13) { cell.classList.add('start-yellow'); cell.innerHTML = '★'; }
        else if (r === 13 && c === 6) { cell.classList.add('start-cyan'); cell.innerHTML = '★'; }
        else if ((r === 2 && c === 6) || (r === 6 && c === 12) || (r === 12 && c === 8) || (r === 8 && c === 2)) {
          cell.classList.add('star-safe'); cell.innerHTML = '★';
        } else {
          cell.classList.add('track-default');
        }
        board.appendChild(cell);
      }
    }
  }

  function renderTokens(movingTok = null) {
    document.querySelectorAll('.pawn-slot').forEach(e => e.remove());

    const coordMap = {};
    for (let p of activePlayerIds) {
      for (let t = 0; t < 4; t++) {
        const tok = tokens[p][t];
        const coord = getTokenCoord(tok);
        const key = `${coord.r}-${coord.c}`;
        if (!coordMap[key]) coordMap[key] = [];
        coordMap[key].push(tok);
      }
    }

    for (let key in coordMap) {
      const list = coordMap[key];
      const [r, c] = key.split('-').map(Number);
      const cell = document.getElementById(`ludo-cell-${r}-${c}`);
      if (!cell) continue;

      const count = list.length;
      list.forEach((tok, idx) => {
        const slot = document.createElement('div');
        slot.className = 'pawn-slot';
        const pawn = document.createElement('div');
        const isPlayable = validPawnMoves.includes(tok);
        const isCurrentMoving = movingTok === tok;

        pawn.className = `pawn ${PLAYERS[tok.player].bgPawn} ${isPlayable ? 'interactive' : ''} ${isCurrentMoving ? 'pawn-hopping' : ''}`;
        pawn.style.boxShadow = `0 0 10px ${PLAYERS[tok.player].glow}`;

        if (count === 1) {
          pawn.style.width = '75%'; pawn.style.height = '75%';
        } else {
          pawn.style.width = '48%'; pawn.style.height = '48%';
          const tr = ['translate(-22%, -22%)', 'translate(22%, -22%)', 'translate(-22%, 22%)', 'translate(22%, 22%)'];
          pawn.style.transform = tr[idx % 4];
        }

        if (isPlayable) {
          pawn.onclick = (e) => {
            e.stopPropagation();
            choosePawnMove(tok);
          };
        }

        slot.appendChild(pawn);
        cell.appendChild(slot);
      });
    }

    updateUI();
  }

  function rollDice() {
    if (matchOver || isRolling || isDiceRolled || isAnimating) return;
    const curPlayer = activePlayerIds[currentTurnIdx];
    if (playerRoles[curPlayer] === 'bot' && !isVsComputer) return;

    isRolling = true;
    playTone(380, 'square', 0.08);

    const diceDisplay = document.getElementById('diceResultNumber');
    if (diceDisplay) diceDisplay.textContent = '🎲...';

    const diceVal = Math.floor(Math.random() * 6) + 1;
    setTimeout(() => {
      isRolling = false;
      currentDiceValue = diceVal;
      isDiceRolled = true;
      if (diceDisplay) diceDisplay.textContent = `🎲 ${diceVal}`;
      afterRoll(diceVal);
    }, 450);
  }

  function afterRoll(val) {
    const curPlayer = activePlayerIds[currentTurnIdx];
    const p = PLAYERS[curPlayer];

    if (val === 6) {
      stats.sixes++;
      consecutiveSixes++;
      if (consecutiveSixes === 3) {
        consecutiveSixes = 0;
        finishTurn(false);
        return;
      }
    } else {
      consecutiveSixes = 0;
    }

    validPawnMoves = getPlayerMoves(curPlayer, val);

    if (validPawnMoves.length === 0) {
      setTimeout(() => finishTurn(val === 6), 750);
    } else if (validPawnMoves.length === 1 && playerRoles[curPlayer] === 'human') {
      renderTokens();
      setTimeout(() => choosePawnMove(validPawnMoves[0]), 300);
    } else {
      renderTokens();
      if (playerRoles[curPlayer] === 'bot') {
        setTimeout(() => runBotDecision(validPawnMoves), 500);
      }
    }
  }

  function getPlayerMoves(pIdx, roll) {
    const moves = [];
    for (let t = 0; t < 4; t++) {
      const tok = tokens[pIdx][t];
      if (tok.status === 'finished') continue;
      if (tok.status === 'yard') {
        if (roll === 6) moves.push(tok);
      } else {
        if (tok.stepCount + roll <= 57) moves.push(tok);
      }
    }
    return moves;
  }

  function runBotDecision(availableMoves) {
    if (availableMoves.length === 0) return;
    let best = availableMoves[0];
    let bestScore = -999;
    for (let tok of availableMoves) {
      let score = 0;
      const targetStep = tok.status === 'yard' ? 1 : tok.stepCount + currentDiceValue;
      if (targetStep === 57) score += 100;
      if (tok.status === 'yard') score += 60;
      if (score > bestScore) {
        bestScore = score;
        best = tok;
      }
    }
    choosePawnMove(best);
  }

  async function choosePawnMove(tok) {
    if (isAnimating) return;
    isAnimating = true;
    validPawnMoves = [];
    stats.moves++;

    const roll = currentDiceValue;
    if (tok.status === 'yard') {
      tok.status = 'track';
      tok.stepCount = 1;
      playTone(520, 'triangle', 0.08);
      renderTokens(tok);
      await new Promise(r => setTimeout(r, 220));
    } else {
      for (let i = 1; i <= roll; i++) {
        tok.stepCount++;
        if (tok.stepCount > 51 && tok.stepCount < 57) tok.status = 'homepath';
        else if (tok.stepCount === 57) tok.status = 'finished';
        else tok.status = 'track';
        playTone(580, 'triangle', 0.04);
        renderTokens(tok);
        await new Promise(r => setTimeout(r, 160));
      }
    }

    let extraTurn = false;
    if (tok.status === 'finished') {
      playTone(880, 'triangle', 0.2);
      extraTurn = true;
    } else if (tok.status === 'track') {
      const pIdx = tok.player;
      const circuitIdx = (PLAYERS[pIdx].startTrackIdx + (tok.stepCount - 1)) % 52;
      const isSafe = SAFE_INDICES.includes(circuitIdx);

      if (!isSafe) {
        for (let opp of activePlayerIds) {
          if (opp === pIdx) continue;
          for (let t = 0; t < 4; t++) {
            const oppTok = tokens[opp][t];
            if (oppTok.status === 'track') {
              const oppCIdx = (PLAYERS[opp].startTrackIdx + (oppTok.stepCount - 1)) % 52;
              if (oppCIdx === circuitIdx) {
                oppTok.status = 'yard';
                oppTok.stepCount = 0;
                stats.captures++;
                extraTurn = true;
                playTone(220, 'sawtooth', 0.2);
              }
            }
          }
        }
      }
    }

    if (tokens[tok.player].every(t => t.status === 'finished')) {
      matchOver = true;
      isAnimating = false;
      triggerWinCelebration(PLAYERS[tok.player].name, 'All 4 tokens conquered the Home Triangle!');
      return;
    }

    isAnimating = false;
    finishTurn(roll === 6 || extraTurn);
  }

  function finishTurn(hasExtraRoll) {
    isDiceRolled = false;
    validPawnMoves = [];
    renderTokens();

    if (!hasExtraRoll) {
      consecutiveSixes = 0;
      currentTurnIdx = (currentTurnIdx + 1) % activePlayerIds.length;
    }

    updateUI();

    const cur = activePlayerIds[currentTurnIdx];
    if (playerRoles[cur] === 'bot' && !matchOver) {
      setTimeout(() => rollDice(), 650);
    }
  }

  function updateUI() {
    const curPlayer = activePlayerIds[currentTurnIdx];
    const p = PLAYERS[curPlayer];
    const turnBadge = document.getElementById("turnBadge");
    const turnText = document.getElementById("turnText");

    turnBadge.className = `turn-pill ${curPlayer === 0 ? 'turn-p1' : 'turn-p2'}`;
    turnText.textContent = `Turn: ${p.name} (${p.tag})`;

    document.getElementById("statBox1Label").textContent = "Captures";
    document.getElementById("statBox1Val").textContent = stats.captures;
    document.getElementById("statBox2Label").textContent = "Sixes Rolled";
    document.getElementById("statBox2Val").textContent = stats.sixes;
    document.getElementById("statBox3Label").textContent = "Win Target";
    document.getElementById("statBox3Val").textContent = "4 Home";
    document.getElementById("moveCountVal").textContent = stats.moves;

    const prompt = document.getElementById("statusPrompt");
    prompt.textContent = isDiceRolled ? "Select glowing token to move" : `${p.name}: Tap Roll Dice`;
  }

  function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll("#gridSizeSelector .size-btn").forEach(btn => {
      btn.classList.toggle("active", btn.textContent.toLowerCase().includes(mode));
    });

    if (mode === '2p') activePlayerIds = [0, 2];
    else if (mode === '3p') activePlayerIds = [0, 1, 2];
    else if (mode === '4p') activePlayerIds = [0, 1, 2, 3];

    setAiMode(isVsComputer);
    reset();
  }

  function reset() {
    matchOver = false;
    currentTurnIdx = 0;
    isDiceRolled = false;
    isRolling = false;
    isAnimating = false;
    stats = { captures: 0, sixes: 0, moves: 0 };
    initTokens();
    renderBoard();
    renderTokens();
    const diceDisplay = document.getElementById('diceResultNumber');
    if (diceDisplay) diceDisplay.textContent = '🎲 Ready';
  }

  function startOnBoard() {
    reset();
  }

  return { init, reset, setMode, setAiMode, rollDice, startOnBoard };
})();
