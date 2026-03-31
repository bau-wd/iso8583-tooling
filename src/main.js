import { parseISO8583 } from './parser.js';
import { renderMessage } from './renderer.js';
import { downloadJSON, copyJSONToClipboard } from './exporter.js';
import { buildHexFromJSON, readJSONFile, computeBitmaps } from './importer.js';
import { FIELD_DEFINITIONS } from './fieldDefinitions.js';
import { SAMPLE_HEX } from './sample.js';

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
const outputSection = document.getElementById('outputSection');
const mtiValue      = document.getElementById('mtiValue');
const primaryBitmapValue   = document.getElementById('primaryBitmapValue');
const secondaryBitmapValue = document.getElementById('secondaryBitmapValue');
const secondaryBitmapItem  = document.getElementById('secondaryBitmapItem');
const fieldCount    = document.getElementById('fieldCount');
const tableContainer = document.getElementById('tableContainer');

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

const builderState = { fields: {} };

let lastParsed = null;

// ── Helpers ───���───────────────────────────────────────────────────────────────
function showOutput(parsed) {
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

  renderMessage(tableContainer, parsed);
  outputSection.classList.remove('hidden');
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Builder helpers ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function populateFieldSelect() {
  const defs = Object.values(FIELD_DEFINITIONS)
    .filter(def => def.de !== 1) // DE1 is bitmap indicator
    .sort((a, b) => a.de - b.de);

  builderFieldSelect.innerHTML = '<option value=\"\" disabled selected>Select data element…</option>' +
    defs.map(def => `<option value=\"${def.de}\">DE${def.de.toString().padStart(3, '0')} — ${escapeHtml(def.name)}</option>`).join('');
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
    builderFieldTableBody.innerHTML = '<tr><td class=\"empty\" colspan=\"5\">No data elements added yet.</td></tr>';
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
        <td><span class=\"de-badge\">${escapeHtml(de)}</span></td>
        <td>${escapeHtml(def?.name ?? 'Unknown')}</td>
        <td><code>${escapeHtml(def?.format ?? '?')}</code> · ${escapeHtml(lengthHint)}</td>
        <td>
          <input
            class=\"builder-value\"
            data-de=\"${de}\"
            value=\"${escapeHtml(builderState.fields[de])}\"
            spellcheck=\"false\"
            />
        </td>
        <td>
          <button class=\"btn btn-secondary btn-xs\" data-action=\"remove\" data-de=\"${de}\">Remove</button>
        </td>
      </tr>
    `;
  }).join('');

  builderFieldTableBody.innerHTML = html;
  builderFieldCount.textContent = `${rows.length} field${rows.length === 1 ? '' : 's'}`;
}

function refreshBuilderOutputs() {
  const errors = [];
  const mti = builderMtiInput.value.trim();
  const cleanFields = {};

  if (mti.length !== 4) {
    errors.push('MTI must be exactly 4 characters.');
  }

  for (const [deStr, rawValue] of Object.entries(builderState.fields)) {
    const de = Number(deStr);
    const def = FIELD_DEFINITIONS[de];
    if (!def) {
      errors.push(`DE${de}: no definition available.`);
      continue;
    }

    const value = String(rawValue);
    if ((def.lengthType === 'LLVAR' || def.lengthType === 'LLLVAR') && value.length > def.maxLength) {
      errors.push(`DE${de}: value exceeds maximum length of ${def.maxLength}.`);
    }
    if (def.lengthType === 'fixed' && value.length > def.maxLength) {
      errors.push(`DE${de}: fixed length ${def.maxLength}, current length ${value.length}.`);
    }
    cleanFields[de] = value;
  }

  const deNumbers = Object.keys(cleanFields).map(Number).sort((a, b) => a - b);
  const { primaryBitmap, secondaryBitmap } = computeBitmaps(deNumbers);
  builderPrimaryBitmap.textContent = primaryBitmap;
  builderSecondaryBitmap.textContent = secondaryBitmap ?? '—';

  let hex = '';
  let jsonText = '';

  if (errors.length === 0 && mti.length === 4) {
    try {
      const payload = { mti, fields: cleanFields };
      hex = buildHexFromJSON(payload);
      jsonText = JSON.stringify(payload, null, 2);
    } catch (err) {
      errors.push(err.message);
    }
  }

  builderHexOutput.value = hex;
  builderJsonOutput.value = jsonText;

  if (errors.length > 0) {
    builderErrorBox.classList.remove('hidden');
    builderErrorBox.innerHTML = `<strong>⚠ Builder warnings:</strong><ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
  } else {
    builderErrorBox.classList.add('hidden');
    builderErrorBox.innerHTML = '';
  }

  return { hex, jsonText };
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

// ── Event listeners ───────────────────────────────────────────────────────────
btnParse.addEventListener('click', () => {
  const raw = hexInput.value.trim();
  if (!raw) {
    alert('Please paste a hex-encoded ISO 8583 message first.');
    return;
  }

  btnParse.disabled = true;
  btnParse.textContent = 'Parsing…';

  // Use setTimeout to allow the UI to update before heavy work
  setTimeout(() => {
    try {
      const options = {
        skipBytes: skipHeader.checked ? parseInt(skipBytes.value, 10) || 0 : 0,
      };
      const parsed = parseISO8583(raw, options);
      showOutput(parsed);
    } catch (err) {
      alert(`Fatal parse error: ${err.message}`);
    } finally {
      btnParse.disabled = false;
      btnParse.textContent = 'Parse Message';
    }
  }, 10);
});

btnSample.addEventListener('click', () => {
  hexInput.value = SAMPLE_HEX;
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
    const hex  = buildHexFromJSON(json);
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

// ── Builder events ───────────────────────────────────────────────────────────
builderFieldSelect.addEventListener('change', () => {
  const def = FIELD_DEFINITIONS[Number(builderFieldSelect.value)];
  builderFieldMeta.textContent = describeField(def);
});

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
  hexInput.value = hex;
  skipHeader.checked = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  btnParse.click();
});

populateFieldSelect();
builderFieldMeta.textContent = describeField(null);
renderBuilderFields();
refreshBuilderOutputs();
