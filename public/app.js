const elements = {
  rowsInput: document.getElementById('rowsInput'),
  colsInput: document.getElementById('colsInput'),
  cellSizeInput: document.getElementById('cellSizeInput'),
  autoFitToggle: document.getElementById('autoFitToggle'),
  applySizeBtn: document.getElementById('applySizeBtn'),
  palette: document.getElementById('palette'),
  customColor: document.getElementById('customColor'),
  addColorBtn: document.getElementById('addColorBtn'),
  clearGridBtn: document.getElementById('clearGridBtn'),
  topCluesToggle: document.getElementById('topCluesToggle'),
  generateFromCluesBtn: document.getElementById('generateFromCluesBtn'),
  clueToolGroup: document.getElementById('clueToolGroup'),
  clearCluesBtn: document.getElementById('clearCluesBtn'),
  topClues: document.getElementById('topClues'),
  leftClues: document.getElementById('leftClues'),
  grid: document.getElementById('grid'),
  boardWrap: document.getElementById('boardWrap'),
  sizeLabel: document.getElementById('sizeLabel'),
  modeLabel: document.getElementById('modeLabel'),
  clueLabel: document.getElementById('clueLabel')
};

const defaultPalette = [
  '#f08a24',
  '#2a7c6f',
  '#2f4b7c',
  '#f25c54',
  '#f7b801',
  '#6f1d1b',
  '#4a4e69',
  '#8ab17d'
];

const EMPTY_SEGMENT = -1;
const EMPTY_COLOR = '#b6a394';

const state = {
  rows: 10,
  cols: 10,
  baseCellSize: 28,
  cellSize: 28,
  autoFit: true,
  palette: [...defaultPalette],
  selectedColorIndex: 0,
  tool: 'pen',
  clueTool: 'edit',
  showTopClues: false,
  grid: [],
  rowClues: [],
  colClues: [],
  leftSlots: 0,
  topSlots: 0,
  gridEls: [],
  rowClueEls: [],
  colClueEls: [],
  isPointerDown: false,
  pointerMode: 'paint',
  lastPointerTime: 0,
  lastInput: 'grid'
};

const PATTERN_LIMIT = 6000;

function createGridData(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

function createClueData(lines, slots) {
  return Array.from({ length: lines }, () =>
    Array.from({ length: slots }, () => ({ value: 0, colorIndex: null }))
  );
}

function hexToRgba(hex, alpha) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateLabels() {
  elements.sizeLabel.textContent = `${state.rows} x ${state.cols}`;
  elements.modeLabel.textContent = state.tool === 'eraser' ? 'Silgi' : 'Çizim';
  elements.clueLabel.textContent = 'Canlı';
}

function buildPalette() {
  elements.palette.innerHTML = '';
  state.palette.forEach((color, index) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.backgroundColor = color;
    swatch.dataset.index = index;
    if (index === state.selectedColorIndex) {
      swatch.classList.add('active');
    }
    swatch.addEventListener('click', () => selectColor(index));
    elements.palette.appendChild(swatch);
  });
}

function selectColor(index) {
  state.selectedColorIndex = index;
  buildPalette();
}

function updateLayout() {
  const desired = state.autoFit ? computeAutoCellSize(state.baseCellSize) : state.baseCellSize;
  state.cellSize = desired;
  const clueSize = Math.max(14, Math.round(state.cellSize * 0.6));
  elements.boardWrap.style.setProperty('--cell-size', `${state.cellSize}px`);
  elements.boardWrap.style.setProperty('--clue-size', `${clueSize}px`);

  elements.grid.style.gridTemplateColumns = `repeat(${state.cols}, ${state.cellSize}px)`;
  elements.grid.style.gridTemplateRows = `repeat(${state.rows}, ${state.cellSize}px)`;

  elements.topClues.style.gridTemplateColumns = `repeat(${state.cols}, ${state.cellSize}px)`;
  elements.topClues.style.gridTemplateRows = `repeat(${state.topSlots}, ${clueSize}px)`;

  elements.leftClues.style.gridTemplateColumns = `repeat(${state.leftSlots}, ${clueSize}px)`;
  elements.leftClues.style.gridTemplateRows = `repeat(${state.rows}, ${state.cellSize}px)`;
}

function updateTopClueVisibility() {
  elements.boardWrap.classList.toggle('hide-top', !state.showTopClues);
  updateLayout();
}

function computeAutoCellSize(desired) {
  const board = elements.boardWrap.parentElement;
  if (!board) return desired;
  const maxWidth = board.clientWidth - 12;
  if (maxWidth <= 0) return desired;
  const minSize = parseInt(elements.cellSizeInput.min, 10) || 18;
  const maxSize = Math.min(
    desired,
    parseInt(elements.cellSizeInput.max, 10) || desired
  );

  for (let size = maxSize; size >= minSize; size--) {
    const clueSize = Math.max(14, Math.round(size * 0.6));
    const totalWidth = state.cols * size + state.leftSlots * clueSize;
    if (totalWidth <= maxWidth) {
      return size;
    }
  }

  return minSize;
}

function buildGrid() {
  elements.grid.innerHTML = '';
  state.gridEls = [];

  for (let r = 0; r < state.rows; r++) {
    const rowEls = [];
    for (let c = 0; c < state.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      if ((c + 1) % 5 === 0) {
        cell.classList.add('major-right');
      }
      if ((r + 1) % 5 === 0) {
        cell.classList.add('major-bottom');
      }
      rowEls.push(cell);
      elements.grid.appendChild(cell);
    }
    state.gridEls.push(rowEls);
  }
}

function buildClues() {
  elements.topClues.innerHTML = '';
  elements.leftClues.innerHTML = '';
  state.rowClueEls = Array.from({ length: state.rows }, () => Array(state.leftSlots).fill(null));
  state.colClueEls = Array.from({ length: state.cols }, () => Array(state.topSlots).fill(null));

  for (let slot = 0; slot < state.topSlots; slot++) {
    for (let col = 0; col < state.cols; col++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'clue-cell';
      cell.dataset.type = 'col';
      cell.dataset.line = col;
      cell.dataset.slot = slot;
      state.colClueEls[col][slot] = cell;
      elements.topClues.appendChild(cell);
    }
  }

  for (let row = 0; row < state.rows; row++) {
    for (let slot = 0; slot < state.leftSlots; slot++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'clue-cell';
      cell.dataset.type = 'row';
      cell.dataset.line = row;
      cell.dataset.slot = slot;
      state.rowClueEls[row][slot] = cell;
      elements.leftClues.appendChild(cell);
    }
  }

  updateClueEditState();
}

function renderGrid() {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      renderCell(r, c);
    }
  }
}

function renderCell(r, c) {
  const cell = state.gridEls[r][c];
  const colorIndex = state.grid[r][c];
  if (colorIndex === null || colorIndex === undefined) {
    cell.style.backgroundColor = '#fdf9f3';
    return;
  }
  const color = state.palette[colorIndex];
  cell.style.backgroundColor = color || '#fdf9f3';
}

function renderClues() {
  for (let row = 0; row < state.rows; row++) {
    for (let slot = 0; slot < state.leftSlots; slot++) {
      const cell = state.rowClueEls[row][slot];
      const entry = state.rowClues[row][slot];
      renderClueCell(cell, entry);
    }
  }

  for (let col = 0; col < state.cols; col++) {
    for (let slot = 0; slot < state.topSlots; slot++) {
      const cell = state.colClueEls[col][slot];
      const entry = state.colClues[col][slot];
      renderClueCell(cell, entry);
    }
  }
}

function renderClueCell(cell, entry) {
  const hasValue = entry.value > 0;
  cell.textContent = hasValue ? entry.value : '';
  cell.classList.toggle('has-value', hasValue);

  cell.classList.remove('has-color', 'is-empty');

  if (entry.colorIndex === EMPTY_SEGMENT) {
    cell.style.color = EMPTY_COLOR;
    cell.style.backgroundColor = hexToRgba(EMPTY_COLOR, 0.12);
    cell.classList.add('has-color', 'is-empty');
    return;
  }

  if (entry.colorIndex !== null && entry.colorIndex !== undefined && state.palette[entry.colorIndex]) {
    const color = state.palette[entry.colorIndex];
    cell.style.color = color;
    cell.style.backgroundColor = hexToRgba(color, 0.12);
    cell.classList.add('has-color');
    return;
  }

  cell.style.color = '';
  cell.style.backgroundColor = '';
}

function computeLineClues(values) {
  const segments = [];
  let currentToken = null;
  let length = 0;

  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    const token = raw === null || raw === undefined ? EMPTY_SEGMENT : raw;

    if (currentToken === null) {
      currentToken = token;
      length = 1;
      continue;
    }

    if (token === currentToken) {
      length += 1;
    } else {
      segments.push({ value: length, colorIndex: currentToken });
      currentToken = token;
      length = 1;
    }
  }

  if (currentToken !== null) {
    segments.push({ value: length, colorIndex: currentToken });
  }

  return segments;
}

function extractLineClues(entries) {
  return entries
    .filter((entry) => entry.value > 0 && entry.colorIndex !== EMPTY_SEGMENT)
    .map((entry) => ({
      value: entry.value,
      colorIndex:
        entry.colorIndex === null || entry.colorIndex === undefined
          ? state.selectedColorIndex
          : entry.colorIndex
    }));
}

function extractCompactClues(entries) {
  return entries
    .filter((entry) => entry.value > 0 && entry.colorIndex !== EMPTY_SEGMENT)
    .map((entry) => ({
      value: entry.value,
      colorIndex:
        entry.colorIndex === null || entry.colorIndex === undefined
          ? state.selectedColorIndex
          : entry.colorIndex
    }));
}

// Sadece manuel girilen clue'ları sola hizala (computed clue'ları koru)
function leftAlignRowClues() {
  // Bu fonksiyon artık kullanılmıyor - clue'lar yerinde kalıyor
  // Grid oluşturma slot pozisyonuna göre yapılıyor
}

function buildLineFromExactClues(clues, length) {
  const total = clues.reduce((sum, clue) => sum + clue.value, 0);
  if (total !== length) {
    return null;
  }
  const line = [];
  clues.forEach((clue) => {
    for (let i = 0; i < clue.value; i++) {
      line.push(clue.colorIndex === EMPTY_SEGMENT ? null : clue.colorIndex);
    }
  });
  return line;
}

function minRemainingLength(clues, index) {
  let sum = 0;
  for (let i = index; i < clues.length; i++) {
    sum += clues[i].value;
  }
  sum += Math.max(0, clues.length - index - 1);
  return sum;
}

function generateLinePatterns(length, clues) {
  if (!clues.length) {
    return [Array.from({ length }, () => null)];
  }

  const results = [];
  const line = Array.from({ length }, () => null);

  function dfs(idx, pos) {
    if (results.length > PATTERN_LIMIT) {
      return;
    }
    if (idx >= clues.length) {
      results.push([...line]);
      return;
    }

    const remaining = minRemainingLength(clues, idx);
    const maxStart = length - remaining;
    for (let start = pos; start <= maxStart; start++) {
      const clue = clues[idx];
      for (let i = 0; i < clue.value; i++) {
        line[start + i] = clue.colorIndex;
      }
      const nextPos = start + clue.value + 1;
      dfs(idx + 1, nextPos);
      for (let i = 0; i < clue.value; i++) {
        line[start + i] = null;
      }
      if (results.length > PATTERN_LIMIT) {
        return;
      }
    }
  }

  dfs(0, 0);
  return results;
}

function solveFromClues({ silent } = {}) {
  console.log('=== solveFromClues başladı ===');
  const rowClues = state.rowClues.map(extractLineClues);
  const colClues = state.colClues.map(extractLineClues);
  const compactRowClues = state.rowClues.map(extractCompactClues);
  const compactColClues = state.colClues.map(extractCompactClues);
  const hasRowClues = rowClues.some((line) => line.length > 0);
  const hasColClues = colClues.some((line) => line.length > 0);

  console.log('hasRowClues:', hasRowClues);
  console.log('hasColClues:', hasColClues);
  console.log('rowClues (extractLineClues):', JSON.stringify(rowClues));
  console.log('state.rowClues:', JSON.stringify(state.rowClues));

  const rowExact = rowClues.every((line) => !line.length || buildLineFromExactClues(line, state.cols));
  const colExact = colClues.every((line) => !line.length || buildLineFromExactClues(line, state.rows));

  console.log('rowExact:', rowExact);
  console.log('colExact:', colExact);

  if (hasRowClues && rowExact) {
    console.log('Branch: hasRowClues && rowExact');
    const grid = createGridData(state.rows, state.cols);
    for (let r = 0; r < state.rows; r++) {
      if (!rowClues[r].length) continue;
      const line = buildLineFromExactClues(rowClues[r], state.cols);
      if (!line) continue;
      for (let c = 0; c < state.cols; c++) {
        grid[r][c] = line[c];
      }
    }
    state.grid = grid;
    renderGrid();
    return true;
  }

  if (hasColClues && colExact) {
    console.log('Branch: hasColClues && colExact');
    const grid = createGridData(state.rows, state.cols);
    for (let c = 0; c < state.cols; c++) {
      if (!colClues[c].length) continue;
      const line = buildLineFromExactClues(colClues[c], state.rows);
      if (!line) continue;
      for (let r = 0; r < state.rows; r++) {
        grid[r][c] = line[r];
      }
    }
    state.grid = grid;
    renderGrid();
    return true;
  }

  // Satır clue'ları varsa, grid oluştur (sütun clue'ları olsa bile)
  if (hasRowClues) {
    console.log('Branch: hasRowClues - Grid oluşturuluyor');
    const grid = createGridData(state.rows, state.cols);
    for (let r = 0; r < state.rows; r++) {
      const entries = state.rowClues[r];
      console.log(`Row ${r} entries:`, JSON.stringify(entries));

      // Önce satırda renkli segment var mı kontrol et
      const hasColoredSegment = entries.some(e => e.value > 0 && e.colorIndex !== EMPTY_SEGMENT);
      console.log(`  Row ${r} hasColoredSegment:`, hasColoredSegment);

      if (!hasColoredSegment) {
        // Sadece EMPTY_SEGMENT var, bu satır boş
        console.log(`  Row ${r}: Sadece boş segment, atlanıyor`);
        continue;
      }

      // Clue'ların sıralı mı (computeCluesFromGrid sonrası) yoksa sparse mı olduğunu kontrol et
      // Sıralı: tüm değerlerin toplamı = cols
      const totalValue = entries.reduce((sum, e) => sum + (e.value > 0 ? e.value : 0), 0);
      const isSequential = totalValue === state.cols;
      console.log(`  Row ${r} totalValue=${totalValue}, cols=${state.cols}, isSequential=${isSequential}`);

      if (isSequential) {
        // Sıralı format - değerleri sırayla işle (computeCluesFromGrid sonrası)
        let pos = 0;
        for (let slot = 0; slot < entries.length; slot++) {
          const entry = entries[slot];
          if (entry.value <= 0) continue;

          if (entry.colorIndex === EMPTY_SEGMENT) {
            // Boş segment - pozisyonu ilerlet
            console.log(`  Slot ${slot}: EMPTY_SEGMENT value=${entry.value}, pos ${pos} -> ${pos + entry.value}`);
            pos += entry.value;
          } else {
            // Renkli segment - hücreleri çiz
            const colorIdx = (entry.colorIndex === null || entry.colorIndex === undefined)
              ? state.selectedColorIndex
              : entry.colorIndex;

            console.log(`  Slot ${slot}: Renkli value=${entry.value}, pos=${pos}, colorIdx=${colorIdx}`);
            for (let i = 0; i < entry.value; i++) {
              if (pos + i < state.cols) {
                grid[r][pos + i] = colorIdx;
                console.log(`    Grid[${r}][${pos + i}] = ${colorIdx}`);
              }
            }
            pos += entry.value;
          }
        }
      } else {
        // Sparse format - slot pozisyonunu kullan (manuel giriş)
        for (let slot = 0; slot < entries.length; slot++) {
          const entry = entries[slot];
          if (entry.value <= 0) continue;
          if (entry.colorIndex === EMPTY_SEGMENT) {
            console.log(`  Slot ${slot}: EMPTY_SEGMENT, yok sayılıyor (sparse)`);
            continue;
          }

          // Slot pozisyonunu grid pozisyonuna çevir (oransal)
          const gridPos = Math.floor((slot / state.leftSlots) * state.cols);
          const colorIdx = (entry.colorIndex === null || entry.colorIndex === undefined)
            ? state.selectedColorIndex
            : entry.colorIndex;

          console.log(`  Slot ${slot}: value=${entry.value}, gridPos=${gridPos}, colorIdx=${colorIdx} (sparse)`);

          for (let i = 0; i < entry.value; i++) {
            if (gridPos + i < state.cols) {
              grid[r][gridPos + i] = colorIdx;
              console.log(`    Grid[${r}][${gridPos + i}] = ${colorIdx}`);
            }
          }
        }
      }
    }
    console.log('Grid oluşturuldu:', JSON.stringify(grid));
    state.grid = grid;
    renderGrid();
    // Grid oluşturulduktan sonra clue'ları grid'e göre yeniden hesapla
    computeCluesFromGrid();
    return true;
  }

  // Sadece sütun clue'ları varsa, clue değerlerini sırayla işle
  if (!hasRowClues && hasColClues) {
    const grid = createGridData(state.rows, state.cols);
    for (let c = 0; c < state.cols; c++) {
      const entries = state.colClues[c];

      // Clue değerlerini sırayla işle - pozisyonu biriktir
      let pos = 0;
      for (let slot = 0; slot < entries.length; slot++) {
        const entry = entries[slot];
        if (entry.value <= 0) continue;

        if (entry.colorIndex === EMPTY_SEGMENT) {
          // Boş segment - sadece pozisyonu ilerlet
          pos += entry.value;
        } else {
          // Renkli segment - hücreleri çiz
          const colorIdx = (entry.colorIndex === null || entry.colorIndex === undefined)
            ? state.selectedColorIndex
            : entry.colorIndex;

          for (let i = 0; i < entry.value; i++) {
            if (pos + i < state.rows) {
              grid[pos + i][c] = colorIdx;
            }
          }
          pos += entry.value;
        }
      }
    }
    state.grid = grid;
    renderGrid();
    // Grid oluşturulduktan sonra clue'ları grid'e göre yeniden hesapla
    computeCluesFromGrid();
    return true;
  }

  const rowPatterns = compactRowClues.map((clues) => generateLinePatterns(state.cols, clues));
  if (rowPatterns.some((patterns) => patterns.length === 0 || patterns.length > PATTERN_LIMIT)) {
    if (!silent) {
      alert('Bu sayılarla çözüm üretilemedi. Daha az karmaşık bir desen deneyin.');
    }
    return false;
  }

  const colPatterns = compactColClues.map((clues) => generateLinePatterns(state.rows, clues));
  if (colPatterns.some((patterns) => patterns.length === 0 || patterns.length > PATTERN_LIMIT)) {
    if (!silent) {
      alert('Bu sayılarla çözüm üretilemedi. Daha az karmaşık bir desen deneyin.');
    }
    return false;
  }

  const grid = createGridData(state.rows, state.cols);
  const order = Array.from({ length: state.rows }, (_, idx) => idx).sort(
    (a, b) => rowPatterns[a].length - rowPatterns[b].length
  );

  function backtrack(idx, colPool) {
    if (idx >= order.length) {
      return true;
    }

    const r = order[idx];
    const currentRow = grid[r].slice();
    for (const pattern of rowPatterns[r]) {
      let ok = true;
      for (let c = 0; c < state.cols; c++) {
        const existing = grid[r][c];
        if (existing !== null && existing !== pattern[c]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const savedCols = [];
      for (let c = 0; c < state.cols; c++) {
        if (!colPool[c]) {
          ok = false;
          break;
        }
        savedCols[c] = colPool[c];
        const filtered = colPool[c].filter((p) => p[r] === pattern[c]);
        if (!filtered.length) {
          ok = false;
          break;
        }
        colPool[c] = filtered;
      }
      if (!ok) {
        for (let c = 0; c < state.cols; c++) {
          if (savedCols[c]) {
            colPool[c] = savedCols[c];
          }
        }
        continue;
      }

      grid[r] = pattern.slice();
      if (backtrack(idx + 1, colPool)) {
        return true;
      }
      grid[r] = currentRow;
      for (let c = 0; c < state.cols; c++) {
        if (savedCols[c]) {
          colPool[c] = savedCols[c];
        }
      }
    }
    return false;
  }

  const colPool = colPatterns.map((patterns) => patterns);
  const solved = backtrack(0, colPool);
  if (!solved) {
    if (!silent) {
      alert('Çözüm bulunamadı. Sayılar birbiriyle uyuşmuyor olabilir.');
    }
    return false;
  }

  state.grid = grid;
  renderGrid();

  // Sayıları Bul modundaysak başarı kontrolü yap
  if (state.gameMode === 'guess_numbers') {
    checkSuccess();
  }

  return true;
}

function checkSuccess() {
  if (state.currentLevelIndex === -1 || !SAMPLE_LEVELS[state.currentLevelIndex]) return;
  // Sadece Play modunda (solve_puzzle) çalışır
  if (state.gameMode !== 'solve_puzzle') return;

  const targetLevel = SAMPLE_LEVELS[state.currentLevelIndex];

  // Boyut kontrolü
  if (state.rows !== targetLevel.rows || state.cols !== targetLevel.cols) return;

  let isMatch = true;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const current = state.grid[r][c];
      const target = targetLevel.grid[r][c];

      const currentVal = (current === null || current === undefined) ? -1 : current;
      const targetVal = (target === null || target === undefined) ? -1 : target;

      if (currentVal !== targetVal) {
        isMatch = false;
        break;
      }
    }
    if (!isMatch) break;
  }

  if (isMatch) {
    setTimeout(() => {
      alert(`Tebrikler! "${targetLevel.name}" resmini başarıyla tamamladınız! 🎉`);
    }, 100);
  }
}

function computeCluesFromGrid() {
  const computedRowClues = createClueData(state.rows, state.leftSlots);
  const computedColClues = createClueData(state.cols, state.topSlots);

  for (let r = 0; r < state.rows; r++) {
    const line = state.grid[r];
    const segments = computeLineClues(line);
    const start = 0;
    segments.forEach((seg, index) => {
      const slot = start + index;
      if (computedRowClues[r][slot]) {
        computedRowClues[r][slot] = { ...seg };
      }
    });
  }

  for (let c = 0; c < state.cols; c++) {
    const line = [];
    for (let r = 0; r < state.rows; r++) {
      line.push(state.grid[r][c]);
    }
    const segments = computeLineClues(line);
    const start = 0;
    segments.forEach((seg, index) => {
      const slot = start + index;
      if (computedColClues[c][slot]) {
        computedColClues[c][slot] = { ...seg };
      }
    });
  }

  state.rowClues = computedRowClues;
  state.colClues = computedColClues;

  renderClues();
}

function applySize() {
  const nextRows = Math.min(30, Math.max(5, parseInt(elements.rowsInput.value, 10)));
  const nextCols = Math.min(30, Math.max(5, parseInt(elements.colsInput.value, 10)));
  const nextSize = Math.min(40, Math.max(18, parseInt(elements.cellSizeInput.value, 10)));

  elements.rowsInput.value = nextRows;
  elements.colsInput.value = nextCols;
  elements.cellSizeInput.value = nextSize;

  state.rows = nextRows;
  state.cols = nextCols;
  state.baseCellSize = nextSize;
  state.autoFit = elements.autoFitToggle.checked;
  state.leftSlots = state.cols;
  state.topSlots = state.rows;
  state.grid = createGridData(state.rows, state.cols);
  state.rowClues = createClueData(state.rows, state.leftSlots);
  state.colClues = createClueData(state.cols, state.topSlots);

  // Grid değiştiği için örnek seviyeden çık, normal moda dön
  state.gameMode = 'sandbox';
  clearGhostImage();
  document.getElementById('gameDescription').textContent = 'Hedef resim tablo üzerinde silik olarak görünür. Sayıları girerek resmi oluşturun.'; // Varsayılan metin

  updateLayout();
  buildGrid();
  buildClues();
  renderGrid();
  renderClues();
  updateLabels();
}

function updateClueEditState() {
  // Klasik play modunda (solve_puzzle) kullanıcı ipuçlarını değiştiremez
  const editable = state.gameMode !== 'solve_puzzle';
  elements.topClues.dataset.editable = editable ? 'true' : 'false';
  elements.leftClues.dataset.editable = editable ? 'true' : 'false';
  elements.topClues.style.pointerEvents = editable ? 'auto' : 'none';
  elements.leftClues.style.pointerEvents = editable ? 'auto' : 'none';
  elements.clearCluesBtn.disabled = !editable; // Clue clear butonu da pasif olsun
  elements.clueToolGroup.querySelectorAll('button').forEach((btn) => {
    btn.disabled = !editable;
  });
  updateLabels();
}

function handleGridPointerDown(event) {
  const cell = event.target.closest('.cell');
  if (!cell) {
    return;
  }
  event.preventDefault();
  state.lastInput = 'grid';
  state.isPointerDown = true;
  state.lastPointerTime = Date.now();
  state.pointerMode = event.button === 2 || state.tool === 'eraser' ? 'erase' : 'paint';
  elements.grid.setPointerCapture(event.pointerId);
  paintCell(cell, state.pointerMode);
}

function handleGridPointerMove(event) {
  if (!state.isPointerDown) {
    return;
  }
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const cell = target ? target.closest('.cell') : null;
  if (!cell) {
    return;
  }
  paintCell(cell, state.pointerMode);
}

function handleGridPointerUp(event) {
  state.isPointerDown = false;
  if (elements.grid.hasPointerCapture(event.pointerId)) {
    elements.grid.releasePointerCapture(event.pointerId);
  }

  if (state.lastInput === 'grid') {
    if (state.gameMode === 'sandbox') {
      computeCluesFromGrid();
    } else if (state.gameMode === 'solve_puzzle') {
      checkSuccess();
    }
  }
}

function handleGridClick(event) {
  if (Date.now() - state.lastPointerTime < 250) {
    return;
  }

  const cell = event.target.closest('.cell');
  if (!cell) {
    return;
  }

  state.lastInput = 'grid';
  const mode = state.tool === 'eraser' ? 'erase' : 'paint';
  paintCell(cell, mode);
}

function paintCell(cell, mode) {
  const r = parseInt(cell.dataset.row, 10);
  const c = parseInt(cell.dataset.col, 10);
  if (mode === 'erase') {
    state.grid[r][c] = null;
  } else {
    state.grid[r][c] = state.selectedColorIndex;
  }
  renderCell(r, c);
}

function handleCluePointer(event) {
  const cell = event.target.closest('.clue-cell');
  if (!cell) {
    return;
  }
  event.preventDefault();
  state.lastInput = 'clue';
  state.lastPointerTime = Date.now();

  const type = cell.dataset.type;
  const line = parseInt(cell.dataset.line, 10);
  const slot = parseInt(cell.dataset.slot, 10);
  const maxValue = Math.max(state.rows, state.cols);

  if (state.clueTool === 'clear') {
    const entry = type === 'row' ? state.rowClues[line][slot] : state.colClues[line][slot];
    entry.value = 0;
    entry.colorIndex = null;
    leftAlignRowClues();
    buildClues();
    renderClues();
    renderClues();
    if (state.gameMode === 'guess_numbers') {
      checkSuccess();
    } else {
      solveFromClues({ silent: true });
    }
    return;
  }

  const delta = event.button === 2 ? -1 : 1;
  const entry = type === 'row' ? state.rowClues[line][slot] : state.colClues[line][slot];

  // EMPTY_SEGMENT hücresine tıklandıysa, 0'dan başla
  let currentValue = entry.value;
  if (entry.colorIndex === EMPTY_SEGMENT) {
    currentValue = 0;
  }

  let nextValue = currentValue + delta;
  if (nextValue < 0) nextValue = 0;
  if (nextValue > maxValue) nextValue = maxValue;
  entry.value = nextValue;
  if (delta > 0 && nextValue > 0) {
    entry.colorIndex = state.selectedColorIndex;
  }
  if (nextValue === 0) {
    entry.colorIndex = null;
  }
  leftAlignRowClues();
  buildClues();
  renderClues();
  renderClues();
  if (state.gameMode === 'guess_numbers') {
    checkSuccess();
  } else {
    solveFromClues({ silent: true });
  }
}

function handleClueClick(event) {
  if (Date.now() - state.lastPointerTime < 250) {
    return;
  }
  const cell = event.target.closest('.clue-cell');
  if (!cell) {
    return;
  }
  handleCluePointer({
    ...event,
    button: 0,
    preventDefault: () => { }
  });
}

function handleClueDblClick(event) {
  const cell = event.target.closest('.clue-cell');
  if (!cell) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();

  // Zaten bir input varsa çık
  if (cell.querySelector('.clue-edit-container')) {
    return;
  }

  const type = cell.dataset.type;
  const line = parseInt(cell.dataset.line, 10);
  const slot = parseInt(cell.dataset.slot, 10);
  const maxValue = Math.max(state.rows, state.cols);
  const entry = type === 'row' ? state.rowClues[line][slot] : state.colClues[line][slot];

  // Container oluştur
  const container = document.createElement('div');
  container.className = 'clue-edit-container';
  container.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 2px;
    z-index: 20;
    background: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    padding: 4px;
  `;

  // Azaltma butonu (mobil için)
  const minusBtn = document.createElement('button');
  minusBtn.type = 'button';
  minusBtn.textContent = '−';
  minusBtn.style.cssText = `
    width: 24px;
    height: 24px;
    border: none;
    background: #e74c3c;
    color: white;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Input alanı (text tipi - spinner yok)
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.pattern = '[0-9]*';
  input.value = entry.value > 0 ? entry.value : '0';
  input.style.cssText = `
    width: 36px;
    height: 24px;
    border: 1px solid #ddd;
    background: white;
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    padding: 0;
    margin: 0;
    border-radius: 4px;
    -moz-appearance: textfield;
  `;

  // Artırma butonu (mobil için)
  const plusBtn = document.createElement('button');
  plusBtn.type = 'button';
  plusBtn.textContent = '+';
  plusBtn.style.cssText = `
    width: 24px;
    height: 24px;
    border: none;
    background: #27ae60;
    color: white;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  container.appendChild(minusBtn);
  container.appendChild(input);
  container.appendChild(plusBtn);

  // Hücrenin pozisyonunu relative yap
  const originalPosition = cell.style.position;
  const originalOverflow = cell.style.overflow;
  cell.style.position = 'relative';
  cell.style.overflow = 'visible';

  // Mevcut içeriği gizle
  const originalText = cell.textContent;
  cell.textContent = '';
  cell.appendChild(container);

  input.focus();
  input.select();

  let currentValue = entry.value > 0 ? entry.value : 0;

  function updateInputDisplay() {
    input.value = currentValue;
  }

  function commitValue() {
    const newValue = Math.max(0, Math.min(maxValue, currentValue));
    entry.value = newValue;
    if (newValue > 0) {
      entry.colorIndex = state.selectedColorIndex;
    } else {
      entry.colorIndex = null;
    }

    // Container'ı kaldır
    cell.style.position = originalPosition || '';
    cell.style.overflow = originalOverflow || '';
    container.remove();

    // Sayıları sola hizala ve yeniden render et
    leftAlignRowClues();
    buildClues();
    renderClues();
    buildClues();
    renderClues();
    if (state.gameMode === 'guess_numbers') {
      checkSuccess();
    } else {
      solveFromClues({ silent: true });
    }
  }

  minusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentValue > 0) {
      currentValue--;
      updateInputDisplay();
    }
  });

  plusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentValue < maxValue) {
      currentValue++;
      updateInputDisplay();
    }
  });

  // Sol tık artır, sağ tık azalt
  input.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      if (currentValue > 0) {
        currentValue--;
        updateInputDisplay();
      }
    }
  });

  input.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  input.addEventListener('input', () => {
    const parsed = parseInt(input.value, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= maxValue) {
      currentValue = parsed;
    }
  });

  input.addEventListener('blur', (e) => {
    // Eğer butonlara tıkladıysak blur'u yoksay
    if (container.contains(e.relatedTarget)) {
      return;
    }
    commitValue();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      currentValue = entry.value > 0 ? entry.value : 0;
      commitValue();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentValue < maxValue) {
        currentValue++;
        updateInputDisplay();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentValue > 0) {
        currentValue--;
        updateInputDisplay();
      }
    }
  });

  // Container dışına tıklandığında kapat
  setTimeout(() => {
    function handleOutsideClick(e) {
      if (!container.contains(e.target)) {
        document.removeEventListener('mousedown', handleOutsideClick);
        commitValue();
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
  }, 100);
}

function clearGrid() {
  state.lastInput = 'grid';
  state.grid = createGridData(state.rows, state.cols);
  renderGrid();
  computeCluesFromGrid();
}

function clearClues() {
  state.lastInput = 'clue';
  state.rowClues = createClueData(state.rows, state.leftSlots);
  state.colClues = createClueData(state.cols, state.topSlots);
  renderClues();
}

function toggleTool(event) {
  const btn = event.target.closest('[data-tool]');
  if (!btn) return;
  state.tool = btn.dataset.tool;
  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === state.tool);
  });
  updateLabels();
}

function toggleClueTool(event) {
  const btn = event.target.closest('[data-clue-tool]');
  if (!btn) return;
  state.clueTool = btn.dataset.clueTool;
  document.querySelectorAll('[data-clue-tool]').forEach((button) => {
    button.classList.toggle('active', button.dataset.clueTool === state.clueTool);
  });
}

const SAMPLE_LEVELS = [
  {
    name: "Kalp (Kolay)",
    rows: 10,
    cols: 10,
    colors: ['#ff0000', '#ff69b4'],
    grid: [
      [null, null, 0, 0, null, null, 0, 0, null, null],
      [null, 0, 1, 1, 0, 0, 1, 1, 0, null],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [null, 0, 1, 1, 1, 1, 1, 1, 0, null],
      [null, null, 0, 1, 1, 1, 1, 0, null, null],
      [null, null, null, 0, 1, 1, 0, null, null, null],
      [null, null, null, null, 0, 0, null, null, null, null],
      [null, null, null, null, null, null, null, null, null, null]
    ]
  },
  {
    name: "Ağaç (Kolay)",
    rows: 10,
    cols: 10,
    colors: ['#2ecc71', '#8e44ad', '#795548', '#e74c3c'], // Yeşil, Mor(Meyve?), Kahve, Kırmızı(Elma)
    // 0: Yeşil, 2: Kahve, 3: Kırmızı
    grid: [
      [null, null, null, 0, 0, 0, 0, null, null, null],
      [null, null, 0, 0, 0, 0, 0, 0, null, null],
      [null, 0, 0, 3, 0, 0, 3, 0, 0, null],
      [null, 0, 0, 0, 0, 0, 0, 0, 0, null],
      [null, 0, 3, 0, 0, 0, 0, 3, 0, null],
      [null, null, 0, 0, 0, 0, 0, 0, null, null],
      [null, null, null, 0, 0, 0, 0, null, null, null],
      [null, null, null, null, 2, 2, null, null, null, null],
      [null, null, null, null, 2, 2, null, null, null, null],
      [null, 0, 0, 0, 0, 0, 0, 0, 0, null] // Zemin
    ]
  },
  {
    name: "Yelkenli (Orta)",
    rows: 10,
    cols: 10,
    colors: ['#3498db', '#ecf0f1', '#d35400', '#f1c40f'], // Mavi(Deniz), Beyaz(Yelken), Kahve(Gövde), Sarı(Güneş)
    // 0: Mavi, 1: Beyaz, 2: Kahve, 3: Sarı
    grid: [
      [null, null, null, null, null, null, null, null, 3, 3],
      [null, null, null, null, 1, null, null, null, 3, 3],
      [null, null, null, 1, 1, null, null, null, null, null],
      [null, null, 1, 1, 1, null, null, null, null, null],
      [null, 1, 1, 1, 1, null, null, null, null, null],
      [null, null, 2, 2, 2, 2, 2, 2, null, null],
      [null, null, 0, 2, 2, 2, 2, 0, null, null],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
  }
];

function populateLevelSelect() {
  const select = document.getElementById('levelSelect');
  if (!select) return;
  select.innerHTML = '';
  SAMPLE_LEVELS.forEach((level, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = level.name;
    select.appendChild(option);
  });
}


// Yardımcı fonksiyonlara artık gerek yok (showGhostImage, renderPreview, clearGhostImage temizlendi)

function loadSampleLevel() {
  const index = parseInt(document.getElementById('levelSelect').value, 10);
  const selectedLevel = SAMPLE_LEVELS[index];
  if (!selectedLevel) return;

  state.gameMode = 'solve_puzzle';
  state.currentLevelIndex = index;

  // 1. Grid ve Palet Ayarları
  state.rows = selectedLevel.rows;
  state.cols = selectedLevel.cols;
  state.palette = [...selectedLevel.colors];

  // Inputları güncelle
  elements.rowsInput.value = state.rows;
  elements.colsInput.value = state.cols;

  // Grid boyutlarını güncelle
  state.leftSlots = state.cols;
  state.topSlots = state.rows;

  // Grid verisini hazırla (Hedef resimden clueları hesaplayacağız)
  const targetGridRef = selectedLevel.grid;

  // KLASİK MOD: Resmi Çiz
  // Geçici olarak gridi doldurup clue hesaplatıp sonra gridi sileceğiz
  state.grid = JSON.parse(JSON.stringify(targetGridRef));
  state.rowClues = createClueData(state.rows, state.leftSlots);
  state.colClues = createClueData(state.cols, state.topSlots);

  // Clueları hesapla (bu sırada state.rowClues ve state.colClues dolar)
  computeCluesFromGrid();

  // Gridi temizle (kullanıcı çizecek)
  state.grid = createGridData(state.rows, state.cols);

  // Eğer varsa eski ghost elementlerini temizle (garanti olsun)
  const ghost = document.getElementById('ghostCanvas');
  if (ghost) ghost.remove();
  if (elements.grid) {
    elements.grid.classList.remove('transparent-mode');
    elements.grid.classList.remove('with-ghost');
    elements.grid.style.border = '';
    elements.grid.style.backgroundImage = '';
  }

  // 3. UI Güncelleme
  buildPalette();
  updateLayout();
  buildGrid();
  buildClues();
  renderGrid();
  renderClues();
  updateLabels();

  updateClueEditState();

  // alert kaldırıldı, daha akıcı olsun
}

function showGhostImage(dataUrl) {
  elements.grid.style.backgroundImage = `url(${dataUrl})`;
  elements.grid.classList.add('with-ghost');
}

function clearGhostImage() {
  elements.grid.style.backgroundImage = '';
  elements.grid.classList.remove('with-ghost');
}

function init() {
  state.rows = parseInt(elements.rowsInput.value, 10);
  state.cols = parseInt(elements.colsInput.value, 10);
  state.baseCellSize = parseInt(elements.cellSizeInput.value, 10);
  state.autoFit = elements.autoFitToggle.checked;
  state.cellSize = state.baseCellSize;
  state.showTopClues = elements.topCluesToggle.checked;
  state.leftSlots = state.cols;
  state.topSlots = state.rows;
  state.grid = createGridData(state.rows, state.cols);
  state.rowClues = createClueData(state.rows, state.leftSlots);
  state.grid = createGridData(state.rows, state.cols);
  state.rowClues = createClueData(state.rows, state.leftSlots);
  state.colClues = createClueData(state.cols, state.topSlots);
  state.gameMode = 'sandbox'; // Varsayılan mod
  state.currentLevelIndex = -1;
  clearGhostImage();

  populateLevelSelect(); // Seviyeleri dropdown'a yükle

  buildPalette();
  updateLayout();
  updateTopClueVisibility();
  buildGrid();
  buildClues();
  renderGrid();
  computeCluesFromGrid();
  updateLabels();

  elements.applySizeBtn.addEventListener('click', applySize);
  elements.cellSizeInput.addEventListener('input', () => {
    state.baseCellSize = parseInt(elements.cellSizeInput.value, 10);
    updateLayout();
  });
  elements.autoFitToggle.addEventListener('change', (event) => {
    state.autoFit = event.target.checked;
    updateLayout();
  });

  elements.clearGridBtn.addEventListener('click', clearGrid);
  elements.clearCluesBtn.addEventListener('click', clearClues);
  elements.generateFromCluesBtn.addEventListener('click', () => {
    state.lastInput = 'clue';
    solveFromClues({ silent: false });
  });

  const loadSampleLevelBtn = document.getElementById('loadSampleLevelBtn');
  if (loadSampleLevelBtn) {
    loadSampleLevelBtn.addEventListener('click', loadSampleLevel);
  }

  elements.addColorBtn.addEventListener('click', () => {
    const color = elements.customColor.value;
    if (!state.palette.includes(color)) {
      state.palette.push(color);
      buildPalette();
    }
  });

  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', toggleTool);
  });

  document.querySelectorAll('[data-clue-tool]').forEach((btn) => {
    btn.addEventListener('click', toggleClueTool);
  });

  elements.topCluesToggle.addEventListener('change', (event) => {
    state.showTopClues = event.target.checked;
    updateTopClueVisibility();
  });

  elements.grid.addEventListener('pointerdown', handleGridPointerDown);
  elements.grid.addEventListener('pointermove', handleGridPointerMove);
  elements.grid.addEventListener('click', handleGridClick);
  elements.grid.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('pointerup', handleGridPointerUp);

  elements.topClues.addEventListener('pointerdown', handleCluePointer);
  elements.leftClues.addEventListener('pointerdown', handleCluePointer);
  elements.topClues.addEventListener('click', handleClueClick);
  elements.leftClues.addEventListener('click', handleClueClick);
  elements.topClues.addEventListener('dblclick', handleClueDblClick);
  elements.leftClues.addEventListener('dblclick', handleClueDblClick);
  elements.topClues.addEventListener('contextmenu', (event) => event.preventDefault());
  elements.leftClues.addEventListener('contextmenu', (event) => event.preventDefault());

  elements.grid.style.touchAction = 'none';

  window.addEventListener('resize', () => {
    if (state.autoFit) {
      updateLayout();
    }
  });
}

init();
