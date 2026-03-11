import { parseISO8583 } from './parser.js';
import { renderMessage } from './renderer.js';
import { downloadJSON, copyJSONToClipboard } from './exporter.js';
import { buildHexFromJSON, readJSONFile } from './importer.js';

// ── Sample 0200 Authorization Request ────────────────────────────────────────
//
// This is a hand-crafted, ASCII-encoded ISO 8583:1993 message.
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
// All text fields are ASCII-encoded as hex pairs.

function buildSampleHex() {
  const enc = (s) => Array.from(s).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase();

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

const SAMPLE_HEX = buildSampleHex();

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