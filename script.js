// =================== FINAL JS SCRIPT ===================
// Semua komentar dalam bahasa Indonesia

/* ========== UTIL ========== */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ========== FUNGSI GAMBAR ULAR & TANGGA (CANVAS fallback untuk style lama) ========== */
function drawSnake(ctx, x1, y1, x2, y2, color = "#0a0") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const midX = (x1 + x2) / 2;
  ctx.bezierCurveTo(midX + 30, y1 - 40, midX - 30, y2 + 40, x2, y2);
  ctx.stroke();
}

function drawLadder(ctx, x1, y1, x2, y2, color = "#ff0") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x1 - 8, y1);
  ctx.lineTo(x2 - 8, y2);
  ctx.moveTo(x1 + 8, y1);
  ctx.lineTo(x2 + 8, y2);
  ctx.stroke();

  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const y = y1 + (y2 - y1) * t;
    const xL = x1 - 8 + (x2 - x1) * t;
    const xR = x1 + 8 + (x2 - x1) * t;
    ctx.beginPath();
    ctx.moveTo(xL, y);
    ctx.lineTo(xR, y);
    ctx.stroke();
  }
}

// Fungsi untuk memeriksa jawaban (flip card lama)
function checkAnswer(isCorrect, card) {
  const back = card.querySelector('.flip-card-back');
  back.classList.remove('correct', 'wrong'); // reset style

  if (isCorrect) {
    back.classList.add('correct');
    back.innerHTML = "✔ Jawaban Benar!";
  } else {
    back.classList.add('wrong');
    back.innerHTML = "✘ Jawaban Salah!";
  }

  // flip kartu
  card.querySelector('.flip-card-inner').classList.add('flipped');
}

/* ========== ELEMENT DOM ========== */
const board = $('#board');
if (!board) throw new Error("Elemen #board tidak ditemukan di HTML.");

let playerEl = $('#player');
let player2El = $('#player2');
if (!playerEl) {
  playerEl = document.createElement('div');
  playerEl.id = 'player';
  document.body.appendChild(playerEl);
}
if (!player2El) {
  player2El = document.createElement('div');
  player2El.id = 'player2';
  document.body.appendChild(player2El);
}
playerEl.classList.add('player-pawn');
player2El.classList.add('player-pawn');

const diceEl = $('#dice') || (function(){ 
  const d=document.createElement('div'); 
  d.id='dice'; 
  document.body.appendChild(d); 
  return d; 
})();
const rollBtn = $('#rollDiceBtn') || $('#rollDice') || (function(){ 
  const b=document.querySelector('button'); 
  return b; 
})();
const questionPopup = $('#questionPopup');

/* ========== STATE GAME ========== */
let positions = [1, 1];  
let currentPlayer = 0;   
let locked = false;      

/* ========== (1) BANGUN PAPAN + START & FINISH INTERAKTIF ========== */
if (board.children.length === 0) {
  for (let i = 100; i >= 1; i--) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.cell = i;
    cell.textContent = i;
    board.appendChild(cell);
  }
}

/* ========== HELPERS ========== */
function findCellByNumber(n) {
  return board.querySelector(`.cell[data-cell='${n}']`);
}
function rowColToNumber(row, col) {
  return 100 - (row * 10 + col);
}
function numberToRowCol(n) {
  const idx = 100 - n;
  return { row: Math.floor(idx / 10), col: idx % 10 };
}

/* ========== (SVG OVERLAY SETUP) ========== */
/*
  Kita buat/ambil elemen <svg id="decorations"> yang akan menjadi overlay di atas papan.
  SVG ini memiliki pointer-events: none sehingga tidak mengganggu klik papan.
*/
let decorationsSvg = document.getElementById("decorations");
if (!decorationsSvg) {
  decorationsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  decorationsSvg.setAttribute("id", "decorations");
  // let svg fill same bounding box as board by absolutely positioning inside #gameContainer
  decorationsSvg.style.position = "absolute";
  decorationsSvg.style.top = "0";
  decorationsSvg.style.left = "0";
  decorationsSvg.style.width = board.clientWidth + "px";
  decorationsSvg.style.height = board.clientHeight + "px";
  decorationsSvg.style.pointerEvents = "none";
  decorationsSvg.style.zIndex = 2;
  // append to the parent container so it overlays board (gameContainer expected)
  const parent = board.parentElement || document.body;
  parent.style.position = parent.style.position || "relative";
  parent.appendChild(decorationsSvg);
}
// helper untuk resize svg overlay sesuai board
function resizeDecorationsSvg() {
  const rect = board.getBoundingClientRect();
  decorationsSvg.style.width = rect.width + "px";
  decorationsSvg.style.height = rect.height + "px";
  decorationsSvg.style.left = board.offsetLeft + "px";
  decorationsSvg.style.top = board.offsetTop + "px";
  // set viewBox to make coordinates consistent with pixel coordinates
  decorationsSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
}

/* ===== helper untuk posisi pusat sel (relatif ke SVG) ===== */
function getCellCenter(n) {
  const cell = findCellByNumber(n);
  const boardRect = board.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  // convert to coordinates relative to board top-left (and thus to SVG viewBox)
  const x = (cellRect.left + cellRect.width / 2) - boardRect.left;
  const y = (cellRect.top  + cellRect.height / 2) - boardRect.top;
  return { x, y };
}

/* ========== (2) KOTAK PERTANYAAN ========== */
const QUESTIONS_COUNT = 15;
const questionCells = [];
while (questionCells.length < QUESTIONS_COUNT) {
  const rand = Math.floor(Math.random() * 100) + 1;
  if (rand !== 1 && rand !== 100 && !questionCells.includes(rand)) {
    questionCells.push(rand);
    const cell = findCellByNumber(rand);
    if (cell) cell.classList.add("question-cell");
  }
}
console.log("Kotak pertanyaan (15):", questionCells);

/* ========== (3) LIST PERTANYAAN ========== */
// sekarang tiap pertanyaan punya pilihan ganda
const questions = [
  { q: "1. What is the main purpose of a narrative text?", options: ["To explain how something works","To tell a story or recount events","To describe a place"], correct: "To tell a story or recount events" },
  { q: "Planet terbesar?", options: ["Mars","Jupiter","Venus"], correct: "Jupiter" },
  { q: "Proklamator Indonesia?", options: ["Soekarno & Hatta","B.J. Habibie","Megawati"], correct: "Soekarno & Hatta" },
  { q: "Gunung tertinggi di dunia?", options: ["Everest","Merapi","Kilimanjaro"], correct: "Everest" },
  { q: "Lambang sila ke-5?", options: ["Padi dan Kapas","Bintang","Rantai"], correct: "Padi dan Kapas" },
  { q: "Hewan tercepat di darat?", options: ["Cheetah","Kuda","Kelinci"], correct: "Cheetah" },
  { q: "56 ÷ 1 ?", options: ["56","65","6"], correct: "56" },
  { q: "Negara Matahari Terbit?", options: ["Jepang","Korea","Cina"], correct: "Jepang" },
  { q: "Bendera Indonesia?", options: ["Merah Putih","Putih Merah","Merah Hijau"], correct: "Merah Putih" },
  { q: "Rumus air?", options: ["H2O","CO2","O2"], correct: "H2O" },
  { q: "Penemu listrik?", options: ["Benjamin Franklin","Edison","Tesla"], correct: "Benjamin Franklin" },
  { q: "Gunung api di Jawa Tengah?", options: ["Merapi","Bromo","Krakatau"], correct: "Merapi" },
  { q: "6 x 6 + 2 ?", options: ["38","36","40"], correct: "38" },
  { q: "Presiden pertama RI?", options: ["Soekarno","Soeharto","Habibie"], correct: "Soekarno" },
  { q: "Pulau terbesar di Indonesia?", options: ["Kalimantan","Sumatra","Papua"], correct: "Kalimantan" }
];
const questionMap = {};
for (let i = 0; i < questionCells.length; i++) {
  questionMap[questionCells[i]] = i % questions.length;
}

/* ========== (4) ULAR & TANGGA (GENERATOR) ========== */
function generateSnakesAndLadders(numLadders = 4, numSnakes = 4, minSteps = 2, maxSteps = 6) {
  const map = {};
  const usedStarts = new Set();
  const usedEnds = new Set();
  const usedCoords = []; 

  function hasNearby(row, col) {
    for (let c of usedCoords) {
      if (Math.abs(c.col - col) < 1) return true;
      if (c.col === col && Math.abs(c.row - row) < 2) return true;
    }
    return false;
  }

  function canUse(start, end, row, col) {
    if (start <= 1 || start >= 100) return false;
    if (end <= 1 || end >= 100) return false;
    if (start === end) return false;
    if (usedStarts.has(start) || usedEnds.has(start) || usedStarts.has(end) || usedEnds.has(end)) return false;
    if (questionCells.includes(start) || questionCells.includes(end)) return false;
    if (hasNearby(row, col)) return false;
    return true;
  }

  let attempts = 0, created = 0;
  // === Tangga ===
  while (created < numLadders && attempts < 5000) {
    attempts++;
    const steps = Math.floor(Math.random() * (maxSteps - minSteps + 1)) + minSteps;
    const col = Math.floor(Math.random() * 10);
    const startRow = Math.floor(Math.random() * (10 - steps)) + steps;
    const endRow = startRow - steps;
    const start = rowColToNumber(startRow, col);
    const end = rowColToNumber(endRow, col);
    if (!canUse(start, end, startRow, col)) continue;
    map[start] = end;
    usedStarts.add(start); usedEnds.add(end);
    usedCoords.push({row: startRow, col}, {row: endRow, col});
    created++;
  }

  attempts = 0; created = 0;
  // === Ular ===
  while (created < numSnakes && attempts < 5000) {
    attempts++;
    const steps = Math.floor(Math.random() * (maxSteps - minSteps + 1)) + minSteps;
    const col = Math.floor(Math.random() * 10);
    const startRow = Math.floor(Math.random() * (10 - steps));
    const endRow = startRow + steps;
    const start = rowColToNumber(startRow, col);
    const end = rowColToNumber(endRow, col);
    if (!canUse(start, end, startRow, col)) continue;
    map[start] = end;
    usedStarts.add(start); usedEnds.add(end);
    usedCoords.push({row: startRow, col}, {row: endRow, col});
    created++;
  }

  return map;
}
let snakesAndLadders = generateSnakesAndLadders();

/* ========== DRAW ULAR & TANGGA (GARIS DEFAULT) ========== */
function drawSnakesAndLadders(map) {
  $$('.snake-ladder-line').forEach(el => el.remove());
  const boardRect = board.getBoundingClientRect();
  for (const [fromStr, to] of Object.entries(map)) {
    const from = Number(fromStr);
    const startCell = findCellByNumber(from);
    const endCell = findCellByNumber(to);
    if (!startCell || !endCell) continue;
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();
    const x = startRect.left + startRect.width / 2 - boardRect.left;
    const y1 = startRect.top + startRect.height / 2 - boardRect.top;
    const y2 = endRect.top + endRect.height / 2 - boardRect.top;
    const isLadder = to > from;
    const line = document.createElement('div');
    line.classList.add('snake-ladder-line');
    line.style.position = 'absolute';
    line.style.width = '8px';
    line.style.left = `calc(${x}px - 4px)`;
    line.style.top = Math.min(y1, y2) + 'px';
    line.style.height = Math.abs(y2 - y1) + 'px';
    line.style.backgroundColor = isLadder ? 'yellow' : 'green';
    line.style.borderRadius = '4px';
    line.style.zIndex = '1' ;
  }
}

/* === DRAW SVG-BASED SNAKES & LADDERS (fungsi utama yang akan digambar ulang ketika regenerate) === */
function drawSvgSnakesAndLadders(map) {
  if (!decorationsSvg) return;

  resizeDecorationsSvg();

  while (decorationsSvg.firstChild) decorationsSvg.removeChild(decorationsSvg.firstChild);

  const ladderColor = "goldenrod";
  const ladderRailWidth = 4;
  const ladderStepWidth = 3;
  const ladderSideOffset = 10;
  const stepSpacing = 22; 

  const snakeColor = "#0b8043";
  const snakeWidth = 6;

  // map is object start->end
  for (const [startStr, end] of Object.entries(map)) {
    const start = Number(startStr);
    const isLadder = end > start;
    const startC = getCellCenter(start);
    const endC   = getCellCenter(end);

    if (isLadder) {
      // gambar ladder as group
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "svg-ladder");
      // two rails
      const leftRail = document.createElementNS("http://www.w3.org/2000/svg", "line");
      leftRail.setAttribute("x1", startC.x - ladderSideOffset);
      leftRail.setAttribute("y1", startC.y);
      leftRail.setAttribute("x2", endC.x - ladderSideOffset);
      leftRail.setAttribute("y2", endC.y);
      leftRail.setAttribute("stroke", ladderColor);
      leftRail.setAttribute("stroke-width", ladderRailWidth);
      leftRail.setAttribute("stroke-linecap", "round");
      g.appendChild(leftRail);

      const rightRail = document.createElementNS("http://www.w3.org/2000/svg", "line");
      rightRail.setAttribute("x1", startC.x + ladderSideOffset);
      rightRail.setAttribute("y1", startC.y);
      rightRail.setAttribute("x2", endC.x + ladderSideOffset);
      rightRail.setAttribute("y2", endC.y);
      rightRail.setAttribute("stroke", ladderColor);
      rightRail.setAttribute("stroke-width", ladderRailWidth);
      rightRail.setAttribute("stroke-linecap", "round");
      g.appendChild(rightRail);

      // anak tangga
      const dist = Math.hypot(endC.x - startC.x, endC.y - startC.y);
      const steps = Math.max(2, Math.floor(dist / stepSpacing));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = startC.x + (endC.x - startC.x) * t;
        const y = startC.y + (endC.y - startC.y) * t;
        const step = document.createElementNS("http://www.w3.org/2000/svg", "line");
        step.setAttribute("x1", x - ladderSideOffset);
        step.setAttribute("y1", y);
        step.setAttribute("x2", x + ladderSideOffset);
        step.setAttribute("y2", y);
        step.setAttribute("stroke", ladderColor);
        step.setAttribute("stroke-width", ladderStepWidth);
        g.appendChild(step);
      }

      decorationsSvg.appendChild(g);
    } else {
      // gambar snake sebagai path bezier
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      // control points sederhana untuk curve yang S-shaped
      const midX = (startC.x + endC.x) / 2;
      const midY = (startC.y + endC.y) / 2;
      const cp1x = midX + (endC.y < startC.y ? 40 : -40);
      const cp1y = startC.y - 30;
      const cp2x = midX - (endC.y < startC.y ? 40 : -40);
      const cp2y = endC.y + 30;
      const d = `M ${startC.x} ${startC.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endC.x} ${endC.y}`;
      path.setAttribute("d", d);
      path.setAttribute("stroke", snakeColor);
      path.setAttribute("stroke-width", snakeWidth);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("class", "svg-snake");
      decorationsSvg.appendChild(path);

      // -- optional: tambahkan "kepala" di end (circle) supaya keliatan jelas --
      const head = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      head.setAttribute("cx", endC.x);
      head.setAttribute("cy", endC.y);
      head.setAttribute("r", Math.max(6, snakeWidth));
      head.setAttribute("fill", snakeColor);
      decorationsSvg.appendChild(head);
    }
  }

  // pastikan svg tidak menerima event
  decorationsSvg.style.pointerEvents = "none";
}

/* ========== (5) PAWN POSITIONING ========== */
function placePawnCentered(pawnEl, cellEl, siblingOffset = 0) {
  const cellRect = cellEl.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const centerX = cellRect.left + cellRect.width / 2;
  const centerY = cellRect.top + cellRect.height / 2;
  const relLeft = centerX - boardRect.left;
  const relTop  = centerY - boardRect.top;
  const left = relLeft - pawnEl.offsetWidth / 2 + siblingOffset;
  const top  = relTop  - pawnEl.offsetHeight / 2;
  const maxLeft = board.clientWidth - pawnEl.offsetWidth;
  const maxTop  = board.clientHeight - pawnEl.offsetHeight;
  pawnEl.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
  pawnEl.style.top  = Math.min(Math.max(0, top), maxTop) + 'px';
}
function updatePlayerVisualPositions() {
  const p1Pos = positions[0], p2Pos = positions[1];
  const cell1 = findCellByNumber(p1Pos);
  const cell2 = findCellByNumber(p2Pos);
  if (cell1 && cell2 && p1Pos === p2Pos) {
    placePawnCentered(playerEl, cell1, -10);
    placePawnCentered(player2El, cell1, +10);
  } else {
    if (cell1) placePawnCentered(playerEl, cell1, 0);
    if (cell2) placePawnCentered(player2El, cell2, 0);
  }
}
playerEl.style.position = 'absolute';
player2El.style.position = 'absolute';
playerEl.style.transition = 'left 300ms ease, top 300ms ease, transform 180ms';
player2El.style.transition = 'left 300ms ease, top 300ms ease, transform 180ms';

/* ========== (6) ANIMASI GERAK + ULAR TANGGA ========== */
async function animateMoveSteps(playerIndex, steps) {
  locked = true;
  for (let s = 0; s < steps; s++) {
    positions[playerIndex] = Math.min(100, positions[playerIndex] + 1);
    updatePlayerVisualPositions();
    await sleep(260);
  }
  const landed = positions[playerIndex];
  const target = snakesAndLadders[landed];
  if (typeof target !== 'undefined') {
    await sleep(200);
    positions[playerIndex] = target;
    updatePlayerVisualPositions();
  }
  locked = false;
}

/* ========== (7) POPUP PERTANYAAN PILIHAN GANDA ========== */
function showQuestionForCell(cellNum) {
  const qIdx = questionMap[cellNum];
  const qObj = questions[qIdx];
  if (!questionPopup) return;

  questionPopup.innerHTML = `
    <div class="flip-card" id="flipCard">
      <div class="flip-card-inner" id="flipInner">
        <div class="flip-card-front">
          <h3>${qObj.q}</h3>
          <div class="options">
            ${qObj.options.map(opt => `<button class="optionBtn">${opt}</button>`).join("")}
          </div>
        </div>
        <div class="flip-card-back" id="answerResult">
          <h3 id="resultText"></h3>
          <button id="closePopupBtn">Tutup</button>
        </div>
      </div>
    </div>
  `;

  // ✅ gunakan class "active" biar konsisten dengan CSS
  questionPopup.classList.add("active");

  const optionBtns = $$(".optionBtn");
  const resultText = $("#resultText");
  const flipInner = $("#flipInner");

  optionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const card = $("#flipCard");
      if (btn.textContent === qObj.correct) {
        resultText.textContent = "✅ Benar! Jawaban: " + qObj.correct;
        resultText.style.color = "white";
        checkAnswer(true, card);
      } else {
        resultText.textContent = "❌ Jawaban Salah!";
        resultText.style.color = "white";
        checkAnswer(false, card);
      }
    });
  });

  const closeBtn = $("#closePopupBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", hideQuestionPopup);
  }
}

function hideQuestionPopup() {
  if (questionPopup) {
    // ✅ sembunyikan dengan hapus class "active"
    questionPopup.classList.remove("active");

    // reset flip supaya bisa digunakan lagi
    const flipInner = $("#flipInner");
    if (flipInner) flipInner.classList.remove("flipped");
  }
}

/* ✅ Tambahan fungsi untuk flip + background benar/salah */
function checkAnswer(isCorrect, card) {
  const flipInner = card.querySelector(".flip-card-inner");
  const back = card.querySelector(".flip-card-back");

  // reset class agar tidak numpuk
  back.classList.remove("correct", "wrong");

  if (isCorrect) {
    back.classList.add("correct");
  } else {
    back.classList.add("wrong");
  }

  // aktifkan efek flip
  flipInner.classList.add("flipped");
}

/* ========== (8) DADU & GILIRAN ========== */
async function handleRoll() {
  if (locked) return;
  locked = true;
  if (rollBtn) rollBtn.disabled = true;
  if (diceEl) diceEl.classList.add('roll');
  const spinTicks = 10;
  for (let t = 0; t < spinTicks; t++) {
    const tmp = Math.floor(Math.random() * 6) + 1;
    if (diceEl) diceEl.textContent = tmp;
    await sleep(60 + t * 10);
  }
  const result = Math.floor(Math.random() * 6) + 1;
  if (diceEl) diceEl.textContent = result;
  if (diceEl) diceEl.classList.remove('roll');
  await animateMoveSteps(currentPlayer, result);
  const landedPos = positions[currentPlayer];
  if (questionCells.includes(landedPos)) showQuestionForCell(landedPos);
  if (positions[currentPlayer] >= 100) {
    alert(`Player ${currentPlayer+1} menang! 🎉`);
    if (rollBtn) rollBtn.disabled = true;
    locked = true;
    return;
  }
  currentPlayer = currentPlayer === 0 ? 1 : 0;
  if (rollBtn) rollBtn.disabled = false;
  locked = false;
}
if (rollBtn) rollBtn.addEventListener('click', handleRoll);

/* ========== (9) RESIZE & INIT ========== */
window.addEventListener('resize', () => {
  drawSnakesAndLadders(snakesAndLadders);
  // redimension svg overlay and redraw svg snakes/ladders
  resizeDecorationsSvg();
  drawSvgSnakesAndLadders(snakesAndLadders);
  updatePlayerVisualPositions();
});
setTimeout(() => {
  // initial draw
  drawSnakesAndLadders(snakesAndLadders);
  resizeDecorationsSvg();
  drawSvgSnakesAndLadders(snakesAndLadders);
  updatePlayerVisualPositions();
}, 100);

/* ========== (10) TOMBOL REGENERATE ULAR & TANGGA ========== */
let regenBtn = document.getElementById("regenBtn");
if (!regenBtn) {
  regenBtn = document.createElement("button");
  regenBtn.id = "regenBtn";
  regenBtn.textContent = "🔄 Regenerate Snakes & Ladders";
  regenBtn.style.marginTop = "10px";
  regenBtn.title = "Klik untuk membuat ulang posisi ular dan tangga";
  document.body.appendChild(regenBtn);
}

regenBtn.addEventListener("click", () => {
  // 1️⃣ HAPUS garis lama sebelum gambar ulang
  $$('.snake-ladder-line').forEach(el => el.remove());

  // 2️⃣ Buat ulang peta ular & tangga
  snakesAndLadders = generateSnakesAndLadders();

  // 3️⃣ Kosongkan SVG lama
  const svg = document.getElementById("decorations");
  if (svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  // 4️⃣ Gambar ulang SVG ular & tangga fungsional
  drawSvgSnakesAndLadders(snakesAndLadders);

  // 5️⃣ Reset posisi pemain & giliran
  positions = [1, 1];
  currentPlayer = 0;
  updatePlayerVisualPositions();
});
/* ========== (EXTRA) BACKGROUND FOLLOW MOUSE ========== */
document.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;

  // Buat warna dinamis berdasarkan posisi
  const r = Math.floor((x / 100) * 255);
  const g = Math.floor((y / 100) * 255);
  const b = 180; // tetap biru lembut

  // Gradient melingkar mengikuti mouse
  document.body.style.background = `
    radial-gradient(circle at ${x}% ${y}%, 
      rgba(${r},${g},${b},0.8) 0%, 
      rgba(${r/2},${g/2},${b/2},0.4) 30%, 
      #202020 100%)
  `;
});
