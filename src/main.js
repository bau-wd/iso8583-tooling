import { parseISO8583 } from './parser.js';
import { renderMessage, renderComparison } from './renderer.js';
import { downloadJSON, copyJSONToClipboard } from './exporter.js';
<<<<<<< HEAD
import { buildHexFromJSON, readJSONFile } from './importer.js';
import { ENCODING_OPTIONS, encodingLabel, normalizeEncoding, textToHex, byteLength } from './encoding.js';
import { FIELD_DEFINITIONS } from './fieldDefinitions.js';

const DEFAULT_ENCODING = 'ascii';

// ── Sample 0200 Authorization Request ────────────────────────────────────────
//
// This is a hand-crafted ISO 8583:1993 message. Text is encoded using the
// currently selected encoding (defaults to ASCII).
//
// MTI:  0200
// Bitmap (primary):   7238000102C08000
//   Bits set: 2,3,4,7,11,12,13,22,25,35,41,42,49
// Bitmap (secondary): 4000000000000000
//   Bits set: 66... wait — bit 1 is NOT set in primary → no secondary bitmap.
//
// Fields present (bits set in 7238000102C08000):
//   Bit  2 → DE02  LLVAR  n19  PAN                 → "16" + "4111111111111111"
//   Bit  3 → DE03  fixed  n6   Processing Code     → "000000"
//   Bit  4 → DE04  fixed  n12  Amount              → "000000012345"
//   Bit  7 → DE07  fixed  n10  Trans Date & Time   → "0311101526"
//   Bit 11 → DE11  fixed  n6   STAN                → "000001"
//   Bit 12 → DE12  fixed  n6   Local Time          → "101526"
//   Bit 13 → DE13  fixed  n4   Local Date          → "0311"
//   Bit 22 → DE22  fixed  n3   POS Entry Mode      → "012"
//   Bit 25 → DE25  fixed  n2   POS Condition Code  → "00"
//   Bit 35 → DE35  LLVAR  z37  Track 2             → "37" + "4111111111111111=2512101000000000000"
//   Bit 41 → DE41  fixed  ans8 Terminal ID         → "TERM0001"
//   Bit 42 → DE42  fixed  ans15 Card Acceptor ID   → "MERCHANT000001 "
//   Bit 49 → DE49  fixed  an3  Currency Code       → "978" (EUR)
//
// All text fields are encoded as hex pairs using the chosen encoding.

function buildSampleHex(selectedEncoding = DEFAULT_ENCODING) {
  const encoding = normalizeEncoding(selectedEncoding);
  const enc = (s) => textToHex(s, encoding);

  const mti        = enc('0200');
  const bitmap     = '7238000102C08000';
  const de02       = enc('16') + enc('4111111111111111');
  const de03       = enc('000000');
  const de04       = enc('000000012345');
  const de07       = enc('0311101526');
  const de11       = enc('000001');
  const de12       = enc('101526');
  const de13       = enc('0311');
  const de22       = enc('012');
  const de25       = enc('00');
  const track2     = '4111111111111111=2512101000000000000';
  const de35       = enc(String(track2.length).padStart(2, '0')) + enc(track2);
  const de41       = enc('TERM0001');
  const de42       = enc('MERCHANT000001 ');
  const de49       = enc('978');

  return mti + bitmap + de02 + de03 + de04 + de07 + de11 + de12 + de13 + de22 + de25 + de35 + de41 + de42 + de49;
}
=======
import { buildHexFromJSON, readJSONFile, computeBitmaps } from './importer.js';
import { FIELD_DEFINITIONS } from './fieldDefinitions.js';
import { NETWORK_PRESETS, validateMessageProfile, findPreset } from './networkProfiles.js';
import { SAMPLE_HEX } from './sample.js';
>>>>>>> main

// ── DOM refs ─────────────────────────────────────────────────────────────────
const hexInput      = document.getElementById('hexInput');
const skipHeader    = document.getElementById('skipHeader');
const skipBytes     = document.getElementById('skipBytes');
const btnParse      = document.getElementById('btnParse');
const btnSample     = document.getElementById('btnSample');
const btnClear      = document.getElementById('btnClear');
const btnExport     = document.getElementById('btnExport');
const btnCopy       = document.getElementById('btnCopy');
const btnImport     = document.getElementById('btnImport');
const importFileInput = document.getElementById('importFileInput');
const btnShareHex   = document.getElementById('btnShareHex');
const btnShareJson  = document.getElementById('btnShareJson');
const historyList   = document.getElementById('historyList');
const btnClearHistory = document.getElementById('btnClearHistory');
const outputSection = document.getElementById('outputSection');
const mtiValue      = document.getElementById('mtiValue');
const primaryBitmapValue   = document.getElementById('primaryBitmapValue');
const secondaryBitmapValue = document.getElementById('secondaryBitmapValue');
const secondaryBitmapItem  = document.getElementById('secondaryBitmapItem');
const fieldCount    = document.getElementById('fieldCount');
const tableContainer = document.getElementById('tableContainer');
<<<<<<< HEAD
const encodingSelect = document.getElementById('encodingSelect');
const fieldSelect = document.getElementById('fieldSelect');
const helperFormat = document.getElementById('helperFormat');
const helperLength = document.getElementById('helperLength');
const helperHint = document.getElementById('helperHint');
const helperSample = document.getElementById('helperSample');
const helperHexPreview = document.getElementById('helperHexPreview');
const helperEncoding = document.getElementById('helperEncoding');
=======
const compareInputA = document.getElementById('compareInputA');
const compareInputB = document.getElementById('compareInputB');
const compareSkipHeaderA = document.getElementById('compareSkipHeaderA');
const compareSkipHeaderB = document.getElementById('compareSkipHeaderB');
const compareSkipBytesA = document.getElementById('compareSkipBytesA');
const compareSkipBytesB = document.getElementById('compareSkipBytesB');
const btnCompare   = document.getElementById('btnCompare');
const btnSwapCompare = document.getElementById('btnSwapCompare');
const btnUseCurrentA = document.getElementById('btnUseCurrentA');
const btnUseCurrentB = document.getElementById('btnUseCurrentB');
const compareError = document.getElementById('compareError');
const compareResult = document.getElementById('compareResult');
const networkPresetSelect = document.getElementById('networkPreset');
const profileBadge = document.getElementById('profileBadge');
const profileStatus = document.getElementById('profileStatus');

// Builder DOM refs
const builderMtiInput          = document.getElementById('builderMti');
const builderFieldSelect       = document.getElementById('builderFieldSelect');
const builderFieldValue        = document.getElementById('builderFieldValue');
const builderFieldMeta         = document.getElementById('builderFieldMeta');
const builderAddField          = document.getElementById('builderAddField');
const builderClearFields       = document.getElementById('builderClearFields');
const builderFieldTableBody    = document.getElementById('builderFieldTableBody');
const builderFieldCount        = document.getElementById('builderFieldCount');
const builderPrimaryBitmap     = document.getElementById('builderPrimaryBitmap');
const builderSecondaryBitmap   = document.getElementById('builderSecondaryBitmap');
const builderHexOutput         = document.getElementById('builderHexOutput');
const builderJsonOutput        = document.getElementById('builderJsonOutput');
const builderErrorBox          = document.getElementById('builderErrorBox');
const builderCopyHex           = document.getElementById('builderCopyHex');
const builderCopyJson          = document.getElementById('builderCopyJson');
const builderDownloadJson      = document.getElementById('builderDownloadJson');
const builderSendToParser      = document.getElementById('builderSendToParser');
const builderNetworkPreset     = document.getElementById('builderNetworkPreset');
const builderProfileStatus     = document.getElementById('builderProfileStatus');

const HISTORY_KEY   = 'iso8583-history';
const HISTORY_LIMIT = 10;

const builderState = { fields: {} };
>>>>>>> main

let lastParsed = null;
let lastHexInput = '';
let lastSkipBytes = 0;

<<<<<<< HEAD
// ── Helpers ────────────────────────────────────────────────────────────────────
function currentEncoding() {
  return normalizeEncoding(encodingSelect?.value || DEFAULT_ENCODING);
}

function populateEncodingSelect() {
  if (!encodingSelect) return;
  encodingSelect.innerHTML = ENCODING_OPTIONS
    .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
    .join('');
  encodingSelect.value = DEFAULT_ENCODING;
}

function populateFieldSelect() {
  if (!fieldSelect) return;
  const entries = Object.keys(FIELD_DEFINITIONS).map(Number).sort((a, b) => a - b);
  fieldSelect.innerHTML = entries
    .map(de => {
      const def = FIELD_DEFINITIONS[de];
      return `<option value="${de}">DE${String(de).padStart(3, '0')} — ${def.name}</option>`;
    })
    .join('');
  fieldSelect.value = '2';
}

function formatDescription(format) {
  switch (format) {
    case 'n': return 'Numeric (digits only)';
    case 'x+n': return 'Signed numeric amount (leading sign)';
    case 'an': return 'Alphanumeric (A–Z, 0–9)';
    case 'ans': return 'Alphanumeric with specials';
    case 'z': return 'Track data (digits, =, D, separators)';
    case 'b': return 'Binary data (raw hex bytes)';
    default: return 'Free-form text';
  }
}

function sampleValueFor(def) {
  const safeLen = Math.min(def.maxLength, 8);
  if (def.format === 'b') {
    return 'AA'.repeat(Math.max(1, Math.min(def.maxLength, 4)));
  }
  if (def.format === 'n') {
    return '1'.repeat(Math.max(1, Math.min(safeLen, 6)));
  }
  if (def.format === 'x+n') {
    const digits = Math.max(1, Math.min(safeLen - 1, 5));
    return `+${'1'.repeat(digits)}`;
  }
  if (def.format === 'z') {
    return '4111111111111111=2512';
  }
  return 'SAMPLE'.padEnd(Math.max(1, Math.min(safeLen, 6)), 'X').slice(0, safeLen);
}

function updateFieldHelper() {
  if (!fieldSelect || !helperFormat || !helperLength || !helperHint) return;
  const selected = Number(fieldSelect.value || 2);
  const def = FIELD_DEFINITIONS[selected] || FIELD_DEFINITIONS[2];
  const encoding = currentEncoding();

  helperFormat.textContent = def.format;
  const maxText = `${def.maxLength} char${def.maxLength !== 1 ? 's' : ''}`;
  const lengthDetail = def.lengthType === 'fixed'
    ? `Fixed (${maxText})`
    : `${def.lengthType} up to ${maxText}`;
  helperLength.textContent = lengthDetail;
  const lengthHint = def.lengthType === 'fixed'
    ? 'No length prefix required.'
    : `${def.lengthType} prefix is encoded using ${encodingLabel(encoding)} digits.`;
  helperHint.textContent = `${formatDescription(def.format)} • ${lengthHint}`;
  helperEncoding.textContent = `Preview encoding: ${encodingLabel(encoding)}`;

  const sample = sampleValueFor(def);
  helperSample.textContent = sample;

  try {
    const valueHex = def.format === 'b' ? sample.toUpperCase() : textToHex(sample, encoding);
    const bodyLength = def.format === 'b' ? valueHex.length / 2 : byteLength(sample, encoding);
    const prefixHex = (() => {
      if (def.lengthType === 'LLVAR') {
        return textToHex(String(bodyLength).padStart(2, '0'), encoding);
      }
      if (def.lengthType === 'LLLVAR') {
        return textToHex(String(bodyLength).padStart(3, '0'), encoding);
      }
      return '';
    })();
    helperHexPreview.textContent = `${prefixHex}${valueHex}`;
  } catch (err) {
    helperHexPreview.textContent = `Preview unavailable: ${err.message}`;
  }
}

function showOutput(parsed) {
=======
// ── Helpers ────────────────────────────────────────────────────────────────
function showOutput(parsed, validation) {
>>>>>>> main
  lastParsed = parsed;

  mtiValue.textContent = parsed.mti ?? '—';
  primaryBitmapValue.textContent = parsed.primaryBitmap ?? '—';

  if (parsed.secondaryBitmap) {
    secondaryBitmapItem.classList.remove('hidden');
    secondaryBitmapValue.textContent = parsed.secondaryBitmap;
  } else {
    secondaryBitmapItem.classList.add('hidden');
  }

  const count = Object.keys(parsed.fields).length;
  fieldCount.textContent = `${count} field${count !== 1 ? 's' : ''}`;

  const validationInfo = validation || {
    profile: findPreset(networkPresetSelect?.value || 'none'),
    errors: [],
    warnings: [],
  };
  updateProfileSummary(validationInfo);

  renderMessage(tableContainer, parsed, validationInfo);
  outputSection.classList.remove('hidden');
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

<<<<<<< HEAD
populateEncodingSelect();
populateFieldSelect();
updateFieldHelper();

// ── Event listeners ───────────────────────────────────────────────────────────
encodingSelect?.addEventListener('change', updateFieldHelper);
fieldSelect?.addEventListener('change', updateFieldHelper);
=======
function updateProfileSummary(validation) {
  if (!profileBadge || !profileStatus) return;

  const profileLabel = validation?.profile?.label ?? 'No preset';
  const errors = validation?.errors?.length ?? 0;
  const warnings = validation?.warnings?.length ?? 0;

  let badgeClass = 'badge badge-neutral';
  if (errors > 0) badgeClass = 'badge badge-fail';
  else if (warnings > 0) badgeClass = 'badge badge-warn';
  else badgeClass = 'badge badge-pass';

  profileBadge.textContent = profileLabel;
  profileBadge.className = badgeClass;

  if (!validation) {
    profileStatus.textContent = 'Validation not run.';
    return;
  }

  if (errors > 0) {
    profileStatus.textContent = `${errors} required field${errors === 1 ? '' : 's'} missing for this preset.`;
  } else if (warnings > 0) {
    profileStatus.textContent = `${warnings} warning${warnings === 1 ? '' : 's'} for this preset.`;
  } else {
    profileStatus.textContent = 'Message satisfies preset requirements.';
  }
}

function updateBuilderValidationStatus(validation) {
  if (!builderProfileStatus) return;

  const errors = validation?.errors?.length ?? 0;
  const warnings = validation?.warnings?.length ?? 0;
  const profileLabel = validation?.profile?.label ?? 'No preset';

  let badgeClass = 'badge badge-neutral';
  let text = profileLabel;

  if (validation?.profile?.id === 'none') {
    text = 'Validation off';
  } else if (errors > 0) {
    badgeClass = 'badge badge-fail';
    text = `${errors} required field${errors === 1 ? '' : 's'} missing`;
  } else if (warnings > 0) {
    badgeClass = 'badge badge-warn';
    text = `${warnings} warning${warnings === 1 ? '' : 's'}`;
  } else if (validation) {
    badgeClass = 'badge badge-pass';
    text = 'Preset satisfied';
  }

  builderProfileStatus.textContent = text;
  builderProfileStatus.className = badgeClass;
}

function toMinimalJSON(parsed) {
  return {
    mti: parsed.mti,
    fields: Object.fromEntries(
      Object.entries(parsed.fields).map(([k, f]) => [k, f.value])
    ),
  };
}

async function copyText(value, button) {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    if (button) {
      const prev = button.textContent;
      button.textContent = '✓ Copied';
      button.disabled = true;
      setTimeout(() => {
        button.textContent = prev;
        button.disabled = false;
      }, 1500);
    }
    return true;
  } catch {
    return false;
  }
}

function flashButton(btn, message, success = true) {
  const original = btn.textContent;
  btn.textContent = success ? `✓ ${message}` : `✗ ${message}`;
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 2000);
}

// ── Builder helpers ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function populatePresetSelect(select) {
  if (!select) return;
  select.innerHTML = NETWORK_PRESETS
    .map(preset => `<option value="${preset.id}">${escapeHtml(preset.label)}</option>`)
    .join('');
  select.value = NETWORK_PRESETS[0].id;
}

function populateFieldSelect() {
  const defs = Object.values(FIELD_DEFINITIONS)
    .filter(def => def.de !== 1)
    .sort((a, b) => a.de - b.de);

  builderFieldSelect.innerHTML = '<option value="" disabled selected>Select data element…</option>' +
    defs.map(def => `<option value="${def.de}">DE${def.de.toString().padStart(3, '0')} — ${escapeHtml(def.name)}</option>`).join('');
}

function describeField(def) {
  if (!def) return 'Choose a data element to see its format and length.';
  const lengthHint = def.lengthType === 'fixed'
    ? `${def.maxLength} characters`
    : `up to ${def.maxLength} characters`;
  return `${def.name} • ${def.format} • ${def.lengthType} • ${lengthHint}`;
}

function renderBuilderFields() {
  const rows = Object.keys(builderState.fields).map(Number).sort((a, b) => a - b);
  if (rows.length === 0) {
    builderFieldTableBody.innerHTML = '<tr><td class="empty" colspan="5">No data elements added yet.</td></tr>';
    builderFieldCount.textContent = '0 fields';
    builderPrimaryBitmap.textContent = '0000000000000000';
    builderSecondaryBitmap.textContent = '—';
    builderHexOutput.value = '';
    builderJsonOutput.value = '';
    builderErrorBox.classList.add('hidden');
    return;
  }

  const html = rows.map(de => {
    const def = FIELD_DEFINITIONS[de];
    const lengthHint = def
      ? `${def.lengthType} • ${def.lengthType === 'fixed' ? def.maxLength : '≤ ' + def.maxLength}`
      : 'unknown';
    return `
      <tr>
        <td><span class="de-badge">${escapeHtml(de)}</span></td>
        <td>${escapeHtml(def?.name ?? 'Unknown')}</td>
        <td><code>${escapeHtml(def?.format ?? '?')}</code> · ${escapeHtml(lengthHint)}</td>
        <td>
          <input
            class="builder-value"
            data-de="${de}"
            value="${escapeHtml(builderState.fields[de])}"
            spellcheck="false"
            />
        </td>
        <td>
          <button class="btn btn-secondary btn-xs" data-action="remove" data-de="${de}">Remove</button>
        </td>
      </tr>
    `;
  }).join('');

  builderFieldTableBody.innerHTML = html;
  builderFieldCount.textContent = `${rows.length} field${rows.length === 1 ? '' : 's'}`;
}

function refreshBuilderOutputs() {
  const structuralErrors = [];
  const mti = builderMtiInput.value.trim();
  const cleanFields = {};

  if (mti.length !== 4) {
    structuralErrors.push('MTI must be exactly 4 characters.');
  }

  for (const [deStr, rawValue] of Object.entries(builderState.fields)) {
    const de = Number(deStr);
    const def = FIELD_DEFINITIONS[de];
    if (!def) {
      structuralErrors.push(`DE${de}: no definition available.`);
      continue;
    }

    const value = String(rawValue);
    if ((def.lengthType === 'LLVAR' || def.lengthType === 'LLLVAR') && value.length > def.maxLength) {
      structuralErrors.push(`DE${de}: value exceeds maximum length of ${def.maxLength}.`);
    }
    if (def.lengthType === 'fixed' && value.length > def.maxLength) {
      structuralErrors.push(`DE${de}: fixed length ${def.maxLength}, current length ${value.length}.`);
    }
    cleanFields[de] = value;
  }

  const deNumbers = Object.keys(cleanFields).map(Number).sort((a, b) => a - b);
  const { primaryBitmap, secondaryBitmap } = computeBitmaps(deNumbers);
  builderPrimaryBitmap.textContent = primaryBitmap;
  builderSecondaryBitmap.textContent = secondaryBitmap ?? '—';

  let hex = '';
  let jsonText = '';

  if (structuralErrors.length === 0 && mti.length === 4) {
    try {
      const payload = { mti, fields: cleanFields };
      hex = buildHexFromJSON(payload);
      jsonText = JSON.stringify(payload, null, 2);
    } catch (err) {
      structuralErrors.push(err.message);
    }
  }

  builderHexOutput.value = hex;
  builderJsonOutput.value = jsonText;

  const builderValidation = validateMessageProfile(
    { mti, fields: cleanFields },
    builderNetworkPreset?.value || 'none'
  );
  updateBuilderValidationStatus(builderValidation);

  const messages = [
    ...structuralErrors,
    ...builderValidation.errors.map(e => `Validation: ${e}`),
    ...builderValidation.warnings.map(w => `Validation: ${w}`),
  ];

  if (messages.length > 0) {
    builderErrorBox.classList.remove('hidden');
    builderErrorBox.innerHTML = `<strong>⚠ Builder checks:</strong><ul>${messages.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
  } else {
    builderErrorBox.classList.add('hidden');
    builderErrorBox.innerHTML = '';
  }

  return { hex, jsonText, validation: builderValidation };
}

// ── History helpers ───────────────────────────────────────────────────────
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
  } catch {
    // ignore write failures (e.g., storage disabled)
  }
}

function renderHistory(list = loadHistory()) {
  if (!historyList) return;
  historyList.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('li');
    empty.className = 'history-empty';
    empty.textContent = 'No messages yet. Parse or import one to start a history.';
    historyList.appendChild(empty);
    return;
  }

  list.slice(0, HISTORY_LIMIT).forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const info = document.createElement('div');
    info.className = 'history-info';

    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = item.mti || '????';
    info.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'history-meta';

    const fieldBadge = document.createElement('span');
    fieldBadge.textContent = `${item.fieldCount} field${item.fieldCount === 1 ? '' : 's'}`;
    meta.appendChild(fieldBadge);

    const timestamp = document.createElement('span');
    timestamp.textContent = new Date(item.timestamp).toLocaleString();
    meta.appendChild(timestamp);

    if (item.skipBytes) {
      const skip = document.createElement('span');
      skip.className = 'tag';
      skip.textContent = `Skip ${item.skipBytes} byte${item.skipBytes === 1 ? '' : 's'}`;
      meta.appendChild(skip);
    }

    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'history-actions';
    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-secondary btn-sm';
    loadBtn.dataset.index = String(idx);
    loadBtn.textContent = 'Load';
    actions.appendChild(loadBtn);

    li.appendChild(info);
    li.appendChild(actions);
    historyList.appendChild(li);
  });
}

function addToHistory(parsed, hex, skipBytes) {
  const history = loadHistory().filter(
    (h) => !(h.hex === hex && (h.skipBytes || 0) === (skipBytes || 0))
  );

  history.unshift({
    hex,
    mti: parsed.mti ?? '????',
    fieldCount: Object.keys(parsed.fields || {}).length,
    skipBytes: skipBytes || 0,
    timestamp: Date.now(),
  });

  persistHistory(history);
  renderHistory(history);
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
  renderHistory([]);
}

function hydrateFromSharedLink() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('hex')) {
    const sharedHex = params.get('hex') || '';
    const sharedSkip = parseInt(params.get('skip'), 10) || 0;
    hexInput.value = sharedHex;
    skipHeader.checked = sharedSkip > 0;
    skipBytes.value = sharedSkip || 0;
    btnParse.click();
    history.replaceState(null, '', window.location.pathname);
    return true;
  }

  if (params.has('json')) {
    try {
      const sharedJSON = params.get('json');
      const parsedJSON = JSON.parse(sharedJSON);
      const hex = buildHexFromJSON(parsedJSON);
      hexInput.value = hex;
      skipHeader.checked = false;
      btnParse.click();
      history.replaceState(null, '', window.location.pathname);
      return true;
    } catch (err) {
      alert(`Shared JSON link is invalid: ${err.message}`);
    }
  }
  return false;
}

function buildShareUrlFromHex(hex, skipBytes) {
  const params = new URLSearchParams();
  params.set('hex', hex);
  if (skipBytes) params.set('skip', skipBytes);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function buildShareUrlFromJSON(parsed) {
  const params = new URLSearchParams();
  params.set('json', JSON.stringify(toMinimalJSON(parsed)));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function showCompareError(msg) {
  if (!compareError) return;
  compareError.textContent = msg;
  compareError.classList.remove('hidden');
}

function clearCompareError() {
  if (!compareError) return;
  compareError.classList.add('hidden');
  compareError.textContent = '';
}

function getSkipValue(checkbox, input) {
  return checkbox.checked ? parseInt(input.value, 10) || 0 : 0;
}

// ── Event listeners ───────────────────────────────────────────────────────────
populatePresetSelect(networkPresetSelect);
populatePresetSelect(builderNetworkPreset);
>>>>>>> main

btnParse.addEventListener('click', () => {
  const raw = hexInput.value.trim();
  if (!raw) {
    alert('Please paste a hex-encoded ISO 8583 message first.');
    return;
  }

  btnParse.disabled = true;
  btnParse.textContent = 'Parsing…';

  const options = {
    skipBytes: skipHeader.checked ? parseInt(skipBytes.value, 10) || 0 : 0,
  };
  lastHexInput = raw;
  lastSkipBytes = options.skipBytes;

  // Use setTimeout to allow the UI to update before heavy work
<<<<<<< HEAD
  setTimeout(() => {
    try {
      const options = {
        skipBytes: skipHeader.checked ? parseInt(skipBytes.value, 10) || 0 : 0,
        encoding: currentEncoding(),
      };
      const parsed = parseISO8583(raw, options);
      showOutput(parsed);
    } catch (err) {
      alert(`Fatal parse error: ${err.message}`);
    } finally {
      btnParse.disabled = false;
=======
    setTimeout(() => {
      try {
        const parsed = parseISO8583(raw, options);
        const presetId = networkPresetSelect?.value || 'none';
        const validation = validateMessageProfile(parsed, presetId);
        showOutput(parsed, validation);
        addToHistory(parsed, raw, options.skipBytes);
      } catch (err) {
        alert(`Fatal parse error: ${err.message}`);
      } finally {
        btnParse.disabled = false;
>>>>>>> main
      btnParse.textContent = 'Parse Message';
    }
  }, 10);
});

if (networkPresetSelect) {
  networkPresetSelect.addEventListener('change', () => {
    if (!lastParsed) return;
    const validation = validateMessageProfile(lastParsed, networkPresetSelect.value);
    showOutput(lastParsed, validation);
  });
}

btnSample.addEventListener('click', () => {
  hexInput.value = buildSampleHex(currentEncoding());
  skipHeader.checked = false;
});

btnClear.addEventListener('click', () => {
  hexInput.value = '';
  outputSection.classList.add('hidden');
  lastParsed = null;
  hexInput.focus();
});

btnImport.addEventListener('click', () => {
  importFileInput.value = ''; // reset so re-selecting same file triggers change
  importFileInput.click();
});

importFileInput.addEventListener('change', async () => {
  const file = importFileInput.files[0];
  if (!file) return;

  try {
    const json = await readJSONFile(file);
    const hex  = buildHexFromJSON(json, { encoding: currentEncoding() });
    hexInput.value = hex;
    skipHeader.checked = false;

    // Auto-parse the reconstructed message
    btnParse.click();
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
});

btnExport.addEventListener('click', () => {
  if (!lastParsed) return;
  const mti = lastParsed.mti ?? 'unknown';
  downloadJSON(lastParsed, `iso8583-${mti}-${Date.now()}.json`);
});

btnCopy.addEventListener('click', async () => {
  if (!lastParsed) return;
  const ok = await copyJSONToClipboard(lastParsed);
  const original = btnCopy.textContent;
  btnCopy.textContent = ok ? '✓ Copied!' : '✗ Failed';
  btnCopy.disabled = true;
  setTimeout(() => {
    btnCopy.textContent = original;
    btnCopy.disabled = false;
  }, 2000);
});
<<<<<<< HEAD
=======

btnShareHex.addEventListener('click', async () => {
  if (!lastParsed) return;
  const url = buildShareUrlFromHex(lastHexInput || hexInput.value.trim(), lastSkipBytes || 0);
  const ok = await copyText(url);
  flashButton(btnShareHex, ok ? 'Copied link' : 'Copy failed', ok);
});

btnShareJson.addEventListener('click', async () => {
  if (!lastParsed) return;
  const url = buildShareUrlFromJSON(lastParsed);
  const ok = await copyText(url);
  flashButton(btnShareJson, ok ? 'Copied link' : 'Copy failed', ok);
});

historyList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-index]');
  if (!btn) return;
  const index = parseInt(btn.dataset.index, 10);
  const history = loadHistory();
  const entry = history[index];
  if (!entry) return;

  hexInput.value = entry.hex;
  const skip = entry.skipBytes || 0;
  skipHeader.checked = skip > 0;
  skipBytes.value = skip;
  btnParse.click();
});

btnClearHistory.addEventListener('click', () => {
  clearHistory();
});

// ── Compare & Diff events ─────────────────────────────────────────────────────
if (btnCompare) {
  btnCompare.addEventListener('click', () => {
    const hexA = compareInputA.value.trim();
    const hexB = compareInputB.value.trim();
    if (!hexA || !hexB) {
      showCompareError('Paste a hex message for both A and B before comparing.');
      return;
    }

    btnCompare.disabled = true;
    const original = btnCompare.textContent;
    btnCompare.textContent = 'Comparing…';

    setTimeout(() => {
      try {
        const parsedA = parseISO8583(hexA, { skipBytes: getSkipValue(compareSkipHeaderA, compareSkipBytesA) });
        const parsedB = parseISO8583(hexB, { skipBytes: getSkipValue(compareSkipHeaderB, compareSkipBytesB) });
        renderComparison(compareResult, parsedA, parsedB);
        clearCompareError();
      } catch (err) {
        showCompareError(`Compare failed: ${err.message}`);
        compareResult.innerHTML = '';
      } finally {
        btnCompare.disabled = false;
        btnCompare.textContent = original;
      }
    }, 10);
  });
}

if (btnSwapCompare) {
  btnSwapCompare.addEventListener('click', () => {
    const tmp = compareInputA.value;
    compareInputA.value = compareInputB.value;
    compareInputB.value = tmp;

    const tmpSkip = compareSkipHeaderA.checked;
    compareSkipHeaderA.checked = compareSkipHeaderB.checked;
    compareSkipHeaderB.checked = tmpSkip;

    const tmpBytes = compareSkipBytesA.value;
    compareSkipBytesA.value = compareSkipBytesB.value;
    compareSkipBytesB.value = tmpBytes;
  });
}

function loadCurrentInto(targetInput, checkbox, input) {
  const source = lastHexInput || hexInput.value.trim();
  if (!source) {
    alert('Parse a message first to reuse it for comparison.');
    return;
  }
  targetInput.value = source;
  checkbox.checked = (lastSkipBytes || 0) > 0;
  input.value = lastSkipBytes || 0;
}

if (btnUseCurrentA) {
  btnUseCurrentA.addEventListener('click', () => {
    loadCurrentInto(compareInputA, compareSkipHeaderA, compareSkipBytesA);
  });
}

if (btnUseCurrentB) {
  btnUseCurrentB.addEventListener('click', () => {
    loadCurrentInto(compareInputB, compareSkipHeaderB, compareSkipBytesB);
  });
}

// ── Builder events ───────────────────────────────────────────────────────────
builderFieldSelect.addEventListener('change', () => {
  const def = FIELD_DEFINITIONS[Number(builderFieldSelect.value)];
  builderFieldMeta.textContent = describeField(def);
});

if (builderNetworkPreset) {
  builderNetworkPreset.addEventListener('change', () => {
    refreshBuilderOutputs();
  });
}

builderAddField.addEventListener('click', () => {
  const de = Number(builderFieldSelect.value);
  if (!de) {
    alert('Select a data element to add.');
    return;
  }
  const value = builderFieldValue.value;
  builderState.fields[de] = value;
  builderFieldValue.value = '';
  renderBuilderFields();
  refreshBuilderOutputs();
});

builderClearFields.addEventListener('click', () => {
  builderState.fields = {};
  renderBuilderFields();
  refreshBuilderOutputs();
});

builderFieldValue.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    builderAddField.click();
  }
});

builderMtiInput.addEventListener('input', () => {
  refreshBuilderOutputs();
});

builderFieldTableBody.addEventListener('input', (e) => {
  if (e.target.classList.contains('builder-value')) {
    const de = Number(e.target.dataset.de);
    builderState.fields[de] = e.target.value;
    refreshBuilderOutputs();
  }
});

builderFieldTableBody.addEventListener('click', (e) => {
  const target = e.target;
  if (target.dataset.action === 'remove') {
    const de = Number(target.dataset.de);
    delete builderState.fields[de];
    renderBuilderFields();
    refreshBuilderOutputs();
  }
});

builderCopyHex.addEventListener('click', () => {
  copyText(builderHexOutput.value, builderCopyHex);
});

builderCopyJson.addEventListener('click', () => {
  copyText(builderJsonOutput.value, builderCopyJson);
});

builderDownloadJson.addEventListener('click', () => {
  const json = builderJsonOutput.value;
  if (!json) return;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'iso8583-message.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
});

builderSendToParser.addEventListener('click', () => {
  const { hex } = refreshBuilderOutputs();
  if (!hex) {
    alert('Build a valid message first.');
    return;
  }
  if (networkPresetSelect && builderNetworkPreset) {
    networkPresetSelect.value = builderNetworkPreset.value;
  }
  hexInput.value = hex;
  skipHeader.checked = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  btnParse.click();
});

populateFieldSelect();
builderFieldMeta.textContent = describeField(null);
renderBuilderFields();
refreshBuilderOutputs();
renderHistory();
hydrateFromSharedLink();
>>>>>>> main
