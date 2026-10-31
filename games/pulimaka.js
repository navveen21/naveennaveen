/**
 * Coin to Win (Puli-Maka) Board Game Engine
 * - 37-Node Asymmetric Graph (2 Hunters vs 24 Defenders)
 * - Player vs Player & Player vs Computer Mode (AI)
 * - 150 Moves Cap: Player 2 wins if >= 12 coins remain, else Draw
 * - Player 1 Wins when 16 defenders are captured
 * - Player 2 must place all 16 reserve pieces before movement unlocks
 * - 90-second turn timer (starts strictly after opening move)
 * - Isolated file: edit this file independently without touching index.html!
 */

const PuliMakaGame = (function() {
  const coords = {
    1: [0, 4],  4: [0, 2],  5: [0, 0],
    2: [1, 3],  6: [1, 2],  7: [1, 1],
    8: [2, 4],  9: [3, 4], 10: [4, 4], 11: [5, 4], 12: [6, 4],
    13: [2, 3], 14: [3, 3], 15: [4, 3], 16: [5, 3], 17: [6, 3],
    3: [2, 2], 18: [3, 2], 19: [4, 2], 20: [5, 2], 21: [6, 2],
    22: [2, 1], 23: [3, 1], 24: [4, 1], 25: [5, 1], 26: [6, 1],
    27: [2, 0], 28: [3, 0], 29: [4, 0], 30: [5, 0], 31: [6, 0],
    32: [7, 3], 37: [7, 2], 36: [7, 1],
    33: [8, 4], 34: [8, 2], 35: [8, 0]
  };

  const edges = [
    [1, 4], [4, 5], [2, 6], [6, 7], [4, 6], [6, 3], [1, 2], [2, 3], [5, 7], [7, 3],
    [8, 9], [9, 10], [10, 11], [11, 12], [13, 14], [14, 15], [15, 16], [16, 17],
    [3, 18], [18, 19], [19, 20], [20, 21], [22, 23], [23, 24], [24, 25], [25, 26],
    [27, 28], [28, 29], [29, 30], [30, 31], [8, 13], [13, 3], [3, 22], [22, 27],
    [9, 14], [14, 18], [18, 23], [23, 28], [10, 15], [15, 19], [19, 24], [24, 29],
    [11, 16], [16, 20], [20, 25], [25, 30], [12, 17], [17, 21], [21, 26], [26, 31],
    [8, 14], [14, 19], [19, 25], [25, 31], [27, 23], [23, 19], [19, 16], [16, 12],
    [10, 14], [14, 3], [3, 23], [23, 29], [10, 16], [16, 21], [21, 25], [25, 29],
    [32, 37], [37, 36], [33, 34], [34, 35], [21, 37], [37, 34], [21, 32], [32, 33], [21, 36], [36, 35]
  ];

  function toSvgX(gx) { return gx * 110 + 10; }
  function toSvgY(gy) { return (4 - gy) * 115 + 15; }

  let p1Pieces = [19, 19];
  let p2Pieces = [14, 15, 16, 18, 20, 23, 24, 25];
  let reserveP2 = 16;
  let eliminatedP2 = 0;
  let turn = "P1";
  let firstP1Turn = true;
  let openingP1Index = 0;
  let selectedP1Index = null;
  let selectedP2Node = null;
  let p2Mode = "place";
  let totalMoves = 0;
  let gameOver = false;
  let gameStartedOnBoard = false;
  let isAiMode = false;

  let timerStarted = false;
  let timeRemaining = 90;
  let timerInterval = null;

  function init() {
    document.getElementById("arenaGameTitle").textContent = "Coin to Win (Puli-Maka)";
    document.getElementById("badgeP1Role").textContent = "2 Hunters";
    document.getElementById("badgeP2Role").textContent = isAiMode ? "Computer AI" : "24 Defenders";
    document.getElementById("gridSizeSelector").style.display = "none";
    document.getElementById("neonGridContainer").style.display = "none";
    document.getElementById("boardSvg").style.display = "block";
    document.getElementById("p2ActionSection").style.display = "block";

    reset();
  }

  function setAiMode(aiEnabled) {
    isAiMode = aiEnabled;
    document.getElementById("badgeP2Role").textContent = isAiMode ? "Computer AI" : "24 Defenders";
  }

  function reset() {
    clearInterval(timerInterval);
    timerStarted = false;
    timeRemaining = 90;
    gameStartedOnBoard = false;
    p1Pieces = [19, 19];
    p2Pieces = [14, 15, 16, 18, 20, 23, 24, 25];
    reserveP2 = 16;
    eliminatedP2 = 0;
    turn = "P1";
    firstP1Turn = true;
    openingP1Index = 0;
    selectedP1Index = null;
    selectedP2Node = null;
    p2Mode = "place";
    totalMoves = 0;
    gameOver = false;

    document.getElementById("boardStartOverlay").style.display = "flex";
    document.getElementById("overlayTitle").textContent = "Puli-Maka Arena Ready";
    document.getElementById("moveCountLabel").textContent = "Moves Cap (150)";

    render();
    updateUI();
  }

  function startOnBoard() {
    gameStartedOnBoard = true;
    document.getElementById("boardStartOverlay").style.display = "none";
    playTone(523, 'triangle', 0.2);
    updateUI();
  }

  function findMiddle(start, end) {
    const [sx, sy] = coords[start];
    const [ex, ey] = coords[end];
    const midX = (sx + ex) / 2.0;
    const midY = (sy + ey) / 2.0;
    let cand = null;
    for (const [nodeStr, [nx, ny]] of Object.entries(coords)) {
      if (nx === midX && ny === midY) { cand = parseInt(nodeStr); break; }
    }
    if (!cand) return null;
    const l1 = edges.some(([u, v]) => (u === start && v === cand) || (v === start && u === cand));
    const l2 = edges.some(([u, v]) => (u === cand && v === end) || (v === cand && u === end));
    return (l1 && l2) ? cand : null;
  }

  function isEdge(u, v) {
    return edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u));
  }

  function checkP1Trapped() {
    for (const p of p1Pieces) {
      for (const nodeStr of Object.keys(coords)) {
        const target = parseInt(nodeStr);
        if (p1Pieces.includes(target) || p2Pieces.includes(target)) continue;
        if (isEdge(p, target)) return false;
        const mid = findMiddle(p, target);
        if (mid && p2Pieces.includes(mid)) return false;
      }
    }
    return true;
  }

  function render() {
    const edgesGroup = document.getElementById("edgesGroup");
    const nodesGroup = document.getElementById("nodesGroup");
    edgesGroup.innerHTML = "";
    nodesGroup.innerHTML = "";

    edges.forEach(([u, v]) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", toSvgX(coords[u][0]));
      line.setAttribute("y1", toSvgY(coords[u][1]));
      line.setAttribute("x2", toSvgX(coords[v][0]));
      line.setAttribute("y2", toSvgY(coords[v][1]));
      line.setAttribute("class", "grid-edge");
      edgesGroup.appendChild(line);
    });

    const p1I = getP1Initial();
    const p2I = getP2Initial();

    for (const [nodeStr, [gx, gy]] of Object.entries(coords)) {
      const node = parseInt(nodeStr);
      const cx = toSvgX(gx);
      const cy = toSvgY(gy);

      const isP1 = p1Pieces.includes(node);
      const isP2 = p2Pieces.includes(node);
      const p1Count = p1Pieces.filter(p => p === node).length;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "node-bg");
      g.onclick = () => onNodeClicked(node);

      const isSelected = (turn === "P1" && selectedP1Index !== null && p1Pieces[selectedP1Index] === node) ||
                         (turn === "P2" && selectedP2Node === node);
      if (isSelected) g.classList.add("node-selected");

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("stroke", "#ffffff");

      if (isP1) {
        circle.setAttribute("r", 25);
        circle.setAttribute("fill", "#ff007f");
        circle.setAttribute("filter", "url(#p1Glow)");
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy);
        text.setAttribute("class", "node-text");
        text.textContent = p1Count > 1 ? `${p1I} x${p1Count}` : p1I;
        g.appendChild(circle);
        g.appendChild(text);
      } else if (isP2) {
        circle.setAttribute("r", 22);
        circle.setAttribute("fill", "#00f3ff");
        circle.setAttribute("filter", "url(#p2Glow)");
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy);
        text.setAttribute("class", "node-text");
        text.textContent = p2I;
        g.appendChild(circle);
        g.appendChild(text);
      } else {
        circle.setAttribute("r", 15);
        circle.setAttribute("fill", "#0f1226");
        circle.setAttribute("stroke", "#9d00ff");
        g.appendChild(circle);
      }

      nodesGroup.appendChild(g);
    }
  }

  function onNodeClicked(node) {
    if (!gameStartedOnBoard || gameOver) return;
    if (isAiMode && turn === "P2") return; // Block human click on AI turn

    if (turn === "P1") handleP1Turn(node);
    else handleP2Turn(node);
  }

  function handleP1Turn(target) {
    if (firstP1Turn) {
      const start = 19;
      const mid = findMiddle(start, target);
      if (mid && p2Pieces.includes(mid)) {
        p2Pieces = p2Pieces.filter(m => m !== mid);
        p1Pieces[openingP1Index] = target;
        eliminatedP2++;
        totalMoves++;
        playTone(220, 'sawtooth', 0.22);
        if (openingP1Index === 0) openingP1Index = 1;
        else { firstP1Turn = false; turn = "P2"; }
        startTurnTimer();
        render();
        checkWinConditions();

        if (isAiMode && turn === "P2" && !gameOver) {
          setTimeout(runP2AiStep, 500);
        }
      }
      return;
    }

    if (selectedP1Index === null) {
      if (p1Pieces.includes(target)) { selectedP1Index = p1Pieces.indexOf(target); render(); }
      return;
    }

    const start = p1Pieces[selectedP1Index];
    if (isEdge(start, target) && !p1Pieces.includes(target) && !p2Pieces.includes(target)) {
      p1Pieces[selectedP1Index] = target;
      selectedP1Index = null;
      totalMoves++;
      turn = "P2";
      playTone(380, 'sine', 0.1);
      startTurnTimer();
      render();
      checkWinConditions();

      if (isAiMode && turn === "P2" && !gameOver) {
        setTimeout(runP2AiStep, 500);
      }
      return;
    }

    const mid = findMiddle(start, target);
    if (mid && p2Pieces.includes(mid) && !p1Pieces.includes(target) && !p2Pieces.includes(target)) {
      p2Pieces = p2Pieces.filter(m => m !== mid);
      p1Pieces[selectedP1Index] = target;
      selectedP1Index = null;
      eliminatedP2++;
      totalMoves++;
      playTone(220, 'sawtooth', 0.22);
      turn = "P2";
      startTurnTimer();
      render();
      checkWinConditions();

      if (isAiMode && turn === "P2" && !gameOver) {
        setTimeout(runP2AiStep, 500);
      }
    }
  }

  function handleP2Turn(target) {
    if (p2Mode === "place") {
      if (reserveP2 > 0 && !p1Pieces.includes(target) && !p2Pieces.includes(target)) {
        p2Pieces.push(target);
        reserveP2--;
        totalMoves++;
        turn = "P1";
        playTone(380, 'sine', 0.1);
        if (reserveP2 === 0) p2Mode = "move";
        startTurnTimer();
        render();
        checkWinConditions();
      }
    } else {
      if (reserveP2 > 0) return;
      if (selectedP2Node === null) {
        if (p2Pieces.includes(target)) { selectedP2Node = target; render(); }
        return;
      }
      const start = selectedP2Node;
      if (isEdge(start, target) && !p1Pieces.includes(target) && !p2Pieces.includes(target)) {
        p2Pieces[p2Pieces.indexOf(start)] = target;
        selectedP2Node = null;
        totalMoves++;
        turn = "P1";
        playTone(380, 'sine', 0.1);
        startTurnTimer();
        render();
        checkWinConditions();
      }
    }
  }

  // Computer AI for Player 2 (Defenders)
  function runP2AiStep() {
    if (gameOver || turn !== "P2") return;

    // AI Phase 1: Place reserves
    if (reserveP2 > 0) {
      const emptyNodes = Object.keys(coords)
        .map(Number)
        .filter(n => !p1Pieces.includes(n) && !p2Pieces.includes(n));

      // Strategic placement: prioritize nodes adjacent to hunters
      let chosen = null;
      for (const p of p1Pieces) {
        const adj = emptyNodes.filter(n => isEdge(p, n));
        if (adj.length > 0) {
          chosen = adj[Math.floor(Math.random() * adj.length)];
          break;
        }
      }
      if (!chosen && emptyNodes.length > 0) {
        chosen = emptyNodes[Math.floor(Math.random() * emptyNodes.length)];
      }

      if (chosen) {
        p2Pieces.push(chosen);
        reserveP2--;
        totalMoves++;
        turn = "P1";
        playTone(380, 'sine', 0.1);
        if (reserveP2 === 0) p2Mode = "move";
        startTurnTimer();
        render();
        checkWinConditions();
      }
      return;
    }

    // AI Phase 2: Move defenders on board
    const moves = [];
    for (const defender of p2Pieces) {
      for (const nodeStr of Object.keys(coords)) {
        const target = Number(nodeStr);
        if (!p1Pieces.includes(target) && !p2Pieces.includes(target) && isEdge(defender, target)) {
          moves.push({ from: defender, to: target });
        }
      }
    }

    if (moves.length > 0) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      p2Pieces[p2Pieces.indexOf(move.from)] = move.to;
      totalMoves++;
      turn = "P1";
      playTone(380, 'sine', 0.1);
      startTurnTimer();
      render();
      checkWinConditions();
    }
  }

  function setMode(mode) {
    if (mode === "move" && reserveP2 > 0) return;
    p2Mode = mode;
    document.getElementById("btnModePlace").classList.toggle("active", mode === "place");
    document.getElementById("btnModeMove").classList.toggle("active", mode === "move");
  }

  function checkWinConditions() {
    if (totalMoves >= 150) {
      const p2Coins = p2Pieces.length + reserveP2;
      const winnerName = isAiMode ? "Computer AI" : player2Name;
      if (p2Coins >= 12) {
        triggerWinCelebration(winnerName, `150 moves reached! ${winnerName} defended ${p2Coins} coins (>= 12). ${winnerName} wins!`);
      } else {
        triggerDrawModal(`150 moves reached! ${winnerName} has only ${p2Coins} coins (< 12). Match is a DRAW!`);
      }
      return;
    }

    if (eliminatedP2 >= 16) {
      triggerWinCelebration(player1Name, `Captured 16 defenders to secure victory!`);
      return;
    }

    if (turn === "P1" && !firstP1Turn && checkP1Trapped()) {
      const winnerName = isAiMode ? "Computer AI" : player2Name;
      triggerWinCelebration(winnerName, `Completely trapped both hunters!`);
    }
  }

  function startTurnTimer() {
    clearInterval(timerInterval);
    if (gameOver) return;

    timerStarted = true;
    timeRemaining = 90;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      if (gameOver) { clearInterval(timerInterval); return; }
      timeRemaining--;
      updateTimerDisplay();

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        const winner = turn === "P1" ? (isAiMode ? "Computer AI" : player2Name) : player1Name;
        triggerWinCelebration(winner, `Time expired! ${winner} wins by timeout.`);
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const clock = document.getElementById("timerClockDisplay");
    const bar = document.getElementById("timerProgressBar");
    if (!clock || !bar) return;

    if (!timerStarted) {
      clock.textContent = "Waiting";
      bar.style.width = "100%";
      return;
    }
    clock.textContent = timeRemaining + "s";
    bar.style.width = ((timeRemaining / 90) * 100) + "%";

    if (timeRemaining <= 15) {
      clock.style.color = "#ff007f";
      bar.style.backgroundColor = "#ff007f";
      playTone(180, 'sine', 0.05);
    } else {
      clock.style.color = "#00f3ff";
      bar.style.backgroundColor = "#00f3ff";
    }
  }

  function updateUI() {
    const p2Remaining = p2Pieces.length + reserveP2;
    document.getElementById("statBox1Label").textContent = "Defenders Captured";
    document.getElementById("statBox1Val").textContent = `${eliminatedP2} / 16`;
    document.getElementById("statBox2Label").textContent = "Defenders Left (≥12)";
    document.getElementById("statBox2Val").textContent = p2Remaining;
    document.getElementById("statBox3Label").textContent = "Reserves";
    document.getElementById("statBox3Val").textContent = reserveP2;
    document.getElementById("moveCountVal").textContent = `${totalMoves} / 150`;
    document.getElementById("btnReserveCount").textContent = reserveP2;

    const btnMove = document.getElementById("btnModeMove");
    if (reserveP2 > 0) {
      btnMove.disabled = true;
      p2Mode = "place";
    } else {
      btnMove.disabled = false;
    }

    const turnBadge = document.getElementById("turnBadge");
    const turnText = document.getElementById("turnText");
    const prompt = document.getElementById("statusPrompt");

    const p2DisplayName = isAiMode ? "Computer AI" : player2Name;
    if (turn === "P1") {
      turnBadge.className = "turn-pill turn-p1";
      turnText.textContent = `Turn: ${player1Name} (Hunter)`;
    } else {
      turnBadge.className = "turn-pill turn-p2";
      turnText.textContent = `Turn: ${p2DisplayName} (Defender)`;
    }

    if (!gameStartedOnBoard) {
      prompt.textContent = "Click 'Start Game on Board' to unlock";
    } else {
      prompt.textContent = `${turn === 'P1' ? player1Name : p2DisplayName} is active`;
    }
  }

  function pauseTimer() { clearInterval(timerInterval); }

  return {
    init,
    reset,
    setMode,
    setAiMode,
    startOnBoard,
    render,
    pauseTimer
  };
})();
