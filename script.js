
/***************** GLOBAL STATE *******************/
let numSelected = null;
let errors = 0;
let timerInterval;
let startTime;
let board = [];           // current puzzle, array of strings w/ '-'
let solution = [];        // solved board, array of strings (digits)
let originalBoard = [];   // copy for reset
let filledCount = 0;      // how many tiles user has filled correctly
let currentDifficulty = 'easy';

// remove counts per difficulty (blanks)
const difficultySettings = {
    easy:   35,
    medium: 45,
    hard:   55,
    expert: 60
};

/***************** UTILITIES *******************/
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function isSafe(boardArr, row, col, num) {
    // row & col checks
    for (let x = 0; x < 9; x++) {
        if (boardArr[row][x] === num) return false;
        if (boardArr[x][col] === num) return false;
    }
    // 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (boardArr[startRow + r][startCol + c] === num) return false;
        }
    }
    return true;
}

function solveBoard(boardArr) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (boardArr[row][col] === 0) {
                const nums = shuffle([1,2,3,4,5,6,7,8,9]);
                for (const n of nums) {
                    if (isSafe(boardArr, row, col, n)) {
                        boardArr[row][col] = n;
                        if (solveBoard(boardArr)) return true;
                        boardArr[row][col] = 0;
                    }
                }
                return false; // trigger backtrack
            }
        }
    }
    return true; // solved
}

function generatePuzzle(level) {
    // 1. generate full solved board
    let solved = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveBoard(solved);

    // 2. clone and remove numbers based on difficulty
    let puzzle = solved.map(row => row.slice());
    let removals = difficultySettings[level];
    while (removals > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0;
            removals--;
        }
    }

    // 3. convert to string arrays
    const puzzleStr = puzzle.map(row => row.map(v => v === 0 ? '-' : v).join(''));
    const solvedStr  = solved.map(row => row.join(''));
    return { puzzleStr, solvedStr };
}

function formatTime(seconds) {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
}

function getLS(key, def = null) {
    const val = localStorage.getItem(key);
    return val === null ? def : JSON.parse(val);
}

function setLS(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

/***************** GAME FLOW *******************/
function initDigits() {
    const digitsDiv = document.getElementById('digits');
    digitsDiv.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const div = document.createElement('div');
        div.id = i;
        div.innerText = i;
        div.classList.add('number');
        div.addEventListener('click', selectNumber);
        digitsDiv.appendChild(div);
    }
}

function buildBoard() {
    const boardDiv = document.getElementById('board');
    boardDiv.innerHTML = '';

    filledCount = 0;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const tile = document.createElement('div');
            tile.id = `${r}-${c}`;
            const val = board[r][c];
            if (val !== '-') {
                tile.innerText = val;
                tile.classList.add('tile-start');
                filledCount++;
            }
            if (r === 2 || r === 5) tile.classList.add('horizontal-line');
            if (c === 2 || c === 5) tile.classList.add('vertical-line');
            tile.classList.add('tile');
            tile.addEventListener('click', selectTile);
            boardDiv.appendChild(tile);
        }
    }
}

function startTimer() {
    startTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('timer').innerText = formatTime(elapsed);
    }, 1000);
}

function updateStatsDisplay() {
    document.getElementById('difficulty-label').innerText = capitalize(currentDifficulty);

    const fastestKey = `fastest_${currentDifficulty}`;
    const completedKey = `completed_${currentDifficulty}`;
    const fastest = getLS(fastestKey, null);
    const completed = getLS(completedKey, 0);

    document.getElementById('fastest').innerText = fastest ? formatTime(fastest) : '--:--';
    document.getElementById('completed').innerText = completed;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function newGame() {
    // capture currentDifficulty from dropdown
    const select = document.getElementById('difficulty-select');
    currentDifficulty = select.value;

    // generate puzzle
    const { puzzleStr, solvedStr } = generatePuzzle(currentDifficulty);
    board = puzzleStr;
    solution = solvedStr;
    originalBoard = JSON.parse(JSON.stringify(board));

    errors = 0;
    document.getElementById('errors').innerText = errors;
    document.getElementById('timer').innerText = '00:00';

    initDigits();
    buildBoard();
    updateStatsDisplay();
    startTimer();

    // reset number selection highlight
    numSelected = null;
}

/***************** INTERACTION HANDLERS *******************/
function selectNumber() {
    if (numSelected) numSelected.classList.remove('number-selected');
    numSelected = this;
    numSelected.classList.add('number-selected');
}

function selectTile() {
    if (!numSelected) return;
    if (this.innerText !== '') return; // already filled

    const [r, c] = this.id.split('-').map(Number);

    if (solution[r][c] === numSelected.id) {
        this.innerText = numSelected.id;
        this.classList.add('success');
        filledCount++;
        // update internal board state
        board[r] = board[r].substring(0, c) + numSelected.id + board[r].substring(c + 1);

        if (filledCount === 81) {
            winGame();
        }
    } else {
        errors++;
        document.getElementById('errors').innerText = errors;
        this.classList.add('mistake');
        setTimeout(() => this.classList.remove('mistake'), 500);
    }
}

function giveHint() {
    const empties = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (document.getElementById(`${r}-${c}`).innerText === '') {
                empties.push([r, c]);
            }
        }
    }
    if (empties.length === 0) return;

    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    const tile = document.getElementById(`${r}-${c}`);
    tile.innerText = solution[r][c];
    tile.style.color = 'rgba(21, 28, 221, 0.9)';
    tile.classList.add('success');
    filledCount++;
    board[r] = board[r].substring(0, c) + solution[r][c] + board[r].substring(c + 1);
    if (filledCount === 81) winGame();
}

function resetGame() {
    board = JSON.parse(JSON.stringify(originalBoard));
    errors = 0;
    document.getElementById('errors').innerText = errors;
    buildBoard();
    startTimer();
}

function checkSolution() {
        let correct = true;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                let tile = document.getElementById(`${r}-${c}`);
                tile.classList.remove("correct", "incorrect");
                if (!tile.classList.contains("tile-start")) {
                    if (tile.innerText === solution[r][c]) {
                        tile.classList.add("correct");
                    } else {
                        tile.classList.add("incorrect");
                        correct = false;
                    }
                }
            }
        }
    

     if (correct) {
            let difficulty = document.getElementById("difficulty").value;
            let completions = localStorage.getItem(`completed-${difficulty}`) || 0;
            localStorage.setItem(`completed-${difficulty}`, parseInt(completions) + 1);
            updateStats();
            alert("🎉 Congratulations! Puzzle completed correctly.");
        }
    else{
            alert("Some tiles are incorrect or not filled. Please check your solution.");
    }    
    }

function showSolution() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const tile = document.getElementById(`${r}-${c}`);
            tile.innerText = solution[r][c];
            tile.style.color = 'rgba(45, 50, 122, 0.83)';
        }
    }
    clearInterval(timerInterval);
}

function winGame() {
    clearInterval(timerInterval);
    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

    // update localStorage
    const fastestKey = `fastest_${currentDifficulty}`;
    const completedKey = `completed_${currentDifficulty}`;

    const prevFastest = getLS(fastestKey, null);
    if (prevFastest === null || elapsedSec < prevFastest) {
        setLS(fastestKey, elapsedSec);
    }
    const prevCompleted = getLS(completedKey, 0);
    setLS(completedKey, prevCompleted + 1);

    updateStatsDisplay();
    alert(`🥳 Congratulations! You solved the puzzle in ${formatTime(elapsedSec)}.`);
}

function resetStats() {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
        if (key.startsWith('fastest_') || key.startsWith('completed_')) {
            localStorage.removeItem(key);
        }
    }
    updateStatsDisplay();
    alert("All statistics will be reset.");
}


/***************** START *******************/
window.addEventListener('load', () => {
    newGame();
});
