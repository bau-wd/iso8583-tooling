import { parseISO8583 } from './parser.js';
import { renderComparison } from './renderer.js';
import { buildHexFromJSON, readJSONFile } from './importer.js';
import { copyJSONToClipboard, downloadJSON } from './exporter.js';
import { FIELD_DEFINITIONS } from './fieldDefinitions.js';
import { buildSampleHex } from './sample.js';
import { ENCODING_OPTIONS, normalizeEncoding } from './encoding.js';

const DEFAULT_ENCODING = 'ascii';
const HISTORY_KEY = 'iso8583-history';
const HISTORY_LIMIT = 15;

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function cleanHex(str = '') {
  return str.replace(/\s+/g, '').toUpperCase();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fieldListFromParsed(parsed) {
  const fields = {};
  if (!parsed?.fields) return fields;
  for (const [de, payload] of Object.entries(parsed.fields)) {
    fields[de] = payload?.value ?? '';
  }
  return fields;
}

function populateEncodingSelect(select) {
  if (!select) return;
  select.innerHTML = ENCODING_OPTIONS
    .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
    .join('');
  select.value = DEFAULT_ENCODING;
}

function populateFieldSelect(select) {
  if (!select) return;
  const entries = Object.values(FIELD_DEFINITIONS)
    .filter(def => def.de !== 1) // skip secondary bitmap entry
    .sort((a, b) => a.de - b.de);

  select.innerHTML = entries
    .map(def => `<option value="${def.de}">DE${String(def.de).padStart(3, '0')} — ${def.name}</option>`)
    .join('');
  select.value = entries[0]?.de ?? '';
}

function badge(text) {
  return text && text.length ? text : '—';
}

function flash(labelEl, text = 'Copied!') {
  if (!labelEl) return;
  const original = labelEl.textContent;
  labelEl.textContent = text;
  setTimeout(() => {
    labelEl.textContent = original;
  }, 1100);
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage failures
  }
}

export function initSmartEditor() {
  const root = document.getElementById('smartEditor');
  if (!root) return;

  // Inputs & controls
  const rawInput           = root.querySelector('#smartRawInput');
  const parseButton        = root.querySelector('#smartParse');
  const sampleButton       = root.querySelector('#smartSample');
  const clearButton        = root.querySelector('#smartClear');
  const setBaselineButton  = root.querySelector('#smartUseBaseline');
  const encodingSelect     = root.querySelector('#smartEncoding');
  const skipHeader         = root.querySelector('#smartSkipHeader');
  const skipBytesInput     = root.querySelector('#smartSkipBytes');
  const mtiInput           = root.querySelector('#smartMti');
  const fieldSelect        = root.querySelector('#smartFieldSelect');
  const fieldValueInput    = root.querySelector('#smartFieldValue');
  const addFieldButton     = root.querySelector('#smartAddField');
  const inspector          = root.querySelector('#smartInspector');
  const summaryBitmap      = root.querySelector('#smartSummaryBitmap');
  const summaryBitmap2     = root.querySelector('#smartSummaryBitmap2');
  const summaryFieldCount  = root.querySelector('#smartSummaryFieldCount');
  const errorBox           = root.querySelector('#smartError');
  const diffToggle         = root.querySelector('#smartDiffToggle');
  const baselineInput      = root.querySelector('#smartBaselineInput');
  const parseBaselineBtn   = root.querySelector('#smartParseBaseline');
  const useCurrentBaseline = root.querySelector('#smartUseCurrentBaseline');
  const diffPanel          = root.querySelector('#smartDiffPanel');
  const diffResult         = root.querySelector('#smartDiffResult');
  const copyHexBtn         = root.querySelector('#smartCopyHex');
  const copyJsonBtn        = root.querySelector('#smartCopyJson');
  const downloadJsonBtn    = root.querySelector('#smartDownloadJson');
  const importJsonInput    = root.querySelector('#smartImportJson');
  const shareLinkBtn       = root.querySelector('#smartShareLink');
  const historyList        = root.querySelector('#smartHistoryList');
  const historyEmpty       = root.querySelector('#smartHistoryEmpty');
  const clearHistoryBtn    = root.querySelector('#smartClearHistory');

  const state = {
    encoding: DEFAULT_ENCODING,
    skipBytes: 0,
    currentHex: '',
    currentParsed: null,
    baselineHex: '',
    baselineParsed: null,
    fields: {},
    mti: '0200',
    history: loadHistory(),
  };
  const scheduleRebuild = debounce((options = {}) => rebuildFromState(options), 120);

  populateEncodingSelect(encodingSelect);
  populateFieldSelect(fieldSelect);

  function showError(message) {
    if (!errorBox) return;
    if (!message) {
      errorBox.classList.add('hidden');
      errorBox.textContent = '';
      return;
    }
    errorBox.classList.remove('hidden');
    errorBox.textContent = message;
  }

  function currentSkipBytes() {
    return skipHeader?.checked ? parseInt(skipBytesInput.value, 10) || 0 : 0;
  }

  function refreshSummary(parsed) {
    if (mtiInput) mtiInput.value = state.mti || parsed?.mti || '????';
    if (summaryBitmap) summaryBitmap.textContent = badge(parsed?.primaryBitmap);
    if (summaryBitmap2) summaryBitmap2.textContent = badge(parsed?.secondaryBitmap);
    if (summaryFieldCount) {
      const count = Object.keys(state.fields || {}).length;
      summaryFieldCount.textContent = `${count} field${count === 1 ? '' : 's'}`;
    }
  }

  function shareableUrl(hex, encoding, skipBytes) {
    const params = new URLSearchParams();
    params.set('hex', hex);
    params.set('enc', encoding || DEFAULT_ENCODING);
    if (skipBytes) params.set('skip', skipBytes);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  function renderHistoryList() {
    if (!historyList) return;
    historyList.innerHTML = '';
    if (!state.history.length) {
      historyEmpty?.classList.remove('hidden');
      return;
    }
    historyEmpty?.classList.add('hidden');

    state.history.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.dataset.id = entry.id;
      const preview = entry.hex.length > 24 ? `${entry.hex.slice(0, 24)}…` : entry.hex;
      li.innerHTML = `
        <div class="history-info">
          <div class="history-title">${escapeHtml(entry.mti || '????')} · ${escapeHtml(preview)}</div>
          <div class="history-meta">
            <span class="tag">Fields: ${entry.fieldCount}</span>
            <span class="tag">Length: ${Math.ceil(entry.hex.length / 2)} bytes</span>
            <span class="tag">Encoding: ${escapeHtml(entry.encoding)}</span>
            ${entry.skipBytes ? `<span class="tag">Skip ${entry.skipBytes} bytes</span>` : ''}
          </div>
        </div>
        <div class="history-actions">
          <button class="btn btn-primary btn-sm" data-action="load">Load</button>
          <button class="btn btn-secondary btn-sm" data-action="link">Copy link</button>
        </div>
      `;
      historyList.appendChild(li);
    });
  }

  function addHistoryEntry(parsed, hex) {
    const cleaned = cleanHex(hex);
    if (!cleaned) return;
    const entry = {
      id: Date.now(),
      hex: cleaned,
      mti: parsed?.mti || state.mti || '0200',
      fieldCount: Object.keys(parsed?.fields || {}).length,
      encoding: state.encoding || DEFAULT_ENCODING,
      skipBytes: currentSkipBytes(),
    };
    state.history = state.history.filter(
      h => !(h.hex === entry.hex && h.encoding === entry.encoding && h.skipBytes === entry.skipBytes)
    );
    state.history.unshift(entry);
    state.history = state.history.slice(0, HISTORY_LIMIT);
    saveHistory(state.history);
    renderHistoryList();
  }

  function renderInspector(parsed) {
    if (!inspector) return;
    const rows = Object.keys(state.fields || {}).map(Number).sort((a, b) => a - b);
    if (rows.length === 0) {
      inspector.innerHTML = '<div class="empty-state">No data elements yet. Parse a message or add a field to start.</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'field-table smart-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>DE</th>
          <th>Field</th>
          <th>Format</th>
          <th>Length</th>
          <th>Value (editable)</th>
          <th>Raw Hex</th>
          <th></th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    rows.forEach((de) => {
      const def = FIELD_DEFINITIONS[de];
      const parsedField = parsed?.fields?.[de];
      const value = state.fields[de] ?? parsedField?.value ?? '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="de-badge">${de}</span></td>
        <td>${escapeHtml(def?.name ?? 'Unknown field')}</td>
        <td><code>${escapeHtml(def?.format ?? '?')}</code> • ${escapeHtml(def?.lengthType ?? '—')}</td>
        <td>${escapeHtml(parsedField?.length ?? def?.maxLength ?? '—')}</td>
        <td>
          <input class="smart-value" data-de="${de}" value="${escapeHtml(value)}" spellcheck="false" />
        </td>
        <td><code class="hex">${escapeHtml(parsedField?.rawHex ?? '—')}</code></td>
        <td><button class="btn btn-secondary btn-xs" data-action="remove" data-de="${de}">Remove</button></td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    inspector.innerHTML = '';
    inspector.appendChild(table);
  }

  function parseHex(inputHex, opts = {}) {
    const hex = cleanHex(inputHex);
    const recordHistory = Boolean(opts.recordHistory);
    if (!hex) {
      state.currentParsed = null;
      state.fields = {};
      state.currentHex = '';
      renderInspector(null);
      refreshSummary(null);
      showError('');
      return null;
    }

    const options = {
      skipBytes: opts.skipBytes ?? currentSkipBytes(),
      encoding: normalizeEncoding(opts.encoding || state.encoding),
    };
    state.encoding = options.encoding;
    state.skipBytes = options.skipBytes;

    const parsed = parseISO8583(hex, options);
    state.currentHex = hex;
    state.currentParsed = parsed;
    state.fields = fieldListFromParsed(parsed);
    state.mti = parsed.mti || state.mti || '0200';

    renderInspector(parsed);
    refreshSummary(parsed);
    showError('');
    if (recordHistory) addHistoryEntry(parsed, hex);
    return parsed;
  }

  function ensureParsedForAction() {
    const parsed = state.currentParsed || parseHex(rawInput.value, { recordHistory: false });
    if (!parsed) {
      showError('Parse a message first.');
      return null;
    }
    return parsed;
  }

  function rebuildFromState({ skipDiff = false } = {}) {
    const payload = { mti: state.mti || '0200', fields: {} };
    for (const [de, value] of Object.entries(state.fields || {})) {
      if (value == null || value === '') {
        delete state.fields[de];
        continue;
      }
      payload.fields[de] = value;
    }
    const encoding = normalizeEncoding(encodingSelect?.value || state.encoding);
    try {
      const hex = buildHexFromJSON(payload, { encoding });
      rawInput.value = hex;
      state.encoding = encoding;
      state.skipBytes = 0;
      if (skipHeader) skipHeader.checked = false;
      if (skipBytesInput) skipBytesInput.value = 0;
      const parsed = parseHex(hex, { skipBytes: 0, encoding, recordHistory: true });
      if (parsed && diffToggle?.checked && !skipDiff) renderDiff();
    } catch (err) {
      showError(err.message);
    }
  }

  function renderDiff() {
    if (!diffResult) return;
    if (!diffToggle?.checked) {
      diffPanel?.classList.add('hidden');
      return;
    }
    diffPanel?.classList.remove('hidden');

    const baselineHex = cleanHex(baselineInput?.value || '');
    if (baselineHex && (!state.baselineHex || state.baselineHex !== baselineHex)) {
      try {
        state.baselineParsed = parseISO8583(baselineHex, {
          skipBytes: currentSkipBytes(),
          encoding: state.encoding,
        });
        state.baselineHex = baselineHex;
        showError('');
      } catch (err) {
        showError(`Baseline parse failed: ${err.message}`);
        return;
      }
    }

    if (!state.baselineParsed || !state.currentParsed) {
      diffResult.innerHTML = '<p class="helper-text">Provide both current and baseline messages to see a diff.</p>';
      return;
    }
    renderComparison(diffResult, state.baselineParsed, state.currentParsed);
  }

  const debouncedParse = debounce(() => {
    try {
      const parsed = parseHex(rawInput.value, { recordHistory: false });
      if (parsed && diffToggle?.checked) renderDiff();
    } catch (err) {
      showError(err.message);
    }
  }, 220);

  // ── Event wiring ─────────────────────────────────────────────
  rawInput?.addEventListener('input', debouncedParse);
  parseButton?.addEventListener('click', () => {
    try {
      const parsed = parseHex(rawInput.value, { recordHistory: true });
      if (parsed && diffToggle?.checked) renderDiff();
    } catch (err) {
      showError(err.message);
    }
  });

  sampleButton?.addEventListener('click', () => {
    const encoding = normalizeEncoding(encodingSelect?.value || DEFAULT_ENCODING);
    const sample = buildSampleHex(encoding);
    rawInput.value = sample;
    parseHex(sample, { skipBytes: 0, encoding, recordHistory: true });
    renderDiff();
  });

  clearButton?.addEventListener('click', () => {
    rawInput.value = '';
    baselineInput.value = '';
    if (skipHeader) skipHeader.checked = false;
    if (skipBytesInput) skipBytesInput.value = 2;
    state.fields = {};
    state.currentParsed = null;
    state.baselineParsed = null;
    state.currentHex = '';
    state.baselineHex = '';
    renderInspector(null);
    refreshSummary(null);
    diffResult.innerHTML = '';
    showError('');
  });

  setBaselineButton?.addEventListener('click', () => {
    const hex = cleanHex(rawInput.value);
    if (!hex) {
      showError('Parse a message before setting a baseline.');
      return;
    }
    baselineInput.value = hex;
    try {
      state.baselineParsed = parseISO8583(hex, {
        skipBytes: currentSkipBytes(),
        encoding: state.encoding,
      });
      state.baselineHex = hex;
      showError('');
      if (diffToggle?.checked) renderDiff();
    } catch (err) {
      showError(`Baseline parse failed: ${err.message}`);
    }
  });

  encodingSelect?.addEventListener('change', () => {
    state.encoding = normalizeEncoding(encodingSelect.value);
    if (rawInput.value.trim()) {
      parseHex(rawInput.value, { encoding: state.encoding, recordHistory: true });
      renderDiff();
    }
  });

  mtiInput?.addEventListener('input', () => {
    state.mti = mtiInput.value.trim();
    scheduleRebuild();
  });

  addFieldButton?.addEventListener('click', () => {
    const de = Number(fieldSelect?.value);
    if (!de) return;
    state.fields[de] = fieldValueInput?.value ?? '';
    fieldValueInput.value = '';
    scheduleRebuild();
  });

  fieldValueInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFieldButton?.click();
    }
  });

  inspector?.addEventListener('input', (e) => {
    const target = e.target;
    if (!target.classList.contains('smart-value')) return;
    const de = Number(target.dataset.de);
    state.fields[de] = target.value;
    scheduleRebuild();
  });

  inspector?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="remove"]');
    if (!btn) return;
    const de = Number(btn.dataset.de);
    delete state.fields[de];
    scheduleRebuild();
  });

  diffToggle?.addEventListener('change', () => {
    if (diffToggle.checked) {
      renderDiff();
    } else if (diffPanel) {
      diffPanel.classList.add('hidden');
    }
  });

  parseBaselineBtn?.addEventListener('click', () => {
    const hex = cleanHex(baselineInput.value);
    if (!hex) {
      showError('Paste a baseline message to diff.');
      return;
    }
    try {
      state.baselineParsed = parseISO8583(hex, {
        skipBytes: currentSkipBytes(),
        encoding: state.encoding,
      });
      state.baselineHex = hex;
      showError('');
      renderDiff();
    } catch (err) {
      showError(`Baseline parse failed: ${err.message}`);
    }
  });

  useCurrentBaseline?.addEventListener('click', () => {
    const hex = cleanHex(rawInput.value);
    if (!hex) {
      showError('Parse a message before using it as baseline.');
      return;
    }
    baselineInput.value = hex;
    parseBaselineBtn?.click();
  });

  copyHexBtn?.addEventListener('click', async () => {
    const hex = cleanHex(rawInput.value);
    if (!hex) {
      showError('No hex to copy. Parse or build a message first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(hex);
      flash(copyHexBtn);
      showError('');
    } catch {
      showError('Copy to clipboard failed.');
    }
  });

  copyJsonBtn?.addEventListener('click', async () => {
    const parsed = ensureParsedForAction();
    if (!parsed) return;
    const ok = await copyJSONToClipboard(parsed);
    if (ok) {
      flash(copyJsonBtn);
      showError('');
    } else {
      showError('Unable to copy JSON to clipboard.');
    }
  });

  downloadJsonBtn?.addEventListener('click', () => {
    const parsed = ensureParsedForAction();
    if (!parsed) return;
    downloadJSON(parsed, 'iso8583-message.json');
    showError('');
  });

  importJsonInput?.addEventListener('change', async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const payload = await readJSONFile(file);
      const hex = buildHexFromJSON(payload, { encoding: state.encoding });
      rawInput.value = hex;
      parseHex(hex, { skipBytes: 0, encoding: state.encoding, recordHistory: true });
      renderDiff();
      showError('');
    } catch (err) {
      showError(`Import failed: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  });

  shareLinkBtn?.addEventListener('click', async () => {
    const hex = cleanHex(rawInput.value);
    if (!hex) {
      showError('Parse or build a message before sharing.');
      return;
    }
    const url = shareableUrl(hex, state.encoding, currentSkipBytes());
    try {
      await navigator.clipboard.writeText(url);
      flash(shareLinkBtn, 'Link copied');
      showError('');
    } catch {
      showError('Copy link failed.');
    }
  });

  historyList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const li = btn.closest('li.history-item');
    if (!li) return;
    const entry = state.history.find(h => String(h.id) === li.dataset.id);
    if (!entry) return;

    if (btn.dataset.action === 'load') {
      if (encodingSelect) encodingSelect.value = entry.encoding;
      state.encoding = normalizeEncoding(entry.encoding);
      rawInput.value = entry.hex;
      if (skipHeader) skipHeader.checked = entry.skipBytes > 0;
      if (skipBytesInput) skipBytesInput.value = entry.skipBytes || 0;
      parseHex(entry.hex, {
        skipBytes: entry.skipBytes || 0,
        encoding: state.encoding,
        recordHistory: true,
      });
      renderDiff();
      return;
    }

    if (btn.dataset.action === 'link') {
      const link = shareableUrl(entry.hex, entry.encoding, entry.skipBytes);
      try {
        await navigator.clipboard.writeText(link);
        flash(btn, 'Copied');
      } catch {
        showError('Copy link failed.');
      }
    }
  });

  clearHistoryBtn?.addEventListener('click', () => {
    state.history = [];
    saveHistory(state.history);
    renderHistoryList();
  });

  function hydrateFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const hex = cleanHex(params.get('hex') || '');
    if (!hex) {
      renderHistoryList();
      return;
    }
    const encoding = normalizeEncoding(params.get('enc') || DEFAULT_ENCODING);
    const skip = parseInt(params.get('skip'), 10);
    if (encodingSelect) encodingSelect.value = encoding;
    if (skipHeader) skipHeader.checked = Number.isFinite(skip) && skip > 0;
    if (skipBytesInput) skipBytesInput.value = Number.isFinite(skip) ? skip : 0;
    state.encoding = encoding;
    rawInput.value = hex;
    parseHex(hex, { skipBytes: Number.isFinite(skip) ? skip : 0, encoding, recordHistory: true });
  }

  // Initial empty state render
  renderHistoryList();
  hydrateFromQuery();
  renderInspector(null);
  refreshSummary(null);
}
