// frontend/script.js

const gridElem = document.getElementById('grid');
const layoutSel = document.getElementById('layoutSel');
const toggleThemeBtn = document.getElementById('toggleTheme');
let charts = [];
let panels = [];

// Config iniziale: 4 pannelli
function makePanel(index) {
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Panel ${index+1}</span>
      <div class="controls-mini">
        <select class="symbolSel">
          <option>AAPL</option>
          <option>MSFT</option>
          <option>RACE.MI</option>
        </select>
        <select class="tfSel">
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="1h">1h</option>
          <option value="1d" selected>1d</option>
        </select>
      </div>
    </div>
    <div class="chart" id="chart-${index}"></div>
  `;
  gridElem.appendChild(panel);
  return panel;
}

async function initPanel(panelIndex) {
  const panel = makePanel(panelIndex);
  const chartDiv = panel.querySelector(`#chart-${panelIndex}`);
  const symbolSel = panel.querySelector('.symbolSel');
  const tfSel = panel.querySelector('.tfSel');

  // Create Lightweight Chart
  const chart = LightweightCharts.createChart(chartDiv, {
    width: chartDiv.clientWidth,
    height: chartDiv.clientHeight,
    layout: {
      background: '#ffffff',
      textColor: '#333',
    },
    grid: {
      verticalLines: { color: '#eee' },
      horizontalLines: { color: '#eee' },
    },
  });
  const lineSeries = chart.addCandlestickSeries({
    upColor: '#4caf50',
    downColor: '#f44336',
    borderVisible: false,
    wickVisible: true,
  });

  panels.push({ panel, chart, lineSeries, symbolSel, tfSel });

  // Resize handling
  window.addEventListener('resize', () => {
    chart.resize(chartDiv.clientWidth, chartDiv.clientHeight);
  });

  // Fetch initial data
  await fetchAndUpdate(panelIndex);
  // Auto-refresh every 30s
  setInterval(() => fetchAndUpdate(panelIndex), 30000);
}

async function fetchAndUpdate(index) {
  const p = panels[index];
  if (!p) return;
  const symbol = p.symbolSel.value;
  const tf = p.tfSel.value;
  try {
    const resp = await fetch(`/api/quote?market=US&symbol=${encodeURIComponent(symbol)}&tf=${tf}`);
    const data = await resp.json();
    const bars = data.data.map(b => ({
      time: Math.floor(b.time / 1000),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume || 0
    }));
    // Lightweight Charts uses time in seconds for unix or as string timestamp
    p.lineSeries.setData(bars);
  } catch (e) {
    console.error('Fetch error', e);
  }
}

// Theme toggle
function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  document.body.classList.toggle('theme-light');
}

function setLayout(count) {
  gridElem.innerHTML = '';
  // Ajusta grid class
  gridElem.className = 'grid';
  if (count == 1) gridElem.classList.add('grid-1');
  else if (count == 2) gridElem.classList.add('grid-2');
  else if (count == 4) gridElem.classList.add('grid-4');
  else gridElem.classList.add('grid-6');
  panels = [];
  // Recreate panels
  for (let i = 0; i < count; i++) {
    initPanel(i);
  }
}

// Init default 4 panels
setLayout(4);

layoutSel.addEventListener('change', (e) => {
  const v = parseInt(e.target.value, 10);
  setLayout(v);
});

toggleThemeBtn.addEventListener('click', toggleTheme);

// Optional: inizializza una singola cripto o stream
