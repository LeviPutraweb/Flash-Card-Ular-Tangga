// =================== FINAL JS SCRIPT ===================
// Semua komentar dalam bahasa Indonesia

/* ========== UTIL ========== */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ========== ELEMENT REFERENSI ========== */
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

const diceEl = $('#dice') || (function(){ const d=document.createElement('div'); d.id='dice'; document.body.appendChild(d); return d; })();
const rollBtn = $('#rollDiceBtn') || $('#rollDice') || (function(){ const b=document.querySelector('button'); return b; })();

// popup container
const questionPopup = $('#questionPopup');

/* ========== GAME STATE ========== */
let positions = [1, 1];
let currentPlayer = 0;
let locked = false;

/* ========== (1) BANGUN PAPAN JIKA BELUM ADA ========== */
if (board.children.length === 0) {
  for (let i = 100; i >= 1; i--) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.cell = i;
    cell.textContent = i;
    board.appendChild(cell);
  }
}

/* ========== HELPER ========== */
function findCellByNumber(n) {
  return board.querySelector(`.cell[data-cell='${n}']`);
}

/* ========== (2) PILIH 15 KOTAK PERTANYAAN RANDOM & TANDAI ========== */
const QUESTIONS_COUNT = 15;
const questionCells = [];
while (questionCells.length < QUESTIONS_COUNT) {
  const rand = Math.floor(Math.random() * 100) + 1;
  if (rand !== 1 && rand !== 100 && !questionCells.includes(rand)) { // jangan kotak 1 & 100
    questionCells.push(rand);
    const cell = findCellByNumber(rand);
    if (cell) cell.classList.add("question-cell");
  }
}
console.log("Kotak pertanyaan (15):", questionCells);

/* ========== (3) PERTANYAAN ========== */
const questions = [
  { q: "sigma boy", a: "Jakarta" },
  { q: "apacoba?", a: "Jupiter" },
  { q: "apcb?", a: "Soekarno & Hatta" },
  { q: "abcd?", a: "Everest" },
  { q: "ambalabu", a: "Padi dan Kapas" },
  { q: "skibidi?", a: "Cheetah" },
  { q: "kelas king?", a: "56" },
  { q: "menyala bos?", a: "Jepang" },
  { q: "dpr eek?", a: "Merah Putih" },
  { q: "tikus tikus?", a: "H2O" },
  { q: "nguawur?", a: "Benjamin Franklin" },
  { q: "apacobarek?", a: "Merapi" },
  { q: "streakk?", a: "38" },
  { q: "apiapii?", a: "Soekarno" },
  { q: "demodemoo?", a: "Kalimantan" }
];

// mapping pertanyaan ke kotak
const questionMap = {};
for (let i = 0; i < questionCells.length; i++) {
  questionMap[questionCells[i]] = i % questions.length;
}

/* ========== (4) ULAR & TANGGA VERTIKAL 5x ========== */
const snakesAndLadders = {
  // Tangga naik vertikal (hijau), max 5 kotak
  2: 6,
  8: 12,
  15: 19,
  23: 28,
  34: 38,
  // Ular turun vertikal (kuning), max 5 kotak
  17: 13,
  26: 21,
  33: 29,
  42: 37,
  49: 45
};

// Hapus garis lama jika ada
$$('.snake-ladder-line').forEach(el => el.remove());

for (const [from, to] of Object.entries(snakesAndLadders)) {
  const startCell = findCellByNumber(from);
  const endCell = findCellByNumber(to);
  if (!startCell || !endCell) continue;

  const boardRect = board.getBoundingClientRect();
  const startRect = startCell.getBoundingClientRect();
  const endRect = endCell.getBoundingClientRect();

  const x = startRect.left + startRect.width/2 - boardRect.left; // vertikal
  const y1 = startRect.top + startRect.height/2 - boardRect.top;
  const y2 = endRect.top + endRect.height/2 - boardRect.top;

  const isLadder = parseInt(from) < parseInt(to);

  const lineEl = document.createElement('div');
  lineEl.classList.add('snake-ladder-line');
  lineEl.style.position = 'absolute';
  lineEl.style.width = '6px';
  lineEl.style.left = x + 'px';
  lineEl.style.top = Math.min(y1, y2) + 'px';
  lineEl.style.height = Math.abs(y2 - y1) + 'px';
  lineEl.style.backgroundColor = isLadder ? 'green' : 'yellow';
  lineEl.style.zIndex = '1';
  board.appendChild(lineEl);
}

/* ========== (5) POSISI & PENEMPATAN PION TENGAH CELL ========== */
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
  const p1Pos = positions[0];
  const p2Pos = positions[1];
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

updatePlayerVisualPositions();

/* ========== (6) ANIMASI GERAK LANGKAH PER LANGKAH ========== */
async function animateMoveSteps(playerIndex, steps) {
  locked = true;
  for (let s = 0; s < steps; s++) {
    positions[playerIndex] = Math.min(100, positions[playerIndex] + 1);
    const pawn = playerIndex === 0 ? playerEl : player2El;
    pawn.style.transform = 'scale(1.12)';
    updatePlayerVisualPositions();
    await sleep(260);
    pawn.style.transform = 'scale(1)';
    await sleep(20);
  }

  const landed = positions[playerIndex];
  if (snakesAndLadders[landed]) {
    positions[playerIndex] = snakesAndLadders[landed];
    updatePlayerVisualPositions();
    await sleep(500);
  }

  locked = false;
}

/* ========== (7) PERTANYAAN POPUP DENGAN FLIP ========== */
function showQuestionForCell(cellNum) {
  const qIdx = questionMap[cellNum];
  const qObj = questions[qIdx];
  if (!questionPopup) return;

  questionPopup.innerHTML = `
    <div class="flip-card" id="flipCard">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <h3>Pertanyaan</h3>
          <p>${qObj.q}</p>
          <small>Klik kartu untuk lihat jawaban</small>
        </div>
        <div class="flip-card-back">
          <h3>Jawaban</h3>
          <p>${qObj.a}</p>
          <button id="closePopupBtn">Tutup</button>
        </div>
      </div>
    </div>
  `;
  questionPopup.style.display = 'flex';

  const flipCard = $('#flipCard');
  if (flipCard) flipCard.addEventListener('click', () => flipCard.classList.toggle('flipped'));

  const closeBtn = $('#closePopupBtn');
  if (closeBtn) closeBtn.addEventListener('click', hideQuestionPopup);

  const cell = findCellByNumber(cellNum);
  if (cell) cell.classList.add('active-question');
}

function hideQuestionPopup() {
  if (questionPopup) questionPopup.style.display = 'none';
  $$('.cell.active-question').forEach(c => c.classList.remove('active-question'));
}

/* ========== (8) LOGIKA DADU & GILIRAN ========== */
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
window.addEventListener('resize', updatePlayerVisualPositions);
setTimeout(updatePlayerVisualPositions, 60);
